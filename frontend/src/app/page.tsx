"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import type { Song } from "@/lib/types";
import { RATING_WORDS } from "@/lib/rating";
import { coverAccent, coverTint } from "@/lib/cover-tint";

export default function Home() {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noSong, setNoSong] = useState<boolean>(false);

  // Rating and progression states
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  useEffect(() => {
    fetch("/api/daily_selection")
      .then((res) => {
        if (res.status === 404) {
          setNoSong(true);
          setLoading(false);
          setSubmitSuccess(false); // Reset success state when no song is found
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
          setSubmitSuccess(false); // Clear success state once new song is fetched
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
        setSubmitSuccess(false); // Reset success state on error
      });
  }, [fetchTrigger]);

  // Tint the page and colour the controls from the current album cover.
  useEffect(() => {
    const tint = song && coverTint(song.cover_color);
    const accent = song && coverAccent(song.cover_color);
    if (!tint || !accent) return;
    const root = document.documentElement;
    root.style.setProperty("--cover", tint);
    root.style.setProperty("--accent", accent);
    return () => {
      root.style.removeProperty("--cover");
      root.style.removeProperty("--accent");
    };
  }, [song]);

  const handleSubmitRating = async () => {
    if (!song) return;

    if (rating === null || rating < 1 || rating > 5) {
      setValidationError("Please select a rating of 1 to 5 stars.");
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          daily_selection_id: song.id,
          rating,
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        const errData =
          (await (
            typeof response.clone === "function" ? response.clone() : response
          )
            .json()
            .catch(() => null)) || (await response.text().catch(() => null));
        const errMsg =
          typeof errData === "string"
            ? errData
            : errData
              ? JSON.stringify(errData)
              : response.statusText;
        throw new Error(errMsg);
      }

      setSubmitSuccess(true);
      setSong(null); // Clear the rated song state immediately to prevent regression/residual UI
      setRating(null);
      setNote("");
      setLoading(true);
      setError(null);
      setNoSong(false);
      setFetchTrigger((prev) => prev + 1);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.heroRow}>
          <span className={styles.eyebrow}>Today&apos;s Selection</span>
          <span className={styles.dayLabel}>{todayLabel}</span>
        </p>

        {loading && !submitSuccess && (
          <div className={styles.statusBox}>
            <span className={styles.spinner} aria-hidden="true"></span>
            {"Loading today's selection..."}
          </div>
        )}

        {submitSuccess && (
          <div className={`${styles.statusBox} ${styles.success}`}>
            <span>Success! Loading next selection...</span>
          </div>
        )}

        {error && (
          <div className={`${styles.statusBox} ${styles.error}`}>
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

        {song && !loading && (
          <article className={styles.songCard}>
            <div className={styles.mediaCol}>
              <Image
                className={styles.cover}
                src={song.cover_url}
                alt={`${song.album} cover`}
                width={600}
                height={600}
                priority
              />
              <div className={styles.player}>
                <iframe
                  className={styles.playerFrame}
                  src={`https://www.youtube-nocookie.com/embed/${song.youtube_id}`}
                  title={`${song.title} - ${song.artist}`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>

            <div className={styles.infoCol}>
              <div className={styles.heading}>
                <h2 className={styles.songTitle}>{song.title}</h2>
                <p className={styles.songArtist}>{song.artist}</p>
                <p className={styles.album}>{`${song.album}, ${song.year}`}</p>
                <p className={styles.tagsRow}>
                  <span className={styles.eraTag}>{song.era}</span>
                  {song.genre_tags.map((tag) => (
                    <span key={tag} className={styles.genreTag}>
                      {tag}
                    </span>
                  ))}
                </p>
              </div>

              <section className={styles.ratingSection}>
                <h3 className={styles.ratingTitle}>Rate this Song</h3>
                <div
                  className={styles.segmented}
                  role="group"
                  aria-label="Rating"
                >
                  {RATING_WORDS.map((word, index) => {
                    const value = index + 1;
                    const isOn = rating === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.segment} ${isOn ? styles.segmentOn : ""}`}
                        onClick={() => {
                          setRating(value);
                          setValidationError(null);
                        }}
                        aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                        aria-pressed={isOn}
                        disabled={submitting}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>

                <label className={styles.noteLabel} htmlFor="song-note">
                  Notes
                </label>
                <div className={styles.noteWrap}>
                  <textarea
                    id="song-note"
                    className={styles.noteInput}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add private notes about this song (optional)..."
                    rows={4}
                    disabled={submitting}
                    maxLength={1024}
                  />
                  <span className={styles.noteCount}>{note.length} / 1024</span>
                </div>

                {validationError && (
                  <p className={styles.validationError} role="alert">
                    {validationError}
                  </p>
                )}

                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={handleSubmitRating}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Rating"}
                </button>
              </section>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
