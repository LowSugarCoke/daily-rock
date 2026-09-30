"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import {
  computeAverageRating,
  computeCurrentStreak,
  formatDayMonth,
} from "@/lib/history-stats";
import type { HistoryItem } from "@/lib/types";
import { ratingWord } from "@/lib/rating";

const ALL = "";

function distinctSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [era, setEra] = useState<string>(ALL);
  const [genre, setGenre] = useState<string>(ALL);
  const [artist, setArtist] = useState<string>(ALL);

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
    () => distinctSorted(items.map((i) => i.era)),
    [items]
  );
  const genreOptions = useMemo(
    () => distinctSorted(items.flatMap((i) => i.genre_tags)),
    [items]
  );
  const artistOptions = useMemo(
    () => distinctSorted(items.map((i) => i.artist)),
    [items]
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (era && item.era !== era) return false;
      if (artist && item.artist !== artist) return false;
      if (genre && !item.genre_tags.includes(genre)) return false;
      if (
        query &&
        !item.title.toLowerCase().includes(query) &&
        !item.artist.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [items, search, era, artist, genre]);

  const songsLogged = items.length;
  const averageRating = computeAverageRating(items);
  const currentStreak = computeCurrentStreak(items);

  const hasActiveFilters = Boolean(search || era || genre || artist);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.head}>
          <h2 className={styles.heading}>Listening History</h2>
          <p className={styles.subheading}>
            Every song you&apos;ve rated, filterable by era, artist, and genre.
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

            <div className={styles.filterBar}>
              <label className={styles.searchWrap}>
                <span className={styles.filterFieldLabel}>Search</span>
                <input
                  type="search"
                  className={styles.filterSearch}
                  placeholder="Search title or artist…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <label className={styles.filterField}>
                <span className={styles.filterFieldLabel}>Era</span>
                <select
                  className={styles.filterSelect}
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                >
                  <option value={ALL}>All</option>
                  {eraOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.filterField}>
                <span className={styles.filterFieldLabel}>Genre</span>
                <select
                  className={styles.filterSelect}
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  <option value={ALL}>All</option>
                  {genreOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.filterField}>
                <span className={styles.filterFieldLabel}>Artist</span>
                <select
                  className={styles.filterSelect}
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                >
                  <option value={ALL}>All</option>
                  {artistOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className={styles.clearFilters}
                onClick={() => {
                  setSearch("");
                  setEra(ALL);
                  setGenre(ALL);
                  setArtist(ALL);
                }}
              >
                Clear filters
              </button>
            )}

            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                No results for the current filters. Clear a filter to see more.
              </div>
            ) : (
              <ol className={styles.list}>
                {filteredItems.map((item) => {
                  const { day, month } = formatDayMonth(item.timestamp);
                  return (
                    <li key={item.rating_id} className={styles.row}>
                      <span className={styles.rowTaped}>
                        <Image
                          className={styles.rowCover}
                          src={item.cover_url}
                          alt={`${item.album} cover`}
                          width={120}
                          height={120}
                        />
                      </span>
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{item.title}</span>
                        <span className={styles.rowArtist}>{item.artist}</span>
                        <span className={styles.rowAlbum}>
                          {`${item.album}, ${item.year}`}
                        </span>
                        {item.note && (
                          <p className={styles.rowNote}>{item.note}</p>
                        )}
                      </div>
                      <span
                        className={styles.rowRating}
                        data-rating={item.rating}
                      >
                        {ratingWord(item.rating)}
                        <svg
                          className={styles.penCircle}
                          viewBox="0 0 100 40"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <path d="M6 24 C 8 6, 90 2, 95 18 C 99 34, 22 40, 8 30 C 2 24, 18 10, 52 8" />
                        </svg>
                      </span>
                      <span className={styles.rowDate}>
                        {month} {Number(day)}
                      </span>
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
