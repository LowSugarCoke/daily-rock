"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

export interface Song {
  id: string;
  title: string;
  artist: string;
  era: string;
  genre_tags: string[];
  youtube_id: string;
}

export default function Home() {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noSong, setNoSong] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/daily_selection")
      .then((res) => {
        if (res.status === 404) {
          setNoSong(true);
          setLoading(false);
          return null;
        }
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Song | null) => {
        if (data) {
          setSong(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.brand}>
            <span className={styles.rockEmoji}>🎸</span>
            <h1 className={styles.title}>Daily Rock</h1>
          </div>
          <p className={styles.tagline}>
            Systematically listening to rock music, one song a day. Tracking
            history, ratings, and classic rock evolution.
          </p>

          <div className={styles.selectionSection}>
            {loading && (
              <div className={styles.statusBox}>
                <span className={styles.spinner}></span>
                {"Loading today's selection..."}
              </div>
            )}

            {error && (
              <div className={`${styles.statusBox} ${styles.error}`}>
                <span
                  className={styles.statusDot}
                  style={{ backgroundColor: "#ff4d4f" }}
                ></span>
                <div className={styles.errorContent}>
                  <h3 className={styles.errorTitle}>
                    {"Failed to load today's selection"}
                  </h3>
                  <p className={styles.errorMessage}>{error}</p>
                </div>
              </div>
            )}

            {noSong && (
              <div className={`${styles.statusBox} ${styles.warning}`}>
                <span
                  className={styles.statusDot}
                  style={{ backgroundColor: "#faad14" }}
                ></span>
                <div className={styles.warningContent}>
                  <h3 className={styles.warningTitle}>
                    No daily selection available
                  </h3>
                  <p className={styles.warningMessage}>
                    There are no songs loaded in the database yet.
                  </p>
                </div>
              </div>
            )}

            {song && (
              <div className={styles.songCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardBadge}>
                    {"Today's Selection"}
                  </span>
                  <span className={styles.eraTag}>{song.era}</span>
                </div>
                <h2 className={styles.songTitle}>{song.title}</h2>
                <p className={styles.songArtist}>{song.artist}</p>
                <div className={styles.genreTags}>
                  {song.genre_tags.map((tag) => (
                    <span key={tag} className={styles.genreTag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className={styles.mediaPlaceholder}>
                  <span className={styles.playIcon}>▶</span>
                  <span>YouTube Player Placeholder (Issue #7)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="https://github.com/LowSugarCoke/daily-rock"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repo
          </a>
          <a
            className={styles.secondary}
            href="/api/daily_selection"
            target="_blank"
            rel="noopener noreferrer"
          >
            Direct API Check
          </a>
        </div>
      </main>
    </div>
  );
}
