import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "pnpm.cmd" : "pnpm";

const child = spawn(command, ["exec", "next", "build"], {
  stdio: "inherit",
  shell: isWindows,
  env: {
    ...process.env,
    ANALYZE: "true",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
