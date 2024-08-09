import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { Color } from "../lib/embeds.js";
import { ticketModal } from "../lib/ticket.js";

const error = (interaction: ChatInputCommandInteraction, content: string) => {
  return interaction.followUp({
    embeds: [new EmbedBuilder().setColor(Color.Red).setDescription(content)],
    ephemeral: true,
  });
};

@ApplyOptions<Command.Options>({
  description: "Speak privately with server staff",
  runIn: [CommandOptionsRunTypeEnum.GuildAny],
})
export class TicketCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      await error(interaction, "Command only available in servers");
      return;
    }

    await interaction.showModal(ticketModal);
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (command) => command.setName(this.name).setDescription(this.description),
      { idHints: ["1128327592269852852"] },
    );
  }
}
