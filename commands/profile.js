const Discord = require('discord.js');

const app = require('../app');

const db = app.db;

const messageChannels =
['198658074876182538',  // #lounge
	'260546095082504202',  // #vexchat
	'342822239076483074',  // #vexforum
	'198658294007463936',  // #coding
	'272921946352648192',  // #suggestionbox
	'198658419945635840',  // #voicechat
	'260546551255007232',  // #memes
	'197818075796471808',  // #admins
	'329477820076130306'];  // Dev server.

module.exports = async (message, args) => {
	let user, member;
	if (!args) {
		user = message.author;
		member = message.member;
	} else {
		console.log(message.mentions);
		user = message.mentions.users.first();
		member = message.mentions.members ? message.mentions.members.first() : null;
	}
	if (user) {
		try {
			const document = message.guild ? await db.collection('counts').aggregate()
				.match({'_id.guild': message.guild.id, '_id.channel': {$in: messageChannels}, '_id.user': user.id})
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
				.setThumbnail(user.displayAvatarURL)
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
