const Discord = require('discord.js');
const mongodb = require('mongodb');

const client = new Discord.Client();
const MongoClient = new mongodb.MongoClient();
const token = process.env.BIGBRO_TOKEN;
const mongodbUri = process.env.BIGBRO_DB;
const mongodbOptions = {
	keepAlive: 1,
	connectTimeoutMS: 30000,
	reconnectTries: 30,
	reconnectInterval: 5000
};
const prefix = '%';
const commandInfo = {
	ping: 'Pong!',
	uptime: 'Time since bot last restarted.',
	leaderboard: 'Users with the most messages on the server.',
	profile: 'Information about a user.'/*,
	prune: 'Get users with the fewest messages on the server.'*/
};
const commands = {};

let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;

let messages;

const handleCommand = message => {
	const slice = message.content.indexOf(' ');
	const cmd = message.content.slice(prefix.length, (slice < 0) ? message.content.length : slice);
	const args = (slice < 0) ? '' : message.content.slice(slice);

	if (commands.hasOwnProperty(cmd)) {
		commands[cmd](message, args);
	} else if (cmd === 'help') {
		const embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setTitle('Commands')
			.setDescription(helpDescription);
		message.channel.send({embed})
			.then(reply => addFooter(message, embed, reply))
			.catch(console.error);
	}
}

const addFooter = (message, embed, reply) => {
	const author = message.member ? message.member.displayName : message.author.username;

	embed.setFooter(`Triggered by ${author}`, message.author.displayAvatarURL)
		.setTimestamp(message.createdAt);
	reply.edit({embed});
}

const log = (message, type) => {
	if (message.guild && !message.author.bot) {
		const author = message.member ? message.member.displayName : message.author.username;
		const attachment = message.attachments.first();

		let color;
		switch (type) {
			case 'updated':
				color = 'GREEN';
				break;
			case 'deleted':
				color = 'RED';
				break;
			default:
				color = 'BLUE';
				break;
		}
		const embed = new Discord.RichEmbed()
			.setAuthor(author, message.author.displayAvatarURL)
			.setColor(color)
			.setTimestamp(message.createdAt);

		if (message.content) {
			embed.setDescription(message.content);
		}
		if (attachment) {
			embed.setImage(attachment.url || attachment.proxyUrl);
		}
		message.guild.channels.get('263385335105323015').send({embed}).then(reply => {
			reply.edit(`Message by ${message.author} ${type} in ${message.channel}:`, {embed});
		}).catch(console.error);
	}
};

client.on('ready', () => {
	console.log('Ready!');
	messages.update();
});

client.on('error', console.error);

client.on('message', message => {
	if (message.content.startsWith(prefix)) {
		handleCommand(message);
	}
	if (message.guild) {
		messages.upsertMessageInDb(message);
	}
});

client.on('messageUpdate', (oldMessage, newMessage) => {
	if (oldMessage.guild && oldMessage.content !== newMessage.content) {
		log(oldMessage, 'updated');
	}
});

client.on('messageDelete', message => {
	if (message.guild) {
		log(message, 'deleted');
		messages.upsertMessageInDb(message, -1);
	}
});

client.on('messageDeleteBulk', messageCollection => {
	messageCollection.forEach(message => {
		if (message.guild) {
			log(message, 'bulk deleted');
			messages.upsertMessageInDb(message, -1);
		}
	});
});

MongoClient.connect(mongodbUri, mongodbOptions).then(db => {
	module.exports.db = db;

	Object.keys(commandInfo).forEach(name => commands[name] = require('./commands/' + name));
	Object.entries(commandInfo).forEach(([name, desc]) => helpDescription += `\n\`${prefix}${name}\`: ${desc}`);

	messages = require('./messages');
	client.login(token).catch(console.error);
}).catch(console.error);

module.exports.client = client;
module.exports.addFooter = addFooter;
