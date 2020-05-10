import { Guild, Message, PartialMessage, Permissions, TextChannel } from 'discord.js';

import { client, db } from '.';

export const leaderboardChannels = [
  '260546095082504202',  // #general
  '360136094500519946',  // #vexu
  '342822239076483074',  // #hardware
  '198658294007463936',  // #software
  '198658074876182538',  // #lounge
  '260546551255007232',  // #memes
  '197818075796471808',  // #administration
  '442826048120291338',  // #moderation
  '198658419945635840',  // #voicechat
  '329477820076130306'  // Dev server.
];

export const upsertMessageInDb = async (message: Message | PartialMessage, inc = 1): Promise<void> => {
  const guild = message.guild.id;
  const channel = message.channel.id;
  const id = message.id;
  await Promise.all([
    db().collection('channels').updateOne({
      _id: {
        guild,
        channel
      }
    }, {
      $max: { last: id },
      $min: { first: id }
    }, {
      upsert: true
    }),
    db().collection('messages').updateOne({
      _id: {
        guild,
        channel,
        user: message.author.id
      }
    }, {
      $inc: { count: inc }
    }, {
      upsert: true
    })
  ]);
};

export const updateChannel = async (channel: TextChannel): Promise<void> => {
  if (!channel.permissionsFor(client.user).has(Permissions.FLAGS.VIEW_CHANNEL | Permissions.FLAGS.READ_MESSAGE_HISTORY)) {
    return;
  }
  const id = channel.lastMessageID;
  const messageManager = channel.messages;
  const firstMessage = (await db().collection('channels').findOneAndUpdate({
    _id: {
      guild: channel.guild.id,
      channel: channel.id
    }
  }, {
    $setOnInsert: {
      first: id,
      last: id
    }
  }, {
    upsert: true,
    returnOriginal: false
  })).value.first;
  const options = {
    before: firstMessage,
    limit: 100
  };
  let messages;
  do {
    try {
      messages = await messageManager.fetch(options, false);
      for (const message of messages.values()) {
        await upsertMessageInDb(message, 1);
        options.before = message.id;
      }
    } catch (err) {
      console.error(err);
      console.log(`Retrying from #${channel.name}, at ${options.before}.`);
    }
  } while (!messages || messages.size);
  console.log(`Done with #${channel.name}.`);
};

const updateGuild = async (guild: Guild): Promise<void> => {
  for (const channel of guild.channels.cache.filter(channel => channel.type === 'text').values() as IterableIterator<TextChannel>) {
    try {
      await updateChannel(channel);
    } catch (err) {
      console.error(err);
    }
  }
  console.log(`Done with ${guild.name}`);
};

export const updateGuilds = async (): Promise<void> => {
  for (const guild of client.guilds.cache.values()) {
    try {
      await updateGuild(guild);
    } catch (err) {
      console.error(err);
    }
  }
  console.log('Done updating messages.');
};
