import { Message, MessageEmbed } from 'discord.js';

import { addFooter, Command, db } from '..';
import { leaderboardChannels } from '../messages';

export type MessageCount = {
  _id: {
    guild: string;
    channel: string;
    user: string;
  };
  count: number;
};

export type LeaderboardUser = {
  _id: string;
  count: number;
};

const rankEmojis = ['🥇', '🥈', '🥉'];
const pageSize = 10;
const previous = '🔺';
const next = '🔻';

const getDescription = (users: LeaderboardUser[], index = 0): string => {
  let description = '';
  for (let i = index; i < users.length && i < (index + pageSize); i++) {
    const user = users[i];
    const rank = (i < 3) ? `\u200B ${rankEmojis[i]} \u200B \u200B \u200B \u200B` : `**\`#${String(i + 1).padEnd(3)}\`**`;
    description += `${rank} <@${user._id}> \`${user.count} messages\`\n`;
  }
  return description;
};

class LeaderboardCommand implements Command {
  async execute(message: Message): Promise<void> {
    if (!message.guild) {
      return;
    }
    try {
      const leaderboard = await db().collection<MessageCount>('messages').aggregate()
        .match({'_id.guild': message.guild.id, '_id.channel': {$in: leaderboardChannels}})
        .group<LeaderboardUser>({_id: '$_id.user', count: {$sum: '$count'}})
        .sort({count: -1})
        .toArray();
      const embed = new MessageEmbed()
        .setColor('RANDOM')
        .setTitle('Message Leaderboard:')
        .setDescription(getDescription(leaderboard));
      const reply = await message.channel.send(embed);
      let index = 0;
      const collector = reply.createReactionCollector((reaction, user) => {
        return user.id === message.author.id && [previous, next].includes(reaction.emoji.name);
      }, {time: 30000, dispose: true});
      collector.on('collect', (reaction) => {
        index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
        if (index >= leaderboard.length) {
          index = 0;
        } else if (index < 0) {
          index = Math.max(leaderboard.length - pageSize, 0);
        }
        reply.edit(embed.setDescription(getDescription(leaderboard, index))).catch(console.error);
      });
      collector.on('remove', (reaction, user) => {
        if (user.id === message.author.id) {
          index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
          if (index >= leaderboard.length) {
            index = 0;
          } else if (index < 0) {
            index = Math.max(leaderboard.length - pageSize, 0);
          }
          reply.edit(embed.setDescription(getDescription(leaderboard, index))).catch(console.error);
        }
      });
      collector.on('end', () => {
        reply.reactions.removeAll().catch(console.error);
        addFooter(message, reply);
      });
      await reply.react(previous);
      await reply.react(next);
    } catch (err) {
      console.error(err);
    }
  }
}

export default new LeaderboardCommand();
