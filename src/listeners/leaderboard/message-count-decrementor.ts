import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import type {Message} from 'discord.js';
import {messageCounter} from '../..';

@ApplyOptions<Listener.Options>({event: Events.MessageDelete})
export class MessageDeleteListener extends Listener<
  typeof Events.MessageDelete
> {
  public override async run(message: Message) {
    await messageCounter.count(message, -1);
  }
}
