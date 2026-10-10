"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import {
  computeAverageRating,
  computeCurrentStreak,
  formatDayMonth,
} from "@/lib/history-stats";
import type { HistoryItem } from "@/lib/types";
import { ratingWord } from "@/lib/rating";
import { PenCircle } from "@/components/Diary";

const ALL = "";

// Genres ordered by how often you've heard them, so the ones you know best
// come first; ties sort by name.
function genresByCount(
  items: HistoryItem[]
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const tag of items.flatMap((i) => i.genre_tags)) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
}

function matchesSearch(item: HistoryItem, query: string): boolean {
  return [item.title, item.artist, item.album, ...item.genre_tags].some(
    (field) => field.toLowerCase().includes(query)
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [era, setEra] = useState<string>(ALL);
  const [genre, setGenre] = useState<string>(ALL);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: HistoryItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  const eraOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.era))).sort(),
    [items]
  );
  const genreOptions = useMemo(() => genresByCount(items), [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        (!era || item.era === era) &&
        (!genre || item.genre_tags.includes(genre)) &&
        (!query || matchesSearch(item, query))
    );
  }, [items, search, era, genre]);

  const songsLogged = items.length;
  const averageRating = computeAverageRating(items);
  const currentStreak = computeCurrentStreak(items);

  const hasActiveFilters = Boolean(search || era || genre);

  const summary = `${songsLogged} ${songsLogged === 1 ? "song" : "songs"} · avg ${averageRating} / 5 · ${currentStreak}-day streak`;
  const activeFilterCount = (era ? 1 : 0) + (genre ? 1 : 0);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.head}>
          <h2 className={styles.heading}>Listening History</h2>
          {!loading && !error && <p className={styles.summary}>{summary}</p>}
          {!loading && !error && (
            <div className={styles.tools}>
              <label className={styles.search}>
                <span className={styles.visuallyHidden}>Search</span>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search title, artist, genre"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={`${styles.filterToggle} ${filtersOpen ? styles.filterToggleOpen : ""}`}
                aria-expanded={filtersOpen}
                aria-controls="history-filters"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <span className={styles.filterLabel}>Filter</span>
                {activeFilterCount > 0 && (
                  <span className={styles.filterCount}>
                    {activeFilterCount}
                  </span>
                )}
                <span className={styles.chevron} aria-hidden="true">
                  {filtersOpen ? "▴" : "▾"}
                </span>
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className={styles.statusBox}>
            <span className={styles.spinner} aria-hidden="true"></span>
            Loading your history...
          </div>
        )}

        {error && (
          <div className={`${styles.statusBox} ${styles.error}`}>
            Failed to load history: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {filtersOpen && (
              <div className={styles.filters} id="history-filters">
                <div className={styles.filterRow} role="group" aria-label="Era">
                  <span className={styles.filterName}>Era</span>
                  <div className={styles.eras}>
                    {[ALL, ...eraOptions].map((option) => {
                      const isOn = era === option;
                      return (
                        <button
                          key={option || "all"}
                          type="button"
                          className={`${styles.era} ${isOn ? styles.eraOn : ""}`}
                          aria-pressed={isOn}
                          aria-label={option || "All eras"}
                          onClick={() => setEra(option)}
                        >
                          {option || "All"}
                          {isOn && <PenCircle />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className={styles.filterRow}
                  role="group"
                  aria-label="Genre"
                >
                  <span className={styles.filterName}>Genre</span>
                  <div className={styles.genres}>
                    {genreOptions.map(({ name, count }) => {
                      const isOn = genre === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          className={`${styles.genre} ${isOn ? styles.genreOn : ""}`}
                          aria-pressed={isOn}
                          aria-label={name}
                          onClick={() => setGenre(isOn ? ALL : name)}
                        >
                          {name}
                          <span
                            className={styles.genreCount}
                            aria-hidden="true"
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <p className={styles.resultLine}>
                {`${filteredItems.length} of ${items.length} songs`}
                <button
                  type="button"
                  className={styles.clearFilters}
                  onClick={() => {
                    setSearch("");
                    setEra(ALL);
                    setGenre(ALL);
                  }}
                >
                  Clear filters
                </button>
              </p>
            )}

            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                No results. Try another genre, or clear the filters.
              </div>
            ) : (
              <ol className={styles.list}>
                {filteredItems.map((item) => {
                  const { day, month } = formatDayMonth(item.timestamp);
                  return (
                    <li key={item.rating_id} className={styles.entry}>
                      <Link
                        href={`/history/${item.rating_id}`}
                        className={styles.entryLink}
                      >
                        <span className={styles.taped}>
                          <Image
                            className={styles.cover}
                            src={item.cover_url}
                            alt={`${item.album} cover`}
                            width={300}
                            height={300}
                          />
                        </span>
                        <span className={styles.stamp}>
                          {month} {Number(day)}
                        </span>
                        <span className={styles.title}>{item.title}</span>
                        <span className={styles.artist}>{item.artist}</span>
                        <span className={styles.album}>
                          {`${item.album}, ${item.year}`}
                        </span>
                        <span className={styles.cardGenres}>
                          {item.genre_tags.join(", ")}
                        </span>
                        <span
                          className={styles.rating}
                          data-rating={item.rating}
                        >
                          {ratingWord(item.rating)}
                          <PenCircle />
                        </span>
                        {item.note && (
                          <span className={styles.note}>{item.note}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </main>
    </div>
  );
}
