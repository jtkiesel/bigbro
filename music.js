const Discord = require('discord.js');
const {google} = require('googleapis');
const ytdl = require('ytdl-core');

const app = require('./app');

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

const playNext = async guild => {
	const guildId = guild.id;
	const video = queue[guildId][0];

	if (video) {
		const stream = ytdl.downloadFromInfo(video.info, {filter: 'audioonly'});
		const textChannel = guild.channels.get(textChannelId[guildId]);
		const voiceId = voiceChannelId[guildId];
		let connection = guild.voiceConnection;

		if (!connection || connection.channel.id !== voiceId) {
			const voiceChannel = guild.channels.get(voiceId);

			if (voiceChannel && voiceChannel.joinable) {
				try {
					connection = await voiceChannel.join();
				} catch (err) {
					console.error(err);
				}
			} else {
				return;
			}
		}
		const dispatcher = connection.play(stream);
		const author = video.info.author;
		const requester = video.message.member ? video.message.member.displayName : video.message.author.username;
		const embed = new Discord.MessageEmbed()
			.setColor('BLUE')
			.setAuthor(author.name, author.avatar, author.user_url)
			.setTitle(getTitle(video))
			.setURL(getUrl(video))
			.setImage(getImage(video))
			.setFooter(`Requested by ${requester}`, video.message.author.displayAvatarURL)
			.setTimestamp(video.message.createdAt);
		let message;
		try {
			message = await textChannel.send('Now playing:', {embed});
		} catch (err) {
			console.error(err);
		}
		const collector = message.createReactionCollector((reaction, user) => {
			if (user.id === app.client.user.id || !reaction.emoji.name === skip) {
				return false;
			}
			return true;
		});
		collector.on('collect', (reaction, user) => {
			if (user.bot || !connection.channel.members.has(user.id)) {
				reaction.users.remove(user);
			} else {
				const size = reaction.users.filter(user => !user.bot).size;
				const required = Math.ceil(connection.channel.members.filter(member => !member.user.bot).size / 2);
				if (size >= required) {
					dispatcher.end();
				}
			}
		});
		collector.on('end', () => {
			const users = message.reactions.get(skip).users;
			users.forEach(user => users.remove(user));
		});
		const id = setInterval(() => {
			textChannel.setTopic(getTopic(video, Math.floor(dispatcher.streamTime / 1000) / video.info.length_seconds));
		}, Math.floor(300 * video.info.length_seconds / progressBarLength));

		dispatcher.on('end', () => {
			collector.stop();
			clearInterval(id);
			queue[guildId].shift();

			if (queue[guildId].length) {
				playNext(guild);
			} else {
				textChannel.setTopic(defaultTopic);
				connection.disconnect();
			}
		});
		try {
			await message.react(skip);
		} catch (err) {
			console.error(err);
		}
	}
};

const getQueue = guildId => {
	return queue[guildId] || [];
};

const sendQueue = message => {
	const guildQueue = queue[message.guild.id];
	if (guildQueue && guildQueue.length > 1) {
		const embed = new Discord.MessageEmbed()
			.setColor('BLUE')
			.setDescription(guildQueue.slice(1).map((video, index) => `\`${String(index + 1).padStart(2, ' ')}.\` \`[${getDuration(video)}]\` [${getTitle(video)}](${getUrl(video)}) - ${getRequester(video)}`).join('\n'));
		message.channel.send({embed});
	} else {
		message.reply('the music queue is currently empty.');
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
	const video = {message: message, info: info};

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

module.exports = {
	getDuration,
	getTitle,
	getUrl,
	getRequester,
	getQueue,
	sendQueue,
	newVideo,
	search
};
