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

const update = async () => {
	for (let guild of client.guilds.array()) {
		for (let channel of guild.channels.array()) {
			if (channel.type == 'text' && channel.permissionsFor(client.user).has('READ_MESSAGES')) {
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
		db.collection('temp').updateOne(
			{_id: {guild: message.guild.id, channel: message.channel.id, user: message.author.id}},
			{$inc: {count: inc}},
			{upsert: true});
	} catch (err) {
		console.error(err);
	}
	if (upsertCounts) {
		try {
			db.collection('counts').updateOne(
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
		await db.collection('temp').deleteMany({'_id.guild': channel.guild.id, '_id.channel': channel.id});
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
			const documents = await db.collection('temp').find({'_id.guild': channel.guild.id, '_id.channel': channel.id}).toArray();

			for (let document of documents) {
				db.collection('counts').updateOne({_id: document._id}, document, {upsert: true});
			}
		}
	} catch (err) {
		console.error(error);
		console.log(`Retrying from #${channel.name}, at ${lastMessageId}.`);
		await updateFromChannelBatch(channel, lastUpdatedTimestamp, lastMessageId);
	}
};

module.exports = {
	upsertMessageInDb: upsertMessageInDb,
	updateFromChannel: updateFromChannel,
	update: update,
	leaderboardChannels: leaderboardChannels
};
