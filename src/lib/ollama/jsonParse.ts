// Models sometimes wrap valid JSON in markdown fences or add trailing prose.
// This handles both: direct parse first, then bracket-matching extraction.
export function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  for (const [open, close] of [["[", "]"], ["{", "}"]]) {
    const start = cleaned.indexOf(open);
    if (start === -1) continue;
    let depth = 0, inStr = false, escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inStr) { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(cleaned.slice(start, i + 1)) as T; } catch {}
          break;
        }
      }
    }
  }

  throw new Error(`Model returned invalid JSON. First 300 chars: ${raw.slice(0, 300)}`);
}

// Some models wrap the requested array in an object, e.g. {"scenes": [...]}.
// Unwrap to the first array value found.
export function toArray<T>(val: T[] | Record<string, T[]>): T[] {
  if (Array.isArray(val)) return val;
  const first = Object.values(val as Record<string, T[]>).find(Array.isArray);
  return first ?? [];
}
