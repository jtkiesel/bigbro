import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  LabelBuilder,
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
      .setLabelComponents(
        new LabelBuilder()
          .setLabel("Name or preferred nickname")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(InputId.Name)
              .setStyle(TextInputStyle.Short)
              .setMinLength(1)
              .setMaxLength(25)
              .setRequired(true),
          ),
        new LabelBuilder()
          .setLabel("Primary robotics competition program")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(InputId.Program)
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
        new LabelBuilder()
          .setLabel("Robotics competition team ID#")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(InputId.Team)
              .setStyle(TextInputStyle.Short)
              .setMinLength(1)
              .setMaxLength(7)
              .setRequired(false),
          ),
        new LabelBuilder()
          .setLabel("Explanation")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(InputId.Explanation)
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
