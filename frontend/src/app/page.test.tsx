import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import Home from "./page";

const mockSong = {
  id: "1",
  title: "Johnny B. Goode",
  artist: "Chuck Berry",
  era: "1950s",
  genre_tags: ["Rock 'n' Roll"],
  youtube_id: "T38v3-SSGcM",
};

describe("Home Component", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders initial loading state and brand info", () => {
    // Mock fetch to return a pending promise to stay in loading state
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    render(<Home />);

    expect(screen.getByText("Daily Rock")).toBeInTheDocument();
    expect(
      screen.getByText("Loading today's selection...")
    ).toBeInTheDocument();
  });

  test("renders success state with the current song details", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSong,
    } as Response);

    render(<Home />);

    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    // Assert song details are rendered beautifully
    expect(screen.getByText("Today's Selection")).toBeInTheDocument();
    expect(screen.getByText("Johnny B. Goode")).toBeInTheDocument();
    expect(screen.getByText("Chuck Berry")).toBeInTheDocument();
    expect(screen.getByText("1950s")).toBeInTheDocument();
    expect(screen.getByText("Rock 'n' Roll")).toBeInTheDocument();
  });

  test("renders empty/no-song state when backend returns 404", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => "No song found",
    } as Response);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByText("No daily selection available")
    ).toBeInTheDocument();
    expect(
      screen.getByText("There are no songs loaded in the database yet.")
    ).toBeInTheDocument();
  });

  test("renders error state when backend fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading today's selection...")
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByText(/Failed to load today's selection/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/HTTP error! status: 500/i)).toBeInTheDocument();
  });
});
