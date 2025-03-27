import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { GuildMember, Role } from "discord.js";
import { verifiedMembers } from "../../index.js";

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberAdd })
export class GuildMemberAddListener extends Listener<
  typeof Events.GuildMemberAdd
> {
  public override async run(member: GuildMember) {
    const verifiedMember = await verifiedMembers.findOne({
      user: member.id,
      guild: member.guild.id,
    });
    if (verifiedMember) {
      const reason = "Automatic reverification";
      const me = await member.guild.members.fetchMe();
      const myHighestRole = me.roles.highest;
      const assignableRoles = verifiedMember.roles
        .map((role) => member.guild.roles.cache.get(role))
        .filter(
          (role): role is Role =>
            role !== undefined &&
            !role.managed &&
            myHighestRole.comparePositionTo(role) > 0,
        );
      await Promise.all([
        member.setNickname(verifiedMember.nickname, reason),
        member.roles.add(assignableRoles, reason),
      ]);
    }
  }
}
