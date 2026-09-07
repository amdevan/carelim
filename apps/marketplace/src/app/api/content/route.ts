import { NextResponse } from "next/server"
import { getContent, updateContent } from "@/lib/content"

export async function GET() {
  return NextResponse.json(getContent())
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const updated = updateContent(body)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 })
  }
}
