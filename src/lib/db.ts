import { Pool } from "@neondatabase/serverless";

declare global {
  // eslint-disable-next-line no-var
  var __lcaNeonPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

/**
 * Reuse the pool between hot reloads / warm serverless invocations.
 * Do NOT call pool.end() inside every API request.
 */
export const db =
  global.__lcaNeonPool ??
  new Pool({
    connectionString,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  global.__lcaNeonPool = db;
}

export async function dbQuery<T = any>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await db.query(text, params as any[]);
  return result.rows as T[];
}