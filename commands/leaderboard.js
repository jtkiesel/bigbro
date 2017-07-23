const Discord = require('discord.js');

const app = require('../app');

const leaderboardChannels = ['198658074876182538', '260546095082504202', '198658294007463936', '198658294007463936', '272921946352648192', '198658419945635840', '197818075796471808', '260546551255007232',
	'329477820076130306'];  // Dev server.

module.exports = (message, args, embed) => {
	app.db.collection('messages').aggregate([
		{$match: {g: message.guild.id, c: {$in: leaderboardChannels}, d: false}},
		{$group: {_id: '$u', count: {$sum: 1}}},
		{$sort: {count: -1}},
		{$limit: 20}
	]).toArray().then(users => {
		embed.setColor('RANDOM').setDescription('**Users with no lives:**\n');
		message.channel.send({embed}).then(reply => {
			embed.setDescription(embed.description + users.map(user => `<@${user._id}>: \`${user.count} messages\``).join('\n'));
			reply.edit({embed});
		}).catch(console.error);
	}).catch(console.error);
};
