import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { rk, rpat } from "@/lib/redis-keys"
import type { Build } from "@/lib/types"

export async function GET(request: NextRequest, context: { params: Promise<{ tokenId: string }> }) {
  try {
    const { tokenId } = await context.params

    console.log("[v0] [TOKEN API] Fetching build data for token ID:", tokenId)

    // First, try the new lookup: token:{tokenId} -> buildId
    let buildId = await redis.get<string>(rk(`token:${tokenId}`))

    if (!buildId) {
      console.log("[v0] [TOKEN API] Token lookup failed, trying alt format")
      buildId = await redis.get<string>(rk(`build:token:${tokenId}`))
    }

    if (buildId) {
      console.log("[v0] [TOKEN API] Found buildId via token lookup:", buildId)
      const buildData = await redis.get<Build>(rk(`build:${buildId}`))

      if (buildData) {
        console.log("[v0] [TOKEN API] Raw build data found, checking bricks...")
        console.log("[v0] [TOKEN API] Bricks type:", typeof buildData.bricks, "Array?", Array.isArray(buildData.bricks))

        let bricks = buildData.bricks
        if (typeof bricks === "string") {
          try {
            console.log("[v0] [TOKEN API] Parsing bricks from JSON string")
            bricks = JSON.parse(bricks)
            console.log("[v0] [TOKEN API] After parsing, got", bricks.length, "bricks")
          } catch (e) {
            console.error("[v0] [TOKEN API] Failed to parse bricks JSON:", e)
            bricks = []
          }
        } else if (!Array.isArray(bricks)) {
          console.warn("[v0] [TOKEN API] Bricks is not an array, type:", typeof bricks)
          bricks = []
        }

        console.log("[v0] [TOKEN API] Returning build data with", bricks.length, "bricks (parsed)")
        return NextResponse.json({ ...buildData, bricks, tokenId: Number.parseInt(tokenId), buildId })
      }
    }

    console.log("[v0] [TOKEN API] Scanning all build keys for tokenId match")
    const allKeys = await redis.keys(rpat("build:*"))
    console.log("[v0] [TOKEN API] Found", allKeys.length, "build keys")

    for (const key of allKeys) {
      // Skip lookup keys
      if (key.startsWith(rk("build:token:")) || key.startsWith(rk("build:hash:"))) continue

      const data = await redis.get<Build>(key)
      if (data && typeof data === "object") {
        // Check if this build has the matching tokenId
        if (String(data.tokenId) === String(tokenId)) {
          console.log("[v0] [TOKEN API] Found build via scan:", key, "with tokenId:", data.tokenId)

          let bricks = data.bricks
          if (typeof bricks === "string") {
            try {
              bricks = JSON.parse(bricks)
              console.log("[v0] [TOKEN API] Parsed", bricks.length, "bricks from scan")
            } catch (e) {
              console.error("[v0] [TOKEN API] Failed to parse bricks from scan:", e)
              bricks = []
            }
          } else if (!Array.isArray(bricks)) {
            bricks = []
          }

          return NextResponse.json({
            ...data,
            bricks,
            tokenId: Number.parseInt(tokenId),
            buildId: key.replace(rk("build:"), ""),
          })
        }
      }
    }

    console.error("[v0] [TOKEN API] No build found for token ID:", tokenId)
    return NextResponse.json({ error: "Build not found for this token ID" }, { status: 404 })
  } catch (error) {
    console.error("[v0] [TOKEN API] Error fetching build by token ID:", error)
    return NextResponse.json({ error: "Failed to fetch build" }, { status: 500 })
  }
}
