const Discord = require('discord.js');

const app = require('../app');

const db = app.db;

const messageChannels = ['198658074876182538', '260546095082504202',
	'342822239076483074', '198658294007463936', '198658294007463936',
	'272921946352648192', '198658419945635840', '197818075796471808',
	'260546551255007232',
	'329477820076130306'];  // Dev server.

module.exports = (message, args, embed) => {
	let member;
	if (!args) {
		member = message.member;
	} else if (message.mentions.members.size) {
		member = message.mentions.members.first();
	}
	if (member) {
		db.collection('counts').aggregate()
			.match({'_id.guild': message.guild.id, '_id.channel': {$in: messageChannels}, '_id.user': member.id})
			.group({_id: '$_id.user', count: {$sum: '$count'}})
			.next().then(user => {
			const game = member.user.presence.game;
			const joinedDiscord = `${Math.floor((Date.now() - member.user.createdAt) / 86400000)} days ago`;
			const joinedServer = `${Math.floor((Date.now() - member.joinedAt) / 86400000)} days ago`;
			const roles = member.roles.size ? member.roles.filterArray(role => role.id != message.guild.id).sort((a, b) => b.calculatedPosition - a.calculatedPosition).join(', ') : '';

			let status = member.user.presence.status;
			switch (status) {
				case 'dnd':
					status = 'Do Not Disturb';
					break;
				default:
					status = status.charAt(0).toUpperCase() + status.slice(1);
					break;
			}
			const embed = new Discord.RichEmbed()
				.setColor(member.displayColor)
				.setAuthor(member.displayName, member.user.displayAvatarURL)
				.addField('Status', status, true)
				.addField('Joined Discord', joinedDiscord, true)
				.addField('Joined Server', joinedServer, true)
				.addField('Messages', user.count, true)
				.addField('Roles', roles, true)
				.setImage(member.user.displayAvatarURL);

			if (game) {
				embed.addField('Playing', game.name, true);
				if (game.url) {
					embed.addField('Streaming', game.url, true);
				}
			}

			message.channel.send({embed}).then(reply => {
				app.addFooter(message, embed, reply);
			}).catch(console.error);
		}).catch(console.error);
	} else {
		message.reply('please mention a user to obtain their profile.').catch(console.error);
	}
};
