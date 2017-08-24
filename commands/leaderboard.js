const Discord = require('discord.js');

const app = require('../app');

const db = app.db;

const leaderboardChannels = ['198658074876182538', '260546095082504202',
	'342822239076483074', '198658294007463936', '198658294007463936',
	'272921946352648192', '198658419945635840', '197818075796471808',
	'260546551255007232',
	'329477820076130306'];  // Dev server.

module.exports = (message, args, embed) => {
	db.collection('counts').aggregate()
		.match({'_id.guild': message.guild.id, '_id.channel': {$in: leaderboardChannels}})
		.group({_id: '$_id.user', count: {$sum: '$count'}})
		.sort({count: -1})
		.limit(20)
		//.explain().then(result => console.log(result.executionStats.totalDocsExamined)).catch(console.error);
		.toArray().then(users => {
		const embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription('**Users with no lives:**\n');
		message.channel.send({embed}).then(reply => {
			embed.setDescription(embed.description + users.map(user => `<@${user._id}>: \`${user.count} messages\``).join('\n'));
			reply.edit({embed})
				.then(reply => app.addFooter(message, embed, reply))
				.catch(console.error);
		}).catch(console.error);
	}).catch(console.error);
};
