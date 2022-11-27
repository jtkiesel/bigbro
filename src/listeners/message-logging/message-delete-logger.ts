import {ApplyOptions} from '@sapphire/decorators';
import {Events, Listener} from '@sapphire/framework';
import {GuildAuditLogs, Message, PartialMessage} from 'discord.js';
import {messageLogger} from '../..';

@ApplyOptions<Listener.Options>({event: Events.MessageDelete})
export class MessageDeleteListener extends Listener<
  typeof Events.MessageDelete
> {
  public override async run(message: Message | PartialMessage) {
    const executor = await this.executor(message, Date.now());
    await messageLogger.logMessageDelete(message, executor);
  }

  private async executor(
    message: Message | PartialMessage,
    deletedTimestamp: number
  ) {
    const auditLogs = await message.guild?.fetchAuditLogs({
      limit: 1,
      type: GuildAuditLogs.Actions.MESSAGE_DELETE,
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
