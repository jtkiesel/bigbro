const Discord = require('discord.js');

const app = require('../app');
const messages = require('../messages');

const db = app.db;
const leaderboardChannels = messages.leaderboardChannels;

module.exports = async (message, args) => {
	let user, member;
	if (!args) {
		user = message.author;
		member = message.member;
	} else {
		user = message.mentions.users.first();
		member = message.mentions.members ? message.mentions.members.first() : null;
	}
	if (user) {
		try {
			const document = message.guild ? await db.collection('counts').aggregate()
				.match({'_id.guild': message.guild.id, '_id.channel': {$in: leaderboardChannels}, '_id.user': user.id})
				.group({_id: '$_id.user', count: {$sum: '$count'}})
				.next() : null;
			const game = user.presence.game;
			const joinedDiscord = `${Math.floor((Date.now() - user.createdAt) / 86400000)} days ago`;
			const joinedServer = member ? `${Math.floor((Date.now() - member.joinedAt) / 86400000)} days ago` : null;
			const messages = document ? document.count : 0;
			const roles = member && member.roles.size > 1 ? member.roles.filterArray(role => role.id != message.guild.id).sort((a, b) => b.calculatedPosition - a.calculatedPosition).join(', ') : null;
			let status = user.presence.status;
			switch (status) {
				case 'dnd':
					status = 'Do Not Disturb';
					break;
				default:
					status = status.charAt(0).toUpperCase() + status.slice(1);
					break;
			}
			const embed = new Discord.RichEmbed()
				.setColor(member ? member.displayColor : 0xffffff)
				.setAuthor(member ? member.displayName : user.username, user.displayAvatarURL)
				.setImage(user.displayAvatarURL)
				.addField('Status', status, true)
				.addField('Joined Discord', joinedDiscord, true);
			if (member) {
				embed.addField('Joined Server', joinedServer, true);
				embed.addField('Messages', messages, true);
			}
			if (roles) {
				embed.addField('Roles', roles, true);
			}
			if (game) {
				embed.addField('Playing', game.name, true);
				if (game.url) {
					embed.addField('Streaming', game.url, true);
				}
			}
			try {
				const reply = await message.channel.send({embed});
				app.addFooter(message, embed, reply);
			} catch (err) {
				console.error(err);
			}
		} catch (err) {
			console.error(err);
		};
	} else {
		message.reply('please mention a user to obtain their profile.').catch(console.error);
	}
};
