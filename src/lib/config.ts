import {LogLevel} from '@sapphire/framework';
import {AssertionError} from 'assert';
import {config} from 'dotenv';

config();

class Config {
  public static parseLogLevel(value: string | undefined) {
    switch (value?.toUpperCase()) {
      case 'TRACE':
        return LogLevel.Trace;
      case 'DEBUG':
        return LogLevel.Debug;
      case 'INFO':
        return LogLevel.Info;
      case 'WARN':
        return LogLevel.Warn;
      case 'ERROR':
        return LogLevel.Error;
      case 'FATAL':
        return LogLevel.Fatal;
      case 'NONE':
        return LogLevel.None;
      default:
        return undefined;
    }
  }

  public static required(name: string) {
    const value = process.env[name];
    Config.assertIsString(name, value);
    return value;
  }

  private static assertIsString(
    name: string,
    value: string | undefined
  ): asserts value is string {
    if (value === undefined) {
      throw new AssertionError({
        message: `Required environment variable not set: ${name}`,
      });
    }
  }
}

export const discordToken = process.env.DISCORD_TOKEN;
export const logLevel = Config.parseLogLevel(process.env.LOG_LEVEL);
export const mongoUrl = Config.required('MONGO_URL');
export const nodeEnv = process.env.NODE_ENV;
export const robotEventsToken = Config.required('ROBOT_EVENTS_TOKEN');
export const version = Config.required('npm_package_version');
