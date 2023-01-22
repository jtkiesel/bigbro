import {bold} from '@discordjs/builders';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Guild,
  type Message,
  type PartialMessage,
  type User,
} from 'discord.js';
import {Color} from './embeds';
import type {SettingsManager} from './settings';
import {userUrl} from './user';

export class MessageLogger {
  public constructor(private readonly settingsManager: SettingsManager) {}

  public async channelForGuild(guild: Guild) {
    const guildSettings = await this.settingsManager.get(guild.id);

    const loggingChannelId = guildSettings?.loggingChannel;
    if (!loggingChannelId) {
      return null;
    }

    const loggingChannel = await guild.channels.fetch(loggingChannelId);

    return loggingChannel?.isTextBased() ? loggingChannel : null;
  }

  public async logMessageDelete(
    message: Message | PartialMessage,
    executor?: User
  ) {
    await this.logMessageChange(
      message,
      MessageChangeType.Deleted,
      Date.now(),
      executor
    );
  }

  public async logMessageUpdate(
    oldMessage: Message | PartialMessage,
    timestamp: Date | number | null
  ) {
    await this.logMessageChange(
      oldMessage,
      MessageChangeType.Updated,
      timestamp
    );
  }

  private async logMessageChange(
    message: Message | PartialMessage,
    type: MessageChangeType,
    timestamp: Date | number | null,
    executor?: User
  ) {
    if (message.partial || message.author.bot || !message.inGuild()) {
      return;
    }

    const logChannel = await this.channelForGuild(message.guild);
    if (!logChannel) {
      return;
    }

    const executorString = executor ? ` by ${executor}` : '';

    await logChannel.send({
      files: message.attachments.map(({proxyURL}) => proxyURL),
      embeds: [
        new EmbedBuilder()
          .setColor(this.messageChangeColor(type))
          .setAuthor({
            name: message.author.tag,
            url: userUrl(message.author.id),
            iconURL: (message.member ?? message.author).displayAvatarURL(),
          })
          .setDescription(
            [
              bold(
                `Message by ${message.author} ${type}${executorString} in ${message.channel}`
              ),
              message.content,
            ].join('\n')
          )
          .setFooter({
            text: [
              `User ID: ${message.author.id}`,
              `Message ID: ${message.id}`,
            ].join(' | '),
          })
          .setTimestamp(timestamp),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Message')
            .setURL(message.url)
        ),
      ],
    });
  }

  private messageChangeColor(type: MessageChangeType) {
    switch (type) {
      case MessageChangeType.Created:
        return Color.Green;
      case MessageChangeType.Deleted:
        return Color.Red;
      case MessageChangeType.Updated:
        return Color.Blue;
    }
  }
}

enum MessageChangeType {
  Created = 'created',
  Deleted = 'deleted',
  Updated = 'updated',
}
