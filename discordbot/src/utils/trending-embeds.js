const axios = require('axios')

/**
 * Create markdown formatted message for a trending item
 */
async function createTrendingItemMessage(item, type, apiBaseUrl) {
    const title = item.title || item.name
    const displayTitle = type === 'tv' ? `[TV Show] ${title}` : `[Movie] ${title}`
    const overview = item.overview || 'No description available.'
    const releaseDate = item.release_date || item.first_air_date
    const voteAverage = item.vote_average?.toFixed(1) || 'N/A'
    const voteCount = item.vote_count?.toLocaleString() || '0'
    
    // Fetch detailed info for more data
    let details = null
    try {
        // Fix: use singular 'movie' not 'movies' for API
        const apiType = type === 'movies' ? 'movie' : type
        const detailsRes = await axios.get(`${apiBaseUrl}/api/tmdb/details`, {
            params: { 
                id: item.id, 
                type: apiType 
            },
            timeout: 10000 // Increased timeout
        })
        details = detailsRes.data
    } catch (error) {
        console.error(`Failed to fetch details for ${item.id}:`, error.message)
        // Continue with basic info if details fetch fails
    }

    // Build the markdown message with clean, minimalistic formatting
    let message = `# **${displayTitle}**\n\n`
    
    // Description in block quote (bold)
    message += `> **${overview.substring(0, 400) + (overview.length > 400 ? '...' : '')}**\n\n`
    
    // Info section using code blocks and bold (clean, no emojis)
    message += `**Rating:** \`${voteAverage}/10\` (\`${voteCount}\` votes)\n`
    message += `**Release Date:** \`${releaseDate ? new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}\`\n`

    // Add TV-specific info
    if (type === 'tv' && details) {
        const status = details.status || 'Unknown'
        const isAiring = status === 'Returning Series' || status === 'In Production'
        const endDate = details.last_air_date
        
        if (isAiring) {
            message += `**Status:** \`Currently Airing\`\n`
        } else {
            message += `**Status:** \`Not Airing\`\n`
            if (endDate) {
                message += `**Ended:** \`${new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\`\n`
            }
        }

        if (details.number_of_seasons) {
            message += `**Seasons:** \`${details.number_of_seasons}\`\n`
        }
        if (details.number_of_episodes) {
            message += `**Episodes:** \`${details.number_of_episodes}\`\n`
        }
    }

    // Add movie-specific info
    if ((type === 'movie' || type === 'movies') && details) {
        const runtime = details.runtime
        if (runtime) {
            const hours = Math.floor(runtime / 60)
            const minutes = runtime % 60
            message += `**Runtime:** \`${hours}h ${minutes}m\`\n`
        }
    }

    // Add genres if available
    if (details?.genres && details.genres.length > 0) {
        const genres = details.genres.slice(0, 3).map(g => g.name).join(', ')
        message += `**Genres:** \`${genres}\`\n`
    }
    
    message += `\n`
    
    // Watch link (Discord will generate rich preview with backdrop image automatically)
    // Use production URL for watch links (Discord can't access localhost)
    const watchUrl = `https://reminiscent.cc/watch/${item.id}?type=${type === 'movies' ? 'movie' : type}`
    message += `**Watch:** ${watchUrl}`

    return message
}

/**
 * Get poster URL for forum card thumbnail
 */
function getPosterUrl(item) {
    if (item.poster_path) {
        return `https://image.tmdb.org/t/p/w500${item.poster_path}`
    }
    return null
}

module.exports = {
    createTrendingItemMessage,
    getPosterUrl
}

