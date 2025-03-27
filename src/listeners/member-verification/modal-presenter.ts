import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Interaction,
} from "discord.js";
import { settingsManager } from "../../index.js";
import { Program } from "../../lib/robotics-program.js";
import { ButtonId, InputId, ModalId } from "../../lib/verification.js";

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
  typeof Events.InteractionCreate
> {
  public override async run(interaction: Interaction) {
    if (
      !interaction.isButton() ||
      interaction.customId !== ButtonId.Verify ||
      !interaction.inGuild()
    ) {
      return;
    }

    const guildSettings = await settingsManager.get(interaction.guildId);
    const verificationChannelId = guildSettings?.verificationChannel;
    if (interaction.channelId !== verificationChannelId) {
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(ModalId.Verify)
      .setTitle("Enter your information for verification")
      .setComponents(
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId(InputId.Name)
            .setLabel("Name or preferred nickname")
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(25)
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId(InputId.Program)
            .setLabel("Primary robotics competition program")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(
              Program.values()
                .map(({ name }) => name)
                .join(", "),
            )
            .setMinLength(3)
            .setMaxLength(5)
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId(InputId.Team)
            .setLabel("Robotics competition team ID#")
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(7)
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().setComponents(
          new TextInputBuilder()
            .setCustomId(InputId.Explanation)
            .setLabel("Explanation")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
              "If program is None, explain how you are involved with VEX Robotics or why you joined the server",
            )
            .setRequired(false),
        ),
      );
    await interaction.showModal(modal);
  }
}
