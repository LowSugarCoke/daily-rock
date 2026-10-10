import { useEffect } from "react";
import { coverAccent, coverTint } from "./cover-tint";

// Tints the page and colours the controls from an album cover's colour.
// Covers without a usable colour leave the neutral defaults in place.
export function useCoverTheme(coverColor: string | undefined) {
  useEffect(() => {
    const tint = coverColor && coverTint(coverColor);
    const accent = coverColor && coverAccent(coverColor);
    if (!tint || !accent) return;
    const root = document.documentElement;
    root.style.setProperty("--cover", tint);
    root.style.setProperty("--accent", accent);
    return () => {
      root.style.removeProperty("--cover");
      root.style.removeProperty("--accent");
    };
  }, [coverColor]);
}
