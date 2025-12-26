const axios = require('axios')
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js')
const { isWebsiteAdmin } = require('../../utils/permissions')

module.exports = {
    name: 'compare',
    description: 'Compare two users\' watchlists (Website Admin Only)',
    usage: '<prefix>compare [uid1] [uid2]',
    dir: "reminiscent",
    aliases: ['comp'],
    cooldown: 1,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return

        // Check website admin permission (invasive command)
        if (!await isWebsiteAdmin(client, message)) {
            return message.reply("❌ This command requires admin, developer, or owner role on reminiscent.cc")
        }

        const uid1 = args[0]
        const uid2 = args[1]

        if (!uid1 || !uid2) {
            return message.reply("❌ Please provide two UIDs. Usage: `?compare [uid1] [uid2]`")
        }

        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'
        const apiKey = client.config.apikey

        try {
            // Get both users' profiles and watchlists
            const [user1Res, user2Res] = await Promise.all([
                axios.get(`${apiBaseUrl}/api/profiles`, {
                    params: { uid: uid1 },
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    timeout: 10000
                }),
                axios.get(`${apiBaseUrl}/api/profiles`, {
                    params: { uid: uid2 },
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    timeout: 10000
                })
            ])

            if (!user1Res.data?.user || !user2Res.data?.user) {
                return message.reply("❌ One or both users not found.")
            }

            const userId1 = user1Res.data.user.id
            const userId2 = user2Res.data.user.id

            // Get both watchlists
            const [watchlist1Res, watchlist2Res] = await Promise.all([
                axios.get(`${apiBaseUrl}/api/watchlist`, {
                    params: { userId: userId1 },
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    timeout: 10000
                }),
                axios.get(`${apiBaseUrl}/api/watchlist`, {
                    params: { userId: userId2 },
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    timeout: 10000
                })
            ])

            const watchlist1 = watchlist1Res.data?.items || []
            const watchlist2 = watchlist2Res.data?.items || []

            // Find common items
            const set1 = new Set(watchlist1.map(item => item.tmdbId))
            const set2 = new Set(watchlist2.map(item => item.tmdbId))
            const common = watchlist1.filter(item => set2.has(item.tmdbId))
            const unique1 = watchlist1.filter(item => !set2.has(item.tmdbId))
            const unique2 = watchlist2.filter(item => !set1.has(item.tmdbId))

            // Calculate compatibility score
            const total = watchlist1.length + watchlist2.length
            const compatibility = total > 0 ? Math.round((common.length * 2 / total) * 100) : 0

            const comparisonText = 
                `**${user1Res.data.user.name}** vs **${user2Res.data.user.name}**\n\n` +
                `> **Common Interests:** ${common.length} items\n` +
                `> **${user1Res.data.user.name} Only:** ${unique1.length} items\n` +
                `> **${user2Res.data.user.name} Only:** ${unique2.length} items\n` +
                `> **Compatibility Score:** ${compatibility}%`

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent("🔀 User Comparison")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(comparisonText)
                )

            message.reply({ 
                flags: require('discord.js').MessageFlags.IsComponentsV2, 
                components: [container] 
            })
        } catch (error) {
            console.error('Compare command error:', error)
            message.reply(`❌ Error: ${error.message}`)
        }
    }
}

