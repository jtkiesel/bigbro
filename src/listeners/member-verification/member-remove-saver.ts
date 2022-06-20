import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import type {GuildMember, PartialGuildMember} from 'discord.js';
import {verifiedMembers} from '../..';

@ApplyOptions<Listener.Options>({event: Events.GuildMemberRemove})
export class GuildMemberRemoveListener extends Listener<
  typeof Events.GuildMemberRemove
> {
  public override async run(member: GuildMember | PartialGuildMember) {
    await verifiedMembers.updateOne(
      {user: member.id, guild: member.guild.id},
      {
        $set: {
          nickname: member.displayName,
          roles: [...member.roles.cache.keys()],
        },
      },
      {upsert: true}
    );
  }
}
