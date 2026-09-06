import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { GuildMember, Role } from "discord.js";
import { formerMembers } from "../../index.js";

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberAdd })
export class GuildMemberAddListener extends Listener<
  typeof Events.GuildMemberAdd
> {
  public override async run(member: GuildMember) {
    const formerMember = await formerMembers.findOneAndDelete({
      user: member.id,
      guild: member.guild.id,
    });
    if (formerMember) {
      const reason = "Automatic reverification";
      const me = await member.guild.members.fetchMe();
      const myHighestRole = me.roles.highest;
      const assignableRoles = formerMember.roles
        .map((role) => member.guild.roles.cache.get(role))
        .filter(
          (role): role is Role =>
            role !== undefined &&
            !role.managed &&
            myHighestRole.comparePositionTo(role) > 0,
        );
      await Promise.all([
        member.setNickname(formerMember.nickname, reason),
        member.roles.add(assignableRoles, reason),
      ]);
    }
  }
}
