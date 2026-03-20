import { CandleEntity } from "../entities/candle.entity.js";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions.js";

type EnvValue = string | Uint8Array | undefined;

type PostgresOverrides = Omit<
  Partial<PostgresConnectionOptions>,
  "type" | "entities" | "host" | "port" | "username" | "password" | "database"
>;

export type PostgresEnv = {
  DB_HOST?: EnvValue;
  DB_PORT?: EnvValue;
  DB_USERNAME?: EnvValue;
  DB_PASSWORD?: EnvValue;
  DB_DATABASE?: EnvValue;
};

function toEnvString(value: EnvValue, fallback: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }

  return fallback;
}

export function createPostgresOptions (
  env: PostgresEnv,
  overrides: PostgresOverrides = {}
): PostgresConnectionOptions {
  return {
    ...overrides,
    type: "postgres",
    host: toEnvString(env.DB_HOST, "localhost"),
    port: Number(toEnvString(env.DB_PORT, "5432")),
    username: toEnvString(env.DB_USERNAME, "cmp"),
    password: toEnvString(env.DB_PASSWORD, "cmp"),
    database: toEnvString(env.DB_DATABASE, "cmp"),
    entities: [CandleEntity],
    // synchronize: false,
    logging: false,
  }
}