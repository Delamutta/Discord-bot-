const Discord = require('discord.js')

module.exports = {
  name: 'limpar-mensagens-usuario',
  description: 'Remove mensagens recentes de um usuário no canal atual',
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'usuario',
      description: 'Usuário cujas mensagens serão removidas (opcional)',
      type: Discord.ApplicationCommandOptionType.User,
      required: false,
    },
    {
      name: 'id',
      description: 'ID do usuário cujas mensagens serão removidas (use se o usuário já saiu)',
      type: Discord.ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: 'quantidade',
      description: 'Número máximo de mensagens a verificar (padrão 100, max 1000)',
      type: Discord.ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: 'incluir_antigas',
      description: 'Permite também apagar mensagens com mais de 14 dias (padrão: falso)',
      type: Discord.ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: 'old_limit',
      description: 'Máximo de mensagens antigas a processar (quando incluir_antigas=true)',
      type: Discord.ApplicationCommandOptionType.Integer,
      required: false,
    }
  ],

  run: async (client, interaction) => {
    try {
      // permissões
      const member = interaction.member
      if (!member.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'Você precisa da permissão `Manage Messages` para usar este comando.', ephemeral: true })
      }

      const optUser = interaction.options.getUser('usuario')
      const optId = interaction.options.getString('id')
      const quantidade = interaction.options.getInteger('quantidade') || 100
      const incluirAntigas = interaction.options.getBoolean('incluir_antigas') || false
      const oldLimitOption = interaction.options.getInteger('old_limit')

      const targetId = optUser?.id || optId
      if (!targetId) return interaction.reply({ content: 'Informe um usuário ou um ID.', ephemeral: true })

      let target
      try {
        target = await client.users.fetch(targetId)
      } catch (err) {
        // não conseguiu buscar o usuário, mas ainda podemos usar o ID
        target = { id: targetId, tag: targetId }
      }

      if (!interaction.channel || !interaction.channel.isTextBased()) {
        return interaction.reply({ content: 'Este comando só pode ser usado em canais de texto.', ephemeral: true })
      }

      await interaction.deferReply({ ephemeral: true })

      const maxToScan = Math.min(Math.max(quantidade, 1), 1000)
      const toDelete = []
      let lastId = null
      const fourteenDays = 14 * 24 * 60 * 60 * 1000
      let scanned = 0

      // buscar mensagens em páginas de 100 até acumular ou esgotar
      while (scanned < maxToScan) {
        const options = { limit: Math.min(100, maxToScan - scanned) }
        if (lastId) options.before = lastId

        const fetched = await interaction.channel.messages.fetch(options)
        if (!fetched.size) break

        scanned += fetched.size
        lastId = fetched.last().id

        // coletar todas as mensagens do autor (vamos separar recentes/antigas depois)
        const filtered = fetched.filter(m => m.author && m.author.id === target.id)
        for (const msg of filtered.values()) {
          toDelete.push(msg)
        }

        if (fetched.size < 100) break
      }

      if (!toDelete.length) {
        return interaction.editReply({ content: `Nenhuma mensagem encontrada do usuário ${target.tag} neste canal.` })
      }

        // deletar: mensagens recentes via bulkDelete, mensagens antigas individualmente
        const recent = toDelete.filter(m => (Date.now() - m.createdTimestamp) < fourteenDays)
        const old = toDelete.filter(m => (Date.now() - m.createdTimestamp) >= fourteenDays)

        let deletedCount = 0

        // Bulk delete para mensagens recentes (<=14 dias)
        while (recent.length) {
          const batch = recent.splice(0, 100)
          try {
            const res = await interaction.channel.bulkDelete(batch, true)
            deletedCount += res.size
          } catch (err) {
            console.log('bulkDelete falhou para lote recente, tentando deletar individualmente:', err)
            for (const m of batch) {
              try {
                await m.delete()
                deletedCount++
              } catch (inner) {
                console.log('Falha ao deletar mensagem individual (recente):', inner)
              }
            }
          }
        }

        // Deletar mensagens antigas individualmente (>14 dias)
        // Atenção: pode ser lento e sujeito a rate limits. Limitamos para evitar execuções muito longas.
        const DEFAULT_OLD_LIMIT = 1000 // limite máximo de mensagens antigas a processar por padrão
        const OLD_DELETE_LIMIT = Math.min(oldLimitOption || DEFAULT_OLD_LIMIT, 5000)
        let oldProcessed = 0
        const wait = (ms) => new Promise(res => setTimeout(res, ms))
        // se o usuário não permitiu apagar antigas, não processe a lista `old`
        if (!incluirAntigas) {
          // Apenas manter recentes
          // `recent` já contém apenas mensagens <=14 dias
        } else {
          for (const m of old) {
            if (oldProcessed >= OLD_DELETE_LIMIT) break
            try {
              await m.delete()
              deletedCount++
            } catch (err) {
              console.log('Falha ao deletar mensagem antiga:', err)
            }
            oldProcessed++
            // pequeno delay para reduzir chance de atingir rate limit
            await wait(300)
          }
        }
        return interaction.editReply({ content: `Removidas ${deletedCount} mensagem(ns) de ${target.tag} neste canal. (incluindo ${oldProcessed} mensagens antigas processadas)` })

    } catch (error) {
      console.log('Erro no comando limpar-mensagens-usuario:', error)
      try { await interaction.editReply({ content: 'Ocorreu um erro ao executar o comando.' }) } catch {}
    }
  }
}