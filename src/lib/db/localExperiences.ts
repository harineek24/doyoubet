import { getLocalPool } from "./localClient";
import type { Experience, Phase1Scene, Phase2Section } from "./experiences";

export async function createExperienceLocal(noteId: string): Promise<Experience> {
  const pool = getLocalPool();
  const { rows } = await pool.query(
    `INSERT INTO experiences (note_id, status) VALUES ($1, 'processing') RETURNING *`,
    [noteId]
  );
  return rows[0] as Experience;
}

export async function markExperienceReadyLocal(
  id: string,
  phase1_script: Phase1Scene[],
  phase2_sections: Phase2Section[]
): Promise<void> {
  const pool = getLocalPool();
  await pool.query(
    `UPDATE experiences
     SET status = 'ready',
         phase1_script = $1,
         phase2_sections = $2,
         completed_at = now()
     WHERE id = $3`,
    [JSON.stringify(phase1_script), JSON.stringify(phase2_sections), id]
  );
}

export async function markExperienceErrorLocal(id: string, msg: string): Promise<void> {
  const pool = getLocalPool();
  await pool.query(
    `UPDATE experiences SET status = 'error', error_msg = $1 WHERE id = $2`,
    [msg, id]
  );
}

export async function getExperienceByNoteIdLocal(noteId: string): Promise<Experience | null> {
  const pool = getLocalPool();
  const { rows } = await pool.query(
    `SELECT * FROM experiences WHERE note_id = $1`,
    [noteId]
  );
  return (rows[0] as Experience) ?? null;
}
