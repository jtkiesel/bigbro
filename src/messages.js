import { Permissions } from 'discord.js';

import { client, db } from '.';

const leaderboardChannels = [
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

const updateGuilds = async () => {
  for (let guild of client.guilds.array()) {
    await updateGuild(guild);
  }
};

const updateGuild = async guild => {
  for (let channel of guild.channels.array()) {
    try {
      await updateChannel(channel);
    } catch (err) {
      console.error(err);
    }
  }
};

const updateChannel = async channel => {
  if (channel.type != 'text' || !channel.permissionsFor(client.user).has(Permissions.FLAGS.VIEW_CHANNEL)
      || !channel.permissionsFor(client.user).has(Permissions.FLAGS.READ_MESSAGE_HISTORY)) {
    return;
  }
  const id = channel.lastMessageID;
  const messageStore = channel.messages;
  const firstMessage = (await db.collection('channels').findOneAndUpdate(
    {_id: {guild: channel.guild.id, channel: channel.id}},
    {$setOnInsert: {first: id, last: id}},
    {upsert: true, returnOriginal: false})).value.first;
  const options = {
    before: firstMessage,
    limit: 100
  };
  let messages;
  do {
    try {
      messages = await messageStore.fetch(options);
      for (let message of messages.array()) {
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

const upsertMessageInDb = async (message, inc = 1) => {
  const guild = message.guild.id;
  const channel = message.channel.id;
  const id = message.id;
  try {
    await Promise.all([
      db.collection('channels').updateOne(
        {_id: {guild, channel}},
        {$max: {last: id}, $min: {first: id}},
        {upsert: true}
      ), db.collection('messages').updateOne(
        {_id: {guild, channel, user: message.author.id}},
        {$inc: {count: inc}},
        {upsert: true}
      )
    ]);
  } catch (err) {
    console.error(err);
  }
};

export {
  leaderboardChannels,
  updateGuilds,
  updateChannel,
  upsertMessageInDb
};
