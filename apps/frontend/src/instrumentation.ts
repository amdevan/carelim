/*
 * Next.js instrumentation hook — runs once when the server boots.
 * Fallback schema-sync: guarantees the database is synced even when the
 * container's start command bypasses docker-entrypoint.sh (e.g. platform
 * "Start Command" overrides). Skipped when the entrypoint already ran it.
 *
 * NOTE: uses CommonJS require (not `import "node:fs"`) — the webpack build
 * does not handle "node:" scheme imports here.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SCHEMA_SYNC_DONE === "1") return;
  if (process.env.DISABLE_SCHEMA_SYNC === "1") return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { existsSync } = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const script = path.join(process.cwd(), "scripts", "schema-sync.js");
    if (!existsSync(script)) return;

    console.log("[instrumentation] Running database schema sync...");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { spawnSync } = require("child_process") as typeof import("child_process");
    const res = spawnSync(process.execPath, [script], {
      stdio: "inherit",
      env: { ...process.env, SCHEMA_SYNC_DONE: "1" },
    });
    if (res.status !== 0) {
      console.error("[instrumentation] Schema sync exited with code", res.status);
    }
  } catch (e) {
    // Never block server startup on sync failure
    console.error("[instrumentation] Schema sync failed:", (e as Error)?.message || e);
  }
}
