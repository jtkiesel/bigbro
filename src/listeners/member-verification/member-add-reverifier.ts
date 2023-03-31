import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import type {GuildMember} from 'discord.js';
import {verifiedMembers} from '../..';

@ApplyOptions<Listener.Options>({event: Events.GuildMemberAdd})
export class GuildMemberAddListener extends Listener<
  typeof Events.GuildMemberAdd
> {
  public override async run(member: GuildMember) {
    const verifiedMember = await verifiedMembers.findOne({
      user: member.id,
      guild: member.guild.id,
    });
    if (verifiedMember) {
      const reason = 'Automatic reverification';
      await Promise.all([
        member.setNickname(verifiedMember.nickname, reason),
        member.roles.add(verifiedMember.roles, reason),
      ]);
    }
  }
}
