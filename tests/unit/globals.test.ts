import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("app globals", () => {
  it("R13: layout.tsx mantiene estructura semántica, metadata y skip-link funcional", () => {
    const layoutPath = resolve(process.cwd(), "src/app/layout.tsx");
    const contents = readFileSync(layoutPath, "utf-8");

    expect(contents).toContain("export const metadata");
    expect(contents).toContain("<html");
    expect(contents).toContain("<body");
    expect(contents).toContain('href="#main"');
    expect(contents).toContain('<main id="main">');
  });
});
