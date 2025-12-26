const { Client, Collection, GatewayIntentBits, MessageFlags } = require("discord.js");
const { Manager } = require("moonlink.js")
const getMusicMessage = require("./src/utils/getMusicMessage");
const renderNowPlaying = require("./src/utils/renderNowPlaying");


/**
 * @type {import("discord.js").Client & { manager: import("moonlink.js").Manager }}
 */

const client = new Client({
    allowedMentions: { parse: ['users', 'roles'] },
    fetchAllMembers: false,
    intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates ],
});

//SET COLLECTION
client.commandes = new Collection();
client.slash = new Collection();
client.aliases = new Collection();
cooldowns = new Collection();

//SET UTILS
client.logger = require('./src/utils/logger');
client.color = require('./src/utils/color.js');

//SET CONFIG
client.config = require('./config');

//MOONLINK
const manager = new Manager({
  nodes: [
    {
      host: 'localhost',    // Lavalink host
      port: 3009,           // Lavalink port
      password: 'fuckingPassword', // Lavalink password
      secure: false,
    },
  ],
  sendPayload: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(JSON.parse(payload));
  },
});

client.on('raw', (packet) => {
  client.manager.packetUpdate(packet);
});

// Attach the manager to your client for easy access
client.manager = manager;

client.on('messageCreate', async (message) => {
  if (message.channel.id === '1436051260535996430') {
    if (message.author.bot) return;
    if (!message.member.voice.channel) return;
    
    if (!client.manager) {
      message.react('❌');
      return;
    }
    
    let player = client.manager.players.get(message.guild.id);
    if (!player) {
      player = client.manager.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: message.member.voice.channel.id,
        textChannelId: message.channel.id,
        autoPlay: true,
      });
      
      if (!player) {
        message.react('❌');
        return;
      }
      
      await player.connect();
    }

    const query = message.content;
    if (!query || query.trim().length === 0) return;
    
    let result;
    try {
      result = await client.manager.search({ query });
    } catch (error) {
      console.error('Search error:', error);
      message.react('❌');
      setTimeout(() => {
        message.delete();
      }, 3000);
      return;
    }
    
    if (!result || !result.tracks || result.tracks.length === 0) {
      message.react('❌');
      setTimeout(() => {
        message.delete();
      }, 3000);
      return;
    }
        
    player.queue.add(result.tracks[0]);
    if (!player.playing) player.play();

    message.react('✅');
    setTimeout(() => {
      message.delete();
    }, 3000);
  }
});

client.manager.on("trackStart", async (player, track) => {
  const guild = client.guilds.cache.get(player.guildId);
  const message = await getMusicMessage(client, guild);
  const container = renderNowPlaying(player, track);
  await message.edit({ 
    flags: MessageFlags.IsComponentsV2, 
    components: [container]
  });
});

// LOAD THE 4 HANDLERS
["error", "command", "slashCommands", "event"].forEach(file => { require(`./src/utils/handlers/${file}`)(client) })

// Start trending feed scheduler
client.once('ready', () => {
    const { startScheduler } = require('./src/utils/scheduler');
    startScheduler(client);
    console.log('✅ Bot is ready!');
});

client.login(client.config.token); 