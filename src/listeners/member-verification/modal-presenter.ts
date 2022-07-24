import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {
  ActionRowBuilder,
  Interaction,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {settingsManager} from '../..';
import {Program} from '../../lib/robotics-program';
import {ButtonId, InputId, ModalId} from '../../lib/verification';

@ApplyOptions<Listener.Options>({event: Events.InteractionCreate})
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isButton() ||
      interaction.customId !== ButtonId.VERIFY ||
      !interaction.inGuild()
    ) {
      return;
    }

    const guildSettings = await settingsManager.get(interaction.guildId);
    const verificationChannelId = guildSettings?.verificationChannel;
    if (interaction.channelId !== verificationChannelId) {
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(ModalId.VERIFY)
      .setTitle('Enter your information for verification')
      .addComponents(
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(InputId.NAME)
            .setLabel('Name or preferred nickname')
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(25)
            .setRequired(true)
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(InputId.PROGRAM)
            .setLabel('Primary robotics competition program')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(
              Program.values()
                .map(({name}) => name)
                .join(', ')
            )
            .setMinLength(3)
            .setMaxLength(4)
            .setRequired(true)
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(InputId.TEAM)
            .setLabel('Robotics competition team ID#')
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(7)
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(InputId.EXPLANATION)
            .setLabel('Explanation')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
              'If program is None, explain how you are involved with VEX Robotics or why you joined the server'
            )
        )
      );
    await interaction.showModal(modal);
  }
}
