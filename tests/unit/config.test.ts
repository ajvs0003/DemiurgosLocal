import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  packageManager?: string;
  engines?: {
    node?: string;
  };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("root configuration", () => {
  it("R1, R35: next.config.ts existe y define configuración base de Next", () => {
    const nextConfigPath = resolve(process.cwd(), "next.config.ts");
    const nextConfigContents = readFileSync(nextConfigPath, "utf-8");

    expect(existsSync(nextConfigPath)).toBe(true);
    expect(nextConfigContents).toContain("import type { NextConfig } from \"next\"");
    expect(nextConfigContents).toContain("reactStrictMode: true");
    expect(nextConfigContents).toContain("typedRoutes: true");
  });

  it("R7, R33: eslint.config.mjs usa flat config con reglas obligatorias de TypeScript", () => {
    const eslintConfigPath = resolve(process.cwd(), "eslint.config.mjs");
    const eslintConfigContents = readFileSync(eslintConfigPath, "utf-8");

    expect(existsSync(eslintConfigPath)).toBe(true);
    expect(eslintConfigContents).toContain("next/core-web-vitals");
    expect(eslintConfigContents).toContain("next/typescript");
    expect(eslintConfigContents).toContain('"@typescript-eslint/no-explicit-any": "error"');
    expect(eslintConfigContents).toContain(
      '"@typescript-eslint/consistent-type-imports": "warn"',
    );
  });

  it("R8, R17: Prettier está configurado con plugin tailwind", () => {
    const prettierrcPath = resolve(process.cwd(), ".prettierrc");
    const prettierConfigPath = resolve(process.cwd(), "prettier.config.mjs");

    expect(existsSync(prettierrcPath) || existsSync(prettierConfigPath)).toBe(true);

    if (existsSync(prettierrcPath)) {
      const prettierrc = readFileSync(prettierrcPath, "utf-8");
      expect(prettierrc).toContain("prettier-plugin-tailwindcss");
    }
  });

  it("R6, R11, R18, R19, R20, R21, R22, R23, R24, R25, R26, R29, R30, R39: package.json declara scripts/engines/package manager del arnés", () => {
    const packageJsonPath = resolve(process.cwd(), "package.json");
    const packageJsonRaw = readFileSync(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonRaw) as PackageJson;

    expect(packageJson.packageManager).toMatch(/^pnpm@(9|\d{2,})\./);
    expect(packageJson.engines?.node).toContain(">=20.0.0");

    expect(packageJson.scripts?.dev).toBe("next dev --turbo");
    expect(packageJson.scripts?.build).toBe("next build");
    expect(packageJson.scripts?.start).toBe("next start");
    expect(packageJson.scripts?.lint).toBe("next lint");
    expect(packageJson.scripts?.typecheck).toBe("tsc --noEmit");
    expect(packageJson.scripts?.format).toBe("prettier --write .");
    expect(packageJson.scripts?.test).toBe("vitest");
    expect(packageJson.scripts?.["test:e2e"]).toBe("playwright test");

    expect(packageJson.devDependencies?.vitest).toBeDefined();
    expect(packageJson.devDependencies?.["@testing-library/react"]).toBeDefined();
    expect(packageJson.devDependencies?.["@testing-library/jest-dom"]).toBeDefined();
    expect(packageJson.devDependencies?.["@playwright/test"]).toBeDefined();
    expect(packageJson.devDependencies?.sass).toBeDefined();
    expect(packageJson.devDependencies?.["@next/bundle-analyzer"]).toBeDefined();
  });

  it("R9, R16: vitest y postcss quedan configurados para el bootstrap", () => {
    const vitestConfigPath = resolve(process.cwd(), "vitest.config.ts");
    const vitestConfigContents = readFileSync(vitestConfigPath, "utf-8");
    const postcssConfigPath = resolve(process.cwd(), "postcss.config.mjs");
    const postcssConfigContents = readFileSync(postcssConfigPath, "utf-8");

    expect(vitestConfigContents).toContain('environment: "jsdom"');
    expect(vitestConfigContents).toContain('setupFiles: ["./tests/setup.ts"]');
    expect(vitestConfigContents).toContain("tests/unit");

    expect(postcssConfigContents).toContain("@tailwindcss/postcss");
  });

  it("R31: no hay variables secretas obligatorias para build en next.config.ts", () => {
    const nextConfigPath = resolve(process.cwd(), "next.config.ts");
    const nextConfigContents = readFileSync(nextConfigPath, "utf-8");

    expect(nextConfigContents).toContain("process.env.ANALYZE");
    expect(nextConfigContents).not.toMatch(/process\.env\.(?!ANALYZE\b)[A-Z0-9_]+/);
  });
});
