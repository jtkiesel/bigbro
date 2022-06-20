import {bold} from '@discordjs/builders';
import {
  Guild,
  Message,
  MessageEmbed,
  MessageOptions,
  PartialMessage,
} from 'discord.js';
import {Colors} from './embeds';
import type {SettingsManager} from './settings';

export class MessageLogger {
  public constructor(private readonly settingsManager: SettingsManager) {}

  public async channelForGuild(guild: Guild) {
    const guildSettings = await this.settingsManager.get(guild.id);

    const loggingChannelId = guildSettings?.loggingChannel;
    if (!loggingChannelId) {
      return null;
    }

    const loggingChannel = await guild.channels.fetch(loggingChannelId);

    return loggingChannel?.isText() ? loggingChannel : null;
  }

  public async logMessageDelete(message: Message | PartialMessage) {
    if (message.partial || message.author.bot || !message.inGuild()) {
      return;
    }

    const logChannel = await this.channelForGuild(message.guild);
    if (!logChannel) {
      return;
    }

    await logChannel.send(
      this.messageChange(message, MessageChangeType.DELETED, Date.now())
    );
  }

  public messageChange(
    message: Message<true>,
    type: MessageChangeType,
    timestamp: Date | number | null
  ): MessageOptions {
    const embed = new MessageEmbed()
      .setColor(this.messageChangeColor(type))
      .setAuthor({
        name: message.author.tag,
        url: `https://discord.com/users/${message.author.id}`,
        iconURL: (message.member ?? message.author).displayAvatarURL({
          dynamic: true,
        }),
      })
      .setDescription(
        [
          bold(`Message by ${message.author} ${type} in ${message.channel}`),
          message.content,
        ].join('\n')
      )
      .setFooter({
        text: [
          `User ID: ${message.author.id}`,
          `Message ID: ${message.id}`,
        ].join(' | '),
      })
      .setTimestamp(timestamp);

    return {
      embeds: [embed],
      files: message.attachments.map(({proxyURL}) => proxyURL),
    };
  }

  private messageChangeColor(type: MessageChangeType) {
    switch (type) {
      case MessageChangeType.CREATED:
        return Colors.GREEN;
      case MessageChangeType.DELETED:
        return Colors.RED;
      case MessageChangeType.UPDATED:
        return Colors.BLUE;
    }
  }
}

export enum MessageChangeType {
  CREATED = 'created',
  DELETED = 'deleted',
  UPDATED = 'updated',
}
