import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err);
});

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T & Record<string, unknown>>> {
  const start = Date.now();
  const res = await pool.query<T & Record<string, unknown>>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DB] ${duration}ms — ${text.slice(0, 80)}`);
  }
  return res;
}

/** Ejecuta múltiples queries dentro de una transacción */
export async function withTransaction<T>(
  fn: (q: typeof query) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const txQuery = <R = unknown>(text: string, params?: unknown[]) =>
      client.query<R & Record<string, unknown>>(text, params);
    const result = await fn(txQuery as typeof query);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
