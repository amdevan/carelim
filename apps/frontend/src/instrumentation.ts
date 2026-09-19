/*
 * Next.js instrumentation hook — runs once when the server boots.
 * Fallback schema-sync: guarantees the database is synced even when the
 * container's start command bypasses docker-entrypoint.sh (e.g. platform
 * "Start Command" overrides). Skipped when the entrypoint already ran it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SCHEMA_SYNC_DONE === "1") return;
  if (process.env.DISABLE_SCHEMA_SYNC === "1") return;

  try {
    const { existsSync } = await import("node:fs");
    const path = await import("node:path");
    const script = path.join(process.cwd(), "scripts", "schema-sync.js");
    if (!existsSync(script)) return;

    console.log("[instrumentation] Running database schema sync...");
    const { spawnSync } = await import("node:child_process");
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
