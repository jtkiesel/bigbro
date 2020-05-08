import { Message } from 'discord.js';
import { youtube_v3 } from 'googleapis';
import ytdl from 'ytdl-core';

import * as music from '../music';
import { Command } from '..';

class PlayCommand implements Command {
  async execute(message: Message, args: string): Promise<void> {
    if (!message.member) {
      message.reply('that command is only available in servers.').catch(console.error);
      return;
    }
    if (ytdl.validateURL(args)) {
      music.newVideo(message, args).catch(console.error);
      return;
    }
    let videos: youtube_v3.Schema$SearchResult[];
    try {
      videos = await music.search(args, 1);
    } catch (error) {
      console.error(error);
      message.reply('search failed, please try again later.').catch(console.error);
      return;
    }
    if (!videos) {
      message.reply('no videos found for that query.').catch(console.error);
      return;
    }
    music.newVideo(message, videos[0].id.videoId).catch(console.error);
  }
}

export default new PlayCommand();
