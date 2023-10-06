import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    type ChatInputCommandInteraction,
} from 'discord.js';
import { Color } from '../lib/embeds';
import {InputId, ModalId} from '../lib/ticket';

const error = (interaction: ChatInputCommandInteraction, content: string) => {
    return interaction.followUp({
        embeds: [new EmbedBuilder().setColor(Color.Red).setDescription(content)],
        ephemeral: true,
    });
};

@ApplyOptions<Command.Options>({
    description: 'Allow users to create a ticket from anywhere',
    runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class SelfTimeoutCommand extends Command {
    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            await error(interaction, 'Command only available in servers');
            return;
        }

        const ticketModal = new ModalBuilder()
            .setCustomId(ModalId.Ticket)
            .setTitle('Enter your information for verification')
            .setComponents(
                new ActionRowBuilder<TextInputBuilder>().setComponents(
                    new TextInputBuilder()
                        .setCustomId(InputId.Title)
                        .setLabel('Title of the Ticket')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(25)
                        .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().setComponents(
                    new TextInputBuilder()
                        .setCustomId(InputId.Explanation)
                        .setLabel('Description')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder(
                            'Provide an explanation of why you are making your ticket.'
                        )
                        .setRequired(true)
                ),
            );
        await interaction.showModal(ticketModal);
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(
            command =>
                command
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ['1128327592269852852'] }
        );
    }
}