const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    name: 'queue',
    description: 'View the current music queue',
    usage: '<prefix>queue',
    dir: "music",
    aliases: ['q', 'playlist'],
    cooldown: 1,
    permissions: [],
    
    run: async (client, message, args) => {
        if (message.author.bot || !message.guild) return;

        if (!client.manager) {
            return message.reply("❌ Music manager is not initialized!");
        }

        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.current) {
            return message.reply("❌ No music is currently playing!");
        }

        const queue = player.queue;
        const currentTrack = player.current;
        const queueSize = queue.size || 0;

        if (queueSize === 0) {
            return message.reply(`🎵 **Now Playing:** ${currentTrack.title}\n\n📋 Queue is empty.`)
        }

        // Show up to 10 tracks in queue
        const queueList = queue.slice(0, 10).map((track, index) => {
            const duration = formatDuration(track.duration);
            return `${index + 1}. **${track.title}** - ${track.author} (${duration})`
        }).join('\n');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent("📋 Music Queue")
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(1)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`🎵 **Now Playing:** ${currentTrack.title}\n\n**Up Next:**\n${queueList}`)
            );

        if (queueSize > 10) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`\n... and ${queueSize - 10} more track${queueSize - 10 === 1 ? '' : 's'}`)
            );
        }

        message.reply({ flags: require('discord.js').MessageFlags.IsComponentsV2, components: [container] });
    }
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

