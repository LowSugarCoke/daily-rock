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
const GENRES_SHOWN = 12;

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
  const [showAllGenres, setShowAllGenres] = useState<boolean>(false);

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
  const visibleGenres =
    showAllGenres || genreOptions.length <= GENRES_SHOWN
      ? genreOptions
      : genreOptions.filter(
          (g, index) => index < GENRES_SHOWN || g.name === genre
        );
  const hiddenGenreCount = genreOptions.length - visibleGenres.length;

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

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.head}>
          <h2 className={styles.heading}>Listening History</h2>
          <p className={styles.subheading}>
            Every song you&apos;ve rated. Pick an era or a genre to narrow it
            down.
          </p>
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
            <dl className={styles.statRow}>
              <div className={styles.statTile}>
                <dt className={styles.statLabel}>Songs Logged</dt>
                <dd className={styles.statValue}>{songsLogged}</dd>
              </div>
              <div className={styles.statTile}>
                <dt className={styles.statLabel}>Average Rating</dt>
                <dd className={styles.statValue}>
                  {averageRating} <small>/ 5</small>
                </dd>
              </div>
              <div className={styles.statTile}>
                <dt className={styles.statLabel}>Current Streak</dt>
                <dd className={styles.statValue}>
                  {currentStreak}{" "}
                  <small>{currentStreak === 1 ? "day" : "days"}</small>
                </dd>
              </div>
            </dl>

            <div className={styles.filters}>
              <label className={styles.search}>
                <span className={styles.filterName}>Search</span>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Title, artist, album or genre"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

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

              <div className={styles.filterRow} role="group" aria-label="Genre">
                <span className={styles.filterName}>Genre</span>
                <div className={styles.genres}>
                  {visibleGenres.map(({ name, count }) => {
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
                        <span className={styles.genreCount} aria-hidden="true">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  {hiddenGenreCount > 0 && (
                    <button
                      type="button"
                      className={styles.moreGenres}
                      onClick={() => setShowAllGenres(true)}
                    >
                      {`+${hiddenGenreCount} more`}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className={styles.resultLine}>
              {`${filteredItems.length} of ${items.length} songs`}
              {hasActiveFilters && (
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
              )}
            </p>

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
