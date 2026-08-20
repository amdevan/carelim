/**
 * Environment variable validation.
 * Call validateEnv() at application startup to ensure all required variables are set.
 */

const requiredEnvVars = [
  "DATABASE_URL",
] as const;

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      `Please set them in your .env file or environment.`
    );
  }

  // Warn about insecure defaults
  if (
    process.env.NEXTAUTH_SECRET === "medcore-secret-key-change-in-production" &&
    process.env.NODE_ENV === "production"
  ) {
    console.warn(
      "WARNING: NEXTAUTH_SECRET is using the default value. Please change it in production!"
    );
  }

  if (!process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
    throw new Error(
      "Either JWT_SECRET or NEXTAUTH_SECRET must be set for authentication to work."
    );
  }
}
