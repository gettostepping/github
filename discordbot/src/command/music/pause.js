module.exports = {
    name: 'pause',
    description: 'Play Music',
    aliases: ['ps'],
    dir: "music",
    cooldown: 2,
    permissions: [],
    
    run :async (client, message, args) => {   
        if (message.author.bot || !message.guild) return;

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply("You need to be in a voice channel to play music!");

        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.playing) return message.reply("There is no music playing!");

        if (player.paused) {
            player.resume();
            return message.reply("▶ Resumed the music.");
        } else {
            player.pause();
            return message.reply("⏸ Paused the music.");
        }
    }
}