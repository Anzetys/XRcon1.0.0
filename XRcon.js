const { Client, GatewayIntentBits, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const { Rcon } = require('minecraft-rcon-client');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let customCachedMessages = {};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || message.channelId !== config.channel_id.toString()) return;

    const allMapsButton = new ButtonBuilder()
        .setCustomId('all-maps')
        .setLabel('All Maps')
        .setStyle(ButtonStyle.Primary);

    const embed = new EmbedBuilder()
        .setTitle("Select Server for Command Execution")
        .setDescription(`\`\`\`\n${message.content}\n\`\`\``)
        .setColor(0x00ff00);

    if (config.interactionType === 'buttons') {
        const views = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;

        Object.entries(config.servers).forEach(([emoji, server], index) => {
            const button = new ButtonBuilder()
                .setCustomId(`server-button-${emoji}`)
                .setLabel(`${emoji} - ${server.name}`)
                .setStyle(getButtonStyle(server.style || 'secondary'));

            currentRow.addComponents(button);
            buttonCount++;

            if (buttonCount === 5 || index === Object.entries(config.servers).length - 1) {
                views.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }
        });

        if (currentRow.components.length > 0) {
            views.push(currentRow); // Push the last row if it has any buttons
        }
        views.push(new ActionRowBuilder().addComponents(allMapsButton)); // Add All Maps button in a new row

        const msg = await message.channel.send({ embeds: [embed], components: views });
        customCachedMessages[msg.id] = { command: message.content };
    } else if (config.interactionType === 'select') {
        const options = Object.entries(config.servers).map(([emoji, server]) => ({
            label: server.name,
            value: emoji,
            description: `Execute command on ${server.name}`
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select-server')
            .setPlaceholder('Select a server')
            .addOptions(options);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        const buttonRow = new ActionRowBuilder().addComponents(allMapsButton); // Separate row for the button
        const msg = await message.channel.send({ embeds: [embed], components: [selectRow, buttonRow] });
        customCachedMessages[msg.id] = { command: message.content };
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isSelectMenu()) return;

    await interaction.deferReply({ ephemeral: true });

    const cachedData = customCachedMessages[interaction.message.id];
    if (!cachedData) {
        console.error('No cached data found for this interaction.');
        await interaction.editReply({ content: "Error: No cached data found for this interaction." });
        return;
    }

    if (interaction.customId === 'all-maps') {
        // Logic to handle the All Maps button
        const responses = [];
        for (const [serverKey, serverInfo] of Object.entries(config.servers)) {
            const rconClient = new Rcon({
                host: serverInfo.ip,
                port: parseInt(serverInfo.port, 10),
                password: serverInfo.password
            });

            try {
                await rconClient.connect();
                const response = await rconClient.send(cachedData.command);
                responses.push(`${serverInfo.name}\n${response || 'No response'}`);
                rconClient.disconnect();
            } catch (error) {
                console.error(`Error with server ${serverInfo.name}:Check Config.json`);
                responses.push(`${serverInfo.name}\nError: ${error.message}`);
            }
        }

        const responseText = responses.join('\n\n');
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = new EmbedBuilder(originalEmbed)
            .setTitle('Command Executed on All Servers')
            .setDescription(responseText)
            .setColor(originalEmbed.color);

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
        await interaction.deleteReply();
    } else {
        // Logic for other buttons and select menus
        const serverKey = interaction.isButton() ? interaction.customId.replace('server-button-', '') : interaction.values[0];
        const serverInfo = config.servers[serverKey];

        if (!serverInfo || !serverInfo.ip) {
            console.error('Server information is incomplete or missing:', serverInfo);
            await interaction.editReply({ content: "Error: Server information is incomplete or missing." });
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
            const updatedEmbed = new EmbedBuilder(originalEmbed)
                .setTitle(`Selected server (${serverInfo.name})`)
                .setDescription(response ?
                    `Response:\n\`\`\`\n${response}\n\`\`\`` :
                    `No response received or command does not provide a response.`)
                .setColor(originalEmbed.color);

            await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
            await interaction.deleteReply();

            delete customCachedMessages[interaction.message.id];
        } catch (error) {
            console.error(error);
            await interaction.followUp({ content: `Error processing command: ${error.message}`, ephemeral: true });
        }
    }
});


function getButtonStyle(styleName) {
    const styles = {
        'primary': ButtonStyle.Primary,
        'secondary': ButtonStyle.Secondary,
        'success': ButtonStyle.Success,
        'danger': ButtonStyle.Danger,
        'link': ButtonStyle.Link
    };
    return styles[styleName] || ButtonStyle.Secondary;
}

client.login(config.discord_bot_token);
