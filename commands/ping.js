const Discord = require('discord.js');

const app = require('../app');

module.exports = (message, args) => {
	const time = Date.now();
	const embed = new Discord.RichEmbed()
		.setColor('RANDOM')
		.setDescription('🏓 Pong!');
	message.channel.send({embed}).then(msg => {
		embed.setDescription(`${embed.description} \`${(Date.now() - time) / 1000}s\``);
		msg.edit({embed})
			.then(reply => app.addFooter(message, embed, reply))
			.catch(console.error);
	}).catch(console.error);
};
