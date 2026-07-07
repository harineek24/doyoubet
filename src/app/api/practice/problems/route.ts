import { NextRequest, NextResponse } from "next/server";

// Maps our chapter tags → Codeforces problem tags
const TAG_MAP: Record<string, string> = {
  // Python / general
  "variables": "implementation",
  "basics": "implementation",
  "input/output": "implementation",
  "expressions": "implementation",
  "loops": "implementation",
  "iteration": "implementation",
  "functions": "implementation",
  "recursion": "divide and conquer",
  "oop": "implementation",

  // DSA fundamentals
  "arrays": "arrays",
  "strings": "strings",
  "two pointers": "two pointers",
  "sorting": "sortings",
  "searching": "binary search",
  "binary search": "binary search",
  "linked lists": "data structures",
  "stacks": "data structures",
  "queues": "data structures",
  "trees": "trees",
  "graphs": "graphs",
  "bfs": "bfs",
  "dfs": "dfs",
  "dynamic programming": "dp",
  "dp": "dp",
  "greedy": "greedy",
  "backtracking": "brute force",
  "big-o": "math",
  "complexity": "math",
  "math": "math",
  "hashing": "hashing",
  "hash map": "hashing",
  "dictionaries": "hashing",

  // Web / systems
  "http": "implementation",
  "networking": "implementation",
  "databases": "implementation",
  "sql": "implementation",
  "git": "implementation",
  "security": "implementation",

  // AI/ML — map to implementation + math
  "numpy": "math",
  "pandas": "implementation",
  "machine learning": "math",
  "neural networks": "math",
};

function mapTags(tags: string[]): string[] {
  const cf = new Set<string>();
  for (const t of tags) {
    const key = t.toLowerCase().trim();
    const mapped = TAG_MAP[key];
    if (mapped) cf.add(mapped);
  }
  // Always include implementation as fallback so we always get results
  if (cf.size === 0) cf.add("implementation");
  return [...cf];
}

interface CFProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
  solvedCount?: number;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const rawTags = url.searchParams.get("tags") ?? "";
  const maxRating = parseInt(url.searchParams.get("maxRating") ?? "1600");
  const minRating = parseInt(url.searchParams.get("minRating") ?? "800");
  const count = Math.min(parseInt(url.searchParams.get("count") ?? "5"), 10);

  const cfTags = mapTags(rawTags.split(",").filter(Boolean));
  const tagQuery = cfTags.slice(0, 2).join(";"); // CF uses semicolons for AND

  let res: Response;
  try {
    res = await fetch(
      `https://codeforces.com/api/problemset.problems?tags=${encodeURIComponent(tagQuery)}`,
      { signal: AbortSignal.timeout(8000) }
    );
  } catch (e) {
    return NextResponse.json({ error: `Codeforces unreachable: ${(e as Error).message}` }, { status: 502 });
  }

  if (!res.ok)
    return NextResponse.json({ error: `Codeforces returned ${res.status}` }, { status: 502 });

  const data = await res.json() as {
    status: string;
    result: {
      problems: CFProblem[];
      problemStatistics: { contestId: number; index: string; solvedCount: number }[];
    };
  };

  if (data.status !== "OK")
    return NextResponse.json({ error: "Codeforces API error" }, { status: 502 });

  // Build solved-count lookup
  const solvedMap: Record<string, number> = {};
  for (const s of data.result.problemStatistics) {
    solvedMap[`${s.contestId}${s.index}`] = s.solvedCount;
  }

  // Filter by rating range, attach solved count, sort by most-solved (accessibility)
  const filtered = data.result.problems
    .filter((p) => p.rating !== undefined && p.rating >= minRating && p.rating <= maxRating)
    .map((p) => ({ ...p, solvedCount: solvedMap[`${p.contestId}${p.index}`] ?? 0 }))
    .sort((a, b) => b.solvedCount - a.solvedCount)
    .slice(0, count)
    .map((p) => ({
      id: `${p.contestId}${p.index}`,
      name: p.name,
      rating: p.rating,
      tags: p.tags,
      url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
      solvedCount: p.solvedCount,
    }));

  return NextResponse.json({ problems: filtered, cfTags });
}
