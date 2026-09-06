import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { GuildMember, PartialGuildMember } from "discord.js";
import { formerMembers } from "../../index.js";

formerMembers.createIndex(
  { leftAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberRemove })
export class GuildMemberRemoveListener extends Listener<
  typeof Events.GuildMemberRemove
> {
  public override async run(member: GuildMember | PartialGuildMember) {
    await formerMembers.updateOne(
      { user: member.id, guild: member.guild.id },
      {
        $set: {
          nickname: member.displayName,
          roles: [...member.roles.cache.keys()],
        },
        $currentDate: { leftAt: true },
      },
      { upsert: true },
    );
  }
}
