import { describe, expect, test } from "vitest";
import { contrastWithWhite, coverAccent, coverTint } from "./cover-tint";

describe("coverTint", () => {
  test("keeps colourful covers", () => {
    expect(coverTint("#eda273")).toBe("#eda273");
    expect(coverTint("#0092c5")).toBe("#0092c5");
  });

  test("skips near-black, near-white and grey covers", () => {
    expect(coverTint("#010101")).toBeNull();
    expect(coverTint("#fffce9")).toBeNull();
    expect(coverTint("#888888")).toBeNull();
  });

  test("skips values that are not hex colours", () => {
    expect(coverTint("")).toBeNull();
    expect(coverTint("red")).toBeNull();
  });
});

describe("coverAccent", () => {
  test("darkens a light cover colour until white text is readable", () => {
    const accent = coverAccent("#eda273")!;
    expect(contrastWithWhite(accent)).toBeGreaterThanOrEqual(4.5);
    expect(accent).not.toBe("#eda273");
  });

  test("keeps the cover's hue", () => {
    const [r, g, b] = [1, 3, 5].map((i) =>
      parseInt(coverAccent("#0092c5")!.slice(i, i + 2), 16)
    );
    expect(b).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(r);
  });

  test("leaves an already dark colour alone", () => {
    expect(coverAccent("#1c3131")).toBe("#1c3131");
  });

  test("returns null for covers that get no tint", () => {
    expect(coverAccent("#010101")).toBeNull();
  });
});
