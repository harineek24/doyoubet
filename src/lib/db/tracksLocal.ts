import { getLocalPool } from "./localClient";
import type { UserTrack } from "./tracks";

export async function createUserTrackLocal(data: {
  user_id: string;
  title: string;
  tagline?: string;
}): Promise<UserTrack> {
  const pool = getLocalPool();
  const { rows } = await pool.query(
    `INSERT INTO tracks (user_id, title, tagline) VALUES ($1, $2, $3) RETURNING *`,
    [data.user_id, data.title, data.tagline ?? ""]
  );
  return rows[0] as UserTrack;
}

export async function getUserTrackByIdLocal(id: string): Promise<UserTrack | null> {
  const pool = getLocalPool();
  const { rows } = await pool.query(`SELECT * FROM tracks WHERE id = $1`, [id]);
  return (rows[0] as UserTrack) ?? null;
}

export async function getUserTracksByUserLocal(userId: string): Promise<UserTrack[]> {
  const pool = getLocalPool();
  const { rows } = await pool.query(
    `SELECT * FROM tracks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows as UserTrack[];
}

export async function updateUserTrackAccentLocal(id: string, accentColor: string): Promise<void> {
  const pool = getLocalPool();
  await pool.query(
    `UPDATE tracks SET accent_color = $1, updated_at = now() WHERE id = $2`,
    [accentColor, id]
  );
}
