import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export enum TButtonId {
  Close = 'close',
  Ticket = 'ticket',
}

export enum ModalId {
  Ticket = 'ticket',
  Close = 'close',
}

export enum InputId {
  Title = 'title',
  Explanation = 'explanation',
  Resolution = 'resolution,'
}

export const ticketModal = new ModalBuilder()
  .setCustomId(ModalId.Ticket)
  .setTitle('Enter your information for verification')
  .setComponents(
    new ActionRowBuilder<TextInputBuilder>().setComponents(
      new TextInputBuilder()
        .setCustomId(InputId.Title)
        .setLabel('Title')
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