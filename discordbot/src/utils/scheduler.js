const axios = require('axios')
const prisma = require('./database')

/**
 * Update trending feed for a channel
 */
async function updateTrendingFeed(client, channelConfig) {
    try {
        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'
        const guild = client.guilds.cache.get(channelConfig.guildId)
        if (!guild) return

        const channel = guild.channels.cache.get(channelConfig.channelId)
        if (!channel) {
            // Channel deleted, disable feed
            await prisma.trendingChannel.update({
                where: { id: channelConfig.id },
                data: { enabled: false }
            })
            return
        }

        // Fetch latest trending
        const response = await axios.get(`${apiBaseUrl}/api/tmdb/trending?type=${channelConfig.type}`, {
            timeout: 10000
        })

        if (!response.data || !response.data.results) {
            console.error(`Failed to fetch trending ${channelConfig.type} for channel ${channelConfig.channelId}`)
            return
        }

        const items = response.data.results.slice(0, 10)
        
        const { deleteTrendingItem, sendTrendingItem } = require('./forum-helpers')
        
        // Archive old threads if they exist
        if (channelConfig.messageId) {
            try {
                const itemIds = JSON.parse(channelConfig.messageId)
                if (Array.isArray(itemIds)) {
                    for (const itemData of itemIds) {
                        const itemId = typeof itemData === 'string' ? itemData : itemData.id
                        await deleteTrendingItem(channel, itemId)
                    }
                } else {
                    // Legacy single message ID
                    await deleteTrendingItem(channel, channelConfig.messageId)
                }
            } catch (error) {
                console.log(`Could not archive old threads: ${error.message}`)
            }
        }

        // Send individual forum posts for each item
        const { createTrendingItemMessage } = require('./trending-embeds')
        const newItemIds = []
        
        for (const item of items) {
            // Fix: convert 'movies' to 'movie' for API calls
            const apiType = channelConfig.type === 'movies' ? 'movies' : channelConfig.type
            const messageContent = await createTrendingItemMessage(item, apiType, apiBaseUrl)
            
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
    } catch (error) {
        console.error(`Error updating trending feed for channel ${channelConfig.channelId}:`, error)
    }
}

/**
 * Start the trending feed scheduler
 */
function startScheduler(client) {
    // Run every hour
    setInterval(async () => {
        try {
            const channels = await prisma.trendingChannel.findMany({
                where: { enabled: true }
            })

            console.log(`🔄 Updating ${channels.length} trending feeds...`)
            
            for (const channel of channels) {
                await updateTrendingFeed(client, channel)
                // Small delay between updates to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        } catch (error) {
            console.error('Error in trending scheduler:', error)
        }
    }, 3600000) // Every hour

    console.log('✅ Trending feed scheduler started (updates every hour)')
}

module.exports = {
    startScheduler,
    updateTrendingFeed
}

