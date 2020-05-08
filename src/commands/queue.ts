import { Message } from 'discord.js';

import { Command } from '..';
import * as music from '../music';

class QueueCommand implements Command {
  async execute(message: Message): Promise<void> {
    if (message.member) {
      const queue = music.getQueue(message.guild.id);
    } else {
      message.reply('that command is only available in servers.');
    }
  }
}

export default new QueueCommand();
