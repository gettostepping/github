const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const axios = require('axios');

module.exports = {
    name: 'status',
    description: 'Get status information from reminiscent.cc',
    usage: '<prefix>status', //OPTIONAL (for the help cmd)
    dir: "reminiscent",
    aliases: [],
    cooldown: 2, // Cooldown in seconds, by default it's 2 seconds | OPTIONAL
    permissions: [], // OPTIONAL
    
    run :async (client, message, args) => {   
        if (message.author.bot || !message.guild) return;

        const apiBaseUrl = client.config.apiBaseUrl || 'https://reminiscent.cc';
        const apiKey = client.config.apikey;

        if (!apiKey) {
            return message.reply("❌ API key not configured! Please set it in config.js");
        }

        try {
            const res = await axios.get(`${apiBaseUrl}/api/admin/api-status`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 10000 // 10 second timeout
            });

            if (!res.data) {
                return message.reply(`❌ No data received: ${res.statusText}`);
            }
            
            const data = res.data;

            let statusIcon = '🟢';
            if (data.stats?.healthStatus === 'Degraded') {
                statusIcon = '🟠';
            } else if (data.stats?.healthStatus === 'Down') {
                statusIcon = '🔴';
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('**Reminiscent.cc Status**')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setDivider(true).setSpacing(1)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            `> **API Health Status:** ${statusIcon} ${data.stats?.healthStatus || 'Unknown'}\n` +
                            `> **Active API Keys:** ${data.apiKeys?.active || 0}\n` +
                            `> **API Success Rate:** ${data.stats?.successRate || 0}%\n` +
                            `> **API Error Rate:** ${data.stats?.errorRate || 0}%\n` +
                            `> **Total Requests:** ${data.stats?.totalRequests || 0} Requests\n`
                        )
                );

            message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        } catch (error) {
            console.error('Status command error:', error);
            if (error.response) {
                // API error response
                const status = error.response.status;
                const statusText = error.response.statusText;
                if (status === 401 || status === 403) {
                    return message.reply(`❌ Authentication failed. Please check your API key in config.js`);
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