/**
 * Environment variable validation.
 * Call validateEnv() at application startup to ensure all required variables are set.
 */

const requiredEnvVars = [
  "DATABASE_URL",
] as const;

export function validateEnv(): void {
  // Only validate at runtime, not during build
  if (process.env.NEXT_RUNTIME === "browser") return;

  const missing: string[] = [];
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(`[Carelim] Missing env vars: ${missing.join(", ")}`);
  }
}
