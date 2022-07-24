import {bold} from '@discordjs/builders';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Guild,
  Message,
  MessageActionRowComponentBuilder,
  PartialMessage,
} from 'discord.js';
import {Color} from './color';
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

    return loggingChannel?.type === ChannelType.GuildText
      ? loggingChannel
      : null;
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

    const embed = new EmbedBuilder()
      .setColor(this.messageChangeColor(type))
      .setAuthor({
        name: message.author.tag,
        url: `https://discord.com/users/${message.author.id}`,
        iconURL: (message.member ?? message.author).displayAvatarURL(),
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
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
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
      case MessageChangeType.CREATED:
        return Color.GREEN;
      case MessageChangeType.DELETED:
        return Color.RED;
      case MessageChangeType.UPDATED:
        return Color.BLUE;
    }
  }
}

export enum MessageChangeType {
  CREATED = 'created',
  DELETED = 'deleted',
  UPDATED = 'updated',
}
