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

class CachedInvite {
  public readonly inviter: string;
  public readonly code: string;
  public readonly uses: number;
  public readonly maxUses: number;
  public readonly expiresTimestamp: number;

  constructor(invite: Invite) {
    this.inviter = invite.inviter.id;
    this.code = invite.code;
    this.uses = invite.uses;
    this.maxUses = invite.maxUses;
    this.expiresTimestamp = invite.expiresTimestamp;
  }
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
const cachedInvites = new Map<string, Map<string, CachedInvite>>();
const cachedVanityUses = new Map<string, number>();

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

const cacheAllInvites = async (): Promise<void> => {
  const manageableGuilds = client.guilds.cache
    .filter(guild => guild.me.hasPermission(Permissions.FLAGS.MANAGE_GUILD))
    .values();
  for (const guild of manageableGuilds) {
    try {
      const invitesCollection = await guild.fetchInvites();
      const invites = invitesCollection
        .reduce((map, invite) => map.set(invite.code, new CachedInvite(invite)),
          new Map<string, CachedInvite>());
      cachedInvites.set(guild.id, invites);
      if (guild.vanityURLCode) {
        const vanity = await guild.fetchVanityData();
        cachedVanityUses.set(guild.id, vanity.uses);
      }
    } catch (e) {
      console.error(`Unable to store invites for server: ${guild}
Caused by:`, e);
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
  if (!member.guild.me.hasPermission(Permissions.FLAGS.MANAGE_GUILD)) {
    console.error(`Missing Manage Server permission in server: ${member.guild}`);
    return;
  }
  const invitesCollection = await member.guild.fetchInvites()
    .catch((e: Error) => {
      console.error(`Failed to fetch invites when logging member join.
Caused by:`, e);
      return new Collection<string, Invite>();
    });
  const newInvites = invitesCollection.reduce((map, invite) =>
    map.set(invite.code, new CachedInvite(invite)), new Map<string, CachedInvite>());
  const oldInvites = cachedInvites.get(member.guild.id);
  // invites that had their uses increase
  const usedInvites = Array.from(newInvites.values())
    .filter(newInvite => oldInvites.get(newInvite.code).uses < newInvite.uses);
  if (!usedInvites.length) {
    // invites that reached their max number of uses
    Array.from(oldInvites.values())
      .filter(i => !newInvites.has(i.code) && i.uses === i.maxUses - 1)
      .forEach(invite => usedInvites.push(invite));
  }
  if (!usedInvites.length && member.guild.vanityURLCode) {
    // vanity invite uses
    const vanity = await member.guild.fetchVanityData();
    if (cachedVanityUses.get(member.guild.id) < vanity.uses) {
      usedInvites.push({
        inviter: member.guild.ownerID,
        code: vanity.code,
        uses: vanity.uses,
        maxUses: 0,
        expiresTimestamp: null,
      });
      cachedVanityUses.set(member.guild.id, vanity.uses);
    }
  }
  if (!usedInvites.length) {
    console.error(`Could not determine invite used for member ${member}
oldInvites: ${JSON.stringify(Array.from(oldInvites))}
newInvites: ${JSON.stringify(Array.from(newInvites))}`);
  }
  cachedInvites.set(member.guild.id, newInvites);
  const logChannelId = logMemberJoinChannelIds[member.guild.id];
  const logChannel = (await client.channels.fetch(logChannelId)) as TextChannel;
  const inviteString = usedInvites.map(i => `\`${i.code}\` by <@${i.inviter}>`)
    .join(', or ');
  await logChannel.send(`Member ${member} joined via invite: ${inviteString}`);
};

client.on(Constants.Events.CLIENT_READY, () => {
  console.log(`Logged in as ${client.user.tag}`);
  cacheAllInvites().catch(console.error);
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

client.on(Constants.Events.GUILD_UPDATE, (oldGuild, newGuild) => {
  if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
    cachedVanityUses.set(newGuild.id, newGuild.vanityURLUses);
  }
});

client.on(Constants.Events.INVITE_CREATE, invite => {
  cachedInvites.get(invite.guild.id)
    .set(invite.code, new CachedInvite(invite));
});

client.on(Constants.Events.INVITE_DELETE, async invite => {
  const cachedInvite = cachedInvites.get(invite.guild.id)
    .get(invite.code);
  if (cachedInvite.expiresTimestamp <= Date.now()) {
    cachedInvites.get(invite.guild.id)
      .delete(invite.code);
    return;
  }
  try {
    const inviteDeleteLogs = await invite.guild.fetchAuditLogs({
      type: GuildAuditLogs.Actions.INVITE_DELETE,
      limit: 10,
    });
    if (inviteDeleteLogs.entries.some(log => log.changes.some(change => change.key === 'code' && change.old === invite.code))) {
      cachedInvites.get(invite.guild.id)
        .delete(invite.code);
    }
  } catch (e) {
    console.error(`Failed to handle delete of invite: ${invite}
Caused by:`, e);
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
      .catch((e: Error) => console.error(`Failed to log member join: ${member}
Caused by:`, e));
  });

  client.on(Constants.Events.GUILD_MEMBER_UPDATE, (oldMember: GuildMember, newMember: GuildMember) => {
    if (oldMember.pending && !newMember.pending) {
      memberVerifier.verify(newMember)
        .catch((e: Error) => console.error(`Failed to verify member: ${newMember}
Caused by:`, e));
    }
  });

  client.on(Constants.Events.GUILD_MEMBER_REMOVE, (member: GuildMember) => {
    memberVerifier.store(member)
      .catch((e: Error) => console.error(`Failed to store removed member's \
verification info: ${member}
Caused by:`, e));
  });

  client.login(token)
    .catch((e: Error) => console.error('Failed to login\nCaused by:', e));
}).catch(console.error);
