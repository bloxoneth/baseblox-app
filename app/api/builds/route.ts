import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { rk, rpat } from "@/lib/redis-keys"
import type { Build } from "@/lib/types"

// GET /api/builds - List all public builds or user's builds
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet")

    const keys = await redis.keys(rpat("build:*"))

    if (keys.length === 0) {
      return NextResponse.json([])
    }

    const builds = await redis.mget<Build[]>(...keys)
    let validBuilds = builds.filter((b): b is Build => b !== null)

    if (walletAddress) {
      validBuilds = validBuilds.filter((b) => b.creator?.toLowerCase() === walletAddress.toLowerCase())
    }

    // Sort by creation date, newest first
    validBuilds.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

    return NextResponse.json(validBuilds)
  } catch (error) {
    console.error("[v0] Error fetching builds:", error)
    return NextResponse.json({ error: "Failed to fetch builds" }, { status: 500 })
  }
}

// POST /api/builds - Save a new build
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const walletAddress = body.walletAddress || body.creator

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 401 })
    }

    // Accept new structure with metadata and blox
    if (body.metadata && body.blox) {
      const { metadata, blox, buildHash } = body

      // Validate build data
      if (!metadata?.id || !metadata?.name || !blox || !Array.isArray(blox)) {
        return NextResponse.json({ error: "Invalid build data structure" }, { status: 400 })
      }

      // Convert blox back to bricks format for storage
      const bricks = blox.map((b: any) => ({
        color: b.color,
        position: [b.x, b.y, b.z],
        width: 1, // Default width
        depth: 1, // Default depth
      }))

      const build: Build = {
        id: metadata.id,
        name: metadata.name,
        creator: walletAddress.toLowerCase(), // Store wallet address as creator
        bricks,
        mass: metadata.mass,
        colors: metadata.uniqueColors,
        bw_score: Number.parseFloat(metadata.bw.toFixed(2)),
        created: metadata.createdAt,
        buildHash: buildHash,
      }

      // Store in Upstash Redis
      await redis.set(rk(`build:${build.id}`), build)

      if (buildHash) {
        await redis.set(rk(`hash:${buildHash}`), build.id)
      }

      // Add to public gallery index (sorted by timestamp)
      const timestamp = new Date(build.created).getTime()
      await redis.zadd(rk("builds:public"), { score: timestamp, member: build.id })

      return NextResponse.json({ success: true, buildId: build.id, buildHash }, { status: 201 })
    }

    // Legacy format support (for backward compatibility)
    const { name, bricks } = body

    if (!name || !bricks || !Array.isArray(bricks)) {
      return NextResponse.json({ error: "Missing required fields: name, bricks" }, { status: 400 })
    }

    // Calculate metadata
    const mass = bricks.length
    const uniqueColors = new Set(bricks.map((b: any) => b.color)).size

    // Calculate BW score using BASEBLOX formula: BW = log(1 + mass) × log(2 + colors)
    const bw_score = Math.log(1 + mass) * Math.log(2 + uniqueColors)

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const build: Build = {
      id,
      name,
      creator: walletAddress.toLowerCase(), // Use wallet address as creator
      bricks,
      mass,
      colors: uniqueColors,
      bw_score: Number.parseFloat(bw_score.toFixed(2)),
      created: new Date().toISOString(),
    }

    // Save to Redis with 30 day expiration
    await redis.set(rk(`build:${id}`), build, { ex: 60 * 60 * 24 * 30 })

    return NextResponse.json({ success: true, build }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error saving build:", error)
    return NextResponse.json({ error: "Failed to save build" }, { status: 500 })
  }
}
