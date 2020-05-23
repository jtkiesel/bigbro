import { Collection, Guild, GuildMember, Message, MessageEmbed, MessageMentions, Permissions, TextChannel } from 'discord.js';
import moment from 'moment';
import 'moment-timer';
import { BulkWriteOperation } from 'mongodb';

import { Command, db, userUrl } from '..';

export type Dq = {
  _id: {
    guild: string;
    user: string;
  };
  dqEndTime: number;
};

const durationRegex = /^([0-9]+)\s*(y|M|w|d|h|m|s|ms)$/;

const verifiedRoleId = '260524994646376449';
const timeoutRoleId = '392860547626041345';
const timeoutChannelId = '392860089951846400';

const doTimeout = async (
  guild: Guild,
  dispatcher: GuildMember,
  members: Collection<string, GuildMember>,
  duration: moment.Duration,
  reason?: string): Promise<void> => {
  const channel = guild.channels.cache.get(timeoutChannelId) as TextChannel;

  const membersStr = members.map(m => `${m}`).join('\n');

  // remove verified role and add DQ role for all mentioned members that are not already DQ'd
  await Promise.all(
    [...members.filter(member => !member.roles.cache.has(timeoutRoleId)).values()].flatMap(member => [
      member.roles.remove(verifiedRoleId, 'DQ'),
      member.roles.add(timeoutRoleId, 'DQ')
    ]));

  const announcement = new MessageEmbed()
    .setAuthor(dispatcher.displayName, dispatcher.user.displayAvatarURL(), userUrl(dispatcher.user.id))
    .setTitle('Disqualification')
    .setThumbnail('https://ton.twimg.com/stickers/stickers/10855_raw.png') // :checkered_flag:
    .addField('Reason', reason || 'unspecified')
    .addField('Duration', duration.humanize())
    .addField('Affected users', membersStr);
  await channel.send(announcement);
};

export const doUnTimeout = (member: GuildMember) => async (): Promise<void> => {
  await Promise.all([
    member.roles.remove(timeoutRoleId, 'DQ over'),
    member.roles.add(verifiedRoleId, 'DQ over')
  ]);
};

class DqCommand implements Command {
  /**
   * format: <prefix> dq \S <duration> <mentions> ( \S <reason> )?
   *  where:
   *    <duration>: [0-9]+ <unit>
   *        <unit>: ( y | M | w | d | h | m | s | ms )
   *    <mentions>: <mention> ( \S <mention> )*
   *      <reason>: .+
   */
  async execute(message: Message, args: string): Promise<Message> {
    if (!message.guild) {
      return message.reply('that command is only available in servers.');
    }
    if (!message.member.hasPermission(Permissions.FLAGS.MANAGE_ROLES)) {
      return message.reply('you must have the Manage Roles permission to use that command.');
    }
    if (message.member.roles.highest.comparePositionTo(message.guild.roles.resolve(timeoutRoleId)) <= 0) {
      return message.reply(`you must have a role higher than <@&${timeoutRoleId}> to use that command.`);
    }
    if (!message.mentions.members.size) {
      return message.reply('you must mention at least one member to DQ.');
    }

    // strip @-mentions out of the args string because we just care about the duration and reason
    const [durationStr, ...reasonArr] = args.trim().split(/\s+/).filter(e => !MessageMentions.USERS_PATTERN.test(e));
    const reason = reasonArr.join(' ');

    // make sure that the user only gives a valid shorthand duration specifier. moment doesn't check this properly still (see moment/moment#1805)
    const matches = durationStr.match(durationRegex)?.slice(1, 3);
    if (matches?.length !== 2) {
      return message.reply(`invalid duration \`${durationStr}\`. valid units are \`y\`, \`M\`, \`w\`, \`d\`, \`h\`, \`m\`, \`s\`, and \`ms\`.`);
    }

    const duration = moment.duration(...matches);
    duration.timer({start: true}, () => message.mentions.members.forEach(m => doUnTimeout(m)()));
    const dqEndTime = moment().add(duration).valueOf();

    await doTimeout(message.guild, message.member, message.mentions.members, duration, reason);

    await db().collection<Dq>('dqs').bulkWrite(message.mentions.users.map<BulkWriteOperation<Dq>>(u => {
      return {
        updateOne: {
          filter: {
            _id: {
              guild: message.guild.id,
              user: u.id
            }
          },
          update: {
            $set: { dqEndTime }
          },
          upsert: true
        }
      };
    }));

    // TODO: send message to channel
  }
}

export default new DqCommand();
