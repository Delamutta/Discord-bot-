const Discord = require("discord.js")

require('dotenv').config()

const client = new Discord.Client({
    intents: [1, 512, 32768, 2, 128,
        Discord.IntentsBitField.Flags.DirectMessages,
        Discord.IntentsBitField.Flags.GuildInvites,
        Discord.IntentsBitField.Flags.GuildMembers,
        Discord.IntentsBitField.Flags.GuildPresences,
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.MessageContent,
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.GuildMessageReactions,
        Discord.IntentsBitField.Flags.GuildEmojisAndStickers
    ],
    partials: [
        Discord.Partials.User,
        Discord.Partials.Message,
        Discord.Partials.Reaction,
        Discord.Partials.Channel,
        Discord.Partials.GuildMember
    ]
});

module.exports = client

client.on('interactionCreate', (interaction) => {

    if (interaction.type === Discord.InteractionType.ApplicationCommand) {

        const cmd = client.slashCommands.get(interaction.commandName);

        if (!cmd) return interaction.reply(`Error`);

        interaction["member"] = interaction.guild.members.cache.get(interaction.user.id);

        cmd.run(client, interaction)

    }
})

client.slashCommands = new Discord.Collection()

require('./handler')(client)

client.login(process.env.token)

// Logs e handlers adicionais para diagnóstico
client.on('error', (err) => console.log('Client error:', err))
client.on('shardError', (err) => console.log('Shard error:', err))
client.on('shardDisconnect', (event, shardID) => console.log('Shard disconnected:', shardID, event))
client.on('invalidated', () => console.log('Client invalidated (session ended)'))
process.on('unhandledRejection', (err) => console.log('Unhandled Rejection:', err))

const fs = require('fs');

fs.readdir('./Eventos', (err, file) => {
    file.forEach(event => {
        require(`./Eventos/${event}`)
    })
})