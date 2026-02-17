import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { tokenImageURI } from "@/lib/contracts/ethblox-contracts"
import type { Build } from "@/lib/types"

const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY
const ADMIN_TOKEN = process.env.ADMIN_RESET_TOKEN

function authorize(request: NextRequest): string | null {
  if (!ADMIN_TOKEN) return "ADMIN_RESET_TOKEN not configured"

  const authHeader = request.headers.get("authorization") || ""
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  const token = bearer || request.headers.get("x-admin-token") || ""

  if (!token) return "Missing admin token"
  if (token !== ADMIN_TOKEN) return "Invalid admin token"
  return null
}

// GET - Preview the metadata that would be pushed
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  const authError = authorize(request)
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError.includes("configured") ? 500 : 401 })
  }

  const { tokenId } = await context.params
  const metadata = await buildMetadataForToken(tokenId)
  if (!metadata) {
    return NextResponse.json({ error: "No app data found for token" }, { status: 404 })
  }
  return NextResponse.json({ metadata, hasApiKey: !!LIGHTHOUSE_API_KEY })
}

// POST - Push metadata JSON to IPFS via Lighthouse
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  const authError = authorize(request)
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError.includes("configured") ? 500 : 401 })
  }

  const { tokenId } = await context.params

  if (!LIGHTHOUSE_API_KEY) {
    return NextResponse.json(
      { error: "LIGHTHOUSE_API_KEY not configured. Set it in environment variables." },
      { status: 500 }
    )
  }

  const metadata = await buildMetadataForToken(tokenId)
  if (!metadata) {
    return NextResponse.json({ error: "No app data found for token" }, { status: 404 })
  }

  try {
    // Upload metadata JSON via Lighthouse text upload API
    const metadataJson = JSON.stringify(metadata)
    const fileName = `${tokenId}.json`

    const formData = new FormData()
    const blob = new Blob([metadataJson], { type: "application/json" })
    formData.append("file", blob, fileName)

    const uploadRes = await fetch("https://node.lighthouse.storage/api/v0/add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LIGHTHOUSE_API_KEY}`,
      },
      body: formData,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      return NextResponse.json(
        { error: `Lighthouse upload failed: ${uploadRes.status} ${errText}` },
        { status: 502 }
      )
    }

    const uploadData = await uploadRes.json()
    const cid = uploadData.Hash

    return NextResponse.json({
      success: true,
      tokenId,
      cid,
      gatewayUrl: `https://gateway.lighthouse.storage/ipfs/${cid}`,
      metadata,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `IPFS push failed: ${err.message}` },
      { status: 500 }
    )
  }
}

// Build ERC-721 compliant metadata from Redis app data
async function buildMetadataForToken(tokenId: string) {
  // Fetch build data from Redis
  const buildId = await redis.get<string>(`token:${tokenId}`)
  if (!buildId) return null

  const build = await redis.get<Build>(`build:${buildId}`)
  if (!build) return null

  const kind = build.kind ?? 0
  const kindLabel = kind === 0 ? "Brick" : kind === 2 ? "Collectors Edition" : "Build"
  const w = build.brickWidth ?? build.baseWidth ?? 1
  const d = build.brickDepth ?? build.baseDepth ?? 1
  const density = build.density ?? 1
  const mass = build.mass ?? (w * d * density)
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || "https://ethblox.art").replace(/\/+$/, "")
  const normalizedName =
    build.name && String(build.name).trim().length > 0
      ? String(build.name).trim()
      : kind === 0
        ? `Brick ${Math.min(w, d)}x${Math.max(w, d)} D${density}`
        : `ETHBLOX ${kindLabel} #${tokenId}`

  // Build attributes array
  const attributes: { trait_type: string; value: string | number }[] = [
    { trait_type: "kind", value: kindLabel },
    { trait_type: "kindId", value: kind },
    { trait_type: "mass", value: mass },
    { trait_type: "density", value: density },
  ]

  if (build.geometryHash) {
    attributes.push({ trait_type: "geometryHash", value: build.geometryHash })
  }
  if (build.specKey) {
    attributes.push({ trait_type: "specKey", value: build.specKey })
  }
  if (build.bw_score) {
    attributes.push({ trait_type: "bw_score", value: build.bw_score })
  }
  if (w && d) {
    attributes.push({ trait_type: "width", value: w })
    attributes.push({ trait_type: "depth", value: d })
  }

  // Component provenance
  const componentIds: number[] = []
  const componentCounts: number[] = []
  if (build.composition && typeof build.composition === "object") {
    for (const [tid, info] of Object.entries(build.composition)) {
      componentIds.push(Number(tid))
      componentCounts.push((info as any).count ?? 1)
    }
  }
  if (componentIds.length > 0) {
    attributes.push({ trait_type: "componentBuildIds", value: componentIds.join(",") })
    attributes.push({ trait_type: "componentCounts", value: componentCounts.join(",") })
  }

  return {
    name: normalizedName,
    description: `ETHBLOX ${kindLabel} - ${w}x${d} density ${density}`,
    image: tokenImageURI(tokenId),
    animation_url: `${appBaseUrl}/viewer/${tokenId}`,
    external_url: `${appBaseUrl}/explore/${tokenId}`,
    attributes,
  }
}
