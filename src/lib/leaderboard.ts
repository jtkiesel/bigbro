import {
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  type Guild,
  type Message,
  type NonThreadGuildBasedChannel,
  type PartialMessage,
} from "discord.js";
import { Long, type Collection } from "mongodb";
import { nonNull } from "./predicates.js";

export class MessageCounter {
  private readonly missedMessagesCountedChannels = new Set<string>();

  public constructor(
    private readonly channels: Collection<ChannelMessages>,
    private readonly messages: Collection<MessageCount>,
  ) {}

  public async count(message: Message | PartialMessage, count: number) {
    if (!message.inGuild() || !message.author || message.author.bot) {
      return;
    }

    const messageIdLong = this.longFromSnowflake(message.id);
    await Promise.all([
      this.channels
        .findOneAndUpdate(
          { _id: { guild: message.guildId, channel: message.channelId } },
          { $min: { first: messageIdLong }, $max: { last: messageIdLong } },
          { upsert: true },
        )
        .then(async (result) => {
          if (
            !result ||
            message.channel.type !== ChannelType.GuildText ||
            this.missedMessagesCountedChannels.has(message.channelId)
          ) {
            return;
          }
          await this.countMessagesInChannelBetween(
            message.channel,
            message.id,
            result.last,
          );
          this.missedMessagesCountedChannels.add(message.channelId);
        }),
      this.messages.updateOne(
        {
          _id: {
            guild: message.guildId,
            channel: message.channelId,
            user: message.author.id,
          },
        },
        { $inc: { count } },
        { upsert: true },
      ),
    ]);
  }

  public async countMessagesInGuild(guild: Guild) {
    const channels = await guild.channels.fetch(undefined, { cache: false });
    await Promise.all(
      channels
        .filter(nonNull)
        .map((channel) => this.countMessagesInChannel(channel)),
    );
  }

  public async countMessagesInChannel(channel: NonThreadGuildBasedChannel) {
    if (channel.type !== ChannelType.GuildText) {
      return;
    }

    if (
      !channel.lastMessageId ||
      !channel.guild.members.me
        ?.permissionsIn(channel)
        .has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
        ])
    ) {
      await Promise.all([
        this.channels.deleteOne({
          _id: { guild: channel.guildId, channel: channel.id },
        }),
        this.messages.deleteMany({
          "_id.guild": channel.guildId,
          "_id.channel": channel.id,
        }),
      ]);
      return;
    }

    const channelMessages = await this.channels.findOne({
      _id: { guild: channel.guildId, channel: channel.id },
    });
    const firstMessage = channelMessages
      ? this.snowflakeFromLong(channelMessages.first)
      : undefined;
    await this.countMessagesInChannelBetween(channel, firstMessage);
    channel.client.logger.info(
      `Done counting messages in guild ${channel.guild.name} channel ${channel.name}`,
    );
  }

  private async countMessagesInChannelBetween(
    channel: TextChannel,
    before?: string,
    after?: Long,
  ) {
    let firstMessage = before;
    let lastMessageLong: Long | undefined;
    while (true) {
      const messages = (
        await channel.messages.fetch({
          limit: 100,
          before: firstMessage,
          cache: false,
        })
      ).filter(({ id }) => !after || this.longFromSnowflake(id).gt(after));
      firstMessage = messages.lastKey();
      const lastMessage = messages.firstKey();
      if (!firstMessage || !lastMessage) {
        break;
      }
      if (!lastMessageLong) {
        lastMessageLong = this.longFromSnowflake(lastMessage);
      }
      const firstMessageLong = this.longFromSnowflake(firstMessage);
      const countsByUser = messages
        .filter(({ author: { bot } }) => !bot)
        .map(({ author: { id } }) => id)
        .reduce(
          (map, user) => map.set(user, (map.get(user) ?? 0) + 1),
          new Map<string, number>(),
        );
      await Promise.all([
        this.channels.updateOne(
          { _id: { guild: channel.guildId, channel: channel.id } },
          {
            $min: { first: firstMessageLong },
            $max: { last: lastMessageLong },
          },
          { upsert: true },
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
            { $inc: { count } },
            { upsert: true },
          ),
        ),
      ]);
    }
  }

  private longFromSnowflake(snowflake: string): Long {
    return Long.fromBigInt(BigInt(snowflake) - 2n ** 63n);
  }

  private snowflakeFromLong(long: Long): string {
    return `${long.toBigInt() + 2n ** 63n}`;
  }
}

export interface ChannelMessages {
  _id: {
    guild: string;
    channel: string;
  };
  first: Long;
  last: Long;
}

export interface MessageCount {
  _id: {
    guild: string;
    channel: string;
    user: string;
  };
  count: number;
}
