import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { rk } from "@/lib/redis-keys"

// POST /api/builds/burn - Remove burned NFT from minted set
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenId } = body

    if (!tokenId) {
      return NextResponse.json({ error: "Missing tokenId" }, { status: 400 })
    }

    console.log("[v0] Removing burned token", tokenId, "from minted_tokens set")

    // Remove from minted tokens set
    await redis.srem(rk("minted_tokens"), tokenId)

    console.log("[v0] Successfully removed token", tokenId, "from gallery")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error removing burned token:", error)
    return NextResponse.json({ error: "Failed to remove burned token" }, { status: 500 })
  }
}
