const Discord = require('discord.js');

const app = require('../app');

const leaderboardChannels = ['198658074876182538', '260546095082504202', '198658294007463936', '198658294007463936', '272921946352648192', '198658419945635840', '197818075796471808', '260546551255007232',
	'329477820076130306'];  // Dev server.

module.exports = (message, args) => {
	app.db.collection('messages').aggregate([
		{$match: {c: {$in: leaderboardChannels}, d: false}},
		{$group: {_id: '$u', count: {$sum: 1}}},
		{$sort: {count: -1}},
		{$limit: 20}
	]).toArray().then(users => {
		const embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('**Users with no lives:**\n');
		message.channel.send({embed}).then(reply => {
			embed.setDescription(embed.description + users.map(user => `<@${user._id}>: \`${user.count} messages\``).join('\n'));
			console.log('editing');
			reply.edit({embed});
		}).catch(console.error);
	}).catch(console.error);
};
