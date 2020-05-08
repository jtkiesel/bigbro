import { Message, MessageEmbed } from 'discord.js';

import { addFooter, Command } from '..';

class PingCommand implements Command {
  async execute(message: Message): Promise<void> {
    const ping = Date.now();
    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setDescription('🏓 Pong!');
    try {
      const reply = await message.channel.send(embed);
      reply.edit(embed.setDescription(`${embed.description} \`${(Date.now() - ping) / 1000}s\``))
        .then(reply => addFooter(message, reply))
        .catch(console.error);
    } catch (error) {
      console.error(error);
    }
  }
}

export default new PingCommand();
