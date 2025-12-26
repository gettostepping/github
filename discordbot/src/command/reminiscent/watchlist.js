const axios = require('axios')
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { isWebsiteAdmin } = require('../../utils/permissions')

module.exports = {
    name: 'watchlist',
    description: 'View a user\'s watchlist (Website Admin Only)',
    usage: '<prefix>watchlist [uid]',
    dir: "reminiscent",
    aliases: ['wl'],
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
            return message.reply("❌ Please provide a UID. Usage: `?watchlist [uid]`")
        }

        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'
        const apiKey = client.config.apikey

        try {
            // Get user profile first
            const profileRes = await axios.get(`${apiBaseUrl}/api/profiles`, {
                params: { uid },
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

            const items = watchlistRes.data?.items || []

            if (items.length === 0) {
                return message.reply(`📋 **${profileRes.data.user.name}'s Watchlist**\n\nEmpty - no items in watchlist.`)
            }

            // Show first 10 items
            const displayItems = items.slice(0, 10)
            const watchlistList = displayItems.map((item, index) => {
                let progress = ''
                if (item.type === 'tv' && item.lastSeason && item.lastEpisode) {
                    progress = ` (S${item.lastSeason}E${item.lastEpisode})`
                }
                return `${index + 1}. **${item.title}**${progress}`
            }).join('\n')

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`📋 **${profileRes.data.user.name}'s Watchlist** (${items.length} items)`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(watchlistList)
                )

            if (items.length > 10) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`\n... and ${items.length - 10} more item${items.length - 10 === 1 ? '' : 's'}`)
                )
            }

            message.reply({ 
                flags: require('discord.js').MessageFlags.IsComponentsV2, 
                components: [container] 
            })
        } catch (error) {
            console.error('Watchlist command error:', error)
            message.reply(`❌ Error: ${error.message}`)
        }
    }
}

