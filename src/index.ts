import { Client, ColorResolvable, Constants, Message, MessageEmbed, PartialMessage, TextChannel, GuildMember } from 'discord.js';
import moment from 'moment-timer';
import { Db, MongoClient } from 'mongodb';
import { inspect } from 'util';

import * as messages from './messages';

import { doUnTimeout } from './commands/dq';

export interface Command {
  execute(message: Message, args: string): Promise<Message>;
}

export const client = new Client();
const token = process.env.BIGBRO_TOKEN;
const dbUri = process.env.BIGBRO_DB;
const ownerId = process.env.DISCORD_ID;
const mongoOptions = {
  retryWrites: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
};
const prefix = '%';
const commandInfo = {
  ping: 'Pong!',
  uptime: 'Time since bot last restarted.',
  leaderboard: 'Users with the most messages on the server.',
  profile: 'Information about a user.',
  play: 'Audio from a YouTube video.',
  search: 'Search YouTube to play audio from a video.',
  queue: 'Current music queue.',
  dq: 'Disqualify a user or users.',
};
const commands: { [key: string]: Command } = {};
const verifiersRoleId = '197816965899747328';
const rulesChannelId = '197777408198180864';
const welcomeMessage = `Welcome! To access this server, one of the <@&${verifiersRoleId}> must verify you.
Please take a moment to read our server <#${rulesChannelId}>, then send a message here with your name (or \
username) and team ID (such as "Kayley, 24B" or "Jordan, BNS"), and/or ask one of the \
<@&${verifiersRoleId}> for help.`;
const logChannelIds: { [key: string]: string } = {
  '197777408198180864': '263385335105323015',
  '329477820076130306': '709178148503420968'
};

let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;
let _db: Db;

export const db = (): Db => _db;

const clean = (text: string): string => {
  return text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`).slice(0, 1990);
};

export const addFooter = (message: Message, reply: Message): Promise<Message> => {
  const author = message.member?.displayName || message.author.username;
  const embed = reply.embeds[0].setFooter(`Triggered by ${author}`, message.author.displayAvatarURL())
    .setTimestamp(message.createdAt);
  return reply.edit(embed);
};

const reloadDQTimers = async (client: Client) => {
	await Promise.all(await db().collection('dqs').find().map(document => {
		const member = client.guilds.cache.get(document._id.guild).members.cache.get(document._id.user);
		
		// check if timer has lapsed while the bot was off, and if so free the prisoner
		if (moment().isSameOrAfter(moment(document.dqEndTime))) {
			return doUnTimeout(member)();
		}

		// still time left so just set the timers back up
		moment.duration(moment().diff(moment(document.dqEndTime))).timer({start: true}, doUnTimeout(member));
		return Promise.resolve();
	}).toArray());
};

const loginPromiseForwarder = (fn: Function) => (token: string) => { fn(); return token; };

const restart = (): Promise<string> => {
  client.destroy();
  return client.login(token).then(loginPromiseForwarder(reloadDQTimers));
};

const handleCommand = async (message: Message): Promise<void> => {
  const slice = message.content.indexOf(' ');
  const cmd = message.content.slice(prefix.length, (slice < 0) ? message.content.length : slice).toLowerCase();
  const args = (slice < 0) ? '' : message.content.slice(slice);

  if (commands[cmd]) {
    commands[cmd].execute(message, args).catch(console.error);
  } else if (cmd === 'help') {
    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setTitle('Commands')
      .setDescription(helpDescription);
    message.channel.send(embed)
      .then(reply => addFooter(message, reply))
      .catch(console.error);
  } else if (message.author.id === ownerId) {
    if (cmd === 'eval') {
      try {
        const evaled = /\s*await\s+/.test(args) ? (await eval(`const f = async () => {\n${args}\n};\nf();`)) : eval(args);
        const evaledString = (typeof evaled === 'string') ? evaled : inspect(evaled);
        message.channel.send(clean(evaledString), {code: 'xl'}).catch(console.error);
      } catch (error) {
        message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(error)}\`\`\``).catch(console.error);
      }
    } else if (cmd === 'restart') {
      restart();
    }
  }
};

