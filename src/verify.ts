import axios from 'axios';
import { GuildMember, Message, MessageReaction, TextChannel, User } from 'discord.js';
import { Collection } from 'mongodb';

const reApiToken = process.env.BIGBRO_RE_TOKEN;
const reApiBaseUrl = 'https://www.robotevents.com/api/v2';

class Program {
  public readonly name: string;
  public readonly role: string;
  public readonly emojiName: string;
  public readonly emojiId: string;
  public readonly teamRegExp: RegExp;
  public readonly teamExamples: string[];
  public readonly ids: number[];

  constructor(name: string, role: string, emojiName: string, emojiId?: string, teamRegExp?: RegExp, teamExamples?: string[], ids?: number[]) {
    this.name = name;
    this.role = role;
    this.emojiName = emojiName;
    this.emojiId = emojiId;
    this.teamRegExp = teamRegExp;
    this.teamExamples = teamExamples;
    this.ids = ids;
  }

  public getEmojiIdentifier() {
    return this.emojiId ? `${this.emojiName}:${this.emojiId}` : encodeURIComponent(this.emojiName);
  }

  public getEmoji() {
    return this.emojiId ? `<:${this.emojiName}:${this.emojiId}>` : this.emojiName;
  }
}

export class MemberVerifier {
  private static readonly NAME_LENGTH_MAX = 25;
  private static readonly DELIMITER = '│';
  private static readonly VERIFIED_ROLE = '260524994646376449';
  private static readonly  verifiedChannelIds: { [key: string]: string } = {
    '197777408198180864': '260546095082504202',
    '329477820076130306': '709178148503420968'
  };
  private static readonly programs = [
    new Program('VRC', '197836716726288387', 'vrc', '464676956428828682', /^[0-9]{1,5}[A-Z]?$/i, ['44', '5225A'], [1]),
    new Program('VEX U', '305392771324313610', 'vexu', '464677474509389831', /^[A-Z]{2,5}[0-9]{0,2}$/i, ['AURA', 'QCC2'], [4]),
    new Program('VAIC', '706299363588177940', 'vaic', '811072718274691073', /^([0-9]{1,5}[A-Z]?|[A-Z]{2,5}[0-9]{0,2})$/i, ['8059A', 'WPI1'], [48, 49]),
    new Program('VIQC', '197817210729791489', 'viqc', '464677535461146624', /^[0-9]{1,5}[A-Z]?$/i, ['42292B', '15472A'], [41]),
    new Program('FRC', '263900951738318849', 'frc', '810644445192126525', /^[0-9]{1,4}$/, ['254', '1114']),
    new Program('FTC', '263900951738318849', 'ftc', '810644782215987230', /^[0-9]{1,5}$/, ['724', '11115']),
    new Program('Other/None', '197817210729791489', '❓')
  ];
  private static readonly programNames = MemberVerifier.programs
    .map(program => `\`${program.name}\``)
    .join(', ');
  private static readonly programChoices = MemberVerifier.programs
    .map(program => `> ${program.getEmoji()}: ${program.name}`)
    .join('\n');
  private static readonly emojiToProgram = MemberVerifier.programs
    .reduce((map, program) => map.set(program.getEmojiIdentifier(), program),
      new Map<string, Program>());
  private static readonly programEmojis = [...MemberVerifier.emojiToProgram.keys()];
  private static readonly YES = '✅';
  private static readonly NO = '❎';
  private static readonly confirmationEmojis = [MemberVerifier.YES, MemberVerifier.NO];

  private readonly collection: Collection<VerifiedMember>;

  public constructor(collection: Collection<VerifiedMember>) {
    this.collection = collection;
  }

