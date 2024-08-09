import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  userMention,
  type Interaction,
} from "discord.js";
import { settingsManager } from "../../index.js";
import { Color } from "../../lib/embeds.js";
import { Program } from "../../lib/robotics-program.js";
import { ButtonId, FieldName } from "../../lib/verification.js";

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isButton() ||
      ![ButtonId.Approve, ButtonId.Deny].some(
        (id) => id === interaction.customId,
      ) ||
      !interaction.inGuild()
    ) {
      return;
    }

    const channel = await interaction.client.channels.fetch(
      interaction.channelId,
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

    await interaction.deferReply({ ephemeral: true });

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageThreads)) {
      await interaction.followUp({
        content:
          "Please stop interacting with the components on this message. They are only for moderators.",
      });
      return;
    }

    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const messageId = interaction.message.id;
    const message = await channel.messages.fetch(messageId);
    const fields = message.embeds[0].fields;
    const userId = fields.find(({ name }) => name === FieldName.UserId)!.value;

    if (interaction.customId === ButtonId.Approve) {
      const member = await guild.members.fetch(userId);
      const nickname = fields.find(
        ({ name }) => name === FieldName.Nickname,
      )!.value;
      const reason = `Verification request approved by ${interaction.user.tag}`;
      member.setNickname(nickname, reason);
      member.roles.add([verifiedRoleId, Program.None.role]);

      const verifiedChannelId = guildSettings.verifiedChannel;
      if (!verifiedChannelId) {
        await interaction.followUp({
          content: "No verified channel set up.",
        });
        return;
      }
      const verifiedChannel = await guild.channels.fetch(verifiedChannelId);
      if (verifiedChannel?.type !== ChannelType.GuildText) {
        await interaction.followUp({
          content: "Verified channel is not a text channel.",
        });
        return;
      }
      await verifiedChannel.send(`${member} Welcome!`);

      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.Green)
            .setDescription(`Verification request for ${member} approved`),
        ],
      });

      await channel.setArchived(true, reason);
    } else {
      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor(Color.Green)
            .setDescription(
              `Verification request for ${userMention(userId)} denied`,
            ),
        ],
      });

      await channel.setArchived(
        true,
        `Verification request denied by ${interaction.user.tag}`,
      );
    }
  }
}
