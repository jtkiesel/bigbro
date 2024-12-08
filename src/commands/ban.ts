import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import {
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Color } from '../lib/embeds.js';
import { messageLogger, moderationLogs } from '../index.js';
import type { banLog } from '../lib/moderation.js';

@ApplyOptions<Command.Options>({
  description: 'Ban user',
  requiredClientPermissions: [PermissionFlagsBits.BanMembers],
  requiredUserPermissions: [PermissionFlagsBits.BanMembers],

  runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class BanCommand extends Command {

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      return;
    }
    const user = interaction.options.getUser(Option.User, true);
    const reason = interaction.options.getString(Option.Reason);
    const purge = interaction.options.getBoolean(Option.Purge);

    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const member = await guild.members.fetch(user);
    if (!member) {
      await interaction.reply({
        content: `Error: ${user} is not a member of this server`,
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
    const purgeTime = (!purge) ? 0 : 604800;

    const filter = { '_id.guild': interaction.guildId, '_id.user': member.id };

    const userBan: banLog = {
      date: new Date(),
      user: interaction.user.id,
      reason: reason
    };

    const update = {
      $push: {
        ban: userBan
      }
    };

    const options = { upsert: true };

    moderationLogs.findOneAndUpdate(filter, update, options);

    const embed = new EmbedBuilder()
      .setColor(Color.Red)
      .setTitle('You Have Been Banned')
      .addFields(
        { name: 'Server', value: `${guild.name}` },
        { name: 'Reason', value: reason },
      )
      .setTimestamp(interaction.createdTimestamp);

    await member.send({ embeds: [embed] });

    await member.ban({ deleteMessageSeconds: purgeTime, reason: reason })

    const ephemeralEmbed = new EmbedBuilder()
      .setColor(Color.Red)
      .setDescription(`${user.tag} banned`)

    await interaction.reply({
      embeds: [ephemeralEmbed],
      ephemeral: true,
    });

    await messageLogger.logMemberBan(
      member,
      interaction.user,
      reason,
      interaction.createdTimestamp
    );
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
          .addStringOption(reason =>
            reason
              .setName(Option.Reason)
              .setDescription('The reason for banning them')
              .setRequired(true)
          )
          .addBooleanOption(purge =>
            purge
              .setName(Option.Purge)
              .setDescription('Purge their messages?')
          ),
      { idHints: [] }
    );
  }
}

enum Option {
  User = 'user',
  Reason = 'reason',
  Purge = 'purge',
}
