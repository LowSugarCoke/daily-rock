"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";
import { computeCurrentStreak } from "@/lib/history-stats";
import type { HistoryItem } from "@/lib/types";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/history", label: "History" },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/history")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: HistoryItem[]) => {
        if (!cancelled) setStreak(computeCurrentStreak(data));
      })
      .catch(() => {
        if (!cancelled) setStreak(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <h1 className={styles.brandWord}>Daily Rock</h1>
        </div>
        <div className={styles.tabs}>
          {TABS.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        {streak !== null && streak > 0 && (
          <span className={styles.streak}>
            🔥 <span className={styles.streakValue}>{streak}</span>&nbsp;day
            streak
          </span>
        )}
      </nav>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
