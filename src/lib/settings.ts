import LRUCache from 'lru-cache';
import type { Collection, UpdateFilter } from 'mongodb';

export class SettingsManager {
  private readonly settingsByGuildId = new LRUCache({
    max: 10,
    fetchMethod: async (guildId: string) =>
      (await this.collection.findOne({ _id: guildId })) ?? undefined,
  });

  public constructor(private readonly collection: Collection<GuildSettings>) { }

  public async get(guildId: string) {
    return this.settingsByGuildId.fetch(guildId);
  }

  public async set(guildId: string, settings: Omit<GuildSettings, '_id'>) {
    await this.update(guildId, { $set: settings });
  }

  public async increment(
    guildId: string,
    settings: UpdateFilter<GuildSettings>['$inc']
  ) {
    return this.update(guildId, { $inc: settings });
  }

  private async update(
    guildId: string,
    updateFilter: UpdateFilter<GuildSettings>
  ) {
    const result = await this.collection.findOneAndUpdate(
      { _id: guildId },
      updateFilter,
      { returnDocument: 'after', upsert: true }
    );
    if (result.value) {
      this.settingsByGuildId.set(guildId, result.value);
    }
    return result.value;
  }
}

export interface GuildSettings {
  _id: string;
  loggingChannel?: string;
  verificationChannel?: string;
  verifiedRole?: string;
  verifiedChannel?: string;
  ticketChannel?: string;
  lastTicketNumber?: number;
}
