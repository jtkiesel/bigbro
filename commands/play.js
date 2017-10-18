const Discord = require('discord.js');
const ytdl = require('ytdl-core');

const app = require('../app');

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
		const textChannel = guild.channels.get(textChannelId[guildId]);
		const voiceId = voiceChannelId[guildId];
		const author = video.info.author;
		const requester = video.message.member ? video.message.member.displayName : video.message.author.username;
		const embed = new Discord.RichEmbed()
			.setColor('BLUE')
			.setAuthor(author.name, author.avatar, author.user_url)
			.setTitle(getTitle(video))
			.setURL(getUrl(video))
			.setImage(video.info.iurlmaxres)
			.setFooter(`Requested by ${requester}`, video.message.author.displayAvatarURL)
			.setTimestamp(video.message.createdAt);
		let connection = guild.voiceConnection;

		await textChannel.setTopic(getTopic(video, 0));

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
		const stream = ytdl.downloadFromInfo(video.info, {filter: 'audioonly'});
		const dispatcher = connection.playStream(stream, {seek: 0, volume: 1});

		const id = setInterval(() => {
			textChannel.setTopic(getTopic(video, Math.floor(dispatcher.time / 1000) / video.info.length_seconds));
		}, Math.floor(300 * video.info.length_seconds / progressBarLength));

		dispatcher.on('end', reason => {
			clearInterval(id);
			queue[guildId].shift();

			if (queue[guildId].length) {
				playNext(guild);
			} else {
				textChannel.setTopic(defaultTopic);
				connection.disconnect();
			}
		});
		const skipSize = Math.ceil((connection.channel.members.size - 1) / 2) + 1;
		const message = await textChannel.send('Now playing:', {embed});

		await message.react(skip);

		message.awaitReactions((reaction, user) => {
			if (!connection.channel.members.has(user.id) && reaction.emoji.name === skip) {
				reaction.remove(user);
				return false;
			}
			return reaction.emoji.name === skip;
		}, {max: skipSize, time: video.info.length_seconds * 1000}).then(reactions => {
			if (reactions.get(skip).count >= skipSize) {
				dispatcher.end();
			}
			console.log('CLEARING REACTIONS.');
			message.clearReactions();
		}).catch(console.error);
	}
};

module.exports = async (message, args) => {
	if (message.member) {
		const guild = message.guild;
		const guildId = guild.id;
		const id = ytdl.getVideoID(args);

		if (id) {
			const info = await ytdl.getInfo(id);
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
		} else {
			message.reply('please provide a valid YouTube video.');
		}
	} else {
		message.reply('that command is only available in servers.');
	}
};

Object.entries(textChannelId).forEach(([guild, channel]) => app.client.guilds.get(channel));
