import {bold, hyperlink, inlineCode, userMention} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Collection,
  type GuildMember,
  type InteractionReplyOptions,
} from 'discord.js';
import type {AbstractCursor} from 'mongodb';
import {messageCounts} from '..';
import type {MessageCount} from '../lib/leaderboard';
import {Color} from '../lib/embeds';
import {userUrl} from '../lib/user';

@ApplyOptions<Command.Options>({
  description: 'Get server message count leaderboard',
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class LeaderboardCommand extends Command {
  private static readonly PageSize = 10;
  private static readonly RankEmojis = ['🥇', '🥈', '🥉'];
  private static readonly ZeroWidthSpace = '\u200B';
  private static readonly PaddingL = `${LeaderboardCommand.ZeroWidthSpace} `;
  private static readonly PaddingR =
    ` ${LeaderboardCommand.ZeroWidthSpace}`.repeat(4);
  private static readonly ButtonPrev = 'prev';
  private static readonly ButtonNext = 'next';

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      return;
    }
    await interaction.deferReply();

    let page = 0;
    const leaderboardUsers = messageCounts
      .aggregate<MessageCount>()
      .match({'_id.guild': interaction.guildId})
      .group<LeaderboardUser>({_id: '$_id.user', count: {$sum: '$count'}})
      .project<LeaderboardUser>({count: true})
      .sort({count: -1, _id: 1});
    const guild = await interaction.client.guilds.fetch(interaction.guildId);
    const cachedPages = new Array<string>();

    const replyOptions = async (): Promise<InteractionReplyOptions> => ({
      embeds: [
        new EmbedBuilder()
          .setColor(Color.Green)
          .setTitle('Message Count Leaderboard')
          .setDescription(
            await this.page(
              page,
              leaderboardUsers,
              await guild.members.fetch(),
              cachedPages
            )
          ),
      ],
      components: [
        await this.actionRow(page, leaderboardUsers, cachedPages.length),
      ],
    });
    const reply = await interaction.followUp({
      fetchReply: true,
      ...(await replyOptions()),
    });

    const collector = reply.createMessageComponentCollector();
    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          ephemeral: true,
          content: `Please stop interacting with the components on this message. They are only for ${userMention(
            interaction.user.id
          )}.`,
        });
        return;
      }
      await i.deferUpdate();
      if (i.customId === LeaderboardCommand.ButtonPrev) {
        page--;
      } else if (i.customId === LeaderboardCommand.ButtonNext) {
        page++;
      }
      await i.editReply(await replyOptions());
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      command => command.setName(this.name).setDescription(this.description),
      {idHints: ['988533581695578153', '983911169758732338']}
    );
  }

  private async page(
    index: number,
    leaderboardUsers: AbstractCursor<LeaderboardUser>,
    members: Collection<string, GuildMember>,
    cache: string[]
  ) {
    if (index < cache.length) {
      return cache[index];
    }
    const users = new Array<LeaderboardUser>();
    for (let i = 0; i < LeaderboardCommand.PageSize; ) {
      const user = await leaderboardUsers.next();
      if (!user) {
        break;
      }
      if (!members.has(user._id)) {
        continue;
      }
      users.push(user);
      i++;
    }
    const start = index * LeaderboardCommand.PageSize;
    const page = users
      .map(({_id, count}, i) => [
        this.formatRank(start + i),
        this.formatUser(members, _id),
        inlineCode(`${count} messages`),
      ])
      .map(columns => columns.join(' '))
      .join('\n');
    cache.push(page);
    return page;
  }

  private formatRank(index: number) {
    return index < LeaderboardCommand.RankEmojis.length
      ? [
          LeaderboardCommand.PaddingL,
          LeaderboardCommand.RankEmojis[index],
          LeaderboardCommand.PaddingR,
        ].join('')
      : bold(inlineCode(`#${String(index + 1).padEnd(3)}`));
  }

  private formatUser(
    members: Collection<string, GuildMember>,
    userId: string
  ): string {
    const member = members.get(userId);
    return hyperlink(
      member?.nickname ?? member?.user.username ?? userId,
      userUrl(userId)
    );
  }

  private async actionRow(
    page: number,
    leaderboardUsers: AbstractCursor<LeaderboardUser>,
    cachedPages: number
  ) {
    const isLastPage =
      page === cachedPages - 1 && !(await leaderboardUsers.hasNext());
    return new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(LeaderboardCommand.ButtonPrev)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('◀️')
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(LeaderboardCommand.ButtonNext)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('▶️')
        .setDisabled(isLastPage)
    );
  }
}

interface LeaderboardUser {
  _id: string;
  count: number;
}
