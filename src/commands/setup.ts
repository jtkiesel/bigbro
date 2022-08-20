import {ApplyOptions} from '@sapphire/decorators';
import {isTextChannel} from '@sapphire/discord.js-utilities';
import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {SubcommandPluginCommand} from '@sapphire/plugin-subcommands';
import {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Permissions,
} from 'discord.js';
import {settingsManager} from '..';
import {Colors} from '../lib/embeds';
import {ButtonId} from '../lib/verification';

enum Subcommand {
  LOGGING = 'logging',
  VERIFICATION = 'verification',
}

const error = (interaction: Command.ChatInputInteraction, content: string) => {
  return interaction.reply({
    embeds: [new MessageEmbed().setColor(Colors.RED).setDescription(content)],
    ephemeral: true,
  });
};

@ApplyOptions<SubcommandPluginCommand.Options>({
  description: 'Setup features for this server',
  requiredUserPermissions: [Permissions.FLAGS.MANAGE_GUILD],
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
  subcommands: [
    {
      name: Subcommand.LOGGING,
      chatInputRun: async (interaction: Command.ChatInputInteraction) => {
        if (!interaction.inGuild()) {
          return error(interaction, 'Command only available in servers');
        }

        const guild = await interaction.client.guilds.fetch(
          interaction.guildId
        );
        if (!guild.me) {
          return error(interaction, 'I am not a member of this guild');
        }

        const channel = await guild.channels.fetch(
          interaction.options.getChannel(LoggingOption.CHANNEL, true).id
        );
        if (!channel) {
          return error(interaction, `Could not find ${channel} in this server`);
        }
        if (!channel.isText()) {
          return error(interaction, `${channel} is not a text channel`);
        }

        const missingChannelPermissions = guild.me
          .permissionsIn(channel)
          .missing([
            Permissions.FLAGS.VIEW_CHANNEL,
            Permissions.FLAGS.SEND_MESSAGES,
            Permissions.FLAGS.EMBED_LINKS,
            Permissions.FLAGS.ATTACH_FILES,
          ]);
        if (missingChannelPermissions.length) {
          return error(
            interaction,
            `I am missing the following permissions in ${channel}: ${missingChannelPermissions}`
          );
        }

        await settingsManager.set(guild.id, {loggingChannel: channel.id});

        await interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor(Colors.GREEN)
              .setDescription(`Action logging setup in ${channel}`),
          ],
          ephemeral: true,
        });
      },
    },
    {
      name: Subcommand.VERIFICATION,
      chatInputRun: async (interaction: Command.ChatInputInteraction) => {
        if (!interaction.inGuild()) {
          return error(interaction, 'Command only available in servers');
        }

        const guild = await interaction.client.guilds.fetch(
          interaction.guildId
        );
        if (!guild.me) {
          return error(interaction, 'I am not a member of this guild');
        }

        const missingPermissions = guild.me.permissions.missing([
          Permissions.FLAGS.MANAGE_NICKNAMES,
          Permissions.FLAGS.MANAGE_ROLES,
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

        const missingVerificationChannelPermissions = guild.me
          .permissionsIn(verificationChannel)
          .missing([
            Permissions.FLAGS.VIEW_CHANNEL,
            Permissions.FLAGS.SEND_MESSAGES,
            Permissions.FLAGS.EMBED_LINKS,
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
        if (guild.me.roles.highest.comparePositionTo(verifiedRole.id) <= 0) {
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
        if (!verifiedChannel.isText()) {
          return error(interaction, `${verifiedChannel} is not a text channel`);
        }

        const missingVerifiedChannelPermissions = guild.me
          .permissionsIn(verifiedChannel)
          .missing([
            Permissions.FLAGS.VIEW_CHANNEL,
            Permissions.FLAGS.SEND_MESSAGES,
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
            new MessageEmbed()
              .setColor(Colors.BLUE)
              .setTitle('Verification Required')
              .setDescription(
                'To access this server, your robotics competition information must be verified. Press the button below to get started!'
              ),
          ],
          components: [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId(ButtonId.VERIFY)
                .setStyle('SUCCESS')
                .setLabel('Verify')
            ),
          ],
        });

        await interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor(Colors.GREEN)
              .setTitle('Member verification setup')
              .addFields(
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
export class SetupCommand extends SubcommandPluginCommand {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      command =>
        command
          .setName(this.name)
          .setDescription(this.description)
          .addSubcommand(logging =>
            logging
              .setName(Subcommand.LOGGING)
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
              .setName(Subcommand.VERIFICATION)
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
