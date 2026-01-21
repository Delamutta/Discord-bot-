const Discord = require('discord.js')

module.exports = {
  name: 'exterminio',
  description: 'Apaga todas as mensagens do canal (precisa de confirmação)',
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'confirmar',
      description: 'Confirme para executar (true) — evita execuções acidentais',
      type: Discord.ApplicationCommandOptionType.Boolean,
      required: true,
    },
    {
      name: 'incluir_antigas',
      description: 'Incluir mensagens com mais de 14 dias (padrão false)',
      type: Discord.ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: 'limit_old',
      description: 'Máximo de mensagens antigas a apagar quando incluir_antigas=true (padrão 1000)',
      type: Discord.ApplicationCommandOptionType.Integer,
      required: false,
    }
  ],

  run: async (client, interaction) => {
    try {
      if (!interaction.channel || !interaction.channel.isTextBased()) {
        return interaction.reply({ content: 'Este comando só pode ser usado em canais de texto.', ephemeral: true })
      }

      const member = interaction.member
      if (!member.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'Você precisa da permissão `Manage Messages` para usar este comando.', ephemeral: true })
      }

      const confirmar = interaction.options.getBoolean('confirmar')
      const incluirAntigas = interaction.options.getBoolean('incluir_antigas') || false
      const limitOld = interaction.options.getInteger('limit_old') || 1000

      if (!confirmar) return interaction.reply({ content: 'Comando cancelado — envie `confirmar: true` para executar.', ephemeral: true })

      await interaction.reply({ content: 'Iniciando exterminio do canal... (resposta será atualizada quando terminar)', ephemeral: true })
      await interaction.channel.sendTyping()

      const fourteenDays = 14 * 24 * 60 * 60 * 1000
      const toDelete = []
      let lastId = null
      let scanned = 0
      const MAX_SCAN = 5000 // limite preventivo de mensagens a vasculhar

      // coletar mensagens até esgotar ou atingir MAX_SCAN
      while (scanned < MAX_SCAN) {
        const options = { limit: 100 }
        if (lastId) options.before = lastId
        const fetched = await interaction.channel.messages.fetch(options)
        if (!fetched.size) break
        scanned += fetched.size
        lastId = fetched.last().id
        for (const m of fetched.values()) toDelete.push(m)
        if (fetched.size < 100) break
      }

      if (!toDelete.length) return interaction.editReply({ content: 'Nenhuma mensagem encontrada neste canal.' })

      // separar recentes e antigas
      const recent = toDelete.filter(m => (Date.now() - m.createdTimestamp) < fourteenDays)
      const old = toDelete.filter(m => (Date.now() - m.createdTimestamp) >= fourteenDays)

      let deleted = 0

      // deletar recentes em batches via bulkDelete
      while (recent.length) {
        const batch = recent.splice(0, 100)
        try {
          const res = await interaction.channel.bulkDelete(batch, true)
          deleted += res.size
        } catch (err) {
          console.log('bulkDelete falhou em batch:', err)
          // tentar deletar individualmente se bulkDelete falhar
          for (const m of batch) {
            try { await m.delete(); deleted++ } catch (e) { console.log('falha delete:', e) }
          }
        }
      }

      // deletar antigas apenas se solicitado
      if (incluirAntigas && old.length) {
        const limit = Math.min(Math.max(limitOld, 1), 5000)
        const wait = ms => new Promise(r => setTimeout(r, ms))
        let processed = 0
        for (const m of old) {
          if (processed >= limit) break
          try { await m.delete(); deleted++; processed++ } catch (err) { console.log('falha delete antiga:', err) }
          await wait(300)
        }
      }

      return interaction.editReply({ content: `Exterminio concluído. Removidas ${deleted} mensagens neste canal.` })
    } catch (error) {
      console.log('Erro no comando exterminio:', error)
      try { await interaction.reply({ content: 'Ocorreu um erro ao executar o comando.', ephemeral: true }) } catch {}
    }
  }
}