import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {
  Message,
  MessageActionRow,
  MessageButton,
  PartialMessage,
} from 'discord.js';
import {messageLogger} from '../..';
import {MessageChangeType} from '../../lib/logging';

@ApplyOptions<Listener.Options>({event: Events.MessageUpdate})
export class MessageUpdateListener extends Listener<
  typeof Events.MessageUpdate
> {
  public override async run(
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    if (oldMessage.partial || oldMessage.author.bot || !oldMessage.inGuild()) {
      return;
    }

    const logChannel = await messageLogger.channelForGuild(oldMessage.guild);
    if (!logChannel) {
      return;
    }

    await logChannel.send({
      ...messageLogger.messageChange(
        oldMessage,
        MessageChangeType.UPDATED,
        newMessage.editedAt
      ),
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle('LINK')
            .setLabel('Message')
            .setURL(newMessage.url)
        ),
      ],
    });
  }
}
