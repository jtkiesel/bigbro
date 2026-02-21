import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Interaction,
} from "discord.js";
import { InputId, ModalId, TButtonId } from "../../lib/ticket.js";

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isButton() ||
      interaction.customId !== TButtonId.Close ||
      !interaction.inGuild()
    ) {
      return;
    }

    const closeModal = new ModalBuilder()
      .setCustomId(ModalId.Close)
      .setTitle("Enter your information for verification")
      .setLabelComponents(
        new LabelBuilder()
          .setLabel("Resolution")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(InputId.Resolution)
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder(
                "Provide a reason to why you are closing this ticket.",
              )
              .setRequired(true),
          ),
      );
    await interaction.showModal(closeModal);
  }
}