const logEmbedColor = (action: string): ColorResolvable => {
  switch (action) {
  case 'updated':
    return Constants.Colors.GREEN;
  case 'deleted':
    return Constants.Colors.RED;
  case 'bulk deleted':
    return Constants.Colors.BLUE;
  default:
    return Constants.Colors.DEFAULT;
  }
};

const userUrl = (id: string): string => `https://discordapp.com/users/${id}`;

const log = async (message: Message | PartialMessage, action: string): Promise<Message> => {
  if (!message.guild || message.author.bot) {
    return;
  }
  const authorName = message.member?.displayName || message.author.username;
  const embed = new MessageEmbed()
    .setColor(logEmbedColor(action))
    .setAuthor(authorName, message.author.displayAvatarURL(), userUrl(message.author.id))
    .setDescription(message.content)
    .setTimestamp(message.createdAt);

  if (message.attachments.size) {
    embed.attachFiles(message.attachments.map(attachment => attachment.proxyURL));
  }
  const logChannel = message.guild.channels.cache.get(logChannelIds[message.guild.id]) as TextChannel;
  if (logChannel) {
    const content = ['Message', `${action} in ${message.channel}:\n${message.url}`];
    const logged = await logChannel.send(content.join(' '), embed);
    content.splice(1, 0, `by ${message.author}`);
    return logged.edit(content.join(' '));
  }
};

client.on(Constants.Events.CLIENT_READY, () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activity: {
      type: 'PLAYING',
      name: `${prefix}help`
    }
  }).catch(console.error);
  messages.updateGuilds().catch(console.error);
});

client.on(Constants.Events.CHANNEL_CREATE, channel => {
  if (channel.type === 'text') {
    messages.updateChannel(channel as TextChannel).catch(console.error);
  }
});

client.on(Constants.Events.GUILD_MEMBER_ADD, member => {
  member.guild.systemChannel.send(`${member} ${welcomeMessage}`).catch(console.error);
});

client.on(Constants.Events.MESSAGE_CREATE, message => {
  const mentionCount = message.mentions.members?.size;
  if (mentionCount > 10) {
    message.member.kick(`Mentioned ${mentionCount} users`);
  }
  if (message.content.startsWith(prefix)) {
    handleCommand(message).catch(console.error);
  }
  if (message.guild) {
    messages.upsertMessageInDb(message).catch(console.error);
  }
});

client.on(Constants.Events.MESSAGE_DELETE, message => {
  if (message.guild) {
    log(message, 'deleted').catch(console.error);
    messages.upsertMessageInDb(message, -1).catch(console.error);
  }
});

client.on(Constants.Events.MESSAGE_UPDATE, (oldMessage, newMessage) => {
  if (oldMessage.guild && oldMessage.content !== newMessage.content) {
    log(oldMessage, 'updated').catch(console.error);
  }
});

client.on(Constants.Events.MESSAGE_BULK_DELETE, messageCollection => {
  messageCollection.forEach(message => {
    if (message.guild) {
      log(message, 'bulk deleted').catch(console.error);
      messages.upsertMessageInDb(message, -1).catch(console.error);
    }
  });
});

client.on(Constants.Events.DISCONNECT, event => {
  console.error('Disconnect.');
  console.error(JSON.stringify(event));
  restart();
});

client.on(Constants.Events.ERROR, console.error);

client.on(Constants.Events.WARN, console.warn);

MongoClient.connect(dbUri, mongoOptions).then(mongoClient => {
  _db = mongoClient.db('bigbro');

  Object.entries(commandInfo).forEach(([name, desc]) => {
    commands[name.toLowerCase()] = require(`./commands/${name}`).default;
    helpDescription += `\n\`${prefix}${name}\`: ${desc}`;
  });

  client.login(token).then(loginPromiseForwarder(reloadDQTimers)).catch(console.error);
}).catch(console.error);
