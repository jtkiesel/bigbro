import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  GuildMember,
  inlineCode,
  PermissionFlagsBits,
  type Interaction,
  type ModalSubmitInteraction,
  type ThreadChannel,
} from "discord.js";
import { settingsManager } from "../../index.js";
import { robotEventsToken } from "../../lib/config.js";
import { Color } from "../../lib/embeds.js";
import { Program } from "../../lib/robotics-program.js";
import type { Team } from "../../lib/team.js";
import { userUrl } from "../../lib/user.js";
import {
  ButtonId,
  FieldName,
  InputId,
  ModalId,
} from "../../lib/verification.js";

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isModalSubmit() ||
      interaction.customId !== ModalId.Verify ||
      !interaction.inGuild()
    ) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const name = interaction.fields.getTextInputValue(InputId.Name).trim();
    if (!name) {
      return this.sendError(
        interaction,
        "Name or preferred nickname must contain at least 1 non-whitespace character",
      );
    }
    if (!/^[ -{}~]*$/.test(name)) {
      return this.sendError(
        interaction,
        "Name or preferred nickname may contain only the following non-alphanumeric characters: `` !\"#$%&'()*+,-./:;<=>?@[\\]^_`{}~``",
      );
    }

    const programName = interaction.fields
      .getTextInputValue(InputId.Program)
      .trim();
    const program = Program.values().find(
      ({ name }) => name.toLowerCase() === programName.toLowerCase(),
    );
    if (!program) {
      return this.sendError(
        interaction,
        `Robotics competition program must be one of: ${Program.values()
          .map(({ name }) => inlineCode(name))
          .join(", ")}`,
      );
    }

    const teamNumber = interaction.fields
      .getTextInputValue(InputId.Team)
      .trim()
      .toUpperCase();
    if (program.teamRegExp && !program.teamRegExp.test(teamNumber)) {
      return this.sendError(
        interaction,
        `Robotics competition team ID# must be a valid ${program.name
        } team ID#, for example: ${program.teamExamples
          .map((example) => inlineCode(example))
          .join(", ")}`,
      );
    }

    let teamObject: Team[] = [];
    if (program.ids.length) {
      const parameters = new URLSearchParams({ "number[]": teamNumber });
      program.ids.forEach((id) =>
        parameters.append("program[]", id.toString()),
      );
      const response = await fetch(
        `https://www.robotevents.com/api/v2/teams?${parameters}`,
        { headers: { Authorization: `Bearer ${robotEventsToken}` } },
      );
      if (!response.ok) {
        await this.sendError(
          interaction,
          "Failed to obtain team information from Robot Events",
        );
        throw new Error(
          `Failed to fetch teams from Robot Events: ${response.status}`,
        );
      }
      const { data: teams } = (await response.json()) as { data: Team[] };
      if (!teams.length) {
        return this.sendError(
          interaction,
          `No ${program.name} team with ID# ${teamNumber} has ever been registered`,
        );
      }
      teamObject = teams;
    }

    const guildSettings = await settingsManager.get(interaction.guildId);
    const guild = await interaction.client.guilds.fetch(interaction.guildId);

    const verifiedRole = guildSettings?.verifiedRole;
    if (!verifiedRole) {
      return;
    }

    let locationRole = "";
    const rolesDictionary = Object.fromEntries(
      interaction.guild?.roles.cache
        .filter(role => role.position < (guild.roles.cache.get(verifiedRole)?.position ?? 0))
        .map(role => [role.name.toLowerCase(), role.id]) ?? []
    );
    if (program.ids.length) {
      const [{ location }] = teamObject;
      const region = location.region?.toLowerCase();
      const regionRole =
        region && region in rolesDictionary
          ? rolesDictionary[region as keyof typeof rolesDictionary]
          : undefined;
      if (regionRole !== undefined) {
        locationRole = regionRole;
      } else {
        const country = location.country.toLowerCase();
        const countryRole =
          country in rolesDictionary
            ? rolesDictionary[country as keyof typeof rolesDictionary]
            : undefined;
        if (countryRole !== undefined) {
          locationRole = countryRole;
        }
      }
    }

    if (program === Program.None) {
      const explanation = interaction.fields
        .getTextInputValue(InputId.Explanation)
        .trim();
      if (!explanation) {
        return this.sendError(
          interaction,
          `By entering a robotics competition program of ${inlineCode(
            Program.None.name,
          )}, you must provide an explanation`,
        );
      }

      const verificationChannelId = guildSettings?.verificationChannel;
      if (!verificationChannelId) {
        return;
      }
      const verificationChannel = await guild.channels.fetch(
        verificationChannelId,
      );
      if (verificationChannel?.type !== ChannelType.GuildText) {
        return;
      }
      const fetchedThreads = await verificationChannel.threads.fetchActive();
      const threadName = `Verifying User ${interaction.user.id}`;
      let thread: ThreadChannel | undefined = fetchedThreads.threads.find(
        ({ type, name }) =>
          type === ChannelType.PrivateThread && name === threadName,
      );
      if (!thread) {
        thread = await verificationChannel.threads.create({
          name: threadName,
          reason: `Verification request for user ${interaction.user.id}`,
          type: ChannelType.PrivateThread,
          invitable: false,
        });

        const roles = await guild.roles.fetch();
        await thread.send(
          [
            interaction.user,
            ...roles
              .filter((role) =>
                role
                  .permissionsIn(verificationChannel)
                  .has(PermissionFlagsBits.ManageThreads),
              )
              .values(),
          ].join(""),
        );
      }

      const verificationRequest = await thread.send({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.Blue)
            .setAuthor({
              name: interaction.user.tag,
              url: userUrl(interaction.user.id),
              iconURL: (interaction.member instanceof GuildMember
                ? interaction.member
                : interaction.user
              ).displayAvatarURL(),
            })
            .setTitle("Verification request")
            .setDescription(explanation)
            .setFields(
              { name: FieldName.Nickname, value: name },
              { name: FieldName.UserId, value: interaction.user.id },
            )
            .setTimestamp(interaction.createdTimestamp),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId(ButtonId.Approve)
              .setStyle(ButtonStyle.Success)
              .setLabel("Approve"),
            new ButtonBuilder()
              .setCustomId(ButtonId.Deny)
              .setStyle(ButtonStyle.Danger)
              .setLabel("Deny"),
          ),
        ],
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.Blue)
            .setDescription(
              [
                "Your information is being verified by the moderation team.",
                "You will receive a notification when you have been verified.",
                "If you have any questions or concerns, please send us a message by pressing the button below.",
              ].join(" "),
            ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel("Help")
              .setURL(verificationRequest.url),
          ),
        ],
      });
    }

    const member = await guild.members.fetch(interaction.member.user.id);

    const nickname = this.nickname(name, program, teamNumber);
    const reason = "Automatic verification";
    const roles = [verifiedRole, program.role];

    if (locationRole !== "") {
      roles.push(locationRole);
    }

    await Promise.all([
      member.setNickname(nickname, reason),
      member.roles.add(roles, reason),
    ]);

    const verifiedChannelId = guildSettings.verifiedChannel;
    if (!verifiedChannelId) {
      return;
    }
    const verifiedChannel = await guild.channels.fetch(verifiedChannelId);
    if (verifiedChannel?.type !== ChannelType.GuildText) {
      return;
    }

    const verifiedMessage = await verifiedChannel.send(
      `${interaction.user} Welcome!`,
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(Color.Green)
          .setDescription(`You now have access to the ${guild} server!`),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Say hello")
            .setURL(verifiedMessage.url),
        ),
      ],
    });
  }

  private nickname(name: string, program: Program, teamNumber: string) {
    if (program === Program.Viqc) {
      return name;
    }
    const isCommonProgram = [Program.Vrc, Program.VexU].includes(program);
    const team = isCommonProgram
      ? teamNumber
      : [program.name, teamNumber].join(" ");
    return [name, team].join("│");
  }

  private async sendError(
    interaction: ModalSubmitInteraction,
    description: string,
  ) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(Color.Red).setDescription(description),
      ],
    });
  }
}
