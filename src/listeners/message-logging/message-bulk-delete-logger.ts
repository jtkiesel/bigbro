import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  AuditLogEvent,
  type Collection,
  type Message,
  type PartialMessage,
} from "discord.js";
import { messageLogger } from "../../index.js";

@ApplyOptions<Listener.Options>({ event: Events.MessageBulkDelete })
export class MessageBulkDeleteListener extends Listener<
  typeof Events.MessageBulkDelete
> {
  public override async run(
    messages: Collection<string, Message | PartialMessage>,
  ) {
    const executor = await this.executor(messages.first()!, Date.now());
    for (const message of messages.values()) {
      await messageLogger.logMessageDelete(message, executor);
    }
  }

  private async executor(
    message: Message | PartialMessage,
    deletedTimestamp: number,
  ) {
    const auditLogs = await message.guild?.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MessageBulkDelete,
    });
    const auditLog = auditLogs?.entries.first();
    if (
      !auditLog ||
      Math.abs(auditLog.createdTimestamp - deletedTimestamp) > 250 ||
      auditLog.target.id !== message.author?.id ||
      !auditLog.executor
    ) {
      return undefined;
    }
    return auditLog.executor;
  }
}
