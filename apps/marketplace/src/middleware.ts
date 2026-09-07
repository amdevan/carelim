import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED = ["/cms"]

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some((p) => path.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get("cms-token")?.value
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", path)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/cms", "/cms/:path*"],
}
