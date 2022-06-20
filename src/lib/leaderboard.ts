import {
  Guild,
  GuildChannel,
  Message,
  PartialMessage,
  Permissions,
} from 'discord.js';
import type {Collection} from 'mongodb';

export class MessageCounter {
  public constructor(
    private readonly channels: Collection<ChannelMessages>,
    private readonly messages: Collection<MessageCount>
  ) {}

  public async count(message: Message | PartialMessage, count: number) {
    if (!message.inGuild() || !message.author) {
      return;
    }

    await Promise.all([
      this.channels.updateOne(
        {_id: {guild: message.guildId, channel: message.channelId}},
        {$min: {first: message.id}, $max: {last: message.id}},
        {upsert: true}
      ),
      this.messages.updateOne(
        {
          _id: {
            guild: message.guildId,
            channel: message.channelId,
            user: message.author.id,
          },
        },
        {$inc: {count}},
        {upsert: true}
      ),
    ]);
  }

  public async countMessagesInGuild(guild: Guild) {
    const channels = await guild.channels.fetch(undefined, {cache: false});
    await Promise.all(
      channels.map(channel => this.countMessagesInChannel(channel))
    );
  }

  public async countMessagesInChannel(channel: GuildChannel) {
    if (!channel.isText()) {
      return;
    }

    if (
      !channel.lastMessageId ||
      !channel.guild.me
        ?.permissionsIn(channel)
        .has([
          Permissions.FLAGS.VIEW_CHANNEL,
          Permissions.FLAGS.READ_MESSAGE_HISTORY,
        ])
    ) {
      await Promise.all([
        this.channels.deleteOne({
          _id: {guild: channel.guildId, channel: channel.id},
        }),
        this.messages.deleteMany({
          '_id.guild': channel.guildId,
          '_id.channel': channel.id,
        }),
      ]);
      return;
    }

    const channelMessages = await this.channels.findOne({
      _id: {guild: channel.guildId, channel: channel.id},
    });
    let firstMessage = channelMessages?.first;
    while (true) {
      const messages = await channel.messages.fetch(
        {limit: 100, before: firstMessage},
        {cache: false}
      );
      firstMessage = messages.lastKey();
      if (!firstMessage) {
        break;
      }
      const countsByUser = messages
        .map(({author: {id}}) => id)
        .reduce(
          (map, user) => map.set(user, (map.get(user) ?? 0) + 1),
          new Map<string, number>()
        );
      await Promise.all([
        this.channels.updateOne(
          {_id: {guild: channel.guildId, channel: channel.id}},
          {$min: {first: firstMessage}, $max: {last: firstMessage}},
          {upsert: true}
        ),
        ...[...countsByUser.entries()].map(([user, count]) =>
          this.messages.updateOne(
            {
              _id: {
                guild: channel.guildId,
                channel: channel.id,
                user,
              },
            },
            {$inc: {count}},
            {upsert: true}
          )
        ),
      ]);
    }
    channel.client.logger.info(
      `Done counting messages in guild ${channel.guild.name} channel ${channel.name}`
    );
  }

  public async resetMessageCountsForGuild(guild: Guild) {
    await Promise.all([
      this.channels.updateMany(
        {'_id.guild': guild.id},
        {$unset: {first: true, last: true}}
      ),
      this.messages.updateMany({'_id.guild': guild.id}, {$set: {count: 0}}),
    ]);
  }

  public async resetMessageCountsForChannel(channel: GuildChannel) {
    await Promise.all([
      this.channels.updateOne(
        {'_id.guild': channel.guildId, '_id.channel': channel.id},
        {$unset: {first: true, last: true}}
      ),
      this.messages.updateMany(
        {'_id.guild': channel.guildId, '_id.channel': channel.id},
        {$set: {count: 0}}
      ),
    ]);
  }
}

export interface ChannelMessages {
  _id: {
    guild: string;
    channel: string;
  };
  first: string;
  last: string;
}

export interface MessageCount {
  _id: {
    guild: string;
    channel: string;
    user: string;
  };
  count: number;
}
