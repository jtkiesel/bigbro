import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import {
  EmbedBuilder,
  inlineCode,
  type ChatInputCommandInteraction,
} from "discord.js";
import { Color } from "../lib/embeds.js";

@ApplyOptions<Command.Options>({ description: "Test connection to Discord" })
export class PingCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const interactionReceived = Date.now();
    const fromDiscord = interactionReceived - interaction.createdTimestamp;

    await interaction.deferReply({ flags: "Ephemeral" });
    const reply = await interaction.fetchReply();

    const toDiscord = reply.createdTimestamp - interactionReceived;
    const roundTrip = reply.createdTimestamp - interaction.createdTimestamp;
    const gatewayHeartbeat =
      interaction.guild?.shard.ping ?? interaction.client.ws.ping;
    const client = interaction.client.user.username;

    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(Color.Blue)
          .setDescription(
            [
              "Pong! 🏓",
              "🐌 Latency:",
              `┣ Discord -> ${client}: ${inlineCode(fromDiscord + "ms")}`,
              `┣ ${client} -> Discord: ${inlineCode(toDiscord + "ms")}`,
              `┗ Round trip: ${inlineCode(roundTrip + "ms")}`,
              `💓 Gateway heartbeat: ${inlineCode(gatewayHeartbeat + "ms")}`,
            ].join("\n"),
          ),
      ],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (command) => command.setName(this.name).setDescription(this.description),
      { idHints: ["983911170203324447"] },
    );
  }
}
