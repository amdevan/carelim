import crypto from "crypto"

const SECRET = process.env.CMS_SECRET || "carelim-cms-secret-change-in-production"
const TOKEN_MAX_AGE = 60 * 60 * 24 // 24 hours

export interface CMSUser {
  email: string
  name: string
}

export function signToken(user: CMSUser): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({ ...user, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE })
  ).toString("base64url")
  const signature = crypto.createHmac("sha256", SECRET).update(`${header}.${payload}`).digest("base64url")
  return `${header}.${payload}.${signature}`
}

export function verifyToken(token: string): CMSUser | null {
  try {
    const [header, payload, signature] = token.split(".")
    const expected = crypto.createHmac("sha256", SECRET).update(`${header}.${payload}`).digest("base64url")
    if (signature !== expected) return null

    const data = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null

    return { email: data.email, name: data.name }
  } catch {
    return null
  }
}

export function verifyCredentials(email: string, password: string): CMSUser | null {
  const adminEmail = process.env.CMS_EMAIL || "admin@carelim.com"
  const adminPassword = process.env.CMS_PASSWORD || "carelim2026"

  if (email === adminEmail && password === adminPassword) {
    return { email: adminEmail, name: "Admin" }
  }
  return null
}
