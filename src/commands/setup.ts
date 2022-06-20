import {ApplyOptions} from '@sapphire/decorators';
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

@ApplyOptions<SubcommandPluginCommand.Options>({
  description: 'Setup features for this server',
  requiredUserPermissions: [Permissions.FLAGS.MANAGE_GUILD],
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
  subcommands: [
    {
      name: Subcommand.LOGGING,
      chatInputRun: async (interaction: Command.ChatInputInteraction) => {
        if (!interaction.inGuild()) {
          throw new Error('Not in guild');
        }

        const guild = await interaction.client.guilds.fetch(
          interaction.guildId
        );
        const channelId = interaction.options.getChannel(
          LoggingOption.CHANNEL,
          true
        ).id;
        const channel = await guild.channels.fetch(channelId);

        if (!channel?.isText()) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(`${channel} is not a text channel`),
            ],
            ephemeral: true,
          });
        }

        if (
          !guild.me?.permissionsIn(channel).has(Permissions.FLAGS.SEND_MESSAGES)
        ) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(
                  `I do not have permission to send messages in ${channel}`
                ),
            ],
            ephemeral: true,
          });
        }

        await settingsManager.set(interaction.guildId, {
          loggingChannel: channelId,
        });

        await interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor(Colors.GREEN)
              .setDescription(`Action logging setup in channel ${channel}`),
          ],
          ephemeral: true,
        });
      },
    },
    {
      name: Subcommand.VERIFICATION,
      chatInputRun: async (interaction: Command.ChatInputInteraction) => {
        if (!interaction.inGuild()) {
          throw new Error('Not in guild');
        }

        const guild = await interaction.client.guilds.fetch(
          interaction.guildId
        );

        if (!guild.me?.permissions.has(Permissions.FLAGS.MANAGE_NICKNAMES)) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription('I do not have permission to manage nicknames'),
            ],
            ephemeral: true,
          });
        }

        if (!guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription('I do not have permission to manage roles'),
            ],
            ephemeral: true,
          });
        }

        const verificationChannelId = interaction.options.getChannel(
          VerificationOption.VERIFICATION_CHANNEL,
          true
        ).id;
        const verificationChannel = await guild.channels.fetch(
          verificationChannelId
        );

        if (verificationChannel?.type !== 'GUILD_TEXT') {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(`${verificationChannel} is not a text channel`),
            ],
            ephemeral: true,
          });
        }

        if (
          !guild.me
            .permissionsIn(verificationChannel)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
        ) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(
                  `I do not have permission to view ${verificationChannel}`
                ),
            ],
            ephemeral: true,
          });
        }

        if (
          !guild.me
            .permissionsIn(verificationChannel)
            .has(Permissions.FLAGS.SEND_MESSAGES)
        ) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(
                  `I do not have permission to send messages in ${verificationChannel}`
                ),
            ],
            ephemeral: true,
          });
        }

        if (
          !guild.me
            .permissionsIn(verificationChannel)
            .has(Permissions.FLAGS.EMBED_LINKS)
        ) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(
                  `I do not have permission to embed links in ${verificationChannel}`
                ),
            ],
            ephemeral: true,
          });
        }

        const verifiedRole = interaction.options.getRole(
          VerificationOption.VERIFIED_ROLE,
          true
        );

        if (guild.me.roles.highest.comparePositionTo(verifiedRole.id) <= 0) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(
                  `I do not have permission to assign ${verifiedRole} to members`
                ),
            ],
            ephemeral: true,
          });
        }

        const verifiedChannelId = interaction.options.getChannel(
          VerificationOption.VERIFIED_CHANNEL,
          true
        ).id;
        const verifiedChannel = await guild.channels.fetch(verifiedChannelId);

        if (!verifiedChannel?.isText()) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(`${verifiedChannel} is not a text channel`),
            ],
            ephemeral: true,
          });
        }

        if (
          !guild.me
            .permissionsIn(verifiedChannel)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
        ) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(
                  `I do not have permission to view ${verifiedChannel}`
                ),
            ],
            ephemeral: true,
          });
        }

        if (
          !guild.me
            .permissionsIn(verifiedChannel)
            .has(Permissions.FLAGS.SEND_MESSAGES)
        ) {
          return interaction.reply({
            embeds: [
              new MessageEmbed()
                .setColor(Colors.RED)
                .setDescription(
                  `I do not have permission to send messages in ${verifiedChannel}`
                ),
            ],
            ephemeral: true,
          });
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
              .addField('Verification channel', verificationChannel.toString())
              .addField('Verified role', verifiedRole.toString())
              .addField('Verified channel', verifiedChannel.toString(), true),
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
