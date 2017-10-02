const Discord = require('discord.js');

const app = require('../app');
const messages = require('../messages');

const db = app.db;
const leaderboardChannels = messages.leaderboardChannels;

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
