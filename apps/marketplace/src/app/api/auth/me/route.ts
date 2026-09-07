import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(/cms-token=([^;]+)/)?.[1]
  if (!token) return NextResponse.json({ user: null }, { status: 401 })

  const user = verifyToken(token)
  if (!user) return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({ user })
}
