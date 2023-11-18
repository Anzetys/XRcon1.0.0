const { Client, GatewayIntentBits, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const { Rcon } = require('minecraft-rcon-client');

// Load configuration from config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Create a new client instance with intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// This will be used to cache messages and commands
let customCachedMessages = {};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    // Prevent the bot from responding to itself or other bots
    if (message.author.bot) return;

    if (message.channelId === config.channel_id.toString()) {
        const view = new ActionRowBuilder();

        for (const [emoji, server] of Object.entries(config.servers)) {
            const buttonStyle = getButtonStyle(server.style || 'secondary');
            const button = new ButtonBuilder()
                .setCustomId(`server-button-${emoji}`)
                .setLabel(`${emoji} - ${server.name}`)
                .setStyle(buttonStyle);

            view.addComponents(button);
        }

        const embed = new EmbedBuilder()
            .setTitle("Select Server for Command Execution")
            .setDescription(`\`\`\`\n${message.content}\n\`\`\``)
            .setColor(0x00ff00);

        const msg = await message.channel.send({ embeds: [embed], components: [view] });
        customCachedMessages[msg.id] = { command: message.content, serverInfo: null };
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // Acknowledge the interaction and indicate that the bot is processing the command
    await interaction.deferReply({ ephemeral: true });

    const cachedData = customCachedMessages[interaction.message.id];
    if (!cachedData) {
        console.error('No cached data found for this interaction.');
        return;
    }

    const emoji = interaction.customId.replace('server-button-', '');
    const serverInfo = config.servers[emoji];

    if (!serverInfo || !serverInfo.ip) {
        console.error('Server information is incomplete or missing:', serverInfo);
        return;
    }

    const rconClient = new Rcon({
        host: serverInfo.ip,
        port: parseInt(serverInfo.port, 10),
        password: serverInfo.password
    });

    try {
        await rconClient.connect();
        const response = await rconClient.send(cachedData.command);
        rconClient.disconnect();

        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = new EmbedBuilder()
            .setTitle(`Selected server (${serverInfo.name})`)
            .setDescription(response ?
                `Response:\n\`\`\`\n${response}\n\`\`\`` :
                `No response received or command does not provide a response.`)
            .setColor(originalEmbed.color);

        const view = new ActionRowBuilder();
        for (const [emoji, server] of Object.entries(config.servers)) {
            const button = new ButtonBuilder()
                .setCustomId(`disabled-${emoji}`)
                .setLabel(`${emoji} - ${server.name}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            view.addComponents(button);
        }

        // Edit the original message
        await interaction.message.edit({ embeds: [updatedEmbed], components: [view] });
        await interaction.deleteReply();

        delete customCachedMessages[interaction.message.id];
    } catch (error) {
        console.error(error);
        await interaction.followUp({ content: `Error processing command: ${error.message}`, ephemeral: true });
    }
});

// Function to convert string to ButtonStyle
function getButtonStyle(styleName) {
    const styles = {
        'primary': ButtonStyle.Primary,
        'secondary': ButtonStyle.Secondary,
        'success': ButtonStyle.Success,
        'danger': ButtonStyle.Danger,
        'link': ButtonStyle.Link
    };
    return styles[styleName] || ButtonStyle.Secondary; // Default to secondary if not found
}

client.login(config.discord_bot_token);
