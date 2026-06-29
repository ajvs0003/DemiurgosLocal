import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

type TsConfig = {
  compilerOptions?: {
    strict?: boolean;
    noUncheckedIndexedAccess?: boolean;
    noImplicitOverride?: boolean;
  };
  include?: string[];
  exclude?: string[];
};

describe("typescript configuration", () => {
  it("R2, R27: tsconfig.json aplica strict mode y garantías de tipado requeridas", () => {
    const tsconfigPath = resolve(process.cwd(), "tsconfig.json");
    const raw = readFileSync(tsconfigPath, "utf-8");
    const parsed = JSON.parse(raw) as TsConfig;

    expect(parsed.compilerOptions?.strict).toBe(true);
    expect(parsed.compilerOptions?.noUncheckedIndexedAccess).toBe(true);
    expect(parsed.compilerOptions?.noImplicitOverride).toBe(true);
    expect(parsed.include).toContain("next-env.d.ts");
    expect(parsed.exclude).toContain("node_modules");
  });

  it("R3, R32: no hay archivos .js en carpetas TypeScript obligatorias", () => {
    const jsInTypeScriptDomains = [
      "src/app/**/*.js",
      "src/components/**/*.js",
      "src/lib/**/*.js",
      "src/hooks/**/*.js",
      "src/server/**/*.js",
      "src/types/**/*.js",
    ].flatMap((pattern) => globSync(pattern, { cwd: process.cwd() }));

    expect(jsInTypeScriptDomains).toHaveLength(0);
  });

  it("R34: tsconfig mantiene strict: true como condición de aprobación", () => {
    const tsconfigPath = resolve(process.cwd(), "tsconfig.json");
    const raw = readFileSync(tsconfigPath, "utf-8");
    const parsed = JSON.parse(raw) as TsConfig;

    expect(parsed.compilerOptions?.strict).toBe(true);
  });
});