  public async verify(member: GuildMember): Promise<boolean> {
    const verifiedMember = await this.collection.findOne({
      user: member.id,
      guild: member.guild.id
    });
    if (verifiedMember) {
      await member.setNickname(verifiedMember.nickname, 'Automatic reverification');
      await member.roles.add(verifiedMember.roles);
      return true;
    }
    const welcomeMessage = `Welcome to the ${member.guild} Discord server!

In order to access all of the server's channels, you must have your name and \
team verified. If you have any issues or questions throughout this process, \
please message a member of the moderation team for help.`;
    try {
      await member.send(welcomeMessage);
    } catch (error) {
      console.warn(`Failed to DM welcome message to user: ${member.user.tag} \
(${member.id})
Caused by:`, error);
      await member.guild.systemChannel.send(`${member} ${welcomeMessage}

Please send a message here with the following, and a member of the moderation \
team will verify your account shortly:
1. Your name or preferred nickname.
2. The robotics program you are primarily affiliated with. (Examples: \
${MemberVerifier.programNames})
3. Your robotics team's ID#. (Examples: \`44\`, \`5225A\`, \`AURA\`, \`QCC2\`)`);
      return false;
    }
    while (true) {
      const name = await this.promptForName(member);
      const program = await this.promptForProgram(member);
      if (program.name === 'Other/None') {
        const assistanceMessage = await member.guild.systemChannel.send(
          `${member} Please send a message here with your name or preferred \
nickname and a brief explanation of how you are affiliated with VEX Robotics \
and/or why you'd like to join the server. Mention a moderator for assistance.`);
        await member.send(`A member of the moderation team must manually \
verify your account. Please follow the instructions provided in the message I \
just sent in the ${member.guild} server: ${assistanceMessage.url}`);
        return false;
      }
      const team = await this.promptForTeam(member, program);

      const commonProgram = ['VRC', 'VEX U'].includes(program.name);
      const teamString = commonProgram ? team : `${program.name} ${team}`;
      const nickname = `${name}${MemberVerifier.DELIMITER}${teamString}`;
      if (await this.promptForConfirmation(member, nickname)) {
        await member.setNickname(nickname, 'Automatic verification');
        await member.roles.add([MemberVerifier.VERIFIED_ROLE, program.role]);

        const verifiedChannelId = MemberVerifier.verifiedChannelIds[member.guild.id];
        const verifiedChannel = member.guild.channels.resolve(verifiedChannelId) as TextChannel;
        const verifiedMessage = await verifiedChannel.send(`${member} Welcome!`);
        await member.send(`Congratulations! You now have access to the other \
channels of the ${member.guild} server! Say hello here: ${verifiedMessage.url}`);
        return true;
      }
    }
  }

  public async store(member: GuildMember): Promise<void> {
    if (!member.nickname || member.roles.cache.size === 1) {
      return;
    }
    const verifiedMember: VerifiedMember = {
      user: member.id,
      guild: member.guild.id,
      nickname: member.nickname,
      roles: member.roles.cache.map(({id}) => id)
    };
    await this.collection.updateOne({
      user: verifiedMember.user,
      guild: verifiedMember.guild
    }, {
      $set: verifiedMember
    }, {
      upsert: true
    });
  }

  private async promptForName(member: GuildMember): Promise<string> {
    while (true) {
      await member.send('1. What is your name or preferred nickname?');
      const responses = await member.user.dmChannel
        .awaitMessages((message: Message) => message.author.id === member.id, {
          max: 1
        });
      const name = responses.first().cleanContent.trim();
      if (name.length < 1) {
        await member.send('Sorry, names/nicknames must contain at least 1 \
non-whitespace character.');
        continue;
      }
      if (name.length > MemberVerifier.NAME_LENGTH_MAX) {
        await member.send(`Sorry, names/nicknames must be \
${MemberVerifier.NAME_LENGTH_MAX} or fewer characters in length.`);
        continue;
      }
      if (!/^[ -{}~]*$/.test(name)) {
        await member.send('Sorry, names/nicknames may only contain the \
following non-alphanumeric characters: `` !"#$%&\'()*+,-./:;<=>?@[\\]^_`{}~``');
        continue;
      }
      return name;
    }
  }

