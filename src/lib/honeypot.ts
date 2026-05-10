import type { Guild, GuildMember } from "discord.js";


export async function removeMember(member: GuildMember, guild: Guild) {
    await member.ban({
        deleteMessageSeconds: 86400,
        reason: "Sent a message in the honeypot channel.",
    });
    await guild.bans.remove(member.id);
}

export const honeypotTimeouts = new Map<string, NodeJS.Timeout>();

export enum HPotButtonId {
    Verify = "verify",
}