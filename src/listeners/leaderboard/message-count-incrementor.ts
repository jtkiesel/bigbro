import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import type {Message} from 'discord.js';
import {messageCounter} from '../..';

@ApplyOptions<Listener.Options>({event: Events.MessageCreate})
export class MessageCreateListener extends Listener<
  typeof Events.MessageCreate
> {
  public override async run(message: Message) {
    await messageCounter.count(message, 1);
  }
}
