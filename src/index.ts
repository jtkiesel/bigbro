import {
  ApplicationCommandRegistries,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import {Constants, Intents, Options} from 'discord.js';
import {MongoClient} from 'mongodb';
import {discordToken, logLevel, mongoUrl} from './lib/config';
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

const client = new SapphireClient({
  shards: 'auto',
  partials: [Constants.PartialTypes.MESSAGE],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_MESSAGES,
  ],
  logger: {level: logLevel},
  makeCache: Options.cacheWithLimits({MessageManager: 2000}),
});

const main = async () => {
  await mongoClient.connect().catch(error => client.logger.error(error));
  try {
    client.logger.info('Logging in');
    await client.login(discordToken);
    client.logger.info('Logged in');
  } catch (error) {
    client.logger.fatal(error);
    client.destroy();
    throw error;
  }

  const guilds = await client.guilds.fetch();
  await Promise.all(
    guilds.map(async oAuth2Guild => {
      const guild = await oAuth2Guild.fetch();
      await messageCounter.countMessagesInGuild(guild);
    })
  );
};

main();
