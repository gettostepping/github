const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const { QuickDB } = require("quick.db");
const db = new QuickDB();

/**
 * Gets or creates the music controller message for a guild.
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Guild} guild
 * @returns {Promise<import("discord.js").Message>}
 */
module.exports = async function getMusicMessage(client, guild) {
    const channelId = "1436051260535996430"; // put in config later
    const channel = guild.channels.cache.get(channelId);
    if (!channel) throw new Error("Music channel not found");

    // Fetch stored message ID from QuickDB
    const storedId = await db.get(`musicMessage_${guild.id}`);

    if (storedId) {
        try {
            const msg = await channel.messages.fetch(storedId);
            return msg;
        } catch (err) {
            // message probably deleted, recreate
        }
    }

    // Build a fresh controller UI
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("DIMENSION MUSIC")
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(1).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("No music is playing currently.")
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("pause")
                    .setLabel("⏯ Pause")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("skip")
                    .setLabel("⏭ Skip")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("stop")
                    .setLabel("⏹ Stop")
                    .setStyle(ButtonStyle.Danger)
            )
        );

    // Send with Components V2 enabled
    const message = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
    });

    // Save message ID using QuickDB
    await db.set(`musicMessage_${guild.id}`, message.id);

    return message;
};
