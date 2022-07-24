import {inlineCode} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Command} from '@sapphire/framework';
import {ChatInputCommandInteraction, EmbedBuilder} from 'discord.js';
import {Color} from '../lib/color';

@ApplyOptions<Command.Options>({description: 'Test connection to Discord'})
export class PingCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const interactionReceived = Date.now();
    const fromDiscord = interactionReceived - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor(Color.BLUE)
      .setDescription('Ping? 👀');
    const reply = await interaction.reply({
      embeds: [embed],
      ephemeral: true,
      fetchReply: true,
    });

    const toDiscord = reply.createdTimestamp - interactionReceived;
    const roundTrip = reply.createdTimestamp - interaction.createdTimestamp;
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

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      command => command.setName(this.name).setDescription(this.description),
      {idHints: ['983911170203324447']}
    );
  }
}
