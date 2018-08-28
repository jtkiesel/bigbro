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
	reconnectInterval: 5000,
	useNewUrlParser: true
};
const prefix = '%';
const commandInfo = {
	ping: 'Pong!',
	uptime: 'Time since bot last restarted.',
	leaderboard: 'Users with the most messages on the server.',
	profile: 'Information about a user.',
	play: 'Audio from a YouTube video.',
	search: 'Search YouTube to play audio from a video.'
};
const commands = {};

let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;

let db, messages;

const clean = text => {
	if (typeof text === 'string') {
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
		const embed = new Discord.MessageEmbed()
			.setColor(color)
			.setDescription(`${message.member}\n${message.content}`)
			.setTimestamp(message.createdAt);

		if (message.attachments.size) {
			embed.attachFiles(message.attachments);
		}
		message.guild.channels.get('263385335105323015').send(`Message ${type} in ${message.channel}:`, {embed}).catch(console.error);
	}
};

client.on('rateLimit', console.log);

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

client.on('resume', () => {
	console.log('Resume.');
});

client.on('guildMemberAdd', member => {
	member.guild.systemChannel.send(`Welcome, ${member}! To access this server, one of the <@&197816965899747328> must verify you.\nPlease take a moment to read our server <#197777408198180864>, then send a message here with your name (or username) and team ID (such as "Kayley, 24B" or "Jordan, BNS"), and/or ask one of the <@&197816965899747328> for help.`);
});

client.on('message', message => {
	if (message.content.startsWith(prefix)) {
		handleCommand(message);
	}
	if (message.guild) {
		messages.upsertMessageInDb(message);
	}
});

client.on('messageDelete', message => {
	if (message.guild) {
		log(message, 'deleted');
		messages.upsertMessageInDb(message, -1);
	}
});

client.on('messageUpdate', (oldMessage, newMessage) => {
	if (oldMessage.guild && oldMessage.content !== newMessage.content) {
		log(oldMessage, 'updated');
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

client.on('disconnect', event => {
	console.error('Disconnect.');
	console.error(JSON.stringify(closeEvent));
	client.destroy().then(() => client.login(token).catch(console.error)).catch(console.error);
});

client.on('reconnecting', () => {
	console.log('Reconnecting.');
});

client.on('error', console.error);

client.on('warn', console.warn);

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
