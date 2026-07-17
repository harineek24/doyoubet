import { NextRequest, NextResponse } from "next/server";

const PISTON_BASE = "https://emkc.org/api/v2/piston";

const LANGUAGE_ALIASES: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "c++",
};

let runtimeVersionCache: Map<string, string> | null = null;

async function getRuntimeVersion(language: string): Promise<string> {
  if (!runtimeVersionCache) {
    const res = await fetch(`${PISTON_BASE}/runtimes`);
    const runtimes: { language: string; version: string }[] = await res.json();
    runtimeVersionCache = new Map(runtimes.map((r) => [r.language, r.version]));
  }
  const version = runtimeVersionCache.get(language);
  if (!version) throw new Error(`Unsupported language: ${language}`);
  return version;
}

const FILENAMES: Record<string, string> = {
  python: "main.py",
  javascript: "main.js",
  typescript: "main.ts",
  java: "Main.java",
  cpp: "main.cpp",
};

export async function POST(request: NextRequest) {
  const { language, content } = await request.json();
  const pistonLanguage = LANGUAGE_ALIASES[language];
  if (!pistonLanguage) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  try {
    const version = await getRuntimeVersion(pistonLanguage);
    const res = await fetch(`${PISTON_BASE}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: pistonLanguage,
        version,
        files: [{ name: FILENAMES[language] ?? "main", content }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Execution service failed" }, { status: 502 });
    }

    const data = await res.json();
    const run = data.run ?? {};
    const compile = data.compile ?? {};

    const stdout = run.stdout ?? "";
    const stderr = [compile.stderr, run.stderr].filter(Boolean).join("\n");
    // Piston sometimes puts everything (including tracebacks) in run.output
    // when stdout/stderr aren't split — fall back to it so errors aren't lost
    const output = (!stdout && !stderr) ? (run.output ?? "") : "";

    return NextResponse.json({
      stdout: stdout || output,
      stderr,
      exitCode: run.code ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Execution failed" }, { status: 500 });
  }
}
