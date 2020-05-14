import moment from 'moment';
import 'moment-timer';

import { Collection, Guild, GuildMember, Message, MessageEmbed, TextChannel, User } from 'discord.js';
import { Command, db } from '..';

const duration_regex = /[0-9]+|(y|M|w|d|h|n|s|ms)/;

const verifiedRoleId = '260524994646376449';
const timeoutRoleId = '392860547626041345';
const timeoutChannelId = '392860089951846400';

const doTimeout = async (guild: Guild, dispatcher: {member: GuildMember, user: User}, members: Collection<string, GuildMember>, duration: moment.Duration, reason?: string) => {
	const channel = guild.channels.cache.get(timeoutChannelId) as TextChannel;
	
	const membersStr = members.map(m => `${m}`).join('\n');

	// remove verified role and add DQ role for all mentioned members that are not already DQ'd
	await Promise.all(
		[...members.filter(member => !member.roles.cache.has(timeoutRoleId)).values()].flatMap(member => [
			member.roles.remove(verifiedRoleId, 'DQ'),
			member.roles.add(timeoutRoleId, 'DQ')
		]));

	
	channel.send(`<@&${timeoutRoleId}>:`);
	const announcement = new MessageEmbed()
		.setAuthor(dispatcher.member.displayName, dispatcher.user.displayAvatarURL(), `https://discordapp.com/users/${dispatcher.user.id}`)
		.setTitle('Disqualification')
		.setThumbnail('https://discordapp.com/assets/8e9a2d7ef44c1052a246e062e4c3f796.svg') // :checkered_flag:
		.addField('Reason', reason || 'unspecified')
		.addField('Duration', duration.humanize())
		.addField('Affected users', membersStr)

	channel.send(announcement);
};

export const doUnTimeout = (member: GuildMember) => async () => {
	await Promise.all([
		member.roles.remove(timeoutRoleId, 'DQ over'),
		member.roles.add(verifiedRoleId, 'DQ over')
	]);
};

class DqCommand implements Command {
	/**
	  * format: <prefix> dq \S <duration> <mentions> ( \S <reason> )?
	  *  where:
	  *		<duration>: [0-9]+ <unit>
	  *		    <unit>: ( y | M | w | d | h | m | s | ms )
	  *		<mentions>: <mention> ( \S <mention> )*
	  *		  <reason>: .+
	  */
	async execute(message: Message, args: string): Promise<Message> {
		if (!message.guild) {
			return message.reply('that command is only available in servers.');
		}
		if (!message.member.hasPermission('ADMINISTRATOR')) {
			return message.reply('you must be an administrator to use that command');
		}
		
		// strip @-mentions out of the args string because we just care about the duration and reason
		args = args.split(' ').filter(e => !e.startsWith('@')).join(' ');
		const [duration_str, reason] = args.split(' ', 2);

		// make sure that the user only gives a valid shorthand duration specifier. moment doesn't check this properly still (see moment/moment#1805)
		if (duration_str.match(duration_regex).length !== 2) {
			return message.reply(`invalid duration \`${duration_str}\`. valid units are \`y\`, \`M\`, \`w\`, \`d\`, \`h\`, \`m\`, \`s\`, and \`ms\`.`);
		}


		//message.mentions.members.forEach(do_timeout(message.guild));
		
		const duration = moment.duration(...duration_str.match(duration_regex));
		duration.timer({start: true}, doUnTimeout);
		const dqEndTime = moment().add(duration).valueOf();

		doTimeout(message.guild, {member: message.member, user: message.author}, message.mentions.members, duration, reason);

		await db().collection('dqs').updateMany({
			_id: {
				guild: message.guild.id,
				channel: message.channel.id,
				user: { $in: message.mentions.users.map(u => u.id) }
			}
		}, {
			$set: { dqEndTime }
		}, {
			upsert: true
		});

		// TODO: send message to channel
	}
}

export default new DqCommand();
