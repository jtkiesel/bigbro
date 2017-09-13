const Discord = require('discord.js');

const app = require('../app');

const db = app.db;

module.exports = async (message, args) => {
	if (message.guild) {
		let count = 20;
		let min = 0;
		if (args) {
			args = args.trim().split(' ');
			if (Number.parseInt(args[0])) {
				count = Number.parseInt(args[0]);
			}
			if (Number.parseInt(args[1])) {
				min = Number.parseInt(args[1]);
			}
		}
		try {
			const guild = await message.guild.fetchMembers();
			let members = guild.members.filter(member => member.roles.size > 1);
			const users = await db.collection('counts').aggregate()
				.match({'_id.guild': message.guild.id, '_id.user': {$in: members.map(member => member.id)}})
				.group({_id: '$_id.user', count: {$sum: '$count'}})
				.toArray();
			members.forEach(member => {
				const user = users.find(user => user._id === member.id);
				member.messages = user ? user.count : 0;
			});
			console.log(min);
			members = members.filter(member => member.messages >= min).sort((a, b) => {
				const sort = a.messages - b.messages;
				if (sort) {
					return sort;
				}
				return a.joinedAt - b.joinedAt;
			}).array().slice(0, count).map(member => `${member}, ${Math.floor((Date.now() - member.joinedAt) / 86400000)} days, ${member.messages || 0} messages`).join('\n');
			message.channel.send(members).catch(console.error);
		} catch (err) {
			console.error(err);
		}
	}
};
