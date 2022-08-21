import {bold, inlineCode, userMention} from '@discordjs/builders';
import {ApplyOptions} from '@sapphire/decorators';
import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {
  type Message,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  type Collection,
  type GuildMember,
} from 'discord.js';
import type {AbstractCursor} from 'mongodb';
import {messageCounts} from '..';
import type {MessageCount} from '../lib/leaderboard';
import {Colors} from '../lib/embeds';

@ApplyOptions<Command.Options>({
  description: 'Get server message count leaderboard',
  runIn: [CommandOptionsRunTypeEnum.GuildText],
  chatInputCommand: {
    register: true,
    idHints: ['988533581695578153', '983911169758732338'],
  },
})
export class LeaderboardCommand extends Command {
  private static readonly PAGE_SIZE = 10;
  private static readonly RANK_EMOJIS = ['🥇', '🥈', '🥉'];
  private static readonly ZERO_WIDTH_SPACE = '\u200B';
  private static readonly PADDING_L = `${LeaderboardCommand.ZERO_WIDTH_SPACE} `;
  private static readonly PADDING_R =
    ` ${LeaderboardCommand.ZERO_WIDTH_SPACE}`.repeat(4);
  private static readonly BUTTON_PREV = 'prev';
  private static readonly BUTTON_NEXT = 'next';

  private readonly guildsWithMembersFetched = new Set<string>();

  public override async chatInputRun(
    interaction: Command.ChatInputInteraction
  ) {
    if (!interaction.inGuild() || !interaction.channel) {
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

    if (!this.guildsWithMembersFetched.has(interaction.guildId)) {
      await guild.members.fetch();
      this.guildsWithMembersFetched.add(interaction.guildId);
    }

    const embed = new MessageEmbed()
      .setColor(Colors.GREEN)
      .setTitle('Message Count Leaderboard');
    const replyOptions = async () => ({
      embeds: [
        embed.setDescription(
          await this.page(
            page,
            leaderboardUsers,
            guild.members.cache,
            cachedPages
          )
        ),
      ],
      components: [
        await this.actionRow(page, leaderboardUsers, cachedPages.length),
      ],
    });
    const reply = (await interaction.followUp({
      fetchReply: true,
      ...(await replyOptions()),
    })) as Message;

    const collector = reply.createMessageComponentCollector();
    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          ephemeral: true,
          content: `Please stop interacting with the components on this message. They are only for ${userMention(
            interaction.user.id
          )}.`,
        });
      }
      await i.deferUpdate();
      if (i.customId === LeaderboardCommand.BUTTON_PREV) {
        page--;
      } else if (i.customId === LeaderboardCommand.BUTTON_NEXT) {
        page++;
      }
      await i.editReply(await replyOptions());
    });
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
    const users: LeaderboardUser[] = [];
    for (let i = 0; i < LeaderboardCommand.PAGE_SIZE; ) {
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
    const start = index * LeaderboardCommand.PAGE_SIZE;
    const page = users
      .map(({_id, count}, i) => [
        this.formatRank(start + i),
        userMention(_id),
        inlineCode(`${count} messages`),
      ])
      .map(columns => columns.join(' '))
      .join('\n');
    cache.push(page);
    return page;
  }

  private formatRank(index: number) {
    return index < LeaderboardCommand.RANK_EMOJIS.length
      ? [
          LeaderboardCommand.PADDING_L,
          LeaderboardCommand.RANK_EMOJIS[index],
          LeaderboardCommand.PADDING_R,
        ].join('')
      : bold(inlineCode(`#${String(index + 1).padEnd(3)}`));
  }

  private async actionRow(
    page: number,
    leaderboardUsers: AbstractCursor<LeaderboardUser>,
    cachedPages: number
  ) {
    const isLastPage =
      page === cachedPages - 1 && !(await leaderboardUsers.hasNext());
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(LeaderboardCommand.BUTTON_PREV)
        .setStyle('PRIMARY')
        .setEmoji('◀️')
        .setDisabled(page === 0),
      new MessageButton()
        .setCustomId(LeaderboardCommand.BUTTON_NEXT)
        .setStyle('PRIMARY')
        .setEmoji('▶️')
        .setDisabled(isLastPage)
    );
  }
}

interface LeaderboardUser {
  _id: string;
  count: number;
}
