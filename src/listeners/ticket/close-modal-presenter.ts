import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Interaction,
} from 'discord.js';
import {TButtonId, InputId, ModalId} from '../../lib/ticket';

@ApplyOptions<Listener.Options>({event: Events.InteractionCreate})
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
      .setTitle('Enter your information for verification')
      .setComponents(
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId(InputId.Resolution)
            .setLabel('Resolution')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
                'Provide a reason to why you are closing this ticket.'
            )
            .setRequired(true)
        ),
      );
    await interaction.showModal(closeModal);
  }
}
