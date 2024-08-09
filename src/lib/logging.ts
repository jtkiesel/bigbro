import {
  ActionRowBuilder,
  bold,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  time,
  TimestampStyles,
  type Guild,
  type GuildMember,
  type Message,
  type PartialMessage,
  type ThreadChannel,
  type User,
} from "discord.js";
import { Color } from "./embeds.js";
import type { SettingsManager } from "./settings.js";
import { userUrl } from "./user.js";

export class MessageLogger {
  public constructor(private readonly settingsManager: SettingsManager) {}

  public async logMessageDelete(
    message: Message | PartialMessage,
    executor?: User,
  ) {
    await this.logMessageChange(
      message,
      MessageChangeType.Deleted,
      Date.now(),
      executor,
    );
  }

  public async logMessageUpdate(
    oldMessage: Message | PartialMessage,
    timestamp: Date | number | null,
  ) {
    await this.logMessageChange(
      oldMessage,
      MessageChangeType.Updated,
      timestamp,
    );
  }

  public async logMemberTimeout(
    member: GuildMember,
    executor: User,
    durationMilliseconds: number,
    readableDuration: string,
    reason: string | null,
    executedTimestamp: number,
  ) {
    const logChannel = await this.channelForGuild(member.guild);
    if (!logChannel) {
      return;
    }

    const expiration = new Date(executedTimestamp + durationMilliseconds);
    const embed = new EmbedBuilder()
      .setColor(Color.Red)
      .setTitle("Member Timed Out")
      .addFields(
        { name: "Member", value: `${member} (${member.user.tag})` },
        { name: "Performed By", value: `${executor}`, inline: true },
        { name: "Duration", value: readableDuration },
        {
          name: "Expiration",
          value: time(expiration, TimestampStyles.RelativeTime),
          inline: true,
        },
      )
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp(executedTimestamp);
    if (reason) {
      embed.addFields({ name: "Reason", value: reason });
    }

    await logChannel.send({ embeds: [embed] });
  }

  private async logMessageChange(
    message: Message | PartialMessage,
    type: MessageChangeType,
    timestamp: Date | number | null,
    executor?: User,
  ) {
    if (message.partial || message.author.bot || !message.inGuild()) {
      return;
    }

    const logChannel = await this.channelForGuild(message.guild);
    if (!logChannel) {
      return;
    }

    const executorString = executor ? ` by ${executor}` : "";

    await logChannel.send({
      files: message.attachments.map(({ proxyURL }) => proxyURL),
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
                `Message by ${message.author} ${type}${executorString} in ${message.channel}`,
              ),
              message.content,
            ].join("\n"),
          )
          .setFooter({
            text: [
              `User ID: ${message.author.id}`,
              `Message ID: ${message.id}`,
            ].join(" | "),
          })
          .setTimestamp(timestamp),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Message")
            .setURL(message.url),
        ),
      ],
    });
  }

  public async logTicketCreation(
    member: GuildMember,
    thread: ThreadChannel,
    title: string,
    ID: string,
    description: string,
    executedTimestamp: number,
  ) {
    const logChannel = await this.channelForGuild(member.guild);
    if (!logChannel) {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(Color.Yellow)
      .setTitle("Member Created a Ticket")
      .addFields(
        { name: "Member", value: `${member} (${member.user.tag})` },
        { name: "Title", value: `${title} - ${ID}` },
        { name: "Reason", value: description },
      )
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp(executedTimestamp);

    const component = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Ticket")
        .setURL(thread.url),
    );

    await logChannel.send({ embeds: [embed], components: [component] });
  }

  public async logTicketClose(
    member: GuildMember,
    thread: ThreadChannel,
    title: string,
    description: string,
    executedTimestamp: number,
  ) {
    const logChannel = await this.channelForGuild(member.guild);
    if (!logChannel) {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(Color.Red)
      .setTitle("Member Closed a Ticket")
      .addFields(
        { name: "Member", value: `${member} (${member.user.tag})` },
        { name: "Title", value: title },
        { name: "Reason", value: description },
      )
      .setFooter({ text: `User ID: ${member.id}` })
      .setTimestamp(executedTimestamp);

    const component = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Ticket")
        .setURL(thread.url),
    );

    await logChannel.send({ embeds: [embed], components: [component] });
  }

  private async channelForGuild(guild: Guild) {
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
  Created = "created",
  Deleted = "deleted",
  Updated = "updated",
}
