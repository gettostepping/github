module.exports = {
    name: 'play',
    description: 'Play Music',
    usage: '<prefix>play [song]', //OPTIONAL (for the help cmd)
    //examples: ['example', 'example ping'], //OPTIONAL (for the help cmd)
    aliases: ['p'],
    dir: "music",
    cooldown: 2, // Cooldown in seconds, by default it's 2 seconds | OPTIONAL
    permissions: [], // OPTIONAL
    
    run :async (client, message, args) => {   
        if (message.author.bot || !message.guild) return;

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply("You need to be in a voice channel to play music!");

        const query = args.join(" ");
        if (!query) return message.reply("Please provide a song name or URL to play!");
        if (query.length < 2) return message.reply("❌ Search query is too short! Please provide at least 2 characters.");

        // Check if manager is available
        if (!client.manager) {
            return message.reply("❌ Music manager is not initialized!");
        }

        // Check if manager has any nodes (Lavalink connection)
        const nodes = client.manager.nodes;
        if (!nodes || nodes.size === 0) {
            return message.reply("❌ No Lavalink nodes available! Make sure Lavalink server is running on localhost:3009");
        }

        let player = client.manager.players.get(message.guild.id);
        if (!player) {
          try {
            player = client.manager.createPlayer({
              guildId: message.guild.id,
              voiceChannelId: voiceChannel.id,
              textChannelId: message.channel.id,
              autoPlay: true,
            });
            
            if (!player) {
              return message.reply("❌ Failed to create player. Make sure Lavalink server is running and connected!");
            }
            
            await player.connect();
          } catch (error) {
            return message.reply(`❌ Error creating player: ${error.message}`);
          }
        } else if (!player.connected) {
          await player.connect();
        }


        let result;
        try {
          result = await client.manager.search({
            query
          });
        } catch (error) {
          return message.reply(`❌ Failed to search for "${query}". Please try a different search term or use a direct YouTube URL.`);
        }
        
        if (!result || !result.tracks || result.tracks.length === 0) {
          return message.reply(`❌ No results found for "${query}". Try a different search term or use a direct YouTube URL.`);
        }
        
        // Add track(s) to queue
        if (result.loadType === 'PLAYLIST_LOADED' && result.playlistInfo && result.tracks.length > 1) {
            // Playlist detected - add all tracks
            player.queue.add(result.tracks);
            const playlistName = result.playlistInfo.name || 'Playlist'
            message.reply(`✅ Added playlist **${playlistName}** with **${result.tracks.length}** tracks to queue!`)
        } else {
            // Single track
            player.queue.add(result.tracks[0]);
            message.reply(`✅ Added to queue: **${result.tracks[0].title}**`)
        }
        
        if (!player.playing) player.play();
    }
}