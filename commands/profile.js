const Discord = require('discord.js');

const app = require('../app');
const messages = require('../messages');

const db = app.db;
const leaderboardChannels = messages.leaderboardChannels;
const statusEmojis = {
	'online': '<:online:462707431865188354>',
	'offline': '<:offline:462707499133304842>',
	'idle': '<:idle:462707524869816330>',
	'dnd': '<:dnd:462707542389161994>',
	'streaming': '<:streaming:462707566552547369>',
	'invisible': '<:invisible:462707587570204682>'
};

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
			const roles = member && member.roles.size > 1 ? member.roles.array().filter(role => role.id != message.guild.id).sort((a, b) => b.comparePositionTo(a)).join(', ') : null;
			let status = user.presence.status;
			if (status === 'dnd') {
				status = 'Do Not Disturb';
			} else {
					status = status.charAt(0).toUpperCase() + status.slice(1);
			}
			status = `${statusEmojis[user.presence.status]} ${status}`;
			const embed = new Discord.MessageEmbed()
				.setColor(member ? member.displayColor : 0xffffff)
				.setAuthor(member ? member.displayName : user.username, user.displayAvatarURL())
				.setImage(user.displayAvatarURL({size: 2048}))
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
