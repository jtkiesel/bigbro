const Discord = require('discord.js');

const app = require('./app');

const client = app.client;
const db = app.db;

const leaderboardChannels =
['260546095082504202',  // #vex
	'360136094500519946',  // #vexu
	'342822239076483074',  // #vexforum
	'198658294007463936',  // #coding
	'198658074876182538',  // #lounge
	'260546551255007232',  // #memes
	'197818075796471808',  // #admins
	'198658419945635840',  // #voicechat
	'329477820076130306'];  // Dev server.

const update = () => {
	client.guilds.forEach(guild => guild.channels.forEach(channel => {
		if (channel.type == 'text' && channel.permissionsFor(client.user).has('READ_MESSAGES')) {
			updateFromChannel(channel);
		}
	}));
}

const upsertMessageInDb = (message, inc = 1, upsertCounts = true) => {
	db.collection('temp').updateOne(
		{_id: {guild: message.guild.id, channel: message.channel.id, user: message.author.id}},
		{$inc: {count: inc}},
		{upsert: true}
	).catch(console.log);

	if (upsertCounts) {
		db.collection('counts').updateOne(
			{_id: {guild: message.guild.id, channel: message.channel.id, user: message.author.id}},
			{$inc: {count: inc}},
			{upsert: true}
		).catch(console.log);
	}
};

const updateFromChannel = channel => {
	db.collection('temp').deleteMany({'_id.guild': channel.guild.id, '_id.channel': channel.id}).then(result => {
		updateFromChannelBatch(channel, 0, '');
	}).catch(console.error);
};

const updateFromChannelBatch = (channel, lastUpdatedTimestamp, lastMessageId) => {
	const options = {limit: 100};
	if (lastMessageId) {
		options.before = lastMessageId;
	}
	channel.fetchMessages(options).then(messages => {
		if (messages.size) {
			messages.forEach(message => upsertMessageInDb(message, 1, false));
			updateFromChannelBatch(channel, lastUpdatedTimestamp, messages.lastKey());
		} else {
			console.log(`Done with ${channel.name}.`);
			db.collection('temp').find({'_id.guild': channel.guild.id, '_id.channel': channel.id}).toArray().then(array => array.forEach(document => {
				db.collection('counts').updateOne(
					{_id: document._id},
					document,
					{upsert: true}
				).catch(console.error);
			}));
		}
	}).catch(error => {
		console.error(error);
		updateFromChannelBatch(channel, lastUpdatedTimestamp, lastMessageId);
	});
};

module.exports = {
	upsertMessageInDb: upsertMessageInDb,
	updateFromChannel: updateFromChannel,
	update: update,
	leaderboardChannels: leaderboardChannels
};
