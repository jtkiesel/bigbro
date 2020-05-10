import { MessageEmbed, Message, Constants } from 'discord.js';
import { youtube_v3 } from 'googleapis';
import ytdl from 'ytdl-core';

import { Command } from '..';
import * as music from '../music';

const searchEmojis = ['\u0031\u20E3', '\u0032\u20E3', '\u0033\u20E3', '\u0034\u20E3', '❌'];

class SearchCommand implements Command {
  async execute(message: Message, args: string): Promise<Message> {
    if (!message.guild) {
      return message.reply('that command is only available in servers.');
    }
    let videos: youtube_v3.Schema$SearchResult[];
    try {
      videos = await music.search(args, 4);
    } catch (error) {
      console.error(error);
      return message.reply('search failed, please try again later.');
    }
    if (!videos) {
      return message.reply('no videos found for that query.');
    }
    const results: music.Video[] = [];
    for (const video of videos) {
      const info = await ytdl.getInfo(video.id.videoId);
      results.push({message, info});
    }

    const embed = new MessageEmbed()
      .setColor(Constants.Colors.BLUE)
      .setDescription(results.map((video, index) => `${searchEmojis[index]} \`[${music.getDuration(video)}]\` [${music.getTitle(video)}](${music.getUrl(video)})`).join('\n'));
    const reply = await message.channel.send(`Search results for \`${args}\`:`, embed);
    reply.createReactionCollector((reaction, user) => {
      return user.id === message.author.id && searchEmojis.includes(reaction.emoji.name);
    }, { max: 1, dispose: true })
      .on('collect', reaction => {
        const index = searchEmojis.findIndex(emoji => emoji === reaction.emoji.name);
        if (index >= 0 && index < searchEmojis.length - 1) {
          music.newVideo(message, videos[index].id.videoId).catch(console.error);
        }
      }).on('end', () => reply.reactions.removeAll().catch(console.error));

    for (const emoji of searchEmojis) {
      await reply.react(emoji);
    }
  }
}

export default new SearchCommand();
