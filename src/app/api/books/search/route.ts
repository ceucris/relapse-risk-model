import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
};

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PulseLifeDashboard/1.0" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Open Library request failed" }, { status: 502 });
  }

  const json = (await res.json()) as { docs?: OpenLibraryDoc[] };
  const results = (json.docs ?? []).map((doc) => ({
    id: doc.key || `${doc.title}-${doc.first_publish_year}`,
    title: doc.title || "Untitled",
    author: doc.author_name?.[0] || "Unknown author",
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
    year: doc.first_publish_year,
  }));

  return NextResponse.json({ results });
}
