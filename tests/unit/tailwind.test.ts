import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("tailwind configuration", () => {
  it("R4, R15, R38: tailwind.config.ts define configuración explícita para src", () => {
    const tailwindConfigPath = resolve(process.cwd(), "tailwind.config.ts");
    const tailwindConfigContents = readFileSync(tailwindConfigPath, "utf-8");

    expect(existsSync(tailwindConfigPath)).toBe(true);
    expect(tailwindConfigContents).toContain('import type { Config } from "tailwindcss"');
    expect(tailwindConfigContents).toContain("content:");
    expect(tailwindConfigContents).toContain("./src/**/*");
    expect(tailwindConfigContents).toContain("theme:");
    expect(tailwindConfigContents).toContain("plugins:");
  });

  it("R4, R14: globals.css importa tailwindcss para bundling de utilidades", () => {
    const globalsCssPath = resolve(process.cwd(), "src/app/globals.css");
    const contents = readFileSync(globalsCssPath, "utf-8");

    expect(contents).toContain('@import "tailwindcss"');
  });

  it("R28, R40: dark mode está soportado vía variantes dark: en UI base", () => {
    const layoutPath = resolve(process.cwd(), "src/app/layout.tsx");
    const layoutContents = readFileSync(layoutPath, "utf-8");

    expect(layoutContents).toContain("dark:bg-");
    expect(layoutContents).toContain("dark:text-");
  });
});
