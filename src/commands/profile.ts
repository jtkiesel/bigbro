import { Constants, GuildMember, Message, MessageEmbed, User } from 'discord.js';

import { LeaderboardUser, MessageCount } from './leaderboard';
import { addFooter, Command, db } from '..';
import { leaderboardChannels } from '../messages';

const statusEmojis = {
  online: '<:online:462707431865188354>',
  offline: '<:offline:462707499133304842>',
  idle: '<:idle:462707524869816330>',
  dnd: '<:dnd:462707542389161994>',
  streaming: '<:streaming:462707566552547369>',
  invisible: '<:invisible:462707587570204682>'
};

class Profile implements Command {
  async execute(message: Message, args: string): Promise<void> {
    let user: User, member: GuildMember;
    if (!args) {
      user = message.author;
      member = message.member;
    } else {
      user = message.mentions.users.first();
      member = message.mentions.members?.first();
    }
    if (!user) {
      message.reply('please mention a user to obtain their profile.').catch(console.error);
      return;
    }
    const presenceStatus = user.presence.status;
    let status: string;
    if (presenceStatus === 'dnd') {
      status = 'Do Not Disturb';
    } else {
      status = presenceStatus.charAt(0).toUpperCase() + presenceStatus.slice(1);
    }
    status = `${statusEmojis[presenceStatus]} ${status}`;
    const joinedDiscord = `${Math.floor((Date.now() - user.createdAt.getTime()) / 86400000)} days ago`;
    const embed = new MessageEmbed()
      .setColor(member?.displayHexColor || Constants.Colors.WHITE)
      .setAuthor(member?.displayName || user.username, user.displayAvatarURL())
      .setImage(user.displayAvatarURL({size: 2048}))
      .addField('Status', status, true)
      .addField('Joined Discord', joinedDiscord, true);
    if (message.guild) {
      const joinedServer = `${Math.floor((Date.now() - member.joinedAt.getTime()) / 86400000)} days ago`;
      embed.addField('Joined Server', joinedServer, true);
      try {
        const leaderboardUser = await db().collection<MessageCount>('messages').aggregate()
          .match({'_id.guild': message.guild.id, '_id.channel': {$in: leaderboardChannels}, '_id.user': user.id})
          .group<LeaderboardUser>({_id: '$_id.user', count: {$sum: '$count'}})
          .next();
        const messageCount = leaderboardUser?.count || 0;
        embed.addField('Messages', messageCount, true);
      } catch (error) {
        console.error(error);
      }
      const roles = member.roles.cache.array().filter(role => role.id != message.guild.id).sort((a, b) => b.comparePositionTo(a)).join(', ');
      if (roles.length) {
        embed.addField('Roles', roles, true);
      }
    } 
    try {
      const reply = await message.channel.send(embed);
      addFooter(message, reply);
    } catch (error) {
      console.error(error);
    }
  }
}

export default new Profile();
