import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import type {Client} from 'discord.js';
import {messageCounter} from '../..';

@ApplyOptions<Listener.Options>({event: Events.ClientReady, once: true})
export class ClientReadyListener extends Listener<typeof Events.ClientReady> {
  public override async run(client: Client<true>) {
    const guilds = await client.guilds.fetch();
    await Promise.all(
      guilds.map(async oAuth2Guild => {
        const guild = await oAuth2Guild.fetch();
        await messageCounter.countMessagesInGuild(guild);
      })
    );
  }
}
