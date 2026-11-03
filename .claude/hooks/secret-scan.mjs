#!/usr/bin/env node
// PreToolUse (Edit|Write): block content that looks like a private key, API token, or a real password/secret literal.
const input = JSON.parse(await readStdin());
const toolInput = input.tool_input ?? {};
const filePath = (toolInput.file_path ?? "").replace(/\\/g, "/");

if (filePath.endsWith(".env.example")) {
  process.exit(0);
}

const content = [toolInput.content, toolInput.new_string].filter(Boolean).join("\n");

const patterns = [
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: "private key header" },
  { re: /\bsk-[a-zA-Z0-9]{16,}\b/, label: "sk- style secret token" },
  { re: /\bghp_[a-zA-Z0-9]{20,}\b/, label: "GitHub personal access token" },
  { re: /\bAKIA[0-9A-Z]{12,}\b/, label: "AWS access key" },
  {
    re: /\b(password|secret|api[_-]?key)\s*[:=]\s*["'`](?!replace-with|placeholder|<|CHANGE_ME|your-|xxx|test-)[^"'`]{8,}["'`]/i,
    label: "hard-coded password/secret literal",
  },
];

for (const { re, label } of patterns) {
  if (re.test(content)) {
    console.error(
      `Refusing to write content matching a ${label}. Use .env / .env.example placeholders instead.`,
    );
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
