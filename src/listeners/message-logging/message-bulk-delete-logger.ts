import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import type {Collection, Message, PartialMessage} from 'discord.js';
import {messageLogger} from '../..';

@ApplyOptions<Listener.Options>({event: Events.MessageBulkDelete})
export class MessageBulkDeleteListener extends Listener<
  typeof Events.MessageBulkDelete
> {
  public override async run(
    messages: Collection<string, Message | PartialMessage>
  ) {
    for (const message of messages.values()) {
      await messageLogger.logMessageDelete(message);
    }
  }
}
