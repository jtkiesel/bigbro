import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import axios from 'axios';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  GuildMember,
  Interaction,
  InteractionType,
  MessageActionRowComponentBuilder,
  ModalSubmitInteraction,
  PermissionsBitField,
} from 'discord.js';
import {robotEventsToken} from '../../lib/config';
import {Program} from '../../lib/robotics-program';
import {Color} from '../../lib/color';
import {ButtonId, FieldName, InputId, ModalId} from '../../lib/verification';
import {settingsManager} from '../..';
import {inlineCode} from '@discordjs/builders';

@ApplyOptions<Listener.Options>({event: Events.InteractionCreate})
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  private readonly axiosInstance = axios.create({
    baseURL: 'https://robotevents.com/api/v2',
    headers: {Authorization: `Bearer ${robotEventsToken}`},
  });

  public override async run(interaction: Interaction) {
    if (
      interaction.type !== InteractionType.ModalSubmit ||
      interaction.customId !== ModalId.VERIFY ||
      !interaction.inGuild()
    ) {
      return;
    }

    await interaction.deferReply({ephemeral: true});

    const name = interaction.fields.getTextInputValue(InputId.NAME).trim();
    if (!name) {
      return this.sendValidationFailure(
        interaction,
        'Name or preferred nickname must contain at least 1 non-whitespace character'
      );
    }
    if (!/^[ -{}~]*$/.test(name)) {
      return this.sendValidationFailure(
        interaction,
        'Name or preferred nickname may contain only the following non-alphanumeric characters: `` !"#$%&\'()*+,-./:;<=>?@[\\]^_`{}~``'
      );
    }

    const programName = interaction.fields
      .getTextInputValue(InputId.PROGRAM)
      .trim();
    const program = Program.values().find(
      ({name}) => name.toLowerCase() === programName.toLowerCase()
    );
    if (!program) {
      return this.sendValidationFailure(
        interaction,
        `Robotics competition program must be one of: ${Program.values()
          .map(({name}) => inlineCode(name))
          .join(', ')}`
      );
    }

    const teamNumber = interaction.fields
      .getTextInputValue(InputId.TEAM)
      .trim()
      .toUpperCase();
    if (program.teamRegExp && !program.teamRegExp.test(teamNumber)) {
      return this.sendValidationFailure(
        interaction,
        `Robotics competition team ID# must be a valid ${
          program.name
        } team ID#, for example: ${program.teamExamples
          .map(example => inlineCode(example))
          .join(', ')}`
      );
    }

    if (program.ids.length) {
      const {
        data: {data: teams},
      } = await this.axiosInstance.get<{data: unknown[]}>('/teams', {
        params: {program: program.ids, number: [teamNumber]},
      });
      if (!teams.length) {
        return this.sendValidationFailure(
          interaction,
          `No ${program.name} team with ID# ${teamNumber} has ever been registered`
        );
      }
    }

    const guildSettings = await settingsManager.get(interaction.guildId);
    const guild = await interaction.client.guilds.fetch(interaction.guildId);

    if (program === Program.None) {
      const explanation = interaction.fields
        .getTextInputValue(InputId.EXPLANATION)
        .trim();
      if (!explanation) {
        return this.sendValidationFailure(
          interaction,
          `By entering a robotics competition program of ${inlineCode(
            Program.None.name
          )}, you must provide an explanation`
        );
      }

      const verificationChannelId = guildSettings?.verificationChannel;
      if (!verificationChannelId) {
        return;
      }
      const verificationChannel = await guild.channels.fetch(
        verificationChannelId
      );
      if (verificationChannel?.type !== ChannelType.GuildText) {
        return;
      }
      const fetchedThreads = await verificationChannel.threads.fetchActive();
      const threadName = `Verifying User ${interaction.user.id}`;
      let thread = fetchedThreads.threads.find(({name}) => name === threadName);
      if (!thread) {
        thread = await verificationChannel.threads.create({
          name: threadName,
          reason: `Verification request for user ${interaction.user.id}`,
          type: ChannelType.GuildPrivateThread,
          invitable: false,
        });

        const roles = await guild.roles.fetch();
        await thread.send(
          [
            interaction.user,
            ...roles
              .filter(role =>
                role
                  .permissionsIn(verificationChannel)
                  .has(PermissionsBitField.Flags.ManageThreads)
              )
              .values(),
          ].join('')
        );
      }

      const verificationRequest = await thread.send({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.BLUE)
            .setAuthor({
              name: interaction.user.tag,
              url: `https://discord.com/users/${interaction.user.id}`,
              iconURL: (interaction.member instanceof GuildMember
                ? interaction.member
                : interaction.user
              ).displayAvatarURL(),
            })
            .setTitle('Verification request')
            .setDescription(explanation)
            .addFields(
              {name: FieldName.NICKNAME, value: name},
              {name: FieldName.USER_ID, value: interaction.user.id}
            )
            .setTimestamp(interaction.createdTimestamp),
        ],
        components: [
          new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(ButtonId.APPROVE)
              .setStyle(ButtonStyle.Success)
              .setLabel('Approve'),
            new ButtonBuilder()
              .setCustomId(ButtonId.DENY)
              .setStyle(ButtonStyle.Danger)
              .setLabel('Deny')
          ),
        ],
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.BLUE)
            .setDescription(
              [
                'Your information is being verified by the moderation team.',
                'You will receive a notification when you have been verified.',
                'If you have any questions or concerns, please send us a message by pressing the button below.',
              ].join(' ')
            ),
        ],
        components: [
          new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel('Help')
              .setURL(verificationRequest.url)
          ),
        ],
      });
    }

    if (!guildSettings?.verifiedRole) {
      return;
    }

    const member = await guild.members.fetch(interaction.member.user.id);

    const isCommonProgram = ['VRC', 'VEXU'].includes(program.name);
    const teamString = isCommonProgram
      ? teamNumber
      : [program.name, teamNumber].join(' ');
    const nickname = `${name}│${teamString}`;
    const reason = 'Automatic verification';

    await member.setNickname(nickname, reason);
    await member.roles.add([guildSettings.verifiedRole, program.role], reason);

    const verifiedChannelId = guildSettings.verifiedChannel;
    if (!verifiedChannelId) {
      return;
    }
    const verifiedChannel = await guild.channels.fetch(verifiedChannelId);
    if (verifiedChannel?.type !== ChannelType.GuildText) {
      return;
    }

    const verifiedMessage = await verifiedChannel.send(
      `${interaction.user} Welcome!`
    );

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(Color.GREEN)
          .setDescription(`You now have access to the ${guild} server!`),
      ],
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Say hello')
            .setURL(verifiedMessage.url)
        ),
      ],
    });
  }

  private async sendValidationFailure(
    interaction: ModalSubmitInteraction,
    description: string
  ) {
    const embed = new EmbedBuilder()
      .setColor(Color.RED)
      .setDescription(description);
    await interaction.editReply({embeds: [embed]});
  }
}
