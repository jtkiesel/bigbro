import { MessageEmbed } from 'discord.js';

import { addFooter, db } from '..';
import { leaderboardChannels } from '../messages';

const statusEmojis = {
  'online': '<:online:462707431865188354>',
  'offline': '<:offline:462707499133304842>',
  'idle': '<:idle:462707524869816330>',
  'dnd': '<:dnd:462707542389161994>',
  'streaming': '<:streaming:462707566552547369>',
  'invisible': '<:invisible:462707587570204682>'
};

export default async (message, args) => {
  let user, member;
  if (!args) {
    user = message.author;
    member = message.member;
  } else {
    user = message.mentions.users.first();
    member = message.mentions.members ? message.mentions.members.first() : null;
  }
  if (!user) {
    message.reply('please mention a user to obtain their profile.').catch(console.error);
    return;
  }
  let document;
  try {
    document = message.guild ? await db.collection('messages').aggregate()
      .match({'_id.guild': message.guild.id, '_id.channel': {$in: leaderboardChannels}, '_id.user': user.id})
      .group({_id: '$_id.user', count: {$sum: '$count'}})
      .next() : null;
  } catch (err) {
    console.error(err);
  }
  const game = user.presence.game;
  const joinedDiscord = `${Math.floor((Date.now() - user.createdAt) / 86400000)} days ago`;
  const joinedServer = member ? `${Math.floor((Date.now() - member.joinedAt) / 86400000)} days ago` : null;
  const messageCount = document ? document.count : 0;
  const roles = (member && member.roles.cache.size > 1) ? member.roles.cache.array().filter(role => role.id != message.guild.id).sort((a, b) => b.comparePositionTo(a)).join(', ') : null;
  let status = user.presence.status;
  if (status === 'dnd') {
    status = 'Do Not Disturb';
  } else {
    status = status.charAt(0).toUpperCase() + status.slice(1);
  }
  status = `${statusEmojis[user.presence.status]} ${status}`;
  const embed = new MessageEmbed()
    .setColor(member ? member.displayColor : 0xffffff)
    .setAuthor(member ? member.displayName : user.username, user.displayAvatarURL())
    .setImage(user.displayAvatarURL({size: 2048}))
    .addField('Status', status, true)
    .addField('Joined Discord', joinedDiscord, true);
  if (member) {
    embed.addField('Joined Server', joinedServer, true)
      .addField('Messages', messageCount, true);
  }
  if (roles) {
    embed.addField('Roles', roles, true);
  }
  if (game) {
    embed.addField('Playing', game.name, true);
    if (game.url) {
      embed.addField('Streaming', game.url, true);
    }
  }
  let reply;
  try {
    reply = await message.channel.send(embed);
  } catch (err) {
    console.error(err);
  }
  addFooter(message, embed, reply);
};
