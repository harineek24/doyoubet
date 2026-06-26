import { NextRequest, NextResponse } from "next/server";
import type { WebSearchResult } from "@/types/schema";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ configured: true, results: [] satisfies WebSearchResult[] });
  }

  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;

  if (!apiKey || !cx) {
    return NextResponse.json({ configured: false, results: [] satisfies WebSearchResult[] });
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "5");

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json(
      { configured: true, results: [] satisfies WebSearchResult[], error: "Search request failed" },
      { status: 502 }
    );
  }

  const data = await res.json();
  const results: WebSearchResult[] = (data.items ?? []).map((item: { title: string; link: string; snippet: string }) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
  }));

  return NextResponse.json({ configured: true, results });
}
