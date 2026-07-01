import { Pool } from "pg";

const LOCAL_DATABASE_URL =
  process.env.LOCAL_DATABASE_URL ??
  "postgresql://postgres:Sairam@03@localhost:5432/doyoubet_test";

let pool: Pool | null = null;

export function getLocalPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: LOCAL_DATABASE_URL });
  }
  return pool;
}

export const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
