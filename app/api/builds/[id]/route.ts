import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import type { Build } from "@/lib/types"

// GET /api/builds/:id - Get a specific build
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { id } = params
    const build = await redis.get<Build>(`build:${id}`)

    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 })
    }

    return NextResponse.json(build)
  } catch (error) {
    console.error("[v0] Error fetching build:", error)
    return NextResponse.json({ error: "Failed to fetch build" }, { status: 500 })
  }
}

// DELETE /api/builds/:id - Delete a build
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { id } = params
    await redis.del(`build:${id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting build:", error)
    return NextResponse.json({ error: "Failed to delete build" }, { status: 500 })
  }
}
