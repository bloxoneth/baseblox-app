import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { validateBrickParams, computeSpecKey, VALID_DENSITIES } from "@/lib/brickSpec"
import { normalizeBrickKey } from "@/data/bricks"
import { rk } from "@/lib/redis-keys"
import type { Build } from "@/lib/types"

// POST /api/builds/mint - Save full build data + mint info to Redis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { tokenId, buildHash, txHash, walletAddress } = body
    if (!tokenId || !buildHash || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: tokenId, buildHash, walletAddress" },
        { status: 400 },
      )
    }

    const rawBricks = body.bricks || []
    const kind = body.kind ?? 0
    const brickW = body.brickWidth ?? body.baseWidth ?? 1
    const brickD = body.brickDepth ?? body.baseDepth ?? 1
    const density = body.density
    const area = Number(brickW) * Number(brickD)
    let canonicalComponentBuildIds = Array.isArray(body.componentBuildIds) ? body.componentBuildIds : []
    let canonicalComponentCounts = Array.isArray(body.componentCounts) ? body.componentCounts : []
    let canonicalComposition = body.composition

    // ── Kind 0 (Brick) validation ──
    if (kind === 0) {
      // Density is REQUIRED for bricks - never default to 1
      if (density === undefined || density === null) {
        return NextResponse.json(
          { error: "density is required for brick mints (kind=0). Must be one of: " + VALID_DENSITIES.join(", ") },
          { status: 400 },
        )
      }

      const validationError = validateBrickParams(brickW, brickD, density)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      // Duplicate check: has this spec already been minted?
      const specKey = computeSpecKey(brickW, brickD, density)
      const brickKey = normalizeBrickKey(brickW, brickD, density)
      const existingTokenId = await redis.get(rk(`brick:spec:${brickKey}`))
      if (existingTokenId && String(existingTokenId) !== String(tokenId)) {
        return NextResponse.json(
          { error: `Brick ${brickKey} already minted as token #${existingTokenId}`, specKey },
          { status: 409 },
        )
      }

      // Component model for kind=0:
      // - 1x1 is primitive (no components)
      // - Any larger rectangle must be composed from the matching 1x1 density token.
      if (area === 1) {
        canonicalComponentBuildIds = []
        canonicalComponentCounts = []
        canonicalComposition = {}
      } else {
        const baseBrickKey = normalizeBrickKey(1, 1, density)
        const baseTokenId = await redis.get<string>(rk(`brick:spec:${baseBrickKey}`))
        if (!baseTokenId) {
          return NextResponse.json(
            { error: `Missing base component ${baseBrickKey}. Mint 1x1 first for this density.` },
            { status: 409 },
          )
        }

        const incomingIds = (Array.isArray(body.componentBuildIds) ? body.componentBuildIds : []).map(String)
        const incomingCounts = (Array.isArray(body.componentCounts) ? body.componentCounts : []).map((n) => Number(n))
        const expectedCount = Number(area)

        if (
          incomingIds.length !== 1 ||
          incomingCounts.length !== 1 ||
          String(incomingIds[0]) !== String(baseTokenId) ||
          incomingCounts[0] !== expectedCount
        ) {
          return NextResponse.json(
            {
              error: "Invalid brick components for kind=0 rectangle. Expected area x 1x1 of same density.",
              expected: {
                componentBuildIds: [String(baseTokenId)],
                componentCounts: [expectedCount],
                baseSpec: baseBrickKey,
              },
            },
            { status: 400 },
          )
        }

        canonicalComponentBuildIds = [String(baseTokenId)]
        canonicalComponentCounts = [expectedCount]
        canonicalComposition = {
          [String(baseTokenId)]: {
            count: expectedCount,
            name: baseBrickKey,
          },
        }
      }
    }

    let bricks: any[]
    let baseWidth: number
    let baseDepth: number

    if (kind === 0 && brickW && brickD) {
      // Kind 0: canonical single brick at origin
      const defaultColor = rawBricks[0]?.color ?? "#e8d44d"
      bricks = [{
        id: "1",
        position: [0, 0.5, 0],
        color: defaultColor,
        width: brickW,
        depth: brickD,
      }]
      baseWidth = brickW
      baseDepth = brickD
    } else {
      // Kind 1+: preserve full composite geometry as-is
      bricks = rawBricks
      baseWidth = body.baseWidth ?? 16
      baseDepth = body.baseDepth ?? 16
    }

    const mass = body.mass ?? (kind === 0 ? brickW * brickD * density : bricks.length)
    const uniqueColors = body.colors ?? new Set(bricks.map((b: any) => b.color)).size
    const bw_score = body.bw_score ?? parseFloat((Math.log(1 + mass) * Math.log(2 + uniqueColors)).toFixed(2))

    const uniqueBuildId = `${tokenId}_${Date.now()}_${buildHash.slice(0, 8)}`

    const mintedBuild: Build = {
      // Identity
      id: uniqueBuildId,
      name: body.buildName || "Untitled Build",
      creator: walletAddress.toLowerCase(),

      // Canonical geometry
      bricks,
      baseWidth,
      baseDepth,

      // Scores
      mass,
      colors: uniqueColors,
      bw_score,

      // Chain data
      tokenId,
      buildHash,
      txHash,
      mintedAt: new Date().toISOString(),

      // Build type info
      kind: body.kind,
      density: body.density,
      brickWidth: body.brickWidth,
      brickDepth: body.brickDepth,

      // Composition (which NFTs are used inside this build)
      composition: canonicalComposition,

      // Contract params (useful for verification / IPFS)
      geometryHash: body.geometryHash,
      specKey: body.specKey,
      componentBuildIds: canonicalComponentBuildIds,
      componentCounts: canonicalComponentCounts,

      // Metadata
      metadata: body.metadata,

      // Timestamps
      created: new Date().toISOString(),
      timestamp: Date.now(),
    }

    // Save full build data
    await redis.set(rk(`build:${mintedBuild.id}`), mintedBuild)

    // Reverse lookups
    await redis.set(rk(`token:${tokenId}`), mintedBuild.id)
    await redis.set(rk(`hash:${buildHash}`), mintedBuild.id)

    // Brick spec reverse index (for duplicate detection)
    if (kind === 0) {
      const brickKey = normalizeBrickKey(brickW, brickD, density ?? 1)
      await redis.set(rk(`brick:spec:${brickKey}`), tokenId)
    }

    // Add to global minted set
    await redis.sadd(rk("minted_tokens"), tokenId)

    return NextResponse.json({ success: true, build: mintedBuild })
  } catch (error) {
    console.error("Error saving mint data:", error)
    return NextResponse.json({ error: "Failed to save mint data" }, { status: 500 })
  }
}
