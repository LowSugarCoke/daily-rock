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
      <header className={styles.masthead}>
        <div className={styles.mastRow}>
          <h1 className={styles.brandWord}>Daily Rock</h1>
          {streak !== null && streak > 0 && (
            <span className={styles.streak}>
              <span className={styles.streakValue}>{streak}</span> day streak
            </span>
          )}
        </div>
        <nav className={styles.tabs} aria-label="Main">
          {TABS.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              >
                {label}
              </Link>
            );
          })}
          <span className={styles.tagline}>One song a day</span>
        </nav>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
