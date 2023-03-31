import {ApplyOptions} from '@sapphire/decorators';
import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {Subcommand} from '@sapphire/plugin-subcommands';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from 'discord.js';
import {settingsManager} from '..';
import {Color} from '../lib/embeds';
import {ButtonId} from '../lib/verification';

enum SubcommandName {
  Logging = 'logging',
  Verification = 'verification',
}

const error = (interaction: ChatInputCommandInteraction, content: string) => {
  return interaction.followUp({
    embeds: [new EmbedBuilder().setColor(Color.Red).setDescription(content)],
    ephemeral: true,
  });
};

@ApplyOptions<Subcommand.Options>({
  description: 'Setup features for this server',
  requiredUserPermissions: [PermissionsBitField.Flags.ManageGuild],
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
  subcommands: [
    {
      name: SubcommandName.Logging,
      chatInputRun: async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply({ephemeral: true});

        if (!interaction.inGuild()) {
          await error(interaction, 'Command only available in servers');
          return;
        }

        const guild = await interaction.client.guilds.fetch(
          interaction.guildId
        );
        if (!guild.members.me) {
          await error(interaction, 'I am not a member of this server');
          return;
        }

        const channel = await guild.channels.fetch(
          interaction.options.getChannel(LoggingOption.Channel, true).id
        );
        if (!channel) {
          await error(interaction, `Could not find ${channel} in this server`);
          return;
        }
        if (!channel.isTextBased()) {
          await error(interaction, `${channel} is not a text channel`);
          return;
        }

        const missingChannelPermissions = guild.members.me
          .permissionsIn(channel)
          .missing([
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles,
          ]);
        if (missingChannelPermissions.length) {
          await error(
            interaction,
            `I am missing the following permissions in ${channel}: ${missingChannelPermissions}`
          );
          return;
        }

        await settingsManager.set(guild.id, {loggingChannel: channel.id});

        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor(Color.Green)
              .setDescription(`Action logging setup in ${channel}`),
          ],
          ephemeral: true,
        });
      },
    },
    {
      name: SubcommandName.Verification,
      chatInputRun: async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply({ephemeral: true});

        if (!interaction.inGuild()) {
          await error(interaction, 'Command only available in servers');
          return;
        }

        const guild = await interaction.client.guilds.fetch(
          interaction.guildId
        );
        if (!guild.members.me) {
          await error(interaction, 'I am not a member of this server');
          return;
        }

        const missingPermissions = guild.members.me.permissions.missing([
          PermissionsBitField.Flags.ManageNicknames,
          PermissionsBitField.Flags.ManageRoles,
        ]);
        if (missingPermissions.length) {
          await error(
            interaction,
            `I am missing the following permissions: ${missingPermissions}`
          );
          return;
        }

        const verificationChannelId = interaction.options.getChannel(
          VerificationOption.VerificationChannel,
          true
        ).id;
        const verificationChannel = await guild.channels.fetch(
          verificationChannelId
        );
        if (!verificationChannel) {
          await error(
            interaction,
            `Could not find ${verificationChannel} in this server`
          );
          return;
        }
        if (verificationChannel.type !== ChannelType.GuildText) {
          await error(
            interaction,
            `${verificationChannel} is not a text channel`
          );
          return;
        }

        const missingVerificationChannelPermissions = guild.members.me
          .permissionsIn(verificationChannel)
          .missing([
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
          ]);
        if (missingVerificationChannelPermissions.length) {
          await error(
            interaction,
            `I am missing the following permissions in ${verificationChannel}: ${missingVerificationChannelPermissions}`
          );
          return;
        }

        const verifiedRole = interaction.options.getRole(
          VerificationOption.VerifiedRole,
          true
        );
        if (
          guild.members.me.roles.highest.comparePositionTo(verifiedRole.id) <= 0
        ) {
          await error(
            interaction,
            `I do not have permission to assign ${verifiedRole} to users`
          );
          return;
        }

        const verifiedChannelId = interaction.options.getChannel(
          VerificationOption.VerifiedChannel,
          true
        ).id;
        const verifiedChannel = await guild.channels.fetch(verifiedChannelId);
        if (!verifiedChannel) {
          await error(
            interaction,
            `Could not find ${verifiedChannel} in this server`
          );
          return;
        }
        if (!verifiedChannel.isTextBased()) {
          await error(interaction, `${verifiedChannel} is not a text channel`);
          return;
        }

        const missingVerifiedChannelPermissions = guild.members.me
          .permissionsIn(verifiedChannel)
          .missing([
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ]);
        if (missingVerifiedChannelPermissions.length) {
          await error(
            interaction,
            `I am missing the following permissions in ${verifiedChannel}: ${missingVerifiedChannelPermissions}`
          );
          return;
        }

        await settingsManager.set(interaction.guildId, {
          verificationChannel: verificationChannelId,
          verifiedRole: verifiedRole.id,
          verifiedChannel: verifiedChannelId,
        });

        await verificationChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(Color.Blue)
              .setTitle('Verification Required')
              .setDescription(
                'To access this server, your robotics competition information must be verified. Press the button below to get started!'
              ),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
              new ButtonBuilder()
                .setCustomId(ButtonId.Verify)
                .setStyle(ButtonStyle.Success)
                .setLabel('Verify')
            ),
          ],
        });

        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setColor(Color.Green)
              .setTitle('Member verification setup')
              .setFields(
                {name: 'Verification channel', value: `${verificationChannel}`},
                {name: 'Verified role', value: `${verifiedRole}`},
                {
                  name: 'Verified channel',
                  value: `${verifiedChannel}`,
                  inline: true,
                }
              ),
          ],
          ephemeral: true,
        });
      },
    },
  ],
})
export class SetupCommand extends Subcommand {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      command =>
        command
          .setName(this.name)
          .setDescription(this.description)
          .addSubcommand(logging =>
            logging
              .setName(SubcommandName.Logging)
              .setDescription('Setup action logging for this server')
              .addChannelOption(channel =>
                channel
                  .setName(LoggingOption.Channel)
                  .setDescription(
                    'The channel in which action logs will be sent'
                  )
                  .setRequired(true)
              )
          )
          .addSubcommand(verification =>
            verification
              .setName(SubcommandName.Verification)
              .setDescription('Setup member verification for this server')
              .addChannelOption(verificationChannel =>
                verificationChannel
                  .setName(VerificationOption.VerificationChannel)
                  .setDescription(
                    'The text channel in which users will begin the verification process'
                  )
                  .setRequired(true)
              )
              .addRoleOption(verifiedRole =>
                verifiedRole
                  .setName(VerificationOption.VerifiedRole)
                  .setDescription('The role to assign to verified users')
                  .setRequired(true)
              )
              .addChannelOption(verifiedChannel =>
                verifiedChannel
                  .setName(VerificationOption.VerifiedChannel)
                  .setDescription(
                    'The text channel to which users will be redirected after having been verified'
                  )
                  .setRequired(true)
              )
          ),
      {idHints: ['988533666722488380', '985249852550168646']}
    );
  }
}

enum LoggingOption {
  Channel = 'channel',
}

enum VerificationOption {
  VerificationChannel = 'verification-channel',
  VerifiedRole = 'verified-role',
  VerifiedChannel = 'verified-channel',
}
