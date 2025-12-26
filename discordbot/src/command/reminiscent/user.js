const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const axios = require('axios');

module.exports = {
    name: 'user',
    description: 'Get user information from reminiscent.cc',
    usage: '<prefix>user [uid]', //OPTIONAL (for the help cmd)
    dir: "reminiscent",
    aliases: [],
    cooldown: 0.1, // Cooldown in seconds, by default it's 2 seconds | OPTIONAL
    permissions: [], // OPTIONAL
    
    run :async (client, message, args) => {   
        if (message.author.bot || !message.guild) return;
        
        // Check website admin permission (invasive command)
        const { isWebsiteAdmin } = require('../../utils/permissions');
        if (!await isWebsiteAdmin(client, message)) {
            return message.reply("❌ This command requires admin, developer, or owner role on reminiscent.cc");
        }
        
        const uid = args[0];
        if (!uid) return message.reply("Please provide a UID or Username!");

        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000';
        const apiKey = client.config.apikey;

        if (!apiKey) {
            return message.reply("❌ API key not configured! Please set it in config.js");
        }

        try {
            // Fetch user profile
            const profileRes = await axios.get(`${apiBaseUrl}/api/profiles`, {
                params: { uid: uid },
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 10000 // 10 second timeout
            });

            if (!profileRes.data || !profileRes.data.user) {
                return message.reply(`❌ User not found or error: ${profileRes.statusText || 'Unknown error'}`);
            }

            const data = profileRes.data;

            // Fetch user's watchlist using the new API endpoint
            let watchData = { items: [] };
            try {
                const watchlistRes = await axios.get(`${apiBaseUrl}/api/watchlist`, {
                    params: { userId: data.user.id },
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    timeout: 10000
                });
                
                if (watchlistRes.data && watchlistRes.data.items) {
                    watchData = watchlistRes.data;
                }
            } catch (watchlistError) {
                // Watchlist fetch failed, but continue with profile data
                console.error('Watchlist fetch error:', watchlistError.message);
            }
            
            const discordLine = data.user.discordId ? `> **Discord:** <@${data.user.discordId}>\n` : "";
            const lastActive = data.profile?.lastActiveAt;
            const formattedActive = lastActive 
                ? `<t:${Math.floor(new Date(lastActive).getTime() / 1000)}:F>`
                : 'Never';

            let lastWatched = 'N/A';
            let lastWatchedButton = null;

            // Only show last watched if watchlist has items
            if (watchData.items && watchData.items.length > 0) {
                const firstItem = watchData.items[0];
                if (firstItem.type === 'tv' && firstItem.lastSeason && firstItem.lastEpisode) {
                    lastWatched = `${firstItem.title} (Season ${firstItem.lastSeason}, Episode ${firstItem.lastEpisode})`;
                } else {
                    lastWatched = firstItem.title;
                }
                
                // Create button for last watched item
                lastWatchedButton = new ButtonBuilder()
                    .setLabel('Last Watched')
                    .setStyle(5) // Link button
                    .setURL(`https://reminiscent.cc/watch/${firstItem.tmdbId}?type=${firstItem.type}`);
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('**Reminiscent User Information**')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            `> **Username:** ${data.user.name || 'N/A'}\n` +
                            `> **UID:** ${data.user.uid || 'N/A'}\n` +
                            `${discordLine}` +
                            `> **Last Active:** ${formattedActive}\n` +
                            `> **Last Watched:** ${lastWatched}\n`
                        )
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(data.user.image || 'https://reminiscent.cc/noprofilepicture.jpg')
                        )
                );

            // Add buttons
            const buttons = [
                new ButtonBuilder()
                    .setLabel('View Profile')
                    .setStyle(5) // Link button
                    .setURL(`https://reminiscent.cc/u/${data.user.uid}`)
            ];

            if (lastWatchedButton) {
                buttons.push(lastWatchedButton);
            }

            container.addActionRowComponents(
                new ActionRowBuilder().addComponents(...buttons)
            );

            message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        } catch (error) {
            console.error('User command error:', error);
            if (error.response) {
                // API error response
                const status = error.response.status;
                const statusText = error.response.statusText;
                if (status === 401 || status === 403) {
                    return message.reply(`❌ Authentication failed. Please check your API key in config.js`);
                } else if (status === 404) {
                    return message.reply(`❌ User not found with UID/Username: ${uid}`);
                } else {
                    return message.reply(`❌ API Error (${status}): ${statusText}`);
                }
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                return message.reply(`❌ Could not connect to ${apiBaseUrl}. Is the server running?`);
            } else {
                return message.reply(`❌ An error occurred: ${error.message || 'Unknown error'}`);
            }
        }
    }
}