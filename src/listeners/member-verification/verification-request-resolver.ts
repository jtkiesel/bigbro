import {userMention} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {Interaction, MessageEmbed, Permissions} from 'discord.js';
import {settingsManager} from '../..';
import {Colors} from '../../lib/embeds';
import {Program} from '../../lib/robotics-program';
import {ButtonId, FieldName} from '../../lib/verification';

@ApplyOptions<Listener.Options>({event: Events.InteractionCreate})
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isButton() ||
      ![ButtonId.APPROVE, ButtonId.DENY].some(
        id => id === interaction.customId
      ) ||
      !interaction.inGuild()
    ) {
      return;
    }

    const channel = await interaction.client.channels.fetch(
      interaction.channelId
    );

    const guildSettings = await settingsManager.get(interaction.guildId);
    const verificationChannelId = guildSettings?.verificationChannel;
    const verifiedRoleId = guildSettings?.verifiedRole;

    if (
      !channel?.isThread() ||
      channel.parentId !== verificationChannelId ||
      !verifiedRoleId
    ) {
      return;
    }

    if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_THREADS)) {
      return interaction.reply({
        ephemeral: true,
        content:
          'Please stop interacting with the components on this message. They are only for moderators.',
      });
    }

    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const messageId = interaction.message.id;
    const message = await channel.messages.fetch(messageId);
    const fields = message.embeds[0].fields;
    const userId = fields.find(({name}) => name === FieldName.USER_ID)!.value;

    if (interaction.customId === ButtonId.APPROVE) {
      const member = await guild.members.fetch(userId);
      const nickname = fields.find(
        ({name}) => name === FieldName.NICKNAME
      )!.value;
      const reason = `Verification request approved by ${interaction.user.tag}`;
      member.setNickname(nickname, reason);
      member.roles.add([verifiedRoleId, Program.NONE.role]);

      await interaction.reply({
        embeds: [
          new MessageEmbed()
            .setColor(Colors.GREEN)
            .setDescription(`Verification request for ${member} approved`),
        ],
        ephemeral: true,
      });

      await channel.setArchived(true, reason);
    } else {
      await interaction.reply({
        embeds: [
          new MessageEmbed()
            .setColor(Colors.GREEN)
            .setDescription(
              `Verification request for ${userMention(userId)} denied`
            ),
        ],
        ephemeral: true,
      });

      await channel.setArchived(
        true,
        `Verification request denied by ${interaction.user.tag}`
      );
    }
  }
}
