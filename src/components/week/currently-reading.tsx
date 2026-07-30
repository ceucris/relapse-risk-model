"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { toDayKey, uid } from "@/lib/dates";
import { getQuarterKey } from "@/lib/dates";
import { EmptyHint, SectionCard } from "@/components/ui";
import type { BookEntry } from "@/lib/types";

type SearchResult = {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
};

export function CurrentlyReadingWidget() {
  const { data, setData } = useDashboard();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const reading = data.books.filter((b) => b.status === "reading");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  function addBook(result: SearchResult) {
    const book: BookEntry = {
      id: uid("book"),
      title: result.title,
      author: result.author,
      coverUrl: result.coverUrl,
      openLibraryId: result.id,
      status: "reading",
      startedAt: toDayKey(),
      quarterKey: getQuarterKey(),
    };
    setData((prev) => ({
      ...prev,
      books: [book, ...prev.books.map((b) => (b.status === "reading" ? { ...b, status: "want" as const } : b))],
    }));
    setQuery("");
    setResults([]);
  }

  function finish(id: string) {
    setData((prev) => ({
      ...prev,
      books: prev.books.map((b) =>
        b.id === id
          ? {
              ...b,
              status: "finished" as const,
              finishedAt: toDayKey(),
              quarterKey: b.quarterKey || getQuarterKey(),
            }
          : b,
      ),
    }));
  }

  return (
    <SectionCard title="Currently reading" accent="#8e967d">
      {reading.map((book) => (
        <div key={book.id} className="book-now">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt="" className="book-cover" />
          ) : (
            <div className="book-cover book-cover--empty">📖</div>
          )}
          <div>
            <strong>{book.title}</strong>
            <p>{book.author}</p>
            <button type="button" className="btn btn-soft" onClick={() => finish(book.id)}>
              Mark finished
            </button>
          </div>
        </div>
      ))}
      {reading.length === 0 && <EmptyHint>Search Open Library to set your current book.</EmptyHint>}

      <div className="book-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books by title…"
          aria-label="Search books"
        />
        {searching && <p className="muted">Searching…</p>}
        <ul className="book-results">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => addBook(r)}>
                {r.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.coverUrl} alt="" />
                ) : (
                  <span className="mini-cover">📘</span>
                )}
                <span>
                  <strong>{r.title}</strong>
                  <em>{r.author}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
