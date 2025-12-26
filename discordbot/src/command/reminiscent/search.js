const axios = require('axios')
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const prisma = require('../../utils/database')

// Store active searches per user
const activeSearches = new Map()

module.exports = {
    name: 'search',
    description: 'Search for movies and TV shows',
    usage: '<prefix>search [query]',
    dir: "reminiscent",
    aliases: ['find', 's'],
    cooldown: 1,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return

        const query = args.join(' ')
        
        if (!query || query.length < 2) {
            return message.reply("❌ Please provide a search query (at least 2 characters). Usage: `?search [query]`")
        }

        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'

        try {
            // Check cache first
            const cached = await prisma.searchCache.findFirst({
                where: {
                    query: query.toLowerCase(),
                    type: 'all',
                    expiresAt: { gt: new Date() }
                }
            })

            let results = []
            if (cached && cached.results) {
                results = cached.results
            } else {
                // Fetch from API
                const response = await axios.get(`${apiBaseUrl}/api/tmdb/search`, {
                    params: { q: query, type: 'all' },
                    timeout: 10000
                })

                if (!response.data || !response.data.results || response.data.results.length === 0) {
                    return message.reply(`❌ No results found for "${query}"`)
                }

                results = response.data.results.slice(0, 10)

                // Cache for 5 minutes
                await prisma.searchCache.create({
                    data: {
                        query: query.toLowerCase(),
                        type: 'all',
                        results: results,
                        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
                    }
                })
            }

            // Create embed with results list
            const embed = new EmbedBuilder()
                .setTitle(`🔍 Search Results for "${query}"`)
                .setColor(0x8B5CF6)
                .setDescription(
                    results.map((item, index) => {
                        const title = item.title || item.name
                        const year = item.release_date 
                            ? new Date(item.release_date).getFullYear() 
                            : item.first_air_date 
                                ? new Date(item.first_air_date).getFullYear() 
                                : 'N/A'
                        const type = item.media_type === 'tv' ? '📺 TV' : '🎬 Movie'
                        return `${index + 1}. **${title}** (${year}) ${type}`
                    }).join('\n')
                )
                .setFooter({ text: 'Type a number (1-10) to view details, or type "cancel" to cancel' })
                .setTimestamp()

            // Add thumbnail from first result if available
            if (results[0]?.poster_path) {
                embed.setThumbnail(`https://image.tmdb.org/t/p/w500${results[0].poster_path}`)
            }

            const sentMessage = await message.reply({ embeds: [embed] })

            // Store active search
            activeSearches.set(message.author.id, {
                results,
                messageId: sentMessage.id,
                channelId: message.channel.id,
                expiresAt: Date.now() + 60000 // 1 minute timeout
            })

            // Set up message collector
            const filter = (msg) => msg.author.id === message.author.id && msg.channel.id === message.channel.id
            const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 })

            collector.on('collect', async (msg) => {
                const input = msg.content.trim().toLowerCase()
                
                // Cancel
                if (input === 'cancel') {
                    activeSearches.delete(message.author.id)
                    collector.stop()
                    return msg.reply("❌ Search cancelled.")
                }

                // Parse number
                const num = parseInt(input)
                if (isNaN(num) || num < 1 || num > results.length) {
                    return msg.reply(`❌ Please enter a number between 1 and ${results.length}, or "cancel" to cancel.`)
                }

                const selected = results[num - 1]
                activeSearches.delete(message.author.id)
                collector.stop()

                // Fetch detailed info
                try {
                    const detailsRes = await axios.get(`${apiBaseUrl}/api/tmdb/details`, {
                        params: { 
                            id: selected.id, 
                            type: selected.media_type || 'movie' 
                        },
                        timeout: 10000
                    })

                    const details = detailsRes.data
                    await showDetailedEmbed(client, message, details, selected.media_type || 'movie', apiBaseUrl)
                } catch (error) {
                    console.error('Error fetching details:', error)
                    msg.reply("❌ Failed to fetch detailed information. Please try again.")
                }
            })

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    activeSearches.delete(message.author.id)
                }
            })

        } catch (error) {
            console.error('Search error:', error)
            message.reply(`❌ Error searching: ${error.message}`)
        }
    }
}

async function showDetailedEmbed(client, message, details, type, apiBaseUrl) {
    const title = details.title || details.name
    const originalTitle = details.original_title || details.original_name
    const overview = details.overview || 'No overview available.'
    const releaseDate = details.release_date || details.first_air_date
    const endDate = details.last_air_date
    const runtime = details.runtime || (details.episode_run_time && details.episode_run_time[0])
    const genres = details.genres?.map(g => g.name).join(', ') || 'N/A'
    const status = details.status || 'Unknown'
    const voteAverage = details.vote_average?.toFixed(1) || 'N/A'
    const voteCount = details.vote_count?.toLocaleString() || '0'
    const productionCompanies = details.production_companies?.slice(0, 3).map(c => c.name).join(', ') || 'N/A'
    const productionCountries = details.production_countries?.map(c => c.name).join(', ') || 'N/A'
    const spokenLanguages = details.spoken_languages?.map(l => l.name).join(', ') || 'N/A'
    const tagline = details.tagline || ''
    const number_of_seasons = details.number_of_seasons
    const number_of_episodes = details.number_of_episodes

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x8B5CF6)
        .setDescription(overview.substring(0, 400) + (overview.length > 400 ? '...' : ''))
        .addFields(
            { name: '📅 Release Date', value: releaseDate ? new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A', inline: true },
            { name: '⭐ Rating', value: `${voteAverage}/10 (${voteCount} votes)`, inline: true },
            { name: '📺 Type', value: type === 'tv' ? 'TV Show' : 'Movie', inline: true }
        )

    if (originalTitle && originalTitle !== title) {
        embed.addFields({ name: '📝 Original Title', value: originalTitle, inline: false })
    }

    if (tagline) {
        embed.addFields({ name: '💬 Tagline', value: tagline, inline: false })
    }

    if (runtime) {
        const runtimeText = type === 'tv' 
            ? `${Math.floor(runtime / 60)}h ${runtime % 60}m per episode`
            : `${Math.floor(runtime / 60)}h ${runtime % 60}m`
        embed.addFields({ name: '⏱️ Runtime', value: runtimeText, inline: true })
    }

    if (type === 'tv') {
        if (number_of_seasons) {
            embed.addFields({ name: '📚 Seasons', value: number_of_seasons.toString(), inline: true })
        }
        if (number_of_episodes) {
            embed.addFields({ name: '🎬 Episodes', value: number_of_episodes.toString(), inline: true })
        }
        if (endDate) {
            embed.addFields({ name: '🏁 End Date', value: new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), inline: true })
        }
    }

    embed.addFields(
        { name: '🎭 Genres', value: genres, inline: false },
        { name: '🏢 Production', value: productionCompanies, inline: true },
        { name: '🌍 Countries', value: productionCountries, inline: true },
        { name: '🗣️ Languages', value: spokenLanguages, inline: true },
        { name: '📊 Status', value: status, inline: true }
    )

    if (details.poster_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w500${details.poster_path}`)
    }

    if (details.backdrop_path) {
        embed.setImage(`https://image.tmdb.org/t/p/w1280${details.backdrop_path}`)
    }

    embed.setFooter({ text: 'Reminiscent.cc' })
    embed.setTimestamp()

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`watchlist_add_${details.id}_${type}`)
            .setLabel('➕ Add to Watchlist')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setLabel('▶️ Watch Now')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://reminiscent.cc/watch/${details.id}?type=${type}`)
    )

    message.channel.send({ embeds: [embed], components: [row] })
}

