import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  CheckboxBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
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
          .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
              .setCustomId(InputId.Program)
              .setOptions(
                Program.values().map(({ name, description }) => ({
                  label: name,
                  value: name,
                  description: description,
                })),
              )
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
        new LabelBuilder()
          .setLabel("I am 13 years of age or older")
          .setCheckboxComponent(
            new CheckboxBuilder().setCustomId(InputId.AgeConfirmation),
          ),
      );
    await interaction.showModal(modal);
  }
}
