import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { tokenImageURI } from "@/lib/contracts/ethblox-contracts"
import type { Build } from "@/lib/types"

const IPFS_API_TOKEN = process.env.PINATA_JWT || process.env.LIGHTHOUSE_API_KEY
const IPFS_UPLOAD_URL =
  process.env.IPFS_UPLOAD_URL ||
  process.env.LIGHTHOUSE_UPLOAD_URL ||
  "https://api.pinata.cloud/pinning/pinFileToIPFS"
const IPFS_GATEWAY_BASE = process.env.PINATA_GATEWAY_BASE || "https://gateway.pinata.cloud/ipfs"
const IPFS_UPLOAD_TIMEOUT_MS = Number(process.env.IPFS_UPLOAD_TIMEOUT_MS || "25000")
const IPFS_UPLOAD_RETRIES = Number(process.env.IPFS_UPLOAD_RETRIES || "4")
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

async function uploadWithRetry(formDataFactory: () => FormData) {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= IPFS_UPLOAD_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), IPFS_UPLOAD_TIMEOUT_MS)
    try {
      const uploadRes = await fetch(IPFS_UPLOAD_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${IPFS_API_TOKEN}`,
        },
        body: formDataFactory(),
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        lastError = new Error(`IPFS upload failed: ${uploadRes.status} ${errText}`)
      } else {
        return uploadRes
      }
    } catch (err: any) {
      clearTimeout(timer)
      lastError = err instanceof Error ? err : new Error(String(err))
    }
    if (attempt < IPFS_UPLOAD_RETRIES) {
      await new Promise((r) => setTimeout(r, 700 * attempt))
    }
  }
  throw lastError || new Error("IPFS upload failed")
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
  return NextResponse.json({ metadata, hasApiKey: !!IPFS_API_TOKEN })
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

  if (!IPFS_API_TOKEN) {
    return NextResponse.json(
      { error: "PINATA_JWT not configured (or LIGHTHOUSE_API_KEY fallback)." },
      { status: 500 }
    )
  }

  const metadata = await buildMetadataForToken(tokenId)
  if (!metadata) {
    return NextResponse.json({ error: "No app data found for token" }, { status: 404 })
  }

  try {
    // Upload metadata JSON via Pinata (or fallback-compatible endpoint)
    const metadataJson = JSON.stringify(metadata)
    const fileName = `${tokenId}.json`

    const uploadRes = await uploadWithRetry(() => {
      const formData = new FormData()
      const blob = new Blob([metadataJson], { type: "application/json" })
      formData.append("file", blob, fileName)
      return formData
    })

    const uploadData = await uploadRes.json()
    const cid = uploadData.IpfsHash || uploadData.Hash
    if (!cid) {
      return NextResponse.json(
        { error: `IPFS upload response missing CID: ${JSON.stringify(uploadData)}` },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      tokenId,
      cid,
      gatewayUrl: `${IPFS_GATEWAY_BASE}/${cid}`,
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
        : `BASEBLOX ${kindLabel} #${tokenId}`

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
    description: `BASEBLOX ${kindLabel} - ${w}x${d} density ${density}`,
    image: tokenImageURI(tokenId),
    animation_url: `${appBaseUrl}/viewer/${tokenId}`,
    external_url: `${appBaseUrl}/explore/${tokenId}`,
    attributes,
  }
}
