import {bold} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
} from 'discord.js';
import {DurationUnit} from '../lib/duration';
import {Color} from '../lib/color';
import {messageLogger} from '..';

@ApplyOptions<Command.Options>({
  description: 'Timeout user',
  requiredClientPermissions: [PermissionsBitField.Flags.ModerateMembers],
  requiredUserPermissions: [PermissionsBitField.Flags.ModerateMembers],
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class TimeoutCommand extends Command {
  private static readonly MILLISECONDS_BY_UNIT = DurationUnit.values().reduce(
    (map, unit) => map.set(unit.name, unit.milliseconds),
    new Map<string, number>()
  );

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      return;
    }
    const user = interaction.options.getUser(Option.USER, true);
    const duration = interaction.options.getNumber(Option.DURATION, true);
    const unit = interaction.options.getString(Option.UNIT, true);
    const reason = interaction.options.getString(Option.REASON);

    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const member = await guild.members.fetch(user);
    await member.timeout(
      duration * TimeoutCommand.MILLISECONDS_BY_UNIT.get(unit)!,
      reason ?? undefined
    );

    const readableDuration = `${duration} ${unit}${duration !== 1 ? 's' : ''}`;
    await interaction.reply({
      content: `${user.tag} timed out for ${readableDuration}`,
      ephemeral: true,
    });

    const logChannel = await messageLogger.channelForGuild(guild);
    if (!logChannel) {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(Color.BLUE)
      .setAuthor({
        name: user.tag,
        url: `https://discord.com/users/${user.id}`,
        iconURL: member.displayAvatarURL(),
      })
      .setDescription(
        bold(`${user} timed out for ${readableDuration} by ${interaction.user}`)
      )
      .setFooter({text: `User ID: ${user.id}`})
      .setTimestamp(interaction.createdAt);
    if (reason) {
      embed.addFields({name: 'Reason', value: reason});
    }

    await logChannel.send({embeds: [embed]});
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      command =>
        command
          .setName(this.name)
          .setDescription(this.description)
          .addUserOption(user =>
            user
              .setName(Option.USER)
              .setDescription('The user to timeout')
              .setRequired(true)
          )
          .addNumberOption(duration =>
            duration
              .setName(Option.DURATION)
              .setDescription('The duration of the timeout')
              .setRequired(true)
              .setMinValue(0)
          )
          .addStringOption(unit =>
            unit
              .setName(Option.UNIT)
              .setDescription('The unit of the timeout duration')
              .setRequired(true)
              .setChoices(
                ...[...TimeoutCommand.MILLISECONDS_BY_UNIT.keys()].map(
                  name => ({
                    name,
                    value: name,
                  })
                )
              )
          )
          .addStringOption(reason =>
            reason
              .setName(Option.REASON)
              .setDescription('The reason for timing them out, if any')
          ),
      {idHints: ['988533580663779369', '984094351170883605']}
    );
  }
}

enum Option {
  USER = 'user',
  DURATION = 'duration',
  UNIT = 'unit',
  REASON = 'reason',
}
