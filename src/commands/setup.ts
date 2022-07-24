import {ApplyOptions} from '@sapphire/decorators';
import {isTextChannel} from '@sapphire/discord.js-utilities';
import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {Subcommand} from '@sapphire/plugin-subcommands';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  PermissionsBitField,
} from 'discord.js';
import {settingsManager} from '..';
import {Color} from '../lib/color';
import {ButtonId} from '../lib/verification';

enum SubcommandName {
  LOGGING = 'logging',
  VERIFICATION = 'verification',
}

const error = (interaction: ChatInputCommandInteraction, content: string) => {
  return interaction.reply({
    embeds: [new EmbedBuilder().setColor(Color.RED).setDescription(content)],
    ephemeral: true,
  });
};

@ApplyOptions<Subcommand.Options>({
  description: 'Setup features for this server',
  requiredUserPermissions: [PermissionsBitField.Flags.ManageGuild],
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
  subcommands: [
    {
      name: SubcommandName.LOGGING,
      chatInputRun: async (interaction: ChatInputCommandInteraction) => {
        if (!interaction.inGuild()) {
          return error(interaction, 'Command only available in servers');
        }

        const guild = await interaction.client.guilds.fetch(
          interaction.guildId
        );
        const me = await guild.members.fetchMe();

        const channel = await guild.channels.fetch(
          interaction.options.getChannel(LoggingOption.CHANNEL, true).id
        );
        if (!channel) {
          return error(interaction, `Could not find ${channel} in this server`);
        }
        if (channel.type !== ChannelType.GuildText) {
          return error(interaction, `${channel} is not a text channel`);
        }

        const missingChannelPermissions = me
          .permissionsIn(channel)
          .missing([
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles,
          ]);
        if (missingChannelPermissions.length) {
          return error(
            interaction,
            `I am missing the following permissions in ${channel}: ${missingChannelPermissions}`
          );
        }

        await settingsManager.set(guild.id, {loggingChannel: channel.id});

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Color.GREEN)
              .setDescription(`Action logging setup in ${channel}`),
          ],
          ephemeral: true,
        });
      },
    },
    {
      name: SubcommandName.VERIFICATION,
      chatInputRun: async (interaction: ChatInputCommandInteraction) => {
        if (!interaction.inGuild()) {
          return error(interaction, 'Command only available in servers');
        }

        const guild = await interaction.client.guilds.fetch(
          interaction.guildId
        );
        const me = await guild.members.fetchMe();

        const missingPermissions = me.permissions.missing([
          PermissionsBitField.Flags.ManageNicknames,
          PermissionsBitField.Flags.ManageRoles,
        ]);
        if (missingPermissions.length) {
          return error(
            interaction,
            `I am missing the following permissions: ${missingPermissions}`
          );
        }

        const verificationChannelId = interaction.options.getChannel(
          VerificationOption.VERIFICATION_CHANNEL,
          true
        ).id;
        const verificationChannel = await guild.channels.fetch(
          verificationChannelId
        );
        if (!verificationChannel) {
          return error(
            interaction,
            `Could not find ${verificationChannel} in this server`
          );
        }
        if (!isTextChannel(verificationChannel)) {
          return error(
            interaction,
            `${verificationChannel} is not a text channel`
          );
        }

        const missingVerificationChannelPermissions = me
          .permissionsIn(verificationChannel)
          .missing([
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.CreatePrivateThreads,
            PermissionsBitField.Flags.SendMessagesInThreads,
          ]);
        if (missingVerificationChannelPermissions.length) {
          return error(
            interaction,
            `I am missing the following permissions in ${verificationChannel}: ${missingVerificationChannelPermissions}`
          );
        }

        const verifiedRole = interaction.options.getRole(
          VerificationOption.VERIFIED_ROLE,
          true
        );
        if (me.roles.highest.comparePositionTo(verifiedRole.id) <= 0) {
          return error(
            interaction,
            `I do not have permission to assign ${verifiedRole} to users`
          );
        }

        const verifiedChannelId = interaction.options.getChannel(
          VerificationOption.VERIFIED_CHANNEL,
          true
        ).id;
        const verifiedChannel = await guild.channels.fetch(verifiedChannelId);
        if (!verifiedChannel) {
          return error(
            interaction,
            `Could not find ${verifiedChannel} in this server`
          );
        }
        if (verifiedChannel.type !== ChannelType.GuildText) {
          return error(interaction, `${verifiedChannel} is not a text channel`);
        }

        const missingVerifiedChannelPermissions = me
          .permissionsIn(verifiedChannel)
          .missing([
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ]);
        if (missingVerifiedChannelPermissions.length) {
          return error(
            interaction,
            `I am missing the following permissions in ${verifiedChannel}: ${missingVerifiedChannelPermissions}`
          );
        }

        await settingsManager.set(interaction.guildId, {
          verificationChannel: verificationChannelId,
          verifiedRole: verifiedRole.id,
          verifiedChannel: verifiedChannelId,
        });

        await verificationChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(Color.BLUE)
              .setTitle('Verification Required')
              .setDescription(
                'To access this server, your robotics competition information must be verified. Press the button below to get started!'
              ),
          ],
          components: [
            new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(ButtonId.VERIFY)
                .setStyle(ButtonStyle.Success)
                .setLabel('Verify')
            ),
          ],
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Color.GREEN)
              .setTitle('Member verification setup')
              .addFields(
                {
                  name: 'Verification channel',
                  value: verificationChannel.toString(),
                },
                {name: 'Verified role', value: verifiedRole.toString()},
                {
                  name: 'Verified channel',
                  value: verifiedChannel.toString(),
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
              .setName(SubcommandName.LOGGING)
              .setDescription('Setup action logging for this server')
              .addChannelOption(channel =>
                channel
                  .setName(LoggingOption.CHANNEL)
                  .setDescription(
                    'The channel in which action logs will be sent'
                  )
                  .setRequired(true)
              )
          )
          .addSubcommand(verification =>
            verification
              .setName(SubcommandName.VERIFICATION)
              .setDescription('Setup member verification for this server')
              .addChannelOption(verificationChannel =>
                verificationChannel
                  .setName(VerificationOption.VERIFICATION_CHANNEL)
                  .setDescription(
                    'The text channel in which users will begin the verification process'
                  )
                  .setRequired(true)
              )
              .addRoleOption(verifiedRole =>
                verifiedRole
                  .setName(VerificationOption.VERIFIED_ROLE)
                  .setDescription('The role to assign to verified users')
                  .setRequired(true)
              )
              .addChannelOption(verifiedChannel =>
                verifiedChannel
                  .setName(VerificationOption.VERIFIED_CHANNEL)
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
  CHANNEL = 'channel',
}

enum VerificationOption {
  VERIFICATION_CHANNEL = 'verification-channel',
  VERIFIED_ROLE = 'verified-role',
  VERIFIED_CHANNEL = 'verified-channel',
}
