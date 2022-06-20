import {inlineCode} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Command} from '@sapphire/framework';
import {Message, MessageEmbed} from 'discord.js';
import {Colors} from '../lib/embeds';

@ApplyOptions<Command.Options>({
  description: 'Test connection to Discord',
  chatInputCommand: {register: true, idHints: ['983911170203324447']},
})
export class PingCommand extends Command {
  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    const interactionReceived = Date.now();
    const fromDiscord = interactionReceived - interaction.createdTimestamp;

    const embed = new MessageEmbed()
      .setColor(Colors.BLUE)
      .setDescription('Ping? 👀');
    const reply = await interaction.reply({
      embeds: [embed],
      ephemeral: true,
      fetchReply: true,
    });
    const replyCreated =
      reply instanceof Message
        ? reply.createdTimestamp
        : Date.parse(reply.timestamp);

    const toDiscord = replyCreated - interactionReceived;
    const roundTrip = replyCreated - interaction.createdTimestamp;
    const gatewayHeartbeat =
      interaction.guild?.shard.ping ?? interaction.client.ws.ping;
    const client = interaction.client.user?.username;

    embed.setDescription(
      [
        'Pong! 🏓',
        '🐌 Latency:',
        `┣ Discord -> ${client}: ${inlineCode(fromDiscord + 'ms')}`,
        `┣ ${client} -> Discord: ${inlineCode(toDiscord + 'ms')}`,
        `┗ Round trip: ${inlineCode(roundTrip + 'ms')}`,
        `💓 Gateway heartbeat: ${inlineCode(gatewayHeartbeat + 'ms')}`,
      ].join('\n')
    );

    interaction.editReply({embeds: [embed]});
  }
}
