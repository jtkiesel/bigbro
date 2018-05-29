const Discord = require('discord.js');
const mongodb = require('mongodb');
const util = require('util');

const client = new Discord.Client();
const MongoClient = mongodb.MongoClient;
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
	profile: 'Information about a user.',
	play: 'Audio from a YouTube video.'
};
const commands = {};

let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;

let db, messages;

const clean = text => {
	if (typeof(text) === 'string') {
		return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)).slice(0, 1990);
	}
	return text;
};

const handleCommand = message => {
	const slice = message.content.indexOf(' ');
	const cmd = message.content.slice(prefix.length, (slice < 0) ? message.content.length : slice);
	const args = (slice < 0) ? '' : message.content.slice(slice);

	if (commands.hasOwnProperty(cmd)) {
		commands[cmd](message, args);
	} else if (cmd === 'help') {
		const embed = new Discord.MessageEmbed()
			.setColor('RANDOM')
			.setTitle('Commands')
			.setDescription(helpDescription);
		message.channel.send({embed})
			.then(reply => addFooter(message, embed, reply))
			.catch(console.error);
	} else if (cmd === 'eval') {
		if (message.author.id === '197781934116569088') {
			try {
				let evaled = eval(args);
				if (typeof evaled !== 'string') {
					evaled = util.inspect(evaled);
				}
				message.channel.send(clean(evaled), {code: 'xl'});
			} catch (error) {
				message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(error)}\`\`\``);
			}
		} else {
			message.reply('you don\'t have permission to run that command.');
		}
	}
};

const addFooter = (message, embed, reply) => {
	const author = message.member ? message.member.displayName : message.author.username;

	embed.setFooter(`Triggered by ${author}`, message.author.displayAvatarURL())
		.setTimestamp(message.createdAt);
	reply.edit({embed});
};

const log = (message, type) => {
	if (message.guild && !message.author.bot) {
		const attachments = message.attachments.array();
		let color;
		switch (type) {
			case 'updated':
				color = 'GREEN';
				break;
			case 'deleted':
				color = 'RED';
				break;
			case 'bulk deleted':
				color = 'PINK';
				break;
			default:
				color = 'BLUE';
				break;
		}
		const embed = new Discord.MessageEmbed()
			.setColor(color)
			.setTimestamp(message.createdAt);

		embed.setDescription(`${message.member}\n${message.content}`);

		if (attachments.length) {
			for (let attachment of attachments) {
				if (attachment.hasOwnProperty('height')) {
					embed.setImage(attachment.url);
					break;
				}
			}
		}
		message.guild.channels.get('263385335105323015').send(`Message ${type} in ${message.channel}:`, {embed}).catch(console.error);
	}
};

const logAttachments = message => {
	if (message.author.id !== client.user.id) {
		const embed = new Discord.MessageEmbed()
			.setColor('BLUE')
			.setDescription(message.member)
			.setTimestamp(message.createdAt);

		let plural = '';
		const attachments = message.attachments.array();
		if (attachments.length > 0) {
			embed.attachFiles(attachments);
			plural = 's';
		}
		message.guild.channels.get('263385335105323015').send(`Attachment${plural} added in ${message.channel}:`, {embed}).catch(console.error);
	}
};

client.on('ready', async () => {
	console.log('Ready!');
	client.user.setActivity(`${prefix}help`, {url: 'https://github.com/jtkiesel/bigbro', type: 'PLAYING'});
	try {
		await messages.update();
	} catch (err) {
		console.error(err);
	}
	console.log('Done updating messages.');
});

client.on('error', console.error);

client.on('guildMemberAdd', member => {
	member.guild.systemChannel.send(`Welcome, ${member}! To access this server, one of the <@&197816965899747328> must verify you.\nPlease take a moment to read our server <#197777408198180864>, then send a message here with your name (or username) and team ID (such as "Kayley, 24B" or "Jordan, BNS"), and/or ask one of the <@&197816965899747328> for help.`);
});

client.on('message', message => {
	if (message.content.startsWith(prefix)) {
		handleCommand(message);
	}
	if (message.guild) {
		if (message.attachments.size > 0) {
			logAttachments(message);
		}
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

MongoClient.connect(mongodbUri, mongodbOptions).then(mongoClient => {
	db = mongoClient.db(mongodbUri.match(/\/([^/]+)$/)[1]);
	module.exports.db = db;

	Object.keys(commandInfo).forEach(name => commands[name] = require('./commands/' + name));
	Object.entries(commandInfo).forEach(([name, desc]) => helpDescription += `\n\`${prefix}${name}\`: ${desc}`);

	messages = require('./messages');
	client.login(token).catch(console.error);
}).catch(console.error);

module.exports.client = client;
module.exports.addFooter = addFooter;
