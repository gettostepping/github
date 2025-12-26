const { isOwner, isServerOwnerOrBotOwner } = require('../../utils/permissions')
const { getAdminRoles, setAdminRoles } = require('../../utils/permissions')

module.exports = {
    name: 'adminroles',
    description: 'Manage Discord admin roles for this server (Server Owner or Bot Owner Only)',
    usage: '<prefix>adminroles [add/remove/list] [role]',
    dir: "reminiscent",
    aliases: ['aroles', 'adminrole'],
    cooldown: 2,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return

        // Server owner or bot owner only
        if (!isServerOwnerOrBotOwner(message)) {
            return message.reply("❌ This command is restricted to server owner or bot owner only.")
        }

        const action = args[0]?.toLowerCase()
        const roleMention = args[1]

        if (!action || !['add', 'remove', 'list'].includes(action)) {
            return message.reply("❌ Usage: `?adminroles [add/remove/list] [role]`\nExample: `?adminroles add @Admin`")
        }

        const guildId = message.guild.id

        try {
            if (action === 'list') {
                const roles = await getAdminRoles(guildId)
                if (roles.length === 0) {
                    return message.reply("📋 No admin roles configured for this server.")
                }

                const roleNames = roles.map(roleId => {
                    const role = message.guild.roles.cache.get(roleId)
                    return role ? role.name : `Unknown (${roleId})`
                }).join(', ')

                return message.reply(`📋 **Admin Roles for this server:**\n${roleNames}`)
            }

            if (!roleMention) {
                return message.reply("❌ Please provide a role ID. Example: `?adminroles add 123456789012345678`\n💡 To get a role ID: Right-click role → Copy ID (Developer Mode must be enabled)")
            }

            // Extract role ID from mention or use directly
            const roleIdMatch = roleMention.match(/<@&(\d+)>/)
            const roleId = roleIdMatch ? roleIdMatch[1] : roleMention

            // Validate it's a valid Discord ID (18-19 digits)
            if (!/^\d{17,19}$/.test(roleId)) {
                return message.reply("❌ Invalid role ID format. Please provide a valid Discord role ID (18-19 digits).")
            }

            const role = message.guild.roles.cache.get(roleId)
            if (!role) {
                return message.reply("❌ Role not found. Please check the role ID is correct and the role exists in this server.")
            }

            const currentRoles = await getAdminRoles(guildId)

            if (action === 'add') {
                if (currentRoles.includes(roleId)) {
                    return message.reply(`✅ Role ${role.name} is already an admin role.`)
                }

                const newRoles = [...currentRoles, roleId]
                await setAdminRoles(guildId, newRoles)
                return message.reply(`✅ Added ${role.name} as an admin role.`)
            }

            if (action === 'remove') {
                if (!currentRoles.includes(roleId)) {
                    return message.reply(`❌ Role ${role.name} is not an admin role.`)
                }

                const newRoles = currentRoles.filter(id => id !== roleId)
                await setAdminRoles(guildId, newRoles)
                return message.reply(`✅ Removed ${role.name} from admin roles.`)
            }
        } catch (error) {
            console.error('Admin roles error:', error)
            message.reply(`❌ Error: ${error.message}`)
        }
    }
}

