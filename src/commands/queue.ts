import { Message } from 'discord.js';

import { Command } from '..';
import * as music from '../music';

class QueueCommand implements Command {
  async execute(message: Message): Promise<Message> {
    if (!message.guild) {
      return message.reply('that command is only available in servers.');
    }
    return music.sendQueue(message);
  }
}

export default new QueueCommand();
