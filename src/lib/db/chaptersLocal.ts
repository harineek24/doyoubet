import { getLocalPool } from "./localClient";
import type { Chapter, ChapterPhase2Section, NewChapterPalette, NoteFragment } from "./chapters";
import type { Phase1Scene } from "./experiences";

export async function createChapterLocal(data: {
  track_id: string;
  position: number;
  title: string;
  sub?: string;
  summary?: string;
  tags?: string[];
  palette: NewChapterPalette;
  raw_text: string;
  fragment: NoteFragment;
}): Promise<Chapter> {
  const pool = getLocalPool();
  const { rows } = await pool.query(
    `INSERT INTO chapters
       (track_id, position, title, sub, summary, tags, accent, g1, g2, g3, raw_text, note_fragments, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'processing')
     RETURNING *`,
    [
      data.track_id,
      data.position,
      data.title,
      data.sub ?? "",
      data.summary ?? "",
      JSON.stringify(data.tags ?? []),
      data.palette.accent,
      data.palette.g1,
      data.palette.g2,
      data.palette.g3,
      data.raw_text,
      JSON.stringify([data.fragment]),
    ]
  );
  return rows[0] as Chapter;
}

export async function getChapterByIdLocal(id: string): Promise<Chapter | null> {
  const pool = getLocalPool();
  const { rows } = await pool.query(`SELECT * FROM chapters WHERE id = $1`, [id]);
  return (rows[0] as Chapter) ?? null;
}

export async function getChaptersByTrackLocal(trackId: string): Promise<Chapter[]> {
  const pool = getLocalPool();
  const { rows } = await pool.query(
    `SELECT * FROM chapters WHERE track_id = $1 ORDER BY position ASC`,
    [trackId]
  );
  return rows as Chapter[];
}

export async function appendChapterFragmentLocal(
  id: string,
  additionalRawText: string,
  fragment: NoteFragment
): Promise<Chapter> {
  const pool = getLocalPool();
  const existing = await getChapterByIdLocal(id);
  if (!existing) throw new Error(`appendChapterFragmentLocal: chapter ${id} not found`);

  const raw_text = `${existing.raw_text}\n\n${additionalRawText}`.trim();
  const note_fragments = [...existing.note_fragments, fragment];

  const { rows } = await pool.query(
    `UPDATE chapters
     SET raw_text = $1, note_fragments = $2, status = 'processing', updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [raw_text, JSON.stringify(note_fragments), id]
  );
  return rows[0] as Chapter;
}

export async function markChapterReadyLocal(
  id: string,
  phase1_scenes: Phase1Scene[],
  phase2_sections: ChapterPhase2Section[]
): Promise<void> {
  const pool = getLocalPool();
  await pool.query(
    `UPDATE chapters
     SET status = 'ready', phase1_scenes = $1, phase2_sections = $2, updated_at = now()
     WHERE id = $3`,
    [JSON.stringify(phase1_scenes), JSON.stringify(phase2_sections), id]
  );
}

export async function markChapterErrorLocal(id: string, msg: string): Promise<void> {
  const pool = getLocalPool();
  await pool.query(
    `UPDATE chapters SET status = 'error', error_msg = $1, updated_at = now() WHERE id = $2`,
    [msg, id]
  );
}
