import { Constants, Guild, Message, MessageEmbed, TextChannel, VoiceChannel, VoiceConnection, User } from 'discord.js';
import { google, youtube_v3 } from 'googleapis';
import ytdl from 'ytdl-core';

import { client } from '.';

export type Video = {
  message: Message;
  info: ytdl.videoInfo;
};

const voiceChannelId: { [key: string]: string } = {
  '197777408198180864': '197818048147750912',
  '329477820076130306': '329477820076130307'
};
const textChannelId: { [key: string]: string } = {
  '197777408198180864': '370062723326803969',
  '329477820076130306': '329477820076130306'
};
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.GOOGLE_KEY
});
const queue: { [key: string]: Video[] } = {};

const padTime = (time: number): string => String(time).padStart(2, '0');

const formatTime = (seconds: number): string => {
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  seconds %= 60;
  minutes %= 60;

  return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
};

export const getDuration = (video: Video): string => formatTime(parseInt(video.info.length_seconds));

export const getTitle = (video: Video): string => video.info.title;

export const getUrl = (video: Video): string => `https://youtu.be/${video.info.video_id}`;

export const getRequester = (video: Video): User => video.message.author;

const getImage = (video: Video): string => `https://i.ytimg.com/vi/${video.info.video_id}/hqdefault.jpg`;

const progressBarLength = 9;

const defaultTopic = `⏹️🔘${'▬'.repeat(progressBarLength)}[00:00:00]🔇 Try the %play command to listen to music.`;

const volumeEmojis = ['🔈', '🔉', '🔊'];

const skip = '\u23ED';

const getTopic = (video: Video, progress: number): string => {
  const progressBar = Math.ceil(progressBarLength * progress);

  return `▶️${'▬'.repeat(progressBar)}🔘${'▬'.repeat(progressBarLength - progressBar)}[${getDuration(video)}]${volumeEmojis[2]} ${getTitle(video)} - ${getRequester(video)}`;
};

const getVoiceConnection = async (guild: Guild): Promise<VoiceConnection> => {
  const voiceId = voiceChannelId[guild.id];
  const connection = guild.voice?.connection;
  if (connection && connection.channel.id === voiceId) {
    return connection;
  }
  const voiceChannel = guild.channels.cache.get(voiceId) as VoiceChannel;
  if (voiceChannel && voiceChannel.joinable) {
    return await voiceChannel.join();
  }
};

const playNext = async (guild: Guild): Promise<void> => {
  const guildId = guild.id;
  const video = queue[guildId][0];
  if (!video) {
    return;
  }
  const stream = ytdl.downloadFromInfo(video.info, { filter: 'audioonly' });
  const textChannel = guild.channels.cache.get(textChannelId[guildId]) as TextChannel;
  const connection = await getVoiceConnection(guild);
  const dispatcher = connection.play(stream, { volume: false });
  const author = video.info.author;
  const requester = video.message.member?.displayName || video.message.author.username;
  const embed = new MessageEmbed()
    .setColor(Constants.Colors.BLUE)
    .setAuthor(author.name, author.avatar, author.user_url)
    .setTitle(getTitle(video))
    .setURL(getUrl(video))
    .setImage(getImage(video))
    .setFooter(`Requested by ${requester}`, video.message.author.displayAvatarURL())
    .setTimestamp(video.message.createdAt);
  let message: Message;
  try {
    message = await textChannel.send('Now playing:', embed);
  } catch (err) {
    console.error(err);
  }
  const collector = message?.createReactionCollector((reaction, user) => user.id !== client.user.id && reaction.emoji.name === skip)
    .on('collect', (reaction, user) => {
      if (user.bot || !connection.channel.members.has(user.id)) {
        reaction.users.remove(user);
      } else {
        const size = reaction.users.cache.filter(user => !user.bot).size;
        const required = Math.ceil(connection.channel.members.filter(member => !member.user.bot).size / 2);
        if (size >= required) {
          dispatcher.end();
        }
      }
    }).on('end', () => message.reactions.removeAll().catch(console.error));

  const intervalId = setInterval(() => {
    textChannel.setTopic(getTopic(video, Math.floor(dispatcher.streamTime / 1000) / parseInt(video.info.length_seconds))).catch(console.error);
  }, Math.floor(300 * parseInt(video.info.length_seconds) / progressBarLength));

  dispatcher
    .on('error', error => {
      console.error(error);
      dispatcher.emit('finish');
    })
    .on('finish', () => {
      stream.destroy();
      collector?.stop();
      clearInterval(intervalId);
      queue[guildId].shift();

      if (queue[guildId].length) {
        playNext(guild).catch(console.error);
      } else {
        textChannel.setTopic(defaultTopic).catch(console.error);
        connection.disconnect();
      }
    });

  message?.react(skip).catch(console.error);
};

export const getQueue = (guildId: string): Video[] => queue[guildId] || [];

export const sendQueue = async (message: Message): Promise<Message> => {
  const guildQueue = queue[message.guild.id];
  if (!guildQueue?.length) {
    return message.reply('the music queue is currently empty.');
  }
  const embed = new MessageEmbed()
    .setColor(Constants.Colors.BLUE)
    .setDescription(guildQueue.slice(1).map((video, index) => `\`${String(index + 1).padStart(2, ' ')}.\` \`[${getDuration(video)}]\` [${getTitle(video)}](${getUrl(video)}) - ${getRequester(video)}`).join('\n'));
  return message.channel.send(embed);
};

export const newVideo = async (message: Message, videoId: string): Promise<void> => {
  const guild = message.guild;
  const guildId = guild.id;
  const info = await ytdl.getInfo(videoId);
  const video = { message, info };

  if (!queue[guildId]) {
    queue[guildId] = [video];
  } else {
    queue[guildId].push(video);
  }
  if (queue[guildId].length === 1) {
    await playNext(guild);
  } else {
    sendQueue(message);
  }
};

export const search = async (query: string, limit: number): Promise<youtube_v3.Schema$SearchResult[]> => {
  return new Promise((resolve, reject) => {
    youtube.search.list({ part: 'snippet', type: 'video', q: query, maxResults: limit }, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response.data.items);
      }
    });
  });
};
