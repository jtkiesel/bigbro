import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {Client, GuildTextBasedChannel, Permissions} from 'discord.js';
import {messageCacheSize} from '../../lib/config';

@ApplyOptions<Listener.Options>({event: Events.ClientReady, once: true})
export class ClientReadyListener extends Listener<typeof Events.ClientReady> {
  public override async run(client: Client<true>) {
    const guilds = await client.guilds.fetch();
    await Promise.all(
      guilds.map(async oAuth2Guild => {
        const guild = await oAuth2Guild.fetch();
        const channels = await guild.channels.fetch();
        await Promise.all(
          channels
            .filter(channel => channel?.isText())
            .map(channel => channel as GuildTextBasedChannel)
            .map(async channel => {
              if (
                !guild.me
                  ?.permissionsIn(channel)
                  .has([
                    Permissions.FLAGS.VIEW_CHANNEL,
                    Permissions.FLAGS.READ_MESSAGE_HISTORY,
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
