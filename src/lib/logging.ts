import {bold} from '@discordjs/builders';
import {
  Guild,
  Message,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  PartialMessage,
} from 'discord.js';
import {Colors} from './embeds';
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

    return loggingChannel?.isText() ? loggingChannel : null;
  }

  public async logMessageDelete(message: Message | PartialMessage) {
    this.logMessageChange(message, MessageChangeType.DELETED, Date.now());
  }

  public async logMessageChange(
    message: Message | PartialMessage,
    type: MessageChangeType,
    timestamp: Date | number | null
  ) {
    if (message.partial || message.author.bot || !message.inGuild()) {
      return;
    }

    const logChannel = await this.channelForGuild(message.guild);
    if (!logChannel) {
      return;
    }

    const embed = new MessageEmbed()
      .setColor(this.messageChangeColor(type))
      .setAuthor({
        name: message.author.tag,
        url: userUrl(message.author.id),
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

    await logChannel.send({
      files: message.attachments.map(({proxyURL}) => proxyURL),
      embeds: [embed],
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle('LINK')
            .setLabel('Message')
            .setURL(message.url)
        ),
      ],
    });
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
