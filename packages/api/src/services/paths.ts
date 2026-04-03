import fs from "fs";
import path from "path";

let packageRootCache: string | null = null;

function findPackageRoot(startDir: string): string {
  let current = startDir;

  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    const dbPath = path.join(current, "db");

    if (fs.existsSync(packageJsonPath) && fs.existsSync(dbPath)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`No se pudo resolver la raiz de packages/api desde ${startDir}`);
    }

    current = parent;
  }
}

export function getPackageRoot(): string {
  if (!packageRootCache) {
    packageRootCache = findPackageRoot(__dirname);
  }

  return packageRootCache;
}

export function getDbRoot(): string {
  return path.join(getPackageRoot(), "db");
}

export function getAssetsRoot(): string {
  return path.join(getPackageRoot(), "assets");
}

export function getImagesRoot(): string {
  return path.join(getAssetsRoot(), "images");
}

export function ensureApiDirectories(): void {
  for (const dir of [getAssetsRoot(), getImagesRoot(), getDbRoot()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
