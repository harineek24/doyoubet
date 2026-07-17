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
    // Piston sometimes merges stdout+stderr into run.output — use it as
    // the final fallback so tracebacks are never silently swallowed
    const combined = run.output ?? "";
    const exitCode = run.code ?? (compile.code ?? 0);

    return NextResponse.json({
      stdout: stdout || (!stderr ? combined : ""),
      stderr: stderr || (combined && combined !== stdout ? combined : ""),
      exitCode,
    });
  } catch {
    return NextResponse.json({ error: "Execution failed" }, { status: 500 });
  }
}
