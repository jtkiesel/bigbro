const Discord = require('discord.js');

const app = require('./app');

const upsertMessageInDb = (message, deleted) => {
	if (message.guild) {
		const insert = formatMessage(message, deleted);
		app.db.collection('messages').updateOne(
			{_id: insert._id},
			{$setOnInsert: insert},
			{upsert: true}
		).then(result => {
			if (result.upsertedCount) {
				console.log(`Insert to messages: ${JSON.stringify(insert)}`);
			} else {
				const edits = insert.e;
				const update = JSON.parse(JSON.stringify(insert));
				delete update.e;
				app.db.collection('messages').findOneAndUpdate(
					{_id: update._id,
						$or: [{t: {$lt: update.t}},
							{d: {$ne: update.d}, d: false}]},
					{$set: update, $addToSet: {e: {$each: edits}}}
				).then(result => {
					const old = result.value;
					if (JSON.stringify(insert) != JSON.stringify(old)) {
						console.log(`Update to messages: ${JSON.stringify(insert)}`);
					}
				}).catch(console.error);
			}
		}).catch(console.error);
	}
};

const formatMessage = (message, deleted) => {
	const document = {_id: {
		c: message.channel.id,
		i: message.id
	}};
	if (message.attachments.size) {
		document.a = Array.from(message.attachments.values()).map(attachment => ({
			f: attachment.filename,
			u: attachment.url || attachment.proxyUrl
		}));
	}
	document.u = message.author.id;
	document.d = deleted;
	document.t = message.editedTimestamp || message.createdTimestamp;
	document.e = message.edits.map(edit => ({
		c: edit.content,
		t: edit.editedTimestamp || edit.createdTimestamp
	}));
	document.g = message.guild.id;
	return document;
};

const update = () => {
	app.client.guilds.forEach(guild => guild.channels.forEach(channel => {
		if (channel.type == 'text' && channel.permissionsFor(app.client.user).has('READ_MESSAGES')) {
			updateFromChannel(channel);
		}
	}));
}

const updateFromChannel = channel => {
	app.db.collection('messages').aggregate([
		{$match: {c: channel.id}},
		{$sort: {_id: -1}},
		{$limit: 1}
	]).toArray().then(messages => {
		const lastUpdatedTimestamp = /*messages.length ? messages[0].t : */0;
		updateFromChannelBatch(channel, lastUpdatedTimestamp, '');
	}).catch(console.error);
};

const updateFromChannelBatch = (channel, lastUpdatedTimestamp, lastMessageId) => {
	let options = {limit: 100};
	if (lastMessageId) {
		options.before = lastMessageId;
	}
	channel.fetchMessages(options).then(messages => {
		if (messages.size && (lastUpdatedTimestamp - messages.first().createdTimestamp) < 604800000) {
			console.log('.');
			messages.forEach(message => upsertMessageInDb(message, false));
			updateFromChannelBatch(channel, lastUpdatedTimestamp, messages.lastKey());
		}
	}).catch(error => {
		console.error(error);
		updateFromChannelBatch(channel, lastMessageId);
	});
};

module.exports = {
	upsertMessageInDb: upsertMessageInDb,
	updateFromChannel: updateFromChannel,
	update: update
};
