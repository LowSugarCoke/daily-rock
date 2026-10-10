"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./page.module.css";
import type { HistoryItem } from "@/lib/types";
import { formatDayMonth } from "@/lib/history-stats";
import { useCoverTheme } from "@/lib/use-cover-theme";
import SongSpread from "@/components/SongSpread";
import { NoteCard, RatingScale, diaryStyles } from "@/components/Diary";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "missing" }
  | { status: "found"; item: HistoryItem };

// One past entry from the listening history: the song to play again, plus
// the rating and note you left that day.
export default function HistoryEntryPage() {
  const { ratingId } = useParams<{ ratingId: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    fetch("/api/history")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((items: HistoryItem[]) => {
        const item = items.find((i) => i.rating_id === ratingId);
        setState(item ? { status: "found", item } : { status: "missing" });
      })
      .catch((err) =>
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        })
      );
  }, [ratingId]);

  const item = state.status === "found" ? state.item : null;
  useCoverTheme(item?.cover_color);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/history" className={styles.back}>
          &larr; Back to History
        </Link>

        {state.status === "loading" && (
          <p className={styles.status}>Loading this entry...</p>
        )}
        {state.status === "error" && (
          <p className={styles.status} role="alert">
            Failed to load this entry: {state.message}
          </p>
        )}
        {state.status === "missing" && (
          <p className={styles.missing}>
            This song isn&apos;t in your history.
          </p>
        )}

        {item && (
          <SongSpread song={item} stamp={stampFor(item)}>
            <section className={styles.entry}>
              <h3 className={styles.label}>Your rating</h3>
              <RatingScale value={item.rating} />

              <h3 className={styles.label}>Your notes</h3>
              <NoteCard>
                <p
                  className={`${diaryStyles.handwritten} ${item.note ? "" : diaryStyles.empty}`}
                >
                  {item.note ?? "No notes that day."}
                </p>
              </NoteCard>
            </section>
          </SongSpread>
        )}
      </main>
    </div>
  );
}

function stampFor(item: HistoryItem): string {
  const { day, month } = formatDayMonth(item.timestamp);
  return `${month} ${Number(day)} · Day ${Number(item.song_id)}`;
}
