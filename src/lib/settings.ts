import LRUCache from 'lru-cache';
import type {Collection} from 'mongodb';

export class SettingsManager {
  private readonly settingsByGuildId = new LRUCache({
    max: 10,
    fetchMethod: async (guild: string) =>
      (await this.collection.findOne({_id: guild})) ?? undefined,
  });

  public constructor(private readonly collection: Collection<GuildSettings>) {}

  public async get(guild: string) {
    return this.settingsByGuildId.fetch(guild);
  }

  public async set(guild: string, settings: Omit<GuildSettings, '_id'>) {
    const result = await this.collection.findOneAndUpdate(
      {_id: guild},
      {$set: settings},
      {returnDocument: 'after', upsert: true}
    );
    if (result.value) {
      this.settingsByGuildId.set(guild, result.value);
    }
  }
}

export interface GuildSettings {
  _id: string;
  loggingChannel?: string;
  verificationChannel?: string;
  verifiedRole?: string;
  verifiedChannel?: string;
}
