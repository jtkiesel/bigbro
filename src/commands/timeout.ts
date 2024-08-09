import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { messageLogger } from "../index.js";
import { DurationUnit } from "../lib/duration.js";

@ApplyOptions<Command.Options>({
  description: "Timeout user",
  requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class TimeoutCommand extends Command {
  private static readonly MaxTimeoutMilliseconds = 2_419_200_000; // 28 days
  private static readonly MillisecondsByUnit = DurationUnit.values().reduce(
    (map, unit) => map.set(unit.name, unit.milliseconds),
    new Map<string, number>(),
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
    if (!member) {
      await interaction.reply({
        content: `Error: ${user} is not a member of this server`,
        ephemeral: true,
      });
      return;
    }

    const durationMilliseconds =
      duration * TimeoutCommand.MillisecondsByUnit.get(unit)!;
    const readableDuration = `${duration} ${unit}${duration !== 1 ? "s" : ""}`;
    if (durationMilliseconds > TimeoutCommand.MaxTimeoutMilliseconds) {
      await interaction.reply({
        content: `Error: ${readableDuration} is greater than the maximum timeout duration (28 days)`,
        ephemeral: true,
      });
      return;
    }

    await member.timeout(durationMilliseconds, reason ?? undefined);

    await interaction.reply({
      content: `${user.tag} timed out for ${readableDuration}`,
      ephemeral: true,
    });

    await messageLogger.logMemberTimeout(
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
                ...[...TimeoutCommand.MillisecondsByUnit.keys()].map(
                  (name) => ({
                    name,
                    value: name,
                  }),
                ),
              ),
          )
          .addStringOption((reason) =>
            reason
              .setName(Option.Reason)
              .setDescription("The reason for timing them out, if any"),
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
