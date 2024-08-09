import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { duration } from "../lib/duration.js";
import { Color } from "../lib/embeds.js";

@ApplyOptions<Command.Options>({
  description: "Get time since bot last restarted",
})
export class UptimeCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Color.Blue)
          .setDescription(`🕒 Uptime: ${duration(interaction.client.uptime)}`),
      ],
      ephemeral: true,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (command) => command.setName(this.name).setDescription(this.description),
      { idHints: ["988533583431995392", "983913881221079070"] },
    );
  }
}
