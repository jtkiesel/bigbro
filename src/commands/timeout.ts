import {bold} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import {DurationUnit} from '../lib/duration';
import {Color} from '../lib/embeds';
import {messageLogger} from '..';
import {userUrl} from '../lib/user';

@ApplyOptions<Command.Options>({
  description: 'Timeout user',
  requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class TimeoutCommand extends Command {
  private static readonly MillisecondsByUnit = DurationUnit.values().reduce(
    (map, unit) => map.set(unit.name, unit.milliseconds),
    new Map<string, number>()
  );

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      return;
    }
    const user = interaction.options.getUser(Option.User, true);
    const duration = interaction.options.getNumber(Option.Duration, true);
    const unit = interaction.options.getString(Option.Unit, true);
    const reason = interaction.options.getString(Option.Reason);

    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const member = await guild.members.fetch(user);
    await member.timeout(
      duration * TimeoutCommand.MillisecondsByUnit.get(unit)!,
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
      .setColor(Color.Blue)
      .setAuthor({
        name: user.tag,
        url: userUrl(user.id),
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
              .setName(Option.User)
              .setDescription('The user to timeout')
              .setRequired(true)
          )
          .addNumberOption(duration =>
            duration
              .setName(Option.Duration)
              .setDescription('The duration of the timeout')
              .setRequired(true)
              .setMinValue(0)
          )
          .addStringOption(unit =>
            unit
              .setName(Option.Unit)
              .setDescription('The unit of the timeout duration')
              .setRequired(true)
              .setChoices(
                ...[...TimeoutCommand.MillisecondsByUnit.keys()].map(name => ({
                  name,
                  value: name,
                }))
              )
          )
          .addStringOption(reason =>
            reason
              .setName(Option.Reason)
              .setDescription('The reason for timing them out, if any')
          ),
      {idHints: ['988533580663779369', '984094351170883605']}
    );
  }
}

enum Option {
  User = 'user',
  Duration = 'duration',
  Unit = 'unit',
  Reason = 'reason',
}
