module.exports = {
    name: 'speak',
    description: 'Very simple example of a command to understand how to use this template',
    usage: '<prefix>speak [text]', //OPTIONAL (for the help cmd)
    examples: [], //OPTIONAL (for the help cmd)
    aliases: [],
    dir: "music",
    cooldown: 1, // Cooldown in seconds, by default it's 2 seconds | OPTIONAL
    permissions: [], // OPTIONAL
    
    run :async (client, message, args) => {   
        const text = args.join(" ");
        if(!text) return message.reply("Please provide text to speak!");
        let player = client.manager.players.get(message.guild.id);
        if (!player) {
          player = client.manager.createPlayer({
            guildId: message.guild.id,
            voiceChannelId: message.member.voice.channel.id,
            textChannelId: message.channel.id,
            autoPlay: true,
          });
          player.connect();
        await player.speak({ text: text, provider: 'google'  });
        message.reply(`Speaking: **${text}**`);
        }
    }
}