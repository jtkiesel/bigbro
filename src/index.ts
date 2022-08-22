import {
  ApplicationCommandRegistries,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import {Constants, Intents, Options} from 'discord.js';
import {MongoClient} from 'mongodb';
import {logLevel, messageCacheSize, mongoUrl} from './lib/config';
import {
  type ChannelMessages,
  type MessageCount,
  MessageCounter,
} from './lib/leaderboard';
import {MessageLogger} from './lib/logging';
import {type GuildSettings, SettingsManager} from './lib/settings';
import type {VerifiedMember} from './lib/verification';

const mongoClient = new MongoClient(mongoUrl);
const database = mongoClient.db('bigbro');

const channelMessages = database.collection<ChannelMessages>('channels');
const guildSettings = database.collection<GuildSettings>('settings');
export const messageCounts = database.collection<MessageCount>('messages');
export const verifiedMembers = database.collection<VerifiedMember>('members');

export const messageCounter = new MessageCounter(
  channelMessages,
  messageCounts
);
export const settingsManager = new SettingsManager(guildSettings);
export const messageLogger = new MessageLogger(settingsManager);

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
  RegisterBehavior.Overwrite
);

const discordClient = new SapphireClient({
  shards: 'auto',
  partials: [Constants.PartialTypes.MESSAGE],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_MESSAGES,
  ],
  logger: {level: logLevel},
  makeCache: Options.cacheWithLimits({
    BaseGuildEmojiManager: 0,
    GuildEmojiManager: 0,
    GuildBanManager: 0,
    GuildInviteManager: 0,
    GuildMemberManager: Number.MAX_VALUE,
    GuildStickerManager: 0,
    GuildScheduledEventManager: 0,
    MessageManager: {
      maxSize: messageCacheSize,
      keepOverLimit: ({pinned}) => pinned,
    },
    PresenceManager: 0,
    ReactionManager: 0,
    ReactionUserManager: 0,
    StageInstanceManager: 0,
    ThreadMemberManager: 0,
    VoiceStateManager: 0,
  }),
});

const main = async () => {
  try {
    discordClient.logger.info('Connecting to database');
    await mongoClient.connect();
    discordClient.logger.info('Connected to database');

    discordClient.logger.info('Logging in to Discord');
    await discordClient.login();
    discordClient.logger.info('Logged in to Discord');
  } catch (error) {
    discordClient.logger.fatal(error);
    throw error;
  }
};

process.on('SIGTERM', async () => {
  discordClient.destroy();
  await mongoClient.close();
});

main();
