#!/usr/bin/env node
// PreToolUse (Bash): block a short list of destructive commands unless the user approves.
const input = JSON.parse(await readStdin());
const command = input.tool_input?.command ?? "";

const blockers = [
  { re: /\brm\s+-rf\s+\/(?!\S)/, reason: "rm -rf / would wipe the filesystem." },
  { re: /\bgit\s+push\s+(--force|-f)\b/, reason: "Force push can overwrite remote history." },
  { re: /\bgit\s+reset\s+--hard\b/, reason: "git reset --hard discards uncommitted work." },
  {
    re: /\bdocker\s+compose\s+down\s+(.*\s)?-v\b/,
    reason: "docker compose down -v deletes the Postgres volume (all local data).",
  },
];

for (const { re, reason } of blockers) {
  if (re.test(command)) {
    console.error(`Blocked: ${reason} Ask the user to run it directly if it's really intended.`);
    process.exit(2);
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}
