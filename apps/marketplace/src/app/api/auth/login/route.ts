import { NextResponse } from "next/server"
import { signToken, verifyCredentials } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const user = verifyCredentials(email, password)

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = signToken(user)
    const res = NextResponse.json({ user, token })
    res.cookies.set("cms-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    })
    return res
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
