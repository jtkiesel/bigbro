import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { Guild, GuildMember, Message } from "discord.js";
import { settingsManager } from "../../index.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, time, TimestampStyles } from "discord.js";
import { Color } from "../../lib/embeds.js";
import { HPotButtonId, honeypotTimeouts } from "../../lib/honeypot.js";

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class MessageCreateListener extends Listener<
    typeof Events.MessageCreate
> {
    public override async run(message: Message) {
        const settings = await settingsManager.get(message.guildId!);
        const honeypotChannelId = settings?.honeypotChannel;
        if (message.channelId === honeypotChannelId && message.author.id !== message.client.user.id) {
            await message.delete();
            const user = message.author;
            const guild = await message.client.guilds.fetch(message.guildId!);
            const member = await guild.members.fetch(user);
            if (member.moderatable && !honeypotTimeouts.has(member.id)) {
                const expiration = new Date(message.createdTimestamp + 60_000);
                try {
                    await member.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(Color.Red)
                                .setTitle("Honeypot Channel Message Detected")
                                .setDescription(
                                    `You have sent a message in the honeypot channel. This channel is actively monitored for hacked accounts and spam bots.`,
                                )
                                .addFields(
                                    { name: "Action", value: "You will be removed from the server if you do not click the button below within the expiration time." },
                                    { name: "Expiration", value: time(expiration, TimestampStyles.RelativeTime) },
                                ),
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().setComponents(
                                new ButtonBuilder()
                                    .setCustomId(HPotButtonId.Verify)
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji("✅")
                                    .setLabel("I am not a bot"),
                            ),
                        ],
                    })
                    honeypotTimeouts.set(member.id, setTimeout(async () => {
                        if (honeypotTimeouts.has(member.id)) {
                            await this.removeMember(member, guild);
                        }
                        honeypotTimeouts.delete(member.id);
                    }, 60_000));



                }
                catch (error) {
                    this.container.logger.error(`Failed to DM user ${user.id}:`, error);
                    await this.removeMember(member, guild);
                }
            }
        }
    }

    private async removeMember(member: GuildMember, guild: Guild) {
        await member.ban({
            deleteMessageSeconds: 86_400,
            reason: "Sent a message in the honeypot channel.",
        });
        await guild.bans.remove(member.id);
    }
}

