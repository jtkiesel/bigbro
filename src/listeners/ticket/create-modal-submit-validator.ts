import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    GuildMember,
    PermissionFlagsBits,
    type Interaction,
    type ModalSubmitInteraction,
} from 'discord.js';
import { Color } from '../../lib/embeds';
import { TButtonId, InputId, ModalId } from '../../lib/ticket';
import { messageLogger } from '../..';
import { settingsManager } from '../..';
import { userUrl } from '../../lib/user';
import { ticketLogs } from '../..';
import type { TicketLog } from '../../lib/ticket';

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
    typeof Events.InteractionCreate
> {

    public override async run(interaction: Interaction) {
        if (
            !interaction.isModalSubmit() ||
            interaction.customId !== ModalId.Ticket ||
            !interaction.inGuild()
        ) {
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const title = interaction.fields.getTextInputValue(InputId.Title).trim();
        if (!title) {
            return this.sendValidationFailure(
                interaction,
                'Title must contain at least 1 non-whitespace character'
            );
        }

        const exp = interaction.fields.getTextInputValue(InputId.Explanation).trim();
        if (!exp) {
            return this.sendValidationFailure(
                interaction,
                'Description must contain at least 1 non-whitespace character'
            );
        }

        const guildSettings = await settingsManager.get(interaction.guildId);
        const guild = await interaction.client.guilds.fetch(interaction.guildId);
        const member = await guild.members.fetch(interaction.member.user.id);

        const ticketChannelId = guildSettings?.ticketChannel;
        if (!ticketChannelId) {
            return;
        }
        const ticketChannel = await guild.channels.fetch(
            ticketChannelId
        );
        if (ticketChannel?.type !== ChannelType.GuildText) {
            return;
        }

        const latestTicket = await ticketLogs.findOne(
            { '_id.guild': interaction.guildId! },
            { sort: { 'number': -1 } }
        );

        
        const latestTicketNumber = latestTicket ? latestTicket.number : 0;
        const ticketID = String(latestTicketNumber + 1).padStart(6, '0');

        const threadName = `${title} - #${ticketID}`;

        let thread = await ticketChannel.threads.create({
            name: threadName,
            reason: `Ticket for ${interaction.user.id}`,
            type: ChannelType.PrivateThread,
            invitable: false,
        });

        const roles = await guild.roles.fetch();

        await thread.send(
            [
                interaction.user,
                ...roles
                    .filter(role =>
                        role
                            .permissionsIn(ticketChannel)
                            .has(PermissionFlagsBits.ManageThreads)
                    )
                    .values(),
            ].join(' ')
        );

        const ticketCreate = await thread.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(Color.Yellow)
                    .setAuthor({
                        name: interaction.user.tag,
                        url: userUrl(interaction.user.id),
                        iconURL: (interaction.member instanceof GuildMember
                            ? interaction.member
                            : interaction.user
                        ).displayAvatarURL(),
                    })
                    .setTitle(`${title}`)
                    .setDescription(exp)
                    .setTimestamp(interaction.createdTimestamp),
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents(
                    new ButtonBuilder()
                        .setCustomId(TButtonId.Close)
                        .setStyle(ButtonStyle.Danger)
                        .setLabel('Close Ticket'),
                ),
            ],
        });

        messageLogger.logTicketCreation(
            member,
            thread,
            title,
            ticketID,
            exp,
            interaction.createdTimestamp
        );

        const ticketLogEntry: TicketLog = {
            _id: {
                guild: interaction.guildId!,
                channel: thread.id,
                user: interaction.user.id,
            },
            title: title,
            number: parseInt(ticketID),
            open: true,
        };
        
        await ticketLogs.insertOne(ticketLogEntry);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Color.Blue)
                    .setDescription(
                        [
                            'Your ticket is being reviewed by the moderation team.',
                            'A thread has been created to continue the conversation',
                            'If you have any additional information, please send us a message by pressing the button below.',
                        ].join(' ')
                    ),
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel('Ticket')
                        .setURL(ticketCreate.url)
                ),
            ],
        });
    }

    private async sendValidationFailure(
        interaction: ModalSubmitInteraction,
        description: string
    ) {
        await interaction.editReply({
            embeds: [
                new EmbedBuilder().setColor(Color.Red).setDescription(description),
            ],
        });
    }
}
