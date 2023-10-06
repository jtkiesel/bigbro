import LRUCache from 'lru-cache';
import type {Collection} from 'mongodb';

export class SettingsManager {
  private readonly settingsByGuildId = new LRUCache({
    max: 10,
    fetchMethod: async (guildId: string) =>
      (await this.collection.findOne({_id: guildId})) ?? undefined,
  });

  public constructor(private readonly collection: Collection<GuildSettings>) {}

  public async get(guildId: string) {
    return this.settingsByGuildId.fetch(guildId);
  }

  public async set(guildId: string, settings: Omit<GuildSettings, '_id'>) {
    const result = await this.collection.findOneAndUpdate(
      {_id: guildId},
      {$set: settings},
      {returnDocument: 'after', upsert: true}
    );
    if (result.value) {
      this.settingsByGuildId.set(guildId, result.value);
    }
  }
}

export interface GuildSettings {
  _id: string;
  loggingChannel?: string;
  verificationChannel?: string;
  verifiedRole?: string;
  verifiedChannel?: string;
  ticketChannel?: string;
}
