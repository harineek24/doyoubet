import { getLocalPool } from "./localClient";
import type { NoteImage, Note } from "./notes";

export async function createNoteLocal(data: {
  user_id: string;
  title: string;
  raw_text: string;
  images?: NoteImage[];
}): Promise<Note> {
  const pool = getLocalPool();
  const { rows } = await pool.query(
    `INSERT INTO notes (user_id, title, raw_text, images)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.user_id, data.title, data.raw_text, JSON.stringify(data.images ?? [])]
  );
  return rows[0] as Note;
}

export async function getNoteByIdLocal(id: string): Promise<Note | null> {
  const pool = getLocalPool();
  const { rows } = await pool.query(`SELECT * FROM notes WHERE id = $1`, [id]);
  return (rows[0] as Note) ?? null;
}

export async function getNotesByUserLocal(userId: string): Promise<Note[]> {
  const pool = getLocalPool();
  const { rows } = await pool.query(
    `SELECT id, user_id, title, created_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows as Note[];
}
