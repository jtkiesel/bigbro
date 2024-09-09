import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { Message, PartialMessage } from "discord.js";
import { messageCounter } from "../../index.js";

@ApplyOptions<Listener.Options>({ event: Events.MessageDelete })
export class MessageDeleteListener extends Listener<
  typeof Events.MessageDelete
> {
  public override async run(message: Message | PartialMessage) {
    await messageCounter.count(message, -1);
  }
}
