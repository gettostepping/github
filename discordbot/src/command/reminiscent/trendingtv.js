const axios = require('axios')
const prisma = require('../../utils/database')

module.exports = {
    name: 'trendingtv',
    description: 'Enable/disable hourly trending TV shows feed in a forum channel',
    usage: '<prefix>trendingtv [channelId]',
    dir: "reminiscent",
    aliases: ['trendingshows', 'ttv', 'tshows'],
    cooldown: 2,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return

        // Check server owner or bot owner permission
        const { isServerOwnerOrBotOwner } = require('../../utils/permissions')
        if (!isServerOwnerOrBotOwner(message)) {
            return message.reply("❌ This command requires server owner or bot owner permission.")
        }

        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'
        const guildId = message.guild.id
        
        // Get channel ID from args or ask for it
        let channelId = args[0]
        
        if (!channelId) {
            return message.reply("❌ Please provide a forum channel ID.\nUsage: `?trendingtv [channelId]`\n💡 To get channel ID: Right-click forum channel → Copy ID (Developer Mode must be enabled)")
        }

        // Validate channel ID format
        if (!/^\d{17,19}$/.test(channelId)) {
            return message.reply("❌ Invalid channel ID format. Please provide a valid Discord channel ID (18-19 digits).")
        }

        try {
            // Fetch the channel
            const targetChannel = await message.guild.channels.fetch(channelId).catch(() => null)
            if (!targetChannel) {
                return message.reply("❌ Channel not found. Please check the channel ID and make sure the bot can see the channel.")
            }

            // Check if it's a forum channel
            const { isForumChannel } = require('../../utils/forum-helpers')
            if (!isForumChannel(targetChannel)) {
                return message.reply("❌ The specified channel is not a forum channel. Please provide a forum channel ID.")
            }

            // Check if channel already has trending TV enabled
            const existing = await prisma.trendingChannel.findUnique({
                where: {
                    guildId_channelId_type: {
                        guildId,
                        channelId,
                        type: 'tv'
                    }
                }
            })

            if (existing && existing.enabled) {
                // Disable
                await prisma.trendingChannel.update({
                    where: { id: existing.id },
                    data: { enabled: false }
                })
                return message.reply(`✅ Trending TV shows feed disabled in <#${channelId}>.`)
            }

            // Enable - fetch and send current trending
            const response = await axios.get(`${apiBaseUrl}/api/tmdb/trending?type=tv`, {
                timeout: 10000
            })

            if (!response.data || !response.data.results) {
                return message.reply("❌ Failed to fetch trending TV shows.")
            }

            const shows = response.data.results.slice(0, 10)
            
            // Send individual forum posts for each show
            const { createTrendingItemMessage } = require('../../utils/trending-embeds')
            const { sendTrendingItem } = require('../../utils/forum-helpers')
            const itemIds = []
            
            message.reply(`🔄 Creating forum posts in <#${channelId}>...`)
            
            for (const show of shows) {
                const messageContent = await createTrendingItemMessage(show, 'tv', apiBaseUrl)
                
                const result = await sendTrendingItem(targetChannel, messageContent, show, 'tv')
                itemIds.push({
                    id: result.id,
                    isThread: true
                })
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            // Store in database (store array of item IDs with thread info as JSON)
            await prisma.trendingChannel.upsert({
                where: {
                    guildId_channelId_type: {
                        guildId,
                        channelId,
                        type: 'tv'
                    }
                },
                update: {
                    enabled: true,
                    messageId: JSON.stringify(itemIds),
                    lastUpdate: new Date()
                },
                create: {
                    guildId,
                    channelId,
                    type: 'tv',
                    enabled: true,
                    messageId: JSON.stringify(itemIds),
                    lastUpdate: new Date()
                }
            })

            message.reply(`✅ Trending TV shows feed enabled in <#${channelId}>! Created ${shows.length} forum posts. Updates every hour automatically.`)
        } catch (error) {
            console.error('Trending TV error:', error)
            message.reply(`❌ Error: ${error.message}`)
        }
    }
}

