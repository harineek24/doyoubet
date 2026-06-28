import { NextRequest, NextResponse } from "next/server";
import type { WebSearchResult } from "@/types/schema";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ configured: true, results: [] satisfies WebSearchResult[] });
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ configured: false, results: [] satisfies WebSearchResult[] });
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Tavily search failed", res.status, errorBody);
    return NextResponse.json(
      { configured: true, results: [] satisfies WebSearchResult[], error: "Search request failed" },
      { status: 502 }
    );
  }

  const data = await res.json();
  const results: WebSearchResult[] = (data.results ?? []).map(
    (item: { title: string; url: string; content: string }) => ({
      title: item.title,
      url: item.url,
      snippet: item.content,
    })
  );

  return NextResponse.json({ configured: true, results });
}
