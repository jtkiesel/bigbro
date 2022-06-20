import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {
  Interaction,
  MessageActionRow,
  Modal,
  ModalActionRowComponent,
  TextInputComponent,
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

    const modal = new Modal()
      .setCustomId(ModalId.VERIFY)
      .setTitle('Enter your information for verification')
      .addComponents(
        new MessageActionRow<ModalActionRowComponent>().addComponents(
          new TextInputComponent()
            .setCustomId(InputId.NAME)
            .setLabel('Name or preferred nickname')
            .setStyle('SHORT')
            .setMinLength(1)
            .setMaxLength(25)
            .setRequired(true)
        ),
        new MessageActionRow<ModalActionRowComponent>().addComponents(
          new TextInputComponent()
            .setCustomId(InputId.PROGRAM)
            .setLabel('Primary robotics competition program')
            .setStyle('SHORT')
            .setPlaceholder(
              Program.values()
                .map(({name}) => name)
                .join(', ')
            )
            .setMinLength(3)
            .setMaxLength(4)
            .setRequired(true)
        ),
        new MessageActionRow<ModalActionRowComponent>().addComponents(
          new TextInputComponent()
            .setCustomId(InputId.TEAM)
            .setLabel('Robotics competition team ID#')
            .setStyle('SHORT')
            .setMinLength(1)
            .setMaxLength(7)
        ),
        new MessageActionRow<ModalActionRowComponent>().addComponents(
          new TextInputComponent()
            .setCustomId(InputId.EXPLANATION)
            .setLabel('Explanation')
            .setStyle('PARAGRAPH')
            .setPlaceholder(
              'If program is None, explain how you are involved with VEX Robotics or why you joined the server'
            )
        )
      );
    await interaction.showModal(modal);
  }
}
