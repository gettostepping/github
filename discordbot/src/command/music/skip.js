module.exports = {
    name: 'skip',
    description: 'Skip Song',
    usage: '<prefix>skip', //OPTIONAL (for the help cmd)
    //examples: ['example', 'example ping'], //OPTIONAL (for the help cmd)
    aliases: [],
    dir: "music",
    cooldown: 2, // Cooldown in seconds, by default it's 2 seconds | OPTIONAL
    permissions: [], // OPTIONAL
    
    run :async (client, message, args) => {   
        if (message.author.bot || !message.guild) return;

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply("You need to be in a voice channel to skip music!");

        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.playing) return message.reply("There is no music playing!");

        if (args[0] && isNaN(args[0]) === false) {
            const skipTo = parseInt(args[0], 10);
            if (skipTo < 1 || skipTo > player.queue.size) {
                return message.reply(`Please provide a valid track number between 1 and ${player.queue.size}.`);
            }
            player.skip(skipTo);

            return message.reply(`Skipped to track number ${skipTo} in the queue!`);
        } else {
            player.skip();
        }
        message.reply("Skipped the current song!");
    }
}