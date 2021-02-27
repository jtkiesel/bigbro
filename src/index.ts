import { Client, ColorResolvable, Constants, GuildMember, Invite, Message, MessageEmbed, TextChannel, Permissions, GuildAuditLogs, Collection } from 'discord.js';
import moment from 'moment';
import 'moment-timer';
import { Db, MongoClient } from 'mongodb';
import { inspect } from 'util';

import { doUnTimeout, Dq } from './commands/dq';
import * as messages from './messages';
import { MemberVerifier } from './verify';

export interface Command {
  execute(message: Message, args: string): Promise<Message>;
}

type StoredInvite = {
  code: string;
  uses: number;
  inviter: string;
  expires: number;
};

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
  dq: 'Disqualify a user or users.',
};
const commands: { [key: string]: Command } = {};
const logChannelIds: { [key: string]: string } = {
  '197777408198180864': '263385335105323015',
  '329477820076130306': '709178148503420968'
};
const logMemberJoinChannelIds: { [key: string]: string } = {
  '197777408198180864': '263385335105323015',
  '329477820076130306': '709178148503420968'
};
const storedInvites: { [key: string]: { [key: string]: StoredInvite } } = {};

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

const inviteToStored = (invite: Invite): StoredInvite => {
  return {
    code: invite.code,
    uses: invite.uses,
    inviter: invite.inviter.id,
    expires: invite.expiresTimestamp
  };
};

const storeInvite = (invite: Invite, guildId?: string): void => {
  storedInvites[guildId || invite.guild.id][invite.code] = inviteToStored(invite);
};

const unStoreInvite = (guildId: string, code: string): boolean => delete storedInvites[guildId][code];

const storeAllInvites = async (): Promise<void> => {
  for (const guild of client.guilds.cache.filter(guild => guild.me.hasPermission(Permissions.FLAGS.MANAGE_GUILD)).values()) {
    try {
      const invites = await guild.fetchInvites();
      storedInvites[guild.id] = {};
      invites.forEach(invite => storeInvite(invite, guild.id));
    } catch (error) {
      console.error(`Unable to store invites for guild: ${guild}\nCaused by:`, error);
    }
  }
};

const reloadDQTimers = async (): Promise<void> => {
  await Promise.all(await db().collection<Dq>('dqs').find().map(async document => {
    const { guild, user } = document._id;

    // check if timer has lapsed while the bot was off, and if so free the prisoner
    if (moment().isSameOrAfter(moment(document.dqEndTime))) {
      return doUnTimeout(guild, user);
    }

    // still time left so just set the timers back up
    moment.duration(moment().diff(moment(document.dqEndTime))).timer({start: true}, () => doUnTimeout(guild, user));
  }).toArray());
};

const restart = (): Promise<string> => {
  client.destroy();
  return client.login(token);
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

export const userUrl = (id: string): string => `https://discordapp.com/users/${id}`;

const log = async (message: Message, action: string): Promise<Message> => {
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

const logMemberJoin = async (member: GuildMember): Promise<void> => {
  const invites = await member.guild.fetchInvites();
  const usedInvites: StoredInvite[] = [];
  for (const storedInvite of Object.values(storedInvites[member.guild.id])) {
    const invite = invites.get(storedInvite.code);
    if (!invite) {
      unStoreInvite(member.guild.id, storedInvite.code);
      if (member.joinedTimestamp <= storedInvite.expires) {
        usedInvites.push(storedInvite);
      }
    } else if (invite.uses > storedInvite.uses) {
      storedInvite.uses = invite.uses;
      usedInvites.push(storedInvite);
    } else if (invite.uses < storedInvite.uses) {
      console.warn(`Invite ${invite.code} uses decreased from ${storedInvite.uses} to ${invite.uses}`);
      storedInvite.uses = invite.uses;
    }
    invites.delete(storedInvite.code);
  }
  if (invites.size) {
    console.warn(`${invites.size} invites were missing from store: ${invites.keyArray()}`);
    invites.forEach(invite => storeInvite(invite, member.guild.id));
    usedInvites.push(...invites.filter(invite => invite.uses > 0).map(inviteToStored));
  }
  const logChannelId = logMemberJoinChannelIds[member.guild.id];
  const logChannel = (await client.channels.fetch(logChannelId)) as TextChannel;
  const inviteString = usedInvites.map(i => `\`${i.code}\` by <@${i.inviter}>`).join(', or ');
  logChannel.send(`Member ${member} joined via invite: ${inviteString}`);
};

client.on(Constants.Events.CLIENT_READY, () => {
  console.log(`Logged in as ${client.user.tag}`);
  storeAllInvites().catch(console.error);
  reloadDQTimers().catch(console.error);
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

client.on(Constants.Events.INVITE_CREATE, async invite => {
  try {
    storeInvite(invite);
  } catch (error) {
    console.error(`Failed to handle creation of invite: ${invite}\nCaused by:`, error);
  }
});

client.on(Constants.Events.INVITE_DELETE, async invite => {
  try {
    const inviteDeleteLogs = await invite.guild.fetchAuditLogs({
      type: GuildAuditLogs.Actions.INVITE_DELETE,
      limit: 10
    });
    if (inviteDeleteLogs.entries.some(log => log.changes.some(change => change.key === 'code' && change.old === invite.code))) {
      unStoreInvite(invite.guild.id, invite.code);
    }
  } catch (error) {
    console.error(`Failed to handle delete of invite: ${invite}\nCaused by:`, error);
  }
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

client.on(Constants.Events.MESSAGE_DELETE, (message: Message) => {
  if (message.guild) {
    log(message, 'deleted').catch(console.error);
    messages.upsertMessageInDb(message, -1).catch(console.error);
  }
});

client.on(Constants.Events.MESSAGE_UPDATE, (oldMessage: Message, newMessage: Message) => {
  if (oldMessage.guild && oldMessage.content !== newMessage.content) {
    log(oldMessage, 'updated').catch(console.error);
  }
});

client.on(Constants.Events.MESSAGE_BULK_DELETE, (messageCollection: Collection<string, Message>) => {
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

  const memberVerifier = new MemberVerifier(db().collection('members'));

  client.on(Constants.Events.GUILD_MEMBER_ADD, (member: GuildMember) => {
    logMemberJoin(member)
      .catch((error: Error) => console.error(`Failed to log member join: ${member}
Caused by:`, error));
    memberVerifier.verify(member);
  });

  client.on(Constants.Events.GUILD_MEMBER_REMOVE, (member: GuildMember) => {
    memberVerifier.store(member)
      .catch((error: Error) => console.error(`Failed to store removed member's \
verification info: ${member}
Caused by:`, error));
  });

  client.login(token)
    .catch((error: Error) => console.error('Failed to login\nCaused by:', error));
}).catch(console.error);
