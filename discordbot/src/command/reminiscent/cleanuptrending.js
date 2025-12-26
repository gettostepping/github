const prisma = require('../../utils/database')
const axios = require('axios')
const { deleteTrendingItem, sendTrendingItem } = require('../../utils/forum-helpers')
const { createTrendingItemMessage } = require('../../utils/trending-embeds')

module.exports = {
    name: 'cleanuptrending',
    description: 'Delete all trending posts and recreate them fresh',
    usage: '<prefix>cleanuptrending [type]',
    dir: "reminiscent",
    aliases: ['cleanup', 'recreatetrending'],
    cooldown: 5,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return

        // Check server owner or bot owner permission
        const { isServerOwnerOrBotOwner } = require('../../utils/permissions')
        if (!isServerOwnerOrBotOwner(message)) {
            return message.reply("❌ This command requires server owner or bot owner permission.")
        }

        const type = args[0]?.toLowerCase() // 'movies', 'tv', or empty for all
        const guildId = message.guild.id
        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'

        try {
            // Get enabled channels
            const whereClause = { 
                enabled: true,
                guildId: guildId
            }
            
            if (type && (type === 'movies' || type === 'tv')) {
                whereClause.type = type
            }

            const channels = await prisma.trendingChannel.findMany({
                where: whereClause
            })

            if (channels.length === 0) {
                return message.reply(`❌ No active trending feeds found${type ? ` for ${type}` : ''}.`)
            }

            message.reply(`🧹 Cleaning up ${channels.length} trending feed${channels.length === 1 ? '' : 's'}...`)

            // Process each channel
            for (const channelConfig of channels) {
                try {
                    const guild = client.guilds.cache.get(channelConfig.guildId)
                    if (!guild) continue

                    const channel = await guild.channels.fetch(channelConfig.channelId).catch(() => null)
                    if (!channel) {
                        // Channel deleted, disable feed
                        await prisma.trendingChannel.update({
                            where: { id: channelConfig.id },
                            data: { enabled: false }
                        })
                        continue
                    }

                    // Delete/archive ALL threads in the forum channel (not just tracked ones)
                    // This ensures we clean up any orphaned threads from previous runs
                    try {
                        // Fetch all active threads in the channel
                        const activeThreads = await channel.threads.fetchActive()
                        
                        // Archive all active threads that match our pattern
                        let archivedCount = 0
                        for (const [threadId, thread] of activeThreads.threads) {
                            try {
                                // Check if thread title matches our pattern ([Movie] or [TV Show])
                                const threadName = thread.name.toLowerCase()
                                const isTrendingThread = threadName.startsWith('[movie]') || threadName.startsWith('[tv show]')
                                
                                if (isTrendingThread) {
                                    await thread.setArchived(true)
                                    archivedCount++
                                    console.log(`Archived thread: ${thread.name}`)
                                }
                            } catch (error) {
                                console.log(`Could not archive thread ${threadId}: ${error.message}`)
                            }
                        }
                        
                        // Also try to fetch archived threads and delete them completely if needed
                        try {
                            const archivedThreads = await channel.threads.fetchArchived({ limit: 100, fetchAll: false })
                            for (const [threadId, thread] of archivedThreads.threads) {
                                try {
                                    const threadName = thread.name.toLowerCase()
                                    const isTrendingThread = threadName.startsWith('[movie]') || threadName.startsWith('[tv show]')
                                    if (isTrendingThread) {
                                        // Try to delete the thread completely (if bot has permission)
                                        await thread.delete().catch(() => {
                                            // If delete fails, just leave it archived
                                        })
                                    }
                                } catch (error) {
                                    // Ignore errors for archived threads
                                }
                            }
                        } catch (error) {
                            // Ignore errors fetching archived threads
                        }
                        
                        console.log(`Archived ${archivedCount} trending threads in channel ${channelConfig.channelId}`)
                    } catch (error) {
                        console.log(`Could not clean up old threads for channel ${channelConfig.channelId}: ${error.message}`)
                    }

                    // Fetch latest trending
                    const response = await axios.get(`${apiBaseUrl}/api/tmdb/trending?type=${channelConfig.type}`, {
                        timeout: 10000
                    })

                    if (!response.data || !response.data.results) {
                        console.error(`Failed to fetch trending ${channelConfig.type} for channel ${channelConfig.channelId}`)
                        continue
                    }

                    const items = response.data.results.slice(0, 10)
                    const newItemIds = []
                    
                    // Create new forum posts
                    for (const item of items) {
                        const messageContent = await createTrendingItemMessage(item, channelConfig.type, apiBaseUrl)
                        const result = await sendTrendingItem(channel, messageContent, item, channelConfig.type)
                        newItemIds.push({
                            id: result.id,
                            isThread: true
                        })
                        
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 500))
                    }

                    // Update database with new item IDs
                    await prisma.trendingChannel.update({
                        where: { id: channelConfig.id },
                        data: {
                            messageId: JSON.stringify(newItemIds),
                            lastUpdate: new Date()
                        }
                    })

                    // Small delay between channels
                    await new Promise(resolve => setTimeout(resolve, 1000))
                } catch (error) {
                    console.error(`Error cleaning up channel ${channelConfig.channelId}:`, error)
                }
            }

            message.reply(`✅ Successfully cleaned up and recreated ${channels.length} trending feed${channels.length === 1 ? '' : 's'}!`)
        } catch (error) {
            console.error('Cleanup trending error:', error)
            message.reply(`❌ Error cleaning up trending feeds: ${error.message}`)
        }
    }
}

