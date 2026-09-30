import { describe, expect, test } from "vitest";
import { coverTint } from "./cover-tint";

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
