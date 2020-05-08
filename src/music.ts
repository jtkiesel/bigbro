import { MessageEmbed } from 'discord.js';
import { google } from 'googleapis';
import ytdl from 'ytdl-core';

import { client } from '.';

const youtube = google.youtube({version: 'v3', auth: process.env.GOOGLE_KEY});

const queue = [];
const voiceChannelId = {'197777408198180864': '197818048147750912', '329477820076130306': '329477820076130307'};
const textChannelId = {'197777408198180864': '370062723326803969', '329477820076130306': '329477820076130306'};

const padTime = time => String(time).padStart(2, '0');

const formatTime = seconds => {
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  seconds %= 60;
  minutes %= 60;

  return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
};

const getDuration = video => formatTime(video.info.length_seconds);

const getTitle = video => video.info.title;

const getUrl = video => `https://youtu.be/${video.info.video_id}`;

const getRequester = video => video.message.author;

const getImage = video => `https://i.ytimg.com/vi/${video.info.video_id}/hqdefault.jpg`;

const progressBarLength = 10 - 1;

const defaultTopic = `⏹️🔘${'▬'.repeat(progressBarLength)}[00:00:00]🔇 Try the %play command to listen to music.`;

const volumeEmojis = ['🔈', '🔉', '🔊'];

const skip = '\u23ED';

const getTopic = (video, progress) => {
  const progressBar = Math.ceil(progressBarLength * progress);

  return `▶️${'▬'.repeat(progressBar)}🔘${'▬'.repeat(progressBarLength - progressBar)}[${getDuration(video)}]${volumeEmojis[2]} ${getTitle(video)} - ${getRequester(video)}`;
};

const getVoiceConnection = async guild => {
  const voiceId = voiceChannelId[guild.id];
  const connection = guild.voiceConnection;

  if (connection && connection.channel.id === voiceId) {
    return connection;
  }
  const voiceChannel = guild.channels.cache.get(voiceId);

  if (voiceChannel && voiceChannel.joinable) {
    try {
      return await voiceChannel.join();
    } catch (err) {
      console.error(err);
    }
  }
};

const playNext = async guild => {
  const guildId = guild.id;
  const video = queue[guildId][0];

  if (video) {
    let dispatcher, collector, id;
    const stream = ytdl.downloadFromInfo(video.info, {filter: 'audioonly'});
    const textChannel = guild.channels.cache.get(textChannelId[guildId]);
    const connection = await getVoiceConnection(guild);
    dispatcher = connection.play(stream, { volume: false })
      .on('error', error => {
        console.error(error);
        dispatcher.emit('finish');
      })
      .on('finish', () => {
        stream.destroy();
        if (collector) {
          collector.stop();
        }
        clearInterval(id);
        queue[guildId].shift();

        if (queue[guildId].length) {
          playNext(guild);
        } else {
          textChannel.setTopic(defaultTopic).catch(console.error);
          connection.disconnect();
        }
      });
    const author = video.info.author;
    const requester = video.message.member ? video.message.member.displayName : video.message.author.username;
    const embed = new MessageEmbed()
      .setColor('BLUE')
      .setAuthor(author.name, author.avatar, author.user_url)
      .setTitle(getTitle(video))
      .setURL(getUrl(video))
      .setImage(getImage(video))
      .setFooter(`Requested by ${requester}`, video.message.author.displayAvatarURL())
      .setTimestamp(video.message.createdAt);
    let message;
    try {
      message = await textChannel.send('Now playing:', embed);
    } catch (err) {
      console.error(err);
      return;
    }
    collector = message.createReactionCollector((reaction, user) => user.id !== client.user.id && reaction.emoji.name === skip)
      .on('collect', (reaction, user) => {
        if (user.bot || !connection.channel.members.has(user.id)) {
          reaction.users.cache.remove(user);
        } else {
          const size = reaction.users.cache.filter(user => !user.bot).size;
          const required = Math.ceil(connection.channel.members.filter(member => !member.user.bot).size / 2);
          if (size >= required) {
            dispatcher.end();
          }
        }
      }).on('end', () => message.reactions.removeAll().catch(console.error));
    id = setInterval(() => {
      textChannel.setTopic(getTopic(video, Math.floor(dispatcher.streamTime / 1000) / video.info.length_seconds)).catch(console.error);
    }, Math.floor(300 * video.info.length_seconds / progressBarLength));

    if (message) {
      message.react(skip).catch(console.error);
    }
  }
};

const getQueue = guildId => {
  return queue[guildId] || [];
};

const sendQueue = message => {
  const guildQueue = queue[message.guild.id];
  if (guildQueue && guildQueue.length > 1) {
    const embed = new MessageEmbed()
      .setColor('BLUE')
      .setDescription(guildQueue.slice(1).map((video, index) => `\`${String(index + 1).padStart(2, ' ')}.\` \`[${getDuration(video)}]\` [${getTitle(video)}](${getUrl(video)}) - ${getRequester(video)}`).join('\n'));
    message.channel.send(embed).catch(console.error);
  } else {
    message.reply('the music queue is currently empty.').catch(console.error);
  }
};

const newVideo = async (message, v) => {
  const guild = message.guild;
  const guildId = guild.id;
  let info;
  try {
    info = await ytdl.getInfo(v);
  } catch (err) {
    console.error(err);
  }
  const video = { message, info };

  if (!queue[guildId]) {
    queue[guildId] = [video];
  } else {
    queue[guildId].push(video);
  }
  if (queue[guildId].length === 1) {
    playNext(guild);
  } else {
    sendQueue(message);
  }
};

const search = async (query, limit) => {
  return new Promise((resolve, reject) => {
    youtube.search.list({part: 'snippet', type: 'video', q: query, maxResults: limit}, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response.data.items);
      }
    });
  });
};

export default {
  getDuration,
  getQueue,
  getRequester,
  getTitle,
  getUrl,
  newVideo,
  search,
  sendQueue
};
