const Discord = require('discord.js');
const ytdl = require('ytdl-core');

const app = require('../app');
const music = require('../music');

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
		const dispatcher = connection.playStream(stream);
		const author = video.info.author;
		const requester = video.message.member ? video.message.member.displayName : video.message.author.username;
		const embed = new Discord.RichEmbed()
			.setColor('BLUE')
			.setAuthor(author.name, author.avatar, author.user_url)
			.setTitle(getTitle(video))
			.setURL(getUrl(video))
			.setImage(getImage(video))
			.setFooter(`Requested by ${requester}`, video.message.author.displayAvatarURL)
			.setTimestamp(video.message.createdAt);
		const message = await textChannel.send('Now playing:', {embed});

		await message.react(skip);

		const collector = new Discord.ReactionCollector(message, (reaction, user) => {
			if (user.id === app.client.user.id || !reaction.emoji.name === skip) {
				console.log('1');
				return false;
			}
			if (user.bot || !connection.channel.members.has(user.id)) {
				console.log('2');
				reaction.remove(user);
				return false;
			}
			console.log('3');
			return true;
		});

		collector.on('collect', (reaction, c) => {
			const size = c.collected.first().users.filter(user => !user.bot).size;
			const required = Math.ceil(connection.channel.members.filter(member => !member.user.bot).size / 2);
			console.log(`size: ${size}`);
			console.log(`required: ${required}`);
			if (size >= required) {
				c.stop();
				dispatcher.end();
			}
		});

		collector.on('end', (collected, reason) => {
			message.clearReactions();
		});

		const id = setInterval(() => {
			textChannel.setTopic(getTopic(video, Math.floor(dispatcher.time / 1000) / video.info.length_seconds));
		}, Math.floor(300 * video.info.length_seconds / progressBarLength));

		dispatcher.on('end', reason => {
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
	}
};

const newVideo = async (message, v) => {
	const guild = message.guild;
	const guildId = guild.id;
	const info = await ytdl.getInfo(v);
	const video = {message: message, info: info};

	if (!queue[guildId]) {
		queue[guildId] = [video];
	} else {
		queue[guildId].push(video);
	}
	if (queue[guildId].length === 1) {
		playNext(guild);
	} else {
		const embed = new Discord.RichEmbed()
			.setColor('BLUE')
			.setDescription(queue[guildId].slice(1).map((video, index) => `\`${String(index + 1).padStart(2, ' ')}.\` \`[${getDuration(video)}]\` [${getTitle(video)}](${getUrl(video)}) - ${getRequester(video)}`).join('\n'));
		message.channel.send({embed});
	}
};

module.exports = async (message, args) => {
	if (message.member) {
		if (ytdl.validateURL(args)) {
			newVideo(message, args);
		} else {
			const videos = await music.search(args, 1);

			if (videos) {
				newVideo(message, videos[0].id.videoId);
			} else {
				message.reply('no videos found for that query.');
			}
		}
	} else {
		message.reply('that command is only available in servers.');
	}
};

//Object.entries(textChannelId).forEach(([guild, channel]) => app.client.guilds.get(channel));
