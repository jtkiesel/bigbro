const app = require('./app');

const leaderboardChannels =
['260546095082504202',  // #general
  '360136094500519946',  // #vexu
  '342822239076483074',  // #hardware
  '198658294007463936',  // #software
  '198658074876182538',  // #lounge
  '260546551255007232',  // #memes
  '197818075796471808',  // #administration
  '442826048120291338',  // #moderation
  '198658419945635840',  // #voicechat
  '329477820076130306'];  // Dev server.

const update = async () => {
  for (let guild of app.client.guilds.array()) {
    for (let channel of guild.channels.array()) {
      if (channel.type == 'text' && channel.permissionsFor(app.client.user).has('READ_MESSAGES')) {
        try {
          await updateFromChannel(channel);
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
};

const upsertMessageInDb = async (message, inc = 1, upsertCounts = true) => {
  try {
    await app.db.collection('temp').updateOne(
      {_id: {guild: message.guild.id, channel: message.channel.id, user: message.author.id}},
      {$inc: {count: inc}},
      {upsert: true});
  } catch (err) {
    console.error(err);
  }
  if (upsertCounts) {
    try {
      await app.db.collection('counts').updateOne(
        {_id: {guild: message.guild.id, channel: message.channel.id, user: message.author.id}},
        {$inc: {count: inc}},
        {upsert: true});
    } catch (err) {
      console.error(err);
    }
  }
};

const updateFromChannel = async channel => {
  try {
    await app.db.collection('temp').deleteMany({'_id.guild': channel.guild.id, '_id.channel': channel.id});
    await updateFromChannelBatch(channel, 0, '');
  } catch (err) {
    console.error(err);
  }
};

const updateFromChannelBatch = async (channel, lastUpdatedTimestamp, lastMessageId) => {
  const options = {limit: 100};
  if (lastMessageId) {
    options.before = lastMessageId;
  }
  try {
    const messages = await channel.fetchMessages(options);
    if (messages.size) {
      for (let message of messages.array()) {
        await upsertMessageInDb(message, 1, false);
      }
      await updateFromChannelBatch(channel, lastUpdatedTimestamp, messages.lastKey());
    } else {
      console.log(`Done with #${channel.name}.`);
      const documents = await app.db.collection('temp').find({'_id.guild': channel.guild.id, '_id.channel': channel.id}).toArray();

      for (let document of documents) {
        await app.db.collection('counts').updateOne({_id: document._id}, document, {upsert: true});
      }
    }
  } catch (err) {
    console.error(err);
    console.log(`Retrying from #${channel.name}, at ${lastMessageId}.`);
    await updateFromChannelBatch(channel, lastUpdatedTimestamp, lastMessageId);
  }
};

module.exports = {
  upsertMessageInDb,
  updateFromChannel,
  update,
  leaderboardChannels
};
