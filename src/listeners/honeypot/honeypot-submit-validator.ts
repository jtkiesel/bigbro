import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
    EmbedBuilder,
    type Interaction,
} from "discord.js";
import { honeypotTimeouts, HPotButtonId } from "../../lib/honeypot.js";
import { Color } from "../../lib/embeds.js";

@ApplyOptions<Listener.Options>({ event: Events.InteractionCreate })
export class InteractionCreateListener extends Listener<
    typeof Events.InteractionCreate
> {
    public override async run(interaction: Interaction) {
        if (
            !interaction.isButton() ||
            interaction.customId !== HPotButtonId.Verify ||
            !honeypotTimeouts.has(interaction.user.id)
        ) {
            return;
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Color.Green)
                    .setTitle("Verification Successful")
                    .setDescription(
                        "You have successfully verified that you are not a bot. You will not be removed from the server.",
                    )
            ],
            flags: "Ephemeral",
        });
    }
}
