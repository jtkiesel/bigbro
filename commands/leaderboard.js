const Discord = require('discord.js');

const app = require('../app');

const db = app.db;

const leaderboardChannels =
['260546095082504202',  // #vex
	'360136094500519946',  // #vexu
	'342822239076483074',  // #vexforum
	'198658294007463936',  // #coding
	'198658074876182538',  // #lounge
	'260546551255007232',  // #memes
	'197818075796471808',  // #admins
	'198658419945635840',  // #voicechat
	'329477820076130306'];  // Dev server.

module.exports = async (message, args) => {
	if (message.guild) {
		try {
			const users = await db.collection('counts').aggregate()
				.match({'_id.guild': message.guild.id, '_id.channel': {$in: leaderboardChannels}})
				.group({_id: '$_id.user', count: {$sum: '$count'}})
				.sort({count: -1})
				.limit(20)
				.toArray();
			const embed = new Discord.RichEmbed()
				.setColor('RANDOM')
				.setTitle('Users with no lives:')
				.setDescription(users.map(user => `<@${user._id}>: \`${user.count} messages\``).join('\n'));
			try {
				const reply = await message.channel.send({embed});
				app.addFooter(message, embed, reply);
			} catch (err) {
				console.error(err);
			}
		} catch (err) {
			console.error(err);
		}
	}
};
