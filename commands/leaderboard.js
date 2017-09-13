const Discord = require('discord.js');

const app = require('../app');

const db = app.db;

const leaderboardChannels =
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
