const Discord = require("discord.js")

module.exports = {
  name: 'limpar', // Coloque o nome do comando
  description: 'coamndo para limpar mensagens do chat', // Coloque a descrição do comando
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
        name: 'quantidade',
        description: 'qauntidade de msgs a ser apagada de 1 a 100',
        type: Discord.ApplicationCommandOptionType.Integer,
        required: true,
    }
],

  run: async (client, interaction) => {

    try {
        let qtd = interaction.options.getInteger('quantidade');

        let embed = new Discord.EmbedBuilder()
        .setColor('Green')
        .setTitle('Chat limpo com sucesso! A mãe é foda demais')

        let embed_err = new Discord.EmbedBuilder()
        .setColor('Red')
        .setTitle('Erro ao limpar o chat! você só pode excluir mensagens em massa com menos de 14 dias')

        // usa await para simplificar o fluxo e capturar erros pelo try/catch
        await interaction.channel.bulkDelete(qtd)
        await interaction.reply({embeds: [embed], ephemeral: true})


    } catch (error) {
        console.log(error);
    }


    
  }
}