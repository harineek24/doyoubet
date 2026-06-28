import { NextRequest, NextResponse } from "next/server";
import type { WebSearchResult } from "@/types/schema";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ configured: true, results: [] satisfies WebSearchResult[] });
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ configured: false, results: [] satisfies WebSearchResult[] });
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });
  if (!res.ok) {
    return NextResponse.json(
      { configured: true, results: [] satisfies WebSearchResult[], error: "Search request failed" },
      { status: 502 }
    );
  }

  const data = await res.json();
  const results: WebSearchResult[] = (data.web?.results ?? []).map(
    (item: { title: string; url: string; description: string }) => ({
      title: item.title,
      url: item.url,
      snippet: item.description,
    })
  );

  return NextResponse.json({ configured: true, results });
}
