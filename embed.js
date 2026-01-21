const Discord = require("discord.js")

module.exports = {
    name: 'embed',
    description: 'Cria um embed com título passado como opção',
    type: Discord.ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'titulo',
            description: 'Título do embed',
            type: Discord.ApplicationCommandOptionType.String,
            required: false,
        }
    ],

    run: async (client, interaction) => {
        try {
            const titulo = interaction.options.getString('titulo') || 'Sem título'

            const autorName = interaction.user.username
            const autorAvatar = interaction.user.displayAvatarURL({ dynamic: true })

            const embed = new Discord.EmbedBuilder()
                .setColor(Discord.Colors.Random)
                .setTitle(titulo)
                .setDescription('Já posso trabalhar??')
                .setImage('https://images8.alphacoders.com/137/thumb-1920-1379479.png')
                .setThumbnail('https://i.pinimg.com/736x/e7/8b/ba/e78bba6be3053ce066ff880679b835ad.jpg')
                .setAuthor({ name: autorName, iconURL: autorAvatar })
                .setTimestamp()
                .setFooter({
                    text: 'Meu criador é muito foda!',
                    iconURL: 'https://i.pinimg.com/736x/e7/8b/ba/e78bba6be3053ce066ff880679b835ad.jpg',
                })

            await interaction.reply({ embeds: [embed] })
        } catch (error) {
            console.log('Erro no comando embed:', error)
            try { await interaction.reply({ content: 'Ocorreu um erro ao executar o comando.', ephemeral: true }) } catch {}
        }
    }
}