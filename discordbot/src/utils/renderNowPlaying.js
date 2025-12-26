const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require("discord.js");

const { QuickDB } = require("quick.db");
const db = new QuickDB();

/**
 * @param {import("moonlink.js").Player} player
 * @param {import("moonlink.js").Track} track
 * @returns {Promise<ContainerBuilder>}
 */
module.exports = function renderNowPlaying(player, track) {
    const guildId = player.guildId;
    const volume = player.volume;
    const loopEnabled = player.loop;
    const queueSize = player.queue.size || 0;

    // Get album art/thumbnail from track
    // Moonlink tracks typically have artwork property or we can extract from YouTube thumbnail
    let artworkUrl = null;
    if (track.artwork) {
        artworkUrl = track.artwork;
    } else if (track.uri && track.uri.includes('youtube.com') || track.uri.includes('youtu.be')) {
        // Extract YouTube video ID and get thumbnail
        const videoIdMatch = track.uri.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (videoIdMatch) {
            artworkUrl = `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
        }
    } else if (track.thumbnail) {
        artworkUrl = track.thumbnail;
    }

    // Construct UI Kit container
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent("🎵 NOW PLAYING")
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(1)
        );

    // Add album art if available
    if (artworkUrl) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(artworkUrl)
                )
        );
    }

    container
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`**[${track.title}](${track.url})**`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    `> Artist: **${track.author}**\n` +
                    `> Duration: **${formatDuration(track.duration)}**\n` +
                    `> Volume: **${volume}%**` +
                    (queueSize > 0 ? `\n> Queue: **${queueSize}** track${queueSize === 1 ? '' : 's'}` : '')
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(1)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("pause")
                    .setLabel(player.paused ? "▶ Resume" : "⏯ Pause")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("skip")
                    .setLabel("⏭ Skip")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("loop")
                    .setLabel(loopEnabled ? "🔁 Unloop" : "🔁 Loop")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("queue")
                    .setLabel(`📋 Queue (${queueSize})`)
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("stop")
                    .setLabel("⏹ Stop")
                    .setStyle(ButtonStyle.Danger)
            )
        );

    return container;
};

// Utility so the UI always looks clean
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