  private async promptForProgram(member: GuildMember): Promise<Program> {
    const prompt = await member.send(`2. Select the reaction corresponding to \
the robotics program you are primarily affiliated with.
${MemberVerifier.programChoices}`);
    const reactionsPromise = prompt.awaitReactions((reaction: MessageReaction, user: User) => {
      return MemberVerifier.programEmojis.includes(reaction.emoji.identifier)
        && user.id === member.id;
    }, {
      max: 1
    });
    for (const programEmoji of MemberVerifier.programEmojis) {
      await prompt.react(programEmoji);
    }
    const reactions = await reactionsPromise;
    return MemberVerifier.emojiToProgram.get(reactions.first().emoji.identifier);
  }

  private async promptForTeam(member: GuildMember, program: Program): Promise<string> {
    while (true) {
      await member.send(`3. What is your ${program.name} team's ID#? (For \
example: ${program.teamExamples.map(team => `\`${team}\``).join(', ')})`);
      const responses = await member.user.dmChannel
        .awaitMessages((message: Message) => message.author.id === member.id, {
          max: 1
        });
      const team = responses.first().cleanContent.trim();
      if (!program.teamRegExp.test(team)) {
        await member.send(`Sorry, that is not a valid ${program.name} team \
ID#. Please double-check your ${program.name} team ID# or message a member of \
the moderation team for help.`);
        continue;
      }
      if (!program.ids) {
        return team;
      }
      const programs = program.ids.map(id => `program[]=${id}`).join('&');
      const url = `${reApiBaseUrl}/teams?${programs}&number[]=${team}`;
      const {
        data: {
          data: teams
        }
      } = await axios.get<Paginated<Team>>(url, {
        headers: {
          Authorization: `Bearer ${reApiToken}`
        }
      });
      if (!teams.length) {
        await member.send(`Sorry, the ${program.name} team \`${team}\` has \
never been registered. Please double-check your ${program.name} team ID# or \
message a member of the moderation team for help.`);
        continue;
      }
      return teams[0].number;
    }
  }

  private async promptForConfirmation(member: GuildMember, nickname: string): Promise<boolean> {
    const confirmation = await member.send(`Your nickname in the \
${member.guild} server will be set to \
\`\`${nickname.replaceAll('`', '`\u200b')}\`\`, is that correct?
(Select the reaction corresponding to your answer.)
> ${MemberVerifier.YES}: Yes
> ${MemberVerifier.NO}: No`);
    const reactionsPromise = confirmation.awaitReactions((reaction: MessageReaction, user: User) => {
      return MemberVerifier.confirmationEmojis.includes(reaction.emoji.name)
        && user.id === member.id;
    }, {
      max: 1
    });
    for (const confirmationEmoji of MemberVerifier.confirmationEmojis) {
      await confirmation.react(confirmationEmoji);
    }
    const reactions = await reactionsPromise;
    return (reactions.first().emoji.name === MemberVerifier.YES);
  }
}

interface VerifiedMember {
  user: string,
  guild: string,
  nickname: string,
  roles: string[]
}

interface Paginated<T> {
  meta: PageMeta;
  data: T[];
}

interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  from: number;
  to: number;
  total: number;
  first_page_url: string;
  last_page_url: string;
  prev_page_url: string;
  next_page_url: string;
  path: string;
}

interface Team {
  id?: number;
  number: string;
  team_name: string;
  robot_name: string;
  organization?: string;
  location: Location;
  registered?: boolean;
  program: IdInfo;
  grade?: Grade;
}

interface Location {
  venue?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  coordinates: Coordinates;
}

interface Coordinates {
  lat: number;
  lon: number;
}

interface IdInfo {
  id: number;
  name: string;
  code?: string;
}

enum Grade {
  COLLEGE = 'College',
  HIGH_SCHOOL = 'High School',
  MIDDLE_SCHOOL = 'Middle School',
  ELEMENTARY_SCHOOL = 'Elementary School'
}
