const { EmbedBuilder } = require('discord.js')

/**
 * Create a rich embed for content items
 */
function createContentEmbed(item, index = null) {
    const embed = new EmbedBuilder()
        .setTitle(item.title || item.name)
        .setColor(0x8B5CF6) // Brand purple
    
    if (item.poster_path) {
        const posterUrl = item.poster_path.startsWith('http') 
            ? item.poster_path 
            : `https://image.tmdb.org/t/p/w500${item.poster_path}`
        embed.setThumbnail(posterUrl)
    }
    
    if (item.overview) {
        embed.setDescription(item.overview.substring(0, 200) + (item.overview.length > 200 ? '...' : ''))
    }
    
    if (item.release_date || item.first_air_date) {
        const date = item.release_date || item.first_air_date
        embed.addFields({ name: 'Release Date', value: new Date(date).getFullYear().toString(), inline: true })
    }
    
    if (item.vote_average) {
        embed.addFields({ name: 'Rating', value: `⭐ ${item.vote_average.toFixed(1)}/10`, inline: true })
    }
    
    if (item.media_type) {
        embed.addFields({ name: 'Type', value: item.media_type.toUpperCase(), inline: true })
    }
    
    if (index !== null) {
        embed.setFooter({ text: `Result ${index + 1}` })
    }
    
    return embed
}

/**
 * Create trending embed
 */
function createTrendingEmbed(items, type) {
    const embed = new EmbedBuilder()
        .setTitle(`🔥 Trending ${type === 'movies' ? 'Movies' : 'TV Shows'}`)
        .setColor(0x8B5CF6)
        .setTimestamp()
    
    const description = items.slice(0, 10).map((item, index) => {
        const title = item.title || item.name
        const year = item.release_date ? new Date(item.release_date).getFullYear() : 
                     item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A'
        const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : 'N/A'
        return `${index + 1}. **${title}** (${year}) ${rating}`
    }).join('\n')
    
    embed.setDescription(description)
    embed.setFooter({ text: `Updated hourly • ${items.length} items` })
    
    return embed
}

module.exports = {
    createContentEmbed,
    createTrendingEmbed
}

