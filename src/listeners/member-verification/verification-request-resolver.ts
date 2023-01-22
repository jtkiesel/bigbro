import {userMention} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {EmbedBuilder, type Interaction, PermissionFlagsBits} from 'discord.js';
import {settingsManager} from '../..';
import {Color} from '../../lib/embeds';
import {Program} from '../../lib/robotics-program';
import {ButtonId, FieldName} from '../../lib/verification';

@ApplyOptions<Listener.Options>({event: Events.InteractionCreate})
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isButton() ||
      ![ButtonId.Approve, ButtonId.Deny].some(
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

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageThreads)) {
      await interaction.reply({
        ephemeral: true,
        content:
          'Please stop interacting with the components on this message. They are only for moderators.',
      });
      return;
    }

    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const messageId = interaction.message.id;
    const message = await channel.messages.fetch(messageId);
    const fields = message.embeds[0].fields;
    const userId = fields.find(({name}) => name === FieldName.UserId)!.value;

    if (interaction.customId === ButtonId.Approve) {
      const member = await guild.members.fetch(userId);
      const nickname = fields.find(
        ({name}) => name === FieldName.Nickname
      )!.value;
      const reason = `Verification request approved by ${interaction.user.tag}`;
      member.setNickname(nickname, reason);
      member.roles.add([verifiedRoleId, Program.None.role]);

      const verifiedChannelId = guildSettings.verifiedChannel;
      if (!verifiedChannelId) {
        return;
      }
      const verifiedChannel = await guild.channels.fetch(verifiedChannelId);
      if (!verifiedChannel?.isTextBased()) {
        return;
      }
      await verifiedChannel.send(`${member} Welcome!`);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.Green)
            .setDescription(`Verification request for ${member} approved`),
        ],
        ephemeral: true,
      });

      await channel.setArchived(true, reason);
    } else {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.Green)
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
