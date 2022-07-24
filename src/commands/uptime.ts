import {ApplyOptions} from '@sapphire/decorators';
import {Command} from '@sapphire/framework';
import {ChatInputCommandInteraction, EmbedBuilder} from 'discord.js';
import {DurationUnit} from '../lib/duration';
import {Color} from '../lib/color';

@ApplyOptions<Command.Options>({
  description: 'Get time since bot last restarted',
})
export class UptimeCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const uptime = interaction.client.uptime;
    if (uptime === null) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.RED)
            .setDescription('Could not obtain uptime'),
        ],
        ephemeral: true,
      });
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Color.BLUE)
          .setDescription(`🕒 Uptime: ${this.uptime(uptime)}`),
      ],
      ephemeral: true,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      command => command.setName(this.name).setDescription(this.description),
      {idHints: ['988533583431995392', '983913881221079070']}
    );
  }

  private uptime(milliseconds: number) {
    return DurationUnit.values()
      .map(unit => {
        const value = Math.floor(milliseconds / unit.milliseconds);
        return {
          unit,
          value: unit.modulo ? value % unit.modulo : value,
        };
      })
      .filter(({value}) => value > 0)
      .map(({unit, value}) => unit.format(value))
      .join(', ');
  }
}
