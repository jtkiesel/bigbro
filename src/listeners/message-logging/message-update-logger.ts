import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { Message, PartialMessage } from "discord.js";
import { messageLogger } from "../../index.js";

@ApplyOptions<Listener.Options>({ event: Events.MessageUpdate })
export class MessageUpdateListener extends Listener<
  typeof Events.MessageUpdate
> {
  public override async run(
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
  ) {
    if (oldMessage.content !== newMessage.content) {
      await messageLogger.logMessageUpdate(oldMessage, newMessage.editedAt);
    }
  }
}
