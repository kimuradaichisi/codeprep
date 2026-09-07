// scripts/claude-haiku.ts
import { spawn } from "child_process";
var DEFAULT_HAIKU_MODEL = "claude-haiku-4-5-20251001";
function resolveHaikuModel(env = process.env) {
  return env.CODEPREP_CLAUDE_HAIKU_MODEL || DEFAULT_HAIKU_MODEL;
}
function buildClaudeArgs(userArgs = [], env = process.env) {
  const model = resolveHaikuModel(env);
  return ["--model", model, ...userArgs];
}
function runClaudeHaiku(args = process.argv.slice(2), env = process.env) {
  const fullArgs = buildClaudeArgs(args, env);
  const isWin = process.platform === "win32";
  const cmd = isWin ? "claude.cmd" : "claude";
  const child = spawn(cmd, fullArgs, {
    stdio: "inherit",
    shell: isWin,
    env
  });
  child.on("error", (err) => {
    if (err.code === "ENOENT") {
      console.error('\n[Error] "claude" CLI was not found in your PATH.');
      console.error("Please install Claude Code CLI (e.g. `npm install -g @anthropic-ai/claude-code`) or ensure it is in your system PATH.\n");
    } else {
      console.error("[Error] Failed to launch Claude Code:", err.message);
    }
    process.exit(1);
  });
  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
  return child;
}
if (process.argv[1] && (process.argv[1].endsWith("claude-haiku.ts") || process.argv[1].endsWith("claude-haiku.mjs"))) {
  runClaudeHaiku();
}
export {
  DEFAULT_HAIKU_MODEL,
  buildClaudeArgs,
  resolveHaikuModel,
  runClaudeHaiku
};
