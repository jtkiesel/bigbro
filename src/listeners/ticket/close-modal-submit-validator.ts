import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  ChannelType,
  EmbedBuilder,
  GuildMember,
  type Interaction,
  type ModalSubmitInteraction,
} from "discord.js";
import { messageLogger } from "../../index.js";
import { Color } from "../../lib/embeds.js";
import { InputId, ModalId } from "../../lib/ticket.js";
import { userUrl } from "../../lib/user.js";

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isModalSubmit() ||
      interaction.customId !== ModalId.Close ||
      !interaction.channelId ||
      !interaction.inGuild()
    ) {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const resolution = interaction.fields
      .getTextInputValue(InputId.Resolution)
      .trim();
    if (!resolution) {
      return this.sendValidationFailure(
        interaction,
        "Resolution must contain at least 1 non-whitespace character",
      );
    }

    const ticketThreadId = interaction.channelId;
    const ticketThread =
      await interaction.client.channels.fetch(ticketThreadId);
    if (ticketThread?.type !== ChannelType.PrivateThread) {
      return;
    }

    await ticketThread.send({
      embeds: [
        new EmbedBuilder()
          .setColor(Color.Red)
          .setAuthor({
            name: interaction.user.tag,
            url: userUrl(interaction.user.id),
            iconURL: (interaction.member instanceof GuildMember
              ? interaction.member
              : interaction.user
            ).displayAvatarURL(),
          })
          .setTitle(`Ticket closed`)
          .setDescription(resolution)
          .setTimestamp(interaction.createdTimestamp),
      ],
    });

    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const member = await guild.members.fetch(interaction.member.user.id);

    messageLogger.logTicketClose(
      member,
      ticketThread,
      ticketThread.name,
      resolution,
      interaction.createdTimestamp,
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(Color.Green)
          .setDescription([`Ticket successfully closed.`].join(" ")),
      ],
    });

    await Promise.all([
      ticketThread.setLocked(true),
      ticketThread.setArchived(true),
    ]);

    return;
  }

  private async sendValidationFailure(
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
