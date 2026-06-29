import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("project structure", () => {
  it("R5, R36: estructura base del repositorio existe y es verificable", () => {
    const requiredPaths = [
      "src/app",
      "src/components/ui",
      "src/lib",
      "src/hooks",
      "src/server/actions",
      "src/types",
      "public",
      "tests/unit",
      "tests/e2e",
      "specs",
      "progress",
      "docs",
      "src/components/ui/README.md",
      "src/server/actions/README.md",
      "src/hooks/README.md",
      "src/types/README.md",
    ];

    for (const relativePath of requiredPaths) {
      const absolutePath = resolve(process.cwd(), relativePath);
      expect(existsSync(absolutePath)).toBe(true);
    }
  });
});
