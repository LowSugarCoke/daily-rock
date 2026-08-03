import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import Home from "./page";

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
      screen.getByText("Checking backend connection...")
    ).toBeInTheDocument();
  });

  test("renders success state when backend is online", async () => {
    const mockHealth = { status: "ok" };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as Response);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Checking backend connection...")
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Backend Online:/i)).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify(mockHealth))).toBeInTheDocument();
  });

  test("renders error state when backend fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.queryByText("Checking backend connection...")
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByText(/Backend Offline: HTTP error! status: 500/i)
    ).toBeInTheDocument();
  });
});
