const prisma = require('../../utils/database')
const { updateTrendingFeed } = require('../../utils/scheduler')

module.exports = {
    name: 'updatetrending',
    description: 'Manually update trending feeds (deletes old posts and creates new ones)',
    usage: '<prefix>updatetrending [type]',
    dir: "reminiscent",
    aliases: ['utrending', 'refresh'],
    cooldown: 5,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return

        // Check server owner or bot owner permission
        const { isServerOwnerOrBotOwner } = require('../../utils/permissions')
        if (!isServerOwnerOrBotOwner(message)) {
            return message.reply("❌ This command requires server owner or bot owner permission.")
        }

        const type = args[0]?.toLowerCase() // 'movies', 'tv', or empty for all
        const guildId = message.guild.id

        try {
            // Get enabled channels
            const whereClause = { 
                enabled: true,
                guildId: guildId
            }
            
            if (type && (type === 'movies' || type === 'tv')) {
                whereClause.type = type
            }

            const channels = await prisma.trendingChannel.findMany({
                where: whereClause
            })

            if (channels.length === 0) {
                return message.reply(`❌ No active trending feeds found${type ? ` for ${type}` : ''}.`)
            }

            message.reply(`🔄 Updating ${channels.length} trending feed${channels.length === 1 ? '' : 's'} (deleting old posts and creating new ones)...`)

            // Update each channel (this will delete old posts and create new ones)
            for (const channelConfig of channels) {
                await updateTrendingFeed(client, channelConfig)
                // Small delay between updates
                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            message.reply(`✅ Successfully updated ${channels.length} trending feed${channels.length === 1 ? '' : 's'}! Old posts deleted and new ones created.`)
        } catch (error) {
            console.error('Update trending error:', error)
            message.reply(`❌ Error updating trending feeds: ${error.message}`)
        }
    }
}

