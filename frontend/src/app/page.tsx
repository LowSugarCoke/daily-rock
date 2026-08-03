"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface HealthStatus {
  status: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: HealthStatus) => {
        setHealth(data);
        setLoading(false);
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

          <div className={styles.healthSection}>
            <h2 className={styles.sectionTitle}>System Status</h2>
            {loading && (
              <div className={styles.statusBox}>
                <span className={styles.spinner}></span>
                Checking backend connection...
              </div>
            )}
            {error && (
              <div className={`${styles.statusBox} ${styles.error}`}>
                <span
                  className={styles.statusDot}
                  style={{ color: "#ff4d4f" }}
                ></span>
                Backend Offline: {error}
              </div>
            )}
            {health && (
              <div className={`${styles.statusBox} ${styles.success}`}>
                <span
                  className={styles.statusDot}
                  style={{ color: "#52c41a" }}
                ></span>
                Backend Online:{" "}
                <code className={styles.code}>{JSON.stringify(health)}</code>
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
            href="/api/health"
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
