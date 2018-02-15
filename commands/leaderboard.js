const Discord = require('discord.js');

const app = require('../app');
const messages = require('../messages');

const client = app.client;
const db = app.db;
const addFooter = app.addFooter;
const leaderboardChannels = messages.leaderboardChannels;

const rankEmojis = ['🥇', '🥈', '🥉'];
const pageSize = 10;
const previous = '🔺';
const next = '🔻';

const getDescription = (users, index = 0) => {
	let description = '';
	for (let i = index; i < users.length && i < (index + pageSize); i++) {
		const user = users[i];
		let rank = i + 1;
		rank = (rank < 4) ? `${rankEmojis[rank - 1]}  ` : `**\`#${String(rank).padEnd(3)}\​\`**`;
		description += `${rank} <@${user._id}> \`${user.count} messages\`\n`;
	}
	return description;
};

module.exports = async (message, args) => {
	if (message.guild) {
		try {
			const leaderboard = await db.collection('counts').aggregate()
				.match({'_id.guild': message.guild.id, '_id.channel': {$in: leaderboardChannels}})
				.group({_id: '$_id.user', count: {$sum: '$count'}})
				.sort({count: -1})
				.toArray();
			const embed = new Discord.MessageEmbed()
				.setColor('RANDOM')
				.setTitle('Users with no lives:')
				.setDescription(getDescription(leaderboard));

			const reply = await message.channel.send({embed: embed});
			let index = 0;
			const collector = reply.createReactionCollector((reaction, user) => {
				return user.id !== client.user.id && (reaction.emoji.name === previous || reaction.emoji.name === next);
			}, {time: 30000, dispose: true});
			collector.on('collect', (reaction, user) => {
				if (user.id === message.author.id) {
					index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
					if (index >= leaderboard.length) {
						index = 0;
					} else if (index < 0) {
						index = Math.max(leaderboard.length - pageSize, 0);
					}
					reply.edit({embed: embed.setDescription(getDescription(leaderboard, index))});
				} else {
					reaction.users.remove(user);
				}
			});
			collector.on('remove', (reaction, user) => {
				if (user.id === message.author.id) {
					index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
					if (index >= leaderboard.length) {
						index = 0;
					} else if (index < 0) {
						index = Math.max(leaderboard.length - pageSize, 0);
					}
					reply.edit({embed: embed.setDescription(getDescription(leaderboard, index))});
				}
			});
			collector.on('end', (collected, reason) => {
				let users = reply.reactions.get(next).users;
				users.forEach(user => users.remove(user));
				users = reply.reactions.get(previous).users;
				users.forEach(user => users.remove(user));
				addFooter(message, embed, reply);
			});
			await reply.react(previous);
			await reply.react(next);
		} catch (err) {
			console.log(err);
		}
	}
};
