const { EmbedBuilder, ChannelType } = require('discord.js')

/**
 * Check if channel is a forum channel
 */
function isForumChannel(channel) {
    return channel.type === ChannelType.GuildForum || channel.type === 15
}

/**
 * Get or create forum tags for a channel
 */
async function getForumTags(channel, type) {
    if (!isForumChannel(channel)) return []
    
    const availableTags = channel.availableTags || []
    const tags = []
    
    // Find or create tags
    const typeTag = availableTags.find(t => t.name.toLowerCase() === type) || 
                   availableTags.find(t => t.name.toLowerCase() === (type === 'movie' ? 'movies' : 'tv'))
    
    if (typeTag) tags.push(typeTag.id)
    
    // Look for "Currently Airing" tag for TV
    if (type === 'tv') {
        const airingTag = availableTags.find(t => 
            t.name.toLowerCase().includes('airing') || 
            t.name.toLowerCase().includes('active')
        )
        if (airingTag) tags.push(airingTag.id)
    }
    
    return tags
}

/**
 * Send trending item to forum channel (markdown formatted)
 */
async function sendTrendingItem(channel, messageContent, item, type) {
    if (!isForumChannel(channel)) {
        throw new Error('Channel must be a forum channel')
    }
    
    // Create forum post with markdown message
    const title = type === 'tv' 
        ? `[TV Show] ${(item.title || item.name).substring(0, 90)}` // Reserve space for prefix
        : `[Movie] ${(item.title || item.name).substring(0, 92)}` // Reserve space for prefix
    const tags = await getForumTags(channel, type)
    
    try {
        const threadOptions = {
            name: title,
            message: {
                content: messageContent
            },
            appliedTags: tags,
            reason: 'Trending content feed'
        }
        
        const thread = await channel.threads.create(threadOptions)
        
        // Get the starter message
        const starterMessage = await thread.fetchStarterMessage().catch(() => null)
        
        return {
            id: thread.id,
            isThread: true,
            firstMessage: starterMessage
        }
    } catch (error) {
        console.error('Error creating forum post:', error)
        throw error
    }
}

/**
 * Update trending item (edit first message in thread)
 */
async function updateTrendingItem(channel, itemId, messageContent) {
    try {
        // Get thread and edit first message
        const thread = await channel.threads.fetch(itemId)
        if (!thread) return false
        
        // Get the starter message (the one that created the thread)
        const firstMessage = await thread.fetchStarterMessage().catch(() => null)
        
        if (firstMessage) {
            await firstMessage.edit({
                content: messageContent
            })
            return true
        }
    } catch (error) {
        console.error(`Error updating trending item ${itemId}:`, error.message)
        return false
    }
    return false
}

/**
 * Delete trending item (archive thread)
 */
async function deleteTrendingItem(channel, itemId) {
    try {
        // Archive the thread
        const thread = await channel.threads.fetch(itemId)
        if (thread) {
            await thread.setArchived(true)
            return true
        }
    } catch (error) {
        // Item already deleted or doesn't exist
        return false
    }
    return false
}

module.exports = {
    isForumChannel,
    getForumTags,
    sendTrendingItem,
    updateTrendingItem,
    deleteTrendingItem
}

