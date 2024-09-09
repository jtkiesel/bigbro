import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import {
  AuditLogEvent,
  type Message,
  type PartialMessage,
  type ReadonlyCollection,
} from "discord.js";
import { messageLogger } from "../../index.js";

@ApplyOptions<Listener.Options>({ event: Events.MessageBulkDelete })
export class MessageBulkDeleteListener extends Listener<
  typeof Events.MessageBulkDelete
> {
  public override async run(
    messages: ReadonlyCollection<string, Message | PartialMessage>,
  ) {
    const executor = await this.executor(messages, Date.now());
    for (const message of messages.values()) {
      await messageLogger.logMessageDelete(message, executor);
    }
  }

  private async executor(
    messages: ReadonlyCollection<string, Message | PartialMessage>,
    deletedTimestamp: number,
  ) {
    const firstMessage = messages.first();
    if (!firstMessage) {
      return undefined;
    }

    const auditLogs = await firstMessage.guild?.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MessageBulkDelete,
    });
    const auditLog = auditLogs?.entries.first();
    if (
      !auditLog ||
      Math.abs(auditLog.createdTimestamp - deletedTimestamp) > 250 ||
      auditLog.target.id !== firstMessage.author?.id ||
      !auditLog.executor
    ) {
      return undefined;
    }
    return auditLog.executor;
  }
}
