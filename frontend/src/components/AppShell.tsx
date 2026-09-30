"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";
import { computeCurrentStreak } from "@/lib/history-stats";
import type { HistoryItem } from "@/lib/types";
import { DiscIcon, FlameIcon, HistoryIcon } from "./icons";

const TABS = [
  { href: "/", label: "Today", Icon: DiscIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
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
        {streak !== null && streak > 0 && (
          <span className={styles.streak}>
            <FlameIcon size={16} className={styles.streakIcon} />
            <span className={styles.streakValue}>{streak}</span>&nbsp;day streak
          </span>
        )}
        <div className={styles.tabs}>
          {TABS.map(({ href, label, Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              >
                <Icon size={20} className={styles.tabIcon} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
