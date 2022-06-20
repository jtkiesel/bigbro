import {ApplyOptions} from '@sapphire/decorators';
import {Command} from '@sapphire/framework';
import {MessageEmbed} from 'discord.js';
import {DurationUnit} from '../lib/duration';
import {Colors} from '../lib/embeds';

@ApplyOptions<Command.Options>({
  description: 'Get time since bot last restarted',
  chatInputCommand: {
    register: true,
    idHints: ['988533583431995392', '983913881221079070'],
  },
})
export class UptimeCommand extends Command {
  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    const uptime = interaction.client.uptime;
    if (uptime === null) {
      return interaction.reply({
        embeds: [
          new MessageEmbed()
            .setColor(Colors.RED)
            .setDescription('Could not obtain uptime'),
        ],
        ephemeral: true,
      });
    }

    await interaction.reply({
      embeds: [
        new MessageEmbed()
          .setColor(Colors.BLUE)
          .setDescription(`🕒 Uptime: ${this.uptime(uptime)}`),
      ],
      ephemeral: true,
    });
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
