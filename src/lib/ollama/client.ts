const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:latest";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

// ── Groq (primary) ────────────────────────────────────────────
async function groqChat(prompt: string, system?: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body}`);
  }

  const data = await res.json();
  return (data.choices[0]?.message?.content ?? "") as string;
}

function parseRetryAfterMs(errMsg: string): number {
  // Groq embeds "Please try again in 9.265s" in the error body
  const match = errMsg.match(/try again in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 10_000;
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("rate_limit") || msg.includes("Rate limit")
    || msg.includes("503") || msg.includes("overloaded");
}

// ── Ollama (fallback) ─────────────────────────────────────────
export async function ollamaChat(prompt: string, system?: string): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.3 },
    }),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message.content as string;
}

// ── Unified entry point: Groq (with retry) → Ollama fallback ─
export async function llmChat(prompt: string, system?: string): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    // Up to 3 attempts with Groq, honouring the retry-after hint each time
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await groqChat(prompt, system);
      } catch (err) {
        if (!isRateLimitError(err)) throw err;
        const waitMs = parseRetryAfterMs((err as Error).message);
        if (attempt < 3) {
          console.warn(`[llm] Groq rate-limited (attempt ${attempt}/3) — waiting ${(waitMs / 1000).toFixed(1)}s then retrying...`);
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          console.warn(`[llm] Groq rate-limited after 3 attempts — falling back to Ollama`);
          try {
            return await ollamaChat(prompt, system);
          } catch (ollamaErr) {
            throw new Error(`Both Groq and Ollama unavailable. Groq: ${(err as Error).message.slice(0, 120)}. Ollama: ${(ollamaErr as Error).message.slice(0, 80)}`);
          }
        }
      }
    }
  }
  return ollamaChat(prompt, system);
}

// ── Availability check ────────────────────────────────────────
export async function llmAvailable(): Promise<boolean> {
  // Groq: validate key exists and API is reachable
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return true;
    } catch {}
    // Groq unreachable — check if Ollama is available as fallback
  }
  // Ollama check
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Keep for backwards compat (used in route.ts)
export const ollamaAvailable = llmAvailable;
