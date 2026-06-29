import { describe, expect, it } from "vitest";

describe("example", () => {
  it("suma 1 + 1", () => {
    expect(1 + 1).toBe(2);
  });

  it("R1: lorem", () => {
    expect("nextjs").toContain("next");
  });
});
