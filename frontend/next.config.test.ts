import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

async function getRewrites(): Promise<
  { source: string; destination: string }[]
> {
  // Dynamically import to pick up the stubbed environment variable on load
  const config = (await import("./next.config")).default;
  return (await (typeof config.rewrites === "function"
    ? config.rewrites()
    : [])) as unknown as { source: string; destination: string }[];
}

describe("Next.js Rewrites Config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("uses localhost fallback when BACKEND_URL is not set", async () => {
    vi.stubEnv("BACKEND_URL", "");
    const rewrites = await getRewrites();

    expect(rewrites).toEqual([
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8787/api/:path*",
      },
    ]);
  });

  test("uses custom BACKEND_URL when set", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.rock-rock.com");
    const rewrites = await getRewrites();

    expect(rewrites).toEqual([
      {
        source: "/api/:path*",
        destination: "https://api.rock-rock.com/api/:path*",
      },
    ]);
  });

  test("removes trailing slash from BACKEND_URL defensively", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.rock-rock.com/");
    const rewrites = await getRewrites();

    expect(rewrites).toEqual([
      {
        source: "/api/:path*",
        destination: "https://api.rock-rock.com/api/:path*",
      },
    ]);
  });
});
