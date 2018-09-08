const Discord = require('discord.js');
const ytdl = require('ytdl-core');

const app = require('../app');
const music = require('../music');

const searchEmojis = ['\u0031\u20E3', '\u0032\u20E3', '\u0033\u20E3', '\u0034\u20E3', '❌'];

module.exports = async (message, args) => {
	if (message.member) {
		let videos;
		try {
			videos = await music.search(args, 4);
		} catch (err) {
			console.error(err);
		}
		if (videos) {
			const results = [];
			for (let video of videos) {
				let info;
				try {
					info = await ytdl.getInfo(video.id.videoId);
				} catch (err) {
					console.error(err);
				}
				results.push({message, info});
			}

			const embed = new Discord.MessageEmbed()
				.setColor('BLUE')
				.setDescription(results.map((video, index) => `${searchEmojis[index]} \`[${music.getDuration(video)}]\` [${music.getTitle(video)}](${music.getUrl(video)})`).join('\n'));
			let reply;
			try {
				reply = await message.channel.send(`Search results for \`${args}\`:`, {embed});
			} catch (err) {
				console.error(err);
			}

			const collector = reply.createReactionCollector((reaction, user) => {
				if (user.id === app.client.user.id || !searchEmojis.includes(reaction.emoji.name)) {
					return false;
				}
				return true;
			});
			collector.on('collect', (reaction, user) => {
				if (user.id !== message.author.id) {
					reaction.users.remove(user);
				} else {
					collector.stop();
				}
			});
			collector.on('end', () => {
				searchEmojis.forEach((emoji, index) => {
					const users = reply.reactions.get(emoji).users;
					users.forEach(user => {
						if (user.id === message.author.id && index < (searchEmojis.length - 1)) {
							music.newVideo(message, videos[index].id.videoId);
						}
						users.remove(user);
					});
				});
			});

			for (let emoji of searchEmojis) {
				try {
					await reply.react(emoji);
				} catch (err) {
					console.error(err);
				}
			}
		} else {
			message.reply('no videos found for that query.');
		}
	}
};
