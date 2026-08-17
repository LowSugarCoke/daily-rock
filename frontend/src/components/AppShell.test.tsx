import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import AppShell from "./AppShell";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

let mockPathname = "/";

const mockHistory = [
  { timestamp: "2026-08-15 09:00:00" },
  { timestamp: "2026-08-14 09:00:00" },
  { timestamp: "2026-08-13 09:00:00" },
].map((t, i) => ({
  rating_id: `r${i}`,
  song_id: `${i}`,
  title: "Song",
  artist: "Artist",
  era: "1970s",
  genre_tags: [],
  youtube_id: "abc",
  rating: 5,
  note: null,
  ...t,
}));

describe("AppShell", () => {
  beforeEach(() => {
    mockPathname = "/";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHistory,
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders the brand and both nav tabs", () => {
    render(<AppShell>content</AppShell>);
    expect(screen.getByText("Daily Rock")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "History" })).toBeInTheDocument();
  });

  test("marks the Today tab active when on the home route", () => {
    mockPathname = "/";
    render(<AppShell>content</AppShell>);
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "History" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  test("marks the History tab active when on the history route", () => {
    mockPathname = "/history";
    render(<AppShell>content</AppShell>);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("renders the current streak computed from listening history", async () => {
    render(<AppShell>content</AppShell>);
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
    expect(screen.getByText(/day streak/i)).toBeInTheDocument();
  });

  test("renders children content", () => {
    render(<AppShell>page body</AppShell>);
    expect(screen.getByText("page body")).toBeInTheDocument();
  });
});
