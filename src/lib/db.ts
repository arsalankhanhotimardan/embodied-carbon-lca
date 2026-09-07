import { neon } from "@neondatabase/serverless";

/**
 * Keep the existing query/rows API, but use request-local HTTP queries.
 * A WebSocket Pool cannot be shared across Cloudflare Worker requests.
 * No automatic retries: a timed-out write may already have committed.
 */
export const db = {
  async query(text: string, params: unknown[] = []) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured.");
    }

    const sql = neon(connectionString, { fullResults: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      return await sql(text, params, {
        fetchOptions: { signal: controller.signal, cache: "no-store" },
      });
    } finally {
      clearTimeout(timeout);
    }
  },
};

export async function dbQuery<T = any>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await db.query(text, params);
  return result.rows as T[];
}
