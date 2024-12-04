import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  PermissionFlagsBits,
  EmbedBuilder,
  time,
  TimestampStyles,
  type ChatInputCommandInteraction,
} from "discord.js";
import { Color } from '../lib/embeds.js';
import { messageLogger, moderationLogs } from "../index.js";
import { DurationUnit } from "../lib/duration.js";
import type { timeoutLog } from '../lib/moderation.js';

@ApplyOptions<Command.Options>({
  description: "Timeout user",
  requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class TimeoutCommand extends Command {
  private static readonly MaxTimeoutMilliseconds = 2_419_200_000; // 28 days

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
    if (!member) {
      await interaction.reply({
        content: `Error: ${user} is not a member of this server`,
        ephemeral: true,
      });
      return;
    }

    const durationUnit = DurationUnit.fromName(unit);
    if (!durationUnit) {
      await interaction.reply({
        content: `Error: ${unit} is not a valid duration unit (${DurationUnit.values().join(", ")})`,
        ephemeral: true,
      });
      return;
    }

    const durationMilliseconds = durationUnit.millisFromCount(duration);
    const readableDuration = `${duration} ${unit}${duration !== 1 ? "s" : ""}`;
    if (durationMilliseconds > TimeoutCommand.MaxTimeoutMilliseconds) {
      await interaction.reply({
        content: `Error: ${readableDuration} is greater than the maximum timeout duration (28 days)`,
        ephemeral: true,
      });
      return;
    }

    if (!reason) {
      await interaction.reply({
        content: `Error: Timeouts require a reason.`,
        ephemeral: true,
      });
      return;
    }

    const filter = { '_id.guild': interaction.guildId!, '_id.user': member.id };

    const userTimeout: timeoutLog = {
      date: new Date(),
      duration: readableDuration,
      user: interaction.user.id,
      reason: reason
    };

    const update = {
      $push: {
        timeout: userTimeout
      }
    };

    const options = { upsert: true };

    moderationLogs.findOneAndUpdate(filter, update, options);

    await member.timeout(durationMilliseconds, reason ?? undefined);
    const expiration = new Date(interaction.createdTimestamp + durationMilliseconds);

    const embed = new EmbedBuilder()
      .setColor(Color.Red)
      .setTitle('You Have Been Timed Out')
      .addFields(
        { name: 'Server', value: `${guild.name}` },
        { name: 'Reason', value: reason },
        { name: 'Duration', value: readableDuration },
        {
          name: 'Expiration',
          value: time(expiration, TimestampStyles.RelativeTime),
          inline: true,
        },
      )
      .setTimestamp(interaction.createdTimestamp);

    await member.send({ embeds: [embed] });

    const ephemeralEmbed = new EmbedBuilder()
      .setColor(Color.Red)
      .setDescription(`${user.tag} timed out for ${readableDuration}`);

    await interaction.reply({
      embeds: [ephemeralEmbed],
      ephemeral: true,
    });

    messageLogger.logMemberTimeout(
      member,
      interaction.user,
      durationMilliseconds,
      readableDuration,
      reason,
      interaction.createdTimestamp,
    );
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (command) =>
        command
          .setName(this.name)
          .setDescription(this.description)
          .addUserOption((user) =>
            user
              .setName(Option.User)
              .setDescription("The user to timeout")
              .setRequired(true),
          )
          .addNumberOption((duration) =>
            duration
              .setName(Option.Duration)
              .setDescription("The duration of the timeout")
              .setRequired(true)
              .setMinValue(0),
          )
          .addStringOption((unit) =>
            unit
              .setName(Option.Unit)
              .setDescription("The unit of the timeout duration")
              .setRequired(true)
              .setChoices(
                DurationUnit.values().map(({ name }) => ({
                  name,
                  value: name,
                })),
              ),
          )
          .addStringOption((reason) =>
            reason
              .setName(Option.Reason)
              .setDescription("The reason for timing them out, if any")
              .setRequired(true),
          ),
      { idHints: ["988533580663779369", "984094351170883605"] },
    );
  }
}

enum Option {
  User = "user",
  Duration = "duration",
  Unit = "unit",
  Reason = "reason",
}
