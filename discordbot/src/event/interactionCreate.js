const { Collection } = require('discord.js');
const axios = require('axios');
const renderNowPlaying = require('../../src/utils/renderNowPlaying');
const getMusicMessage = require('../../src/utils/getMusicMessage');
const { MessageFlags } = require('discord.js');

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * @param {import('discord.js').Client} client 
 * @param {import('discord.js').Interaction} interaction
 */
module.exports = async (client, interaction) => {
    const defaultCooldownAmount = 2;
    const player = client.manager.players.get(interaction.guild.id);
    switch (interaction.customId) {
        case "pause":
            // 1. ACKNOWLEDGE IMMEDIATELY (must be first)
            await interaction.deferUpdate(); 

            let confirmationContent;

            if (player.paused) {
                // Player is currently paused, so we resume it
                player.resume();
                confirmationContent = "▶ Resumed the music.";
            } else {
                // Player is currently playing, so we pause it
                player.pause();
                confirmationContent = "⏸ Paused the music.";
            }
        
            // 2. RENDER & EDIT UI
            // Ensure renderNowPlaying is synchronous or you await it
            const newContainer = renderNowPlaying(player, player.current); 

            // You are editing the original message, so use interaction.message
            await interaction.message.edit({ 
                // No need to pass flags if they already exist on the message
                components: [newContainer] 
            });
        
            // 3. SEND EPHEMERAL CONFIRMATION
            return interaction.followUp({ 
                content: confirmationContent, 
                ephemeral: true 
            });
        case "skip":
            await interaction.deferUpdate();
            player.skip();
            const skipContainer = renderNowPlaying(player, player.current);
            await interaction.message.edit({ 
                components: [skipContainer] 
            });
            return interaction.followUp({ content: "⏭ Skipped to the next track.", ephemeral: true });
        case "loop":
            await interaction.deferUpdate();
            player.setLoop(!player.loop);
            const loopContainer = renderNowPlaying(player, player.current);
            await interaction.message.edit({ 
                components: [loopContainer] 
            });
            return interaction.followUp({ 
                content: player.loop ? "🔁 Loop enabled." : "🔁 Loop disabled.", 
                ephemeral: true 
            });
        case "queue":
            const queue = player.queue;
            const queueSize = queue.size || 0;
            if (queueSize === 0) {
                return interaction.reply({ 
                    content: `🎵 **Now Playing:** ${player.current.title}\n\n📋 Queue is empty.`, 
                    ephemeral: true 
                });
            }
            const queueList = queue.slice(0, 10).map((track, index) => {
                const duration = formatDuration(track.duration);
                return `${index + 1}. **${track.title}** - ${track.author} (${duration})`
            }).join('\n');
            return interaction.reply({ 
                content: `🎵 **Now Playing:** ${player.current.title}\n\n**Up Next:**\n${queueList}${queueSize > 10 ? `\n... and ${queueSize - 10} more` : ''}`, 
                ephemeral: true 
            });
        case "stop":
            await interaction.deferUpdate();
            player.stop();
            return interaction.followUp({ content: "⏹ Music playback has been stopped.", ephemeral: true });
    }

    // Handle watchlist add button
    if (interaction.isButton() && interaction.customId.startsWith('watchlist_add_')) {
        const [, , tmdbId, type] = interaction.customId.split('_')
        const apiBaseUrl = client.config.apiBaseUrl || 'http://localhost:3000'
        const apiKey = client.config.apikey

        // Get user's Discord ID and find their UID
        const discordId = interaction.user.id

        try {
            // First, get user profile by Discord ID
            const profileRes = await axios.get(`${apiBaseUrl}/api/profiles`, {
                params: { discordId: discordId },
                headers: { 'Authorization': `Bearer ${apiKey}` },
                timeout: 10000
            })

            if (!profileRes.data?.user?.id) {
                return interaction.reply({ 
                    content: '❌ Could not find your account. Make sure your Discord is linked to your Reminiscent account.', 
                    ephemeral: true 
                })
            }

            const userId = profileRes.data.user.id

            // Add to watchlist
            const addRes = await axios.post(`${apiBaseUrl}/api/watchlist`, {
                tmdbId: parseInt(tmdbId),
                type: type,
                title: 'Loading...', // Will be updated by backend
                poster: ''
            }, {
                headers: { 
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            })

            if (addRes.status === 200 || addRes.status === 201) {
                return interaction.reply({ 
                    content: `✅ Added to your watchlist! [View on Reminiscent](https://reminiscent.cc/watch/${tmdbId}?type=${type})`, 
                    ephemeral: true 
                })
            } else {
                return interaction.reply({ 
                    content: '❌ Failed to add to watchlist. Please try again.', 
                    ephemeral: true 
                })
            }
        } catch (error) {
            console.error('Watchlist add error:', error)
            if (error.response?.status === 401 || error.response?.status === 403) {
                return interaction.reply({ 
                    content: '❌ Authentication failed. Please check API key configuration.', 
                    ephemeral: true 
                })
            }
            return interaction.reply({ 
                content: '❌ Error adding to watchlist. Please try again.', 
                ephemeral: true 
            })
        }
    }


    if(interaction.isCommand() || interaction.isContextMenu()
       && interaction.guild // interaction's guild can be fetch
       && client.slash.has(interaction.commandName) /* valid slash command */) {

        const command = client.slash.get(interaction.commandName);
        try {
            /* Command cooldowns */
            if (!cooldowns.has(command.name)) {
                cooldowns.set(command.name, new Collection());
            }
            
            const now = Date.now();
            const timestamps = cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || defaultCooldownAmount) * 1000;
            
            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                if (now < expirationTime) {
                    const secondsLeft = ((expirationTime - now) / 1000).toFixed(1);
                    return interaction.reply({
                        content: `Wait ${secondsLeft} more second${secondsLeft < 2 ? '' : 's'} to use **${command.name}**`,
                        ephemeral: true
                    });
                }
            }
            timestamps.set(interaction.user.id, now); // reset user's cooldown
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            /* Command permissions verification */
            if (command.permissions && !interaction.member.permissions.has(command.permissions)) {
                return interaction.reply({
                    content: `You're missing permissions : ${command.permissions.map(p => `**${p}**`).join(', ')}`,
                    ephemeral: true
                });
            }
            command.run(client, interaction);

        } catch (e) {
            console.log(e);
            await interaction.reply({ content: 'An error has occured', ephemeral: true });
        }
    }
};
