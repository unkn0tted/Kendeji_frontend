import { SQL } from "bun";

const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

function readIdentifier(name: string, fallback: string): string {
  const value = String(process.env[name] || fallback).trim();
  if (!identifierPattern.test(value)) {
    throw new Error(`${name} must be a simple SQL identifier`);
  }
  return value;
}

const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const tableName = readIdentifier("SUBSCRIPTION_TABLE", "user_subscribe");
const idColumn = readIdentifier("SUBSCRIPTION_ID_COLUMN", "id");
const tokenColumn = readIdentifier("SUBSCRIPTION_TOKEN_COLUMN", "token");

let database: SQL | undefined;

function getDatabase() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  database ||= new SQL(databaseUrl, {
    max: Number(process.env.DATABASE_POOL_SIZE || "5"),
    idleTimeout: Number(process.env.DATABASE_IDLE_TIMEOUT || "30"),
  });
  return database;
}

export async function findSubscriberId(token: string): Promise<number | null> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT ${sql(idColumn)} AS subscriber_id
    FROM ${sql(tableName)}
    WHERE ${sql(tokenColumn)} = ${token}
    LIMIT 1
  `) as Array<{ subscriber_id?: number | bigint | string }>;
  const value = rows[0]?.subscriber_id;
  if (value === undefined || value === null) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id >= 0 ? id : null;
}

export async function findSubscriberToken(
  subscriberId: number
): Promise<string | null> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT ${sql(tokenColumn)} AS subscription_token
    FROM ${sql(tableName)}
    WHERE ${sql(idColumn)} = ${subscriberId}
    LIMIT 1
  `) as Array<{ subscription_token?: string }>;

  return rows[0]?.subscription_token || null;
}

export async function closeDatabase() {
  if (database) {
    await database.close();
    database = undefined;
  }
}
