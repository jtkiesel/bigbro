import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { Guild, GuildMember, Message } from "discord.js";
import { settingsManager } from "../../index.js";
import { EmbedBuilder } from "discord.js";
import { Color } from "../../lib/embeds.js";

@ApplyOptions<Listener.Options>({ event: Events.MessageCreate })
export class MessageCreateListener extends Listener<
    typeof Events.MessageCreate
> {
    public override async run(message: Message) {
        const settings = await settingsManager.get(message.guildId!);
        const honeypotChannelId = settings?.honeypotChannel;
        if (message.channelId === honeypotChannelId && message.author.id !== message.client.user.id) {
            const user = message.author;
            const guild = await message.client.guilds.fetch(message.guildId!);
            const member = await guild.members.fetch(user);
            if (member.moderatable) {
                try {
                    await member.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(Color.Red)
                                .setTitle("Honeypot Channel Message Detected")
                                .setDescription(
                                    `You have sent a message in the honeypot channel. This channel is actively monitored for hacked accounts and spam bots. Your last hour of messages have been deleted, and you have been removed from the server.`,
                                )
                                .addFields(
                                    { name: "Action", value: "If you believe this was a mistake or have regained access to your account, you are welcome to rejoin the server." },
                                ),
                        ],
                    })
                }
                catch (error) {
                    throw error;
                }
                this.removeMember(member, guild);
            }
        }
    }

    private async removeMember(member: GuildMember, guild: Guild) {
        await member.ban({
            deleteMessageSeconds: 3_600,
            reason: "Sent a message in the honeypot channel.",
        });
        await guild.bans.remove(member.id);
    }
}

