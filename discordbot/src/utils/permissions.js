const axios = require('axios')
const prisma = require('./database')

/**
 * Check if user is bot owner
 */
function isOwner(message) {
    const ownerIds = require('../../config').owner || []
    return ownerIds.includes(message.author.id)
}

/**
 * Check if user is server/guild owner
 */
function isServerOwner(message) {
    if (!message.guild) return false
    return message.guild.ownerId === message.author.id
}

/**
 * Check if user is server owner OR bot owner
 */
function isServerOwnerOrBotOwner(message) {
    return isServerOwner(message) || isOwner(message)
}

/**
 * Check if user has Discord admin role (per-guild)
 */
async function isDiscordAdmin(client, message) {
    if (!message.guild) return false
    
    const guildId = message.guild.id
    const member = message.member
    
    if (!member) return false
    
    try {
        // Get admin roles for this guild
        const settings = await prisma.guildSetting.findUnique({
            where: { guildId }
        })
        
        if (!settings || !settings.adminRoles || settings.adminRoles.length === 0) {
            return false // No admin roles configured
        }
        
        // Check if user has any of the admin roles
        return member.roles.cache.some(role => settings.adminRoles.includes(role.id))
    } catch (error) {
        console.error('Error checking Discord admin:', error)
        return false
    }
}

/**
 * Check if Discord user has admin/developer/owner role on website
 */
async function isWebsiteAdmin(client, message) {
    const discordId = message.author.id
    const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'
    const apiKey = client.config.apikey
    
    if (!apiKey) {
        console.error('API key not configured in config.js')
        return false
    }
    
    try {
        // Check cache first
        const cached = await prisma.roleCache.findUnique({
            where: { discordId }
        })
        
        if (cached && new Date(cached.expiresAt) > new Date()) {
            return cached.isOwner || cached.isDeveloper || cached.isAdmin
        }
        
        // Query website API
        const response = await axios.get(`${apiBaseUrl}/api/discord/verify-role`, {
            params: { discordId },
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
        })
        
        if (response.data.hasAccess && response.data.found) {
            // Cache for 5 minutes
            await prisma.roleCache.upsert({
                where: { discordId },
                update: {
                    roles: response.data.roles,
                    isOwner: response.data.isOwner,
                    isDeveloper: response.data.isDeveloper,
                    isAdmin: response.data.isAdmin,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
                },
                create: {
                    discordId,
                    roles: response.data.roles,
                    isOwner: response.data.isOwner,
                    isDeveloper: response.data.isDeveloper,
                    isAdmin: response.data.isAdmin,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
                }
            })
            
            return response.data.isOwner || response.data.isDeveloper || response.data.isAdmin
        }
    } catch (error) {
        console.error('Error checking website admin:', error.message)
    }
    
    return false
}

/**
 * Get Discord admin roles for a guild
 */
async function getAdminRoles(guildId) {
    try {
        const settings = await prisma.guildSetting.findUnique({
            where: { guildId }
        })
        return settings?.adminRoles || []
    } catch (error) {
        console.error('Error getting admin roles:', error)
        return []
    }
}

/**
 * Set Discord admin roles for a guild
 */
async function setAdminRoles(guildId, roleIds) {
    try {
        await prisma.guildSetting.upsert({
            where: { guildId },
            update: { adminRoles: roleIds },
            create: { guildId, adminRoles: roleIds }
        })
        return true
    } catch (error) {
        console.error('Error setting admin roles:', error)
        return false
    }
}

/**
 * Main permission checker
 */
async function hasPermission(client, message, level) {
    switch (level) {
        case 'owner':
            return isOwner(message)
        case 'discord_admin':
            return await isDiscordAdmin(client, message)
        case 'website_admin':
            return await isWebsiteAdmin(client, message)
        case 'public':
            return true
        default:
            return false
    }
}

module.exports = {
    isOwner,
    isServerOwner,
    isServerOwnerOrBotOwner,
    isDiscordAdmin,
    isWebsiteAdmin,
    getAdminRoles,
    setAdminRoles,
    hasPermission
}

