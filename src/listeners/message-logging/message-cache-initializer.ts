import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {ChannelType, PermissionFlagsBits, type Client} from 'discord.js';
import {messageCacheSize} from '../../lib/config';
import {nonNull} from '../../lib/predicates';

@ApplyOptions<Listener.Options>({event: Events.ClientReady, once: true})
export class ClientReadyListener extends Listener<typeof Events.ClientReady> {
  public override async run(client: Client<true>) {
    const guilds = await client.guilds.fetch();
    await Promise.all(
      guilds.map(async oAuth2Guild => {
        const guild = await oAuth2Guild.fetch();
        const channels = await guild.channels.fetch();
        await Promise.all(
          channels.filter(nonNull).map(async channel => {
            if (
              channel.type !== ChannelType.GuildText ||
              !guild.members.me
                ?.permissionsIn(channel)
                .has([
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.ReadMessageHistory,
                ])
            ) {
              return;
            }
            await channel.messages.fetchPinned();

            let firstMessageId: string | undefined;
            while (channel.messages.cache.size < messageCacheSize) {
              const messages = await channel.messages.fetch({
                limit: Math.min(
                  messageCacheSize - channel.messages.cache.size,
                  100
                ),
                before: firstMessageId,
              });
              firstMessageId = messages.lastKey();
              if (!firstMessageId) {
                break;
              }
            }
          })
        );
      })
    );
  }
}
