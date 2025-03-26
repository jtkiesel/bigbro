import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import {
    ActionRowBuilder,
    bold,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    userMention,
    type ChatInputCommandInteraction,
    type InteractionReplyOptions,
} from 'discord.js';
import { moderationLogs } from '../index.js';
import type { ModerationLog } from '../lib/moderation.js';

@ApplyOptions<Command.Options>({
    description: "Get a user's moderation history",
    requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class ModLogsCommand extends Command {

    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            return;
        }

        const user = interaction.options.getUser(Logs.User, true);
        const guild = await interaction.client.guilds.fetch(interaction.guildId);
        const member = await guild.members.fetch(user);

        if (!member) {
            await interaction.reply({
                content: `Error: ${user} is not a member of this server`,
                ephemeral: true,
            });
            return;
        }

        const userLog = await moderationLogs.findOne({
            '_id.user': member.id,
            '_id.guild': interaction.guildId,
        });

        if (!userLog) {
            await interaction.reply({
                content: `No moderation history found for ${user}`,
                ephemeral: true,
            });
            return;
        }

        userLog.warnings?.reverse();
        userLog.timeouts?.reverse();
        userLog.bans?.reverse();

        await interaction.deferReply({ ephemeral: true });

        const cachedPages: CachedPages = { user: [], warnings: [], timeouts: [], bans: [] };
        let logPage = 0;
        let selectedCategory = Logs.User;

        const replyOptions = async (): Promise<InteractionReplyOptions> => ({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${member.displayName}'s moderation history`)
                    .setDescription(
                        await this.renderLogPage(
                            selectedCategory,
                            logPage,
                            userLog,
                            cachedPages
                        )
                    ),
            ],
            components: [
                await this.selectActionRow(selectedCategory),
                await this.buttonActionRow(logPage, await this.getLogLength(selectedCategory, userLog)),
            ],
        });
        const reply = await interaction.editReply({
            fetchReply: true,
            ...(await replyOptions()),
        });

        const collector = reply.createMessageComponentCollector();
        collector.on('collect', async i => {
            await i.deferUpdate();
            if (i.customId === Logs.ButtonPrev) {
                logPage--;
            } else if (i.customId === Logs.ButtonNext) {
                logPage++;
            } else if (i.isStringSelectMenu() && i.customId === Logs.Category) {
                selectedCategory = i.values[0] as Logs;
                logPage = 0;
            }
            await i.editReply(await replyOptions());
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(
            command =>
                command
                    .setName(this.name)
                    .setDescription(this.description)
                    .addUserOption(user =>
                        user
                            .setName(Logs.User)
                            .setDescription('The user to view')
                            .setRequired(true)
                    ),
            { idHints: [] }
        );
    }

    private async renderLogPage(
        selectedCategory: Logs,
        index: number,
        userLog: ModerationLog,
        cache: CachedPages
    ) {
        switch (selectedCategory) {
            case Logs.User:
                return this.userPage(userLog, cache);
            case Logs.Warnings:
                return this.warningsPage(index, userLog, cache);
            case Logs.Timeouts:
                return this.timeoutsPage(index, userLog, cache);
            case Logs.Bans:
                return this.bansPage(index, userLog, cache);
            default:
                return '';
        }
    }

    private async getLogLength(
        selectedCategory: Logs,
        userLog: ModerationLog,
    ) {
        switch (selectedCategory) {
            case Logs.Warnings:
                return userLog.warnings?.length || 1;
            case Logs.Timeouts:
                return userLog.timeouts?.length || 1;
            case Logs.Bans:
                return userLog.bans?.length || 1;
            default:
                return 1;
        }
    }

    private async userPage(
        userLog: ModerationLog,
        cache: CachedPages
    ) {
        if (cache.user.length) {
            return cache.user[0];
        }
        const page = [
            `**Warnings:** ${userLog.warnings?.length || 0}`,
            `**Timeouts:** ${userLog.timeouts?.length || 0}`,
            `**Bans:** ${userLog.bans?.length || 0}`,
        ].join('\n');

        cache.user.push(page);
        return page;

    }

    private async warningsPage(
        index: number,
        userLog: ModerationLog,
        cache: CachedPages
    ) {
        if (index < cache.warnings.length) {
            return cache.warnings[index];
        }
        let page = ``;
        if (!userLog.warnings) {
            page = `User has no warnings`;
        } else {
            const { user, date, reason } = userLog.warnings[index];
            page = [
                bold(`Warning #${userLog.warnings.length - index}\n`),
                bold('Moderator:'),
                userMention(user),
                bold('Date'),
                date,
                bold('Reason'),
                reason,
            ].join('\n');
        }

        cache.warnings.push(page);
        return page;
    }

    private async timeoutsPage(
        index: number,
        userLog: ModerationLog,
        cache: CachedPages
    ) {
        if (index < cache.timeouts.length) {
            return cache.timeouts[index];
        }
        let page = ``;
        if (!userLog.timeouts) {
            page = `User has no timeouts`;
        } else {
            const { user, date, duration, reason } = userLog.timeouts[index];
            page = [
                bold(`Timeout #${userLog.timeouts.length - index}\n`),
                bold('Moderator:'),
                userMention(user),
                bold('Date'),
                date,
                bold('Duration'),
                duration,
                bold('Reason'),
                reason,
            ].join('\n');
        }

        cache.timeouts.push(page);
        return page;
    }

    private async bansPage(
        index: number,
        userLog: ModerationLog,
        cache: CachedPages
    ) {
        if (index < cache.bans.length) {
            return cache.bans[index];
        }
        let page = ``;
        if (!userLog.bans) {
            page = `User has no bans`;
        } else {
            const { user, date, reason } = userLog.bans[index];
            page = [
                bold(`Ban #${userLog.bans.length - index}\n`),
                bold('Moderator:'),
                userMention(user),
                bold('Date'),
                date,
                bold('Reason'),
                reason,
            ].join('\n');
        }

        cache.warnings.push(page);
        return page;
    }

    private async selectActionRow(selectedCategory: Logs) {
        return new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            new StringSelectMenuBuilder()
                .setCustomId(Logs.Category)
                .addOptions([
                    {
                        label: "User",
                        description: "User's information",
                        value: Logs.User,
                        default: selectedCategory === Logs.User,
                    },
                    {
                        label: "Warnings",
                        description: "Warning history",
                        value: Logs.Warnings,
                        default: selectedCategory === Logs.Warnings,
                    },
                    {
                        label: "Timeouts",
                        description: "Timeout history",
                        value: Logs.Timeouts,
                        default: selectedCategory === Logs.Timeouts,
                    },
                    {
                        label: "Bans",
                        description: "Ban history",
                        value: Logs.Bans,
                        default: selectedCategory === Logs.Bans,
                    },
                ]),
        );
    }

    private async buttonActionRow(
        page: number,
        logsLength: number,

    ) {
        const isLastPage =
            page === logsLength - 1;
        return new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
                .setCustomId(Logs.ButtonPrev)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('◀️')
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(Logs.ButtonNext)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('▶️')
                .setDisabled(isLastPage)
        );
    }
}

interface CachedPages {
    user: string[];
    warnings: string[];
    timeouts: string[];
    bans: string[];
}

enum Logs {
    User = 'user',
    Warnings = 'warnings',
    Timeouts = 'timeouts',
    Bans = 'bans',
    Title = 'title',
    ButtonPrev = 'prev',
    ButtonNext = 'next',
    Category = 'category',
}
