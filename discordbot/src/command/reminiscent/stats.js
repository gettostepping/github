const axios = require('axios')
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js')
const { isWebsiteAdmin } = require('../../utils/permissions')

module.exports = {
    name: 'stats',
    description: 'View comprehensive user statistics (Website Admin Only)',
    usage: '<prefix>stats [uid]',
    dir: "reminiscent",
    aliases: ['statistics'],
    cooldown: 1,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return

        // Check website admin permission (invasive command)
        if (!await isWebsiteAdmin(client, message)) {
            return message.reply("❌ This command requires admin, developer, or owner role on reminiscent.cc")
        }

        const uid = args[0]
        if (!uid) {
            return message.reply("❌ Please provide a UID. Usage: `?stats [uid]`")
        }

        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'
        const apiKey = client.config.apikey

        try {
            // Get user profile
            const profileRes = await axios.get(`${apiBaseUrl}/api/profiles`, {
                params: { uid },
                headers: { 'Authorization': `Bearer ${apiKey}` },
                timeout: 10000
            })

            if (!profileRes.data || !profileRes.data.user) {
                return message.reply(`❌ User not found with UID: ${uid}`)
            }

            const data = profileRes.data
            const userId = data.user.id

            // Get watchlist
            const watchlistRes = await axios.get(`${apiBaseUrl}/api/watchlist`, {
                params: { userId },
                headers: { 'Authorization': `Bearer ${apiKey}` },
                timeout: 10000
            })

            const watchlist = watchlistRes.data?.items || []
            const movies = watchlist.filter(item => item.type === 'movie').length
            const tv = watchlist.filter(item => item.type === 'tv').length

            // Get ratings (if available via API)
            const ratingsCount = data.user.ratings?.length || 0
            const commentsCount = data.comments?.length || 0
            const viewsCount = data.views?.length || 0

            const statsText = 
                `> **Watchlist:** ${watchlist.length} items (${movies} movies, ${tv} TV shows)\n` +
                `> **Ratings:** ${ratingsCount}\n` +
                `> **Comments:** ${commentsCount}\n` +
                `> **Profile Views:** ${viewsCount}\n` +
                `> **Joined:** <t:${Math.floor(new Date(data.user.createdAt).getTime() / 1000)}:F>`

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`📊 **Statistics for ${data.user.name}**`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(statsText)
                )

            message.reply({ 
                flags: require('discord.js').MessageFlags.IsComponentsV2, 
                components: [container] 
            })
        } catch (error) {
            console.error('Stats command error:', error)
            message.reply(`❌ Error: ${error.message}`)
        }
    }
}

