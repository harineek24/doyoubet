// 8-color rotation used for chapter gradients/accents — mechanical, not AI-driven.
// Shared between builtin tracks (src/lib/store/tracks.ts) and AI-generated
// user chapters (src/lib/ollama/chapterOrchestrator.ts).
export const CHAPTER_PALETTES = [
  { g1: "#fef9c3", g2: "#fde68a", g3: "#f59e0b", accent: "#92400e" }, // amber
  { g1: "#eff6ff", g2: "#93c5fd", g3: "#3b82f6", accent: "#1e40af" }, // blue
  { g1: "#f0fdfa", g2: "#5eead4", g3: "#0d9488", accent: "#134e4a" }, // teal
  { g1: "#fdf4ff", g2: "#d8b4fe", g3: "#9333ea", accent: "#581c87" }, // purple
  { g1: "#fff7ed", g2: "#fdba74", g3: "#ea580c", accent: "#7c2d12" }, // orange
  { g1: "#fff1f2", g2: "#fda4af", g3: "#e11d48", accent: "#881337" }, // rose
  { g1: "#f5f3ff", g2: "#c4b5fd", g3: "#7c3aed", accent: "#4c1d95" }, // violet
  { g1: "#f0fdf4", g2: "#86efac", g3: "#16a34a", accent: "#14532d" }, // emerald
] as const;

export function paletteForIndex(index: number) {
  return CHAPTER_PALETTES[index % CHAPTER_PALETTES.length];
}
