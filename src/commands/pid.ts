import { Message, MessageEmbed } from 'discord.js';

import { addFooter, Command } from '..';

class PidCommand implements Command {
    async execute(message: Message): Promise<Message> {
        let reply = await message.channel.send("http://georgegillard.com/documents/2-introduction-to-pid-controllers");
    }
}

export default new PidCommand();