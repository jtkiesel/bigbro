import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Interaction,
} from 'discord.js';
import {settingsManager} from '../..';
import {TButtonId, InputId, ModalId} from '../../lib/ticket';

@ApplyOptions<Listener.Options>({event: Events.InteractionCreate})
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

    const ticketModal = new ModalBuilder()
      .setCustomId(ModalId.Ticket)
      .setTitle('Enter your information for verification')
      .setComponents(
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId(InputId.Title)
            .setLabel('Title of the Ticket')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Do not provide sensitive information here.')
            .setMinLength(1)
            .setMaxLength(25)
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId(InputId.Explanation)
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
                'Provide an explanation of why you are making your ticket.'
            )
            .setRequired(true)
        ),
      );
    await interaction.showModal(ticketModal);
  }
}
