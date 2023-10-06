import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import {
    ChannelType,
    EmbedBuilder,
    GuildMember,
    type Interaction,
    type ModalSubmitInteraction,
} from 'discord.js';
import { Color } from '../../lib/embeds';
import { InputId, ModalId } from '../../lib/ticket';
import { messageLogger } from '../..';
import { userUrl } from '../../lib/user';
import { ticketLogs } from '../..';

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
    typeof Events.InteractionCreate
> {

    public override async run(interaction: Interaction) {
        if (
            !interaction.isModalSubmit() ||
            interaction.customId !== ModalId.Close ||
            !interaction.inGuild()
        ) {
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const resolution = interaction.fields.getTextInputValue(InputId.Resolution).trim();
        if (!resolution) {
            return this.sendValidationFailure(
                interaction,
                'Resolution must contain at least 1 non-whitespace character'
            );
        }

        const guild = await interaction.client.guilds.fetch(interaction.guildId);
        const member = await guild.members.fetch(interaction.member.user.id);

        const ticketThreadId = interaction.channelId;
        if (!ticketThreadId) {
            return;
        }
        const ticketThread = await guild.channels.fetch(
            ticketThreadId
        );
        if (ticketThread?.type !== ChannelType.PrivateThread) {
            return;
        }

        const ticket = await ticketLogs.findOne(
            { '_id.guild': interaction.guildId!, '_id.channel': ticketThread.id }
        );

        if (!ticket) { return; }

        const ticketID = String(ticket.number).padStart(6, '0');

        await ticketThread.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(Color.Red)
                    .setAuthor({
                        name: interaction.user.tag,
                        url: userUrl(interaction.user.id),
                        iconURL: (interaction.member instanceof GuildMember
                            ? interaction.member
                            : interaction.user
                        ).displayAvatarURL(),
                    })
                    .setTitle(`Ticket #${ticketID} closed`)
                    .setDescription(resolution)
                    .setTimestamp(interaction.createdTimestamp),
            ]
        });

        messageLogger.logTicketClose(
            member,
            ticketThread,
            ticketThread.name,
            resolution,
            interaction.createdTimestamp
        );

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Color.Green)
                    .setDescription(
                        [
                            `Ticket #${ticketID} successfully closed.`,
                        ].join(' ')
                    ),
            ],
        });

        await ticketThread.setLocked(true);
        await ticketThread.setArchived(true);

        await ticketLogs.updateOne(
            { '_id.guild': interaction.guildId!, '_id.channel': ticketThread.id },
            { $set: { open: false } }
        );
        return;
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
