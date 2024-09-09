import { LogLevel } from "@sapphire/framework";

class Config<T> {
  private constructor(
    private readonly name: string,
    private readonly value?: T,
  ) {}

  public static string(name: string) {
    return new Config(name, process.env[name]);
  }

  public static integer(name: string) {
    const value = process.env[name];
    return new Config(name, Config.parseInteger(value));
  }

  public static logLevel(name: string) {
    return new Config(name, Config.parseLogLevel(process.env[name]));
  }

  public orElse(value: T) {
    return this.value ?? value;
  }

  public orElseThrow() {
    if (this.value === undefined) {
      throw new Error(`Required environment variable not set: ${this.name}`);
    }
    return this.value;
  }

  private static parseInteger(value?: string) {
    if (!value?.length) {
      return undefined;
    } else if (!/\d+/.test(value)) {
      throw new Error(`Invalid integer: ${value}`);
    }
    return Number(value);
  }

  private static parseLogLevel(value?: string) {
    switch (value?.toLowerCase()) {
      case "trace":
        return LogLevel.Trace;
      case "debug":
        return LogLevel.Debug;
      case "info":
        return LogLevel.Info;
      case "warn":
        return LogLevel.Warn;
      case "error":
        return LogLevel.Error;
      case "fatal":
        return LogLevel.Fatal;
      case "none":
        return LogLevel.None;
      case undefined:
        return undefined;
      default:
        throw new Error(`Invalid log level: ${value}`);
    }
  }
}

export const discordToken = Config.string("DISCORD_TOKEN").orElseThrow();
export const logLevel = Config.logLevel("LOG_LEVEL").orElse(LogLevel.Info);
export const messageCacheSize =
  Config.integer("MESSAGE_CACHE_SIZE").orElse(250);
export const mongoUrl = Config.string("MONGO_URL").orElse(
  "mongodb://localhost:27017/bigbro",
);
export const nodeEnv = Config.string("NODE_ENV").orElse("development");
export const robotEventsToken =
  Config.string("ROBOT_EVENTS_TOKEN").orElseThrow();
