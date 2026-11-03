#!/usr/bin/env node
// PostToolUse (Edit|Write): format the touched file with Biome. Never fails the tool call.
import { spawnSync } from "node:child_process";

const input = JSON.parse(await readStdin());
const filePath = input.tool_input?.file_path ?? "";

if (/\.(ts|tsx|js|jsx|json|css)$/.test(filePath)) {
  spawnSync("pnpm", ["biome", "check", "--write", filePath], {
    cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    stdio: "ignore",
    shell: process.platform === "win32",
    timeout: 15_000,
  });
}

process.exit(0);

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}
