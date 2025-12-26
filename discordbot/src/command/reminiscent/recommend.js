const axios = require('axios')
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

module.exports = {
    name: 'recommend',
    description: 'Get personalized recommendations for a user',
    usage: '<prefix>recommend [uid]',
    dir: "reminiscent",
    aliases: ['rec', 'suggest'],
    cooldown: 2,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return

        const uid = args[0]
        if (!uid) {
            return message.reply("❌ Please provide a UID. Usage: `?recommend [uid]`")
        }

        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'
        const apiKey = client.config.apikey

        try {
            // Get user's watchlist to find recommendations
            const profileRes = await axios.get(`${apiBaseUrl}/api/profiles`, {
                params: { uid: uid },
                headers: { 'Authorization': `Bearer ${apiKey}` },
                timeout: 10000
            })

            if (!profileRes.data || !profileRes.data.user) {
                return message.reply(`❌ User not found with UID: ${uid}`)
            }

            const userId = profileRes.data.user.id

            // Get watchlist
            const watchlistRes = await axios.get(`${apiBaseUrl}/api/watchlist`, {
                params: { userId },
                headers: { 'Authorization': `Bearer ${apiKey}` },
                timeout: 10000
            })

            const watchlist = watchlistRes.data?.items || []
            
            if (watchlist.length === 0) {
                return message.reply(`❌ User has no items in watchlist to generate recommendations.`)
            }

            // Get recommendations based on first item in watchlist
            const firstItem = watchlist[0]
            const recommendationsRes = await axios.get(`${apiBaseUrl}/api/tmdb/recommendations`, {
                params: { 
                    tmdbId: firstItem.tmdbId,
                    type: firstItem.type
                },
                timeout: 10000
            })

            const recommendations = recommendationsRes.data?.results || []
            
            if (recommendations.length === 0) {
                return message.reply(`❌ No recommendations found based on user's watchlist.`)
            }

            const top5 = recommendations.slice(0, 5)
            const recList = top5.map((item, index) => {
                const title = item.title || item.name
                const year = item.release_date ? new Date(item.release_date).getFullYear() :
                           item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A'
                const type = item.media_type === 'tv' ? '📺 TV' : '🎬 Movie'
                return `${index + 1}. **${title}** (${year}) ${type}`
            }).join('\n')

            const embed = new EmbedBuilder()
                .setTitle(`💡 Recommendations for ${profileRes.data.user.name}`)
                .setColor(0x8B5CF6)
                .setDescription(`Based on: **${firstItem.title}**\n\n${recList}`)
                .setFooter({ text: `UID: ${uid}` })
                .setTimestamp()

            if (top5[0]?.poster_path) {
                embed.setThumbnail(`https://image.tmdb.org/t/p/w500${top5[0].poster_path}`)
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('View on Reminiscent')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://reminiscent.cc/${firstItem.type === 'movie' ? 'movies' : 'tv'}`)
            )

            message.reply({ embeds: [embed], components: [row] })
        } catch (error) {
            console.error('Recommend error:', error)
            message.reply(`❌ Error getting recommendations: ${error.message}`)
        }
    }
}

