import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { Interaction } from "discord.js";
import { settingsManager } from "../../index.js";
import { TButtonId, ticketModal } from "../../lib/ticket.js";

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isButton() ||
      interaction.customId !== TButtonId.Ticket ||
      !interaction.inGuild()
    ) {
      return;
    }

    const guildSettings = await settingsManager.get(interaction.guildId);
    const ticketChannelId = guildSettings?.ticketChannel;
    if (interaction.channelId !== ticketChannelId) {
      return;
    }

    await interaction.showModal(ticketModal);
  }
}
