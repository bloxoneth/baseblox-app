import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { redis } from "@/lib/redis"
import { validateBrickParams, computeSpecKey, VALID_DENSITIES } from "@/lib/brickSpec"
import { normalizeBrickKey } from "@/data/bricks"
import { rk } from "@/lib/redis-keys"
import type { Build } from "@/lib/types"
import { tokenImageURI } from "@/lib/contracts/ethblox-contracts"
import { CONTRACTS, RPC_URL } from "@/lib/contracts/ethblox-contracts"

const IPFS_API_TOKEN = process.env.PINATA_JWT || process.env.LIGHTHOUSE_API_KEY
const IPFS_UPLOAD_URL =
  process.env.IPFS_UPLOAD_URL ||
  process.env.LIGHTHOUSE_UPLOAD_URL ||
  "https://api.pinata.cloud/pinning/pinFileToIPFS"
const IPFS_GATEWAY_BASE = process.env.PINATA_GATEWAY_BASE || "https://gateway.pinata.cloud/ipfs"
const IPFS_UPLOAD_TIMEOUT_MS = Number(process.env.IPFS_UPLOAD_TIMEOUT_MS || "25000")
const IPFS_UPLOAD_RETRIES = Number(process.env.IPFS_UPLOAD_RETRIES || "4")
const AUTO_IPFS_PUSH_ON_MINT = process.env.AUTO_IPFS_PUSH_ON_MINT === "1"
const AUTO_SET_BASE_TOKEN_URI_ON_MINT = process.env.AUTO_SET_BASE_TOKEN_URI_ON_MINT === "1"
const BASE_TOKEN_URI_TARGET = process.env.BASE_TOKEN_URI_TARGET || process.env.NEXT_PUBLIC_BASE_METADATA_URI || ""
const BASE_TOKEN_URI_OWNER_KEY = process.env.BASE_TOKEN_URI_OWNER_KEY || process.env.PRIVATE_KEY || ""

const CHAIN_READ_ABI = [
  "function nextTokenId() view returns (uint256)",
  "function exists(uint256 tokenId) view returns (bool)",
  "function kindOf(uint256 tokenId) view returns (uint8)",
  "function brickSpecOf(uint256 tokenId) view returns (uint8 width, uint8 depth, uint16 density)",
]

async function findBaseBrickTokenOnChain(targetDensity: number): Promise<string | null> {
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, CHAIN_READ_ABI, provider)
  const nextTokenId = Number(await contract.nextTokenId())
  for (let tokenId = 1; tokenId < nextTokenId; tokenId++) {
    try {
      const exists = Boolean(await contract.exists(BigInt(tokenId)))
      if (!exists) continue
      const kind = Number(await contract.kindOf(BigInt(tokenId)))
      if (kind !== 0) continue
      const [w, d, den] = await contract.brickSpecOf(BigInt(tokenId))
      if (Number(w) === 1 && Number(d) === 1 && Number(den) === Number(targetDensity)) {
        return String(tokenId)
      }
    } catch {
      // Ignore gaps/reverts and continue scan.
    }
  }
  return null
}

async function uploadToIpfsWithRetry(formDataFactory: () => FormData) {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= IPFS_UPLOAD_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), IPFS_UPLOAD_TIMEOUT_MS)
    try {
      const res = await fetch(IPFS_UPLOAD_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${IPFS_API_TOKEN}`,
        },
        body: formDataFactory(),
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) return res
      const errText = await res.text()
      lastError = new Error(`IPFS upload failed: ${res.status} ${errText}`)
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
        let baseTokenId = await redis.get<string>(rk(`brick:spec:${baseBrickKey}`))

        const incomingIds = (Array.isArray(body.componentBuildIds) ? body.componentBuildIds : []).map(String)
        const incomingCounts = (Array.isArray(body.componentCounts) ? body.componentCounts : []).map((n) => Number(n))
        const expectedCount = Number(area)

        // Redis can lag or be empty in test resets. Accept the incoming base component
        // when it provably matches a 1x1 brick of the same density on-chain.
        if (!baseTokenId && incomingIds.length === 1 && incomingCounts.length === 1 && incomingCounts[0] === expectedCount) {
          try {
            const provider = new ethers.JsonRpcProvider(RPC_URL)
            const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, CHAIN_READ_ABI, provider)
            const candidateId = BigInt(incomingIds[0])
            const candidateKind = Number(await contract.kindOf(candidateId))
            const [cw, cd, cden] = await contract.brickSpecOf(candidateId)
            if (candidateKind === 0 && Number(cw) === 1 && Number(cd) === 1 && Number(cden) === Number(density)) {
              baseTokenId = incomingIds[0]
              // Heal Redis index for future requests.
              await redis.set(rk(`brick:spec:${baseBrickKey}`), String(baseTokenId))
            }
          } catch {
            // Keep validation path below for error reporting.
          }
        }

        // Final fallback: scan on-chain minted tokens for the canonical 1x1 at this density,
        // then heal Redis so subsequent requests are fast.
        if (!baseTokenId) {
          const discoveredBaseTokenId = await findBaseBrickTokenOnChain(Number(density))
          if (discoveredBaseTokenId) {
            baseTokenId = discoveredBaseTokenId
            await redis.set(rk(`brick:spec:${baseBrickKey}`), String(baseTokenId))
          }
        }

        if (!baseTokenId) {
          return NextResponse.json(
            {
              error: `Missing base component ${baseBrickKey}. Mint 1x1 first for this density.`,
              hint: "If this 1x1 already exists on-chain, import/backfill brick spec indexes into Redis.",
            },
            { status: 409 },
          )
        }

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

    const resolvedName =
      body.buildName && String(body.buildName).trim().length > 0
        ? String(body.buildName).trim()
        : kind === 0
          ? `Brick ${Math.min(brickW, brickD)}x${Math.max(brickW, brickD)} D${density ?? 1}`
          : "Untitled Build"

    const mintedBuild: Build = {
      // Identity
      id: uniqueBuildId,
      name: resolvedName,
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

    let ipfs: { cid: string; gatewayUrl: string } | null = null
    if (AUTO_IPFS_PUSH_ON_MINT && IPFS_API_TOKEN) {
      try {
        const metadata = buildMetadataFromBuild(mintedBuild)
        const metadataJson = JSON.stringify(metadata)
        const fileName = `${tokenId}.json`

        const uploadRes = await uploadToIpfsWithRetry(() => {
          const formData = new FormData()
          const blob = new Blob([metadataJson], { type: "application/json" })
          formData.append("file", blob, fileName)
          return formData
        })

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          const cid = uploadData.IpfsHash || uploadData.Hash
          if (cid) {
            ipfs = {
              cid,
              gatewayUrl: `${IPFS_GATEWAY_BASE}/${cid}`,
            }
          }
        } else {
          const errText = await uploadRes.text()
          console.warn(`AUTO_IPFS_PUSH_ON_MINT failed for token ${tokenId}: ${uploadRes.status} ${errText}`)
        }
      } catch (ipfsErr) {
        console.warn(`AUTO_IPFS_PUSH_ON_MINT exception for token ${tokenId}:`, ipfsErr)
      }
    }

    const uriCheck = await verifyAndOptionallyAlignTokenURI(String(tokenId))

    return NextResponse.json({ success: true, build: mintedBuild, ipfs, uriCheck })
  } catch (error) {
    console.error("Error saving mint data:", error)
    return NextResponse.json({ error: "Failed to save mint data" }, { status: 500 })
  }
}

function normalizeBaseUri(base: string) {
  const trimmed = String(base || "").trim()
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed
}

async function verifyAndOptionallyAlignTokenURI(tokenId: string) {
  const targetBase = normalizeBaseUri(BASE_TOKEN_URI_TARGET)
  if (!targetBase) {
    return {
      ok: false,
      reason: "BASE_TOKEN_URI_TARGET not configured",
    }
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const readAbi = [
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function owner() view returns (address)",
  ]
  const writeAbi = ["function setBaseTokenURI(string calldata newBase)"]

  try {
    const readContract = new ethers.Contract(CONTRACTS.BUILD_NFT, readAbi, provider)
    const expectedTokenURI = `${targetBase}/${tokenId}.json`
    const currentTokenURI = await readContract.tokenURI(BigInt(tokenId))
    const isAligned = String(currentTokenURI) === expectedTokenURI

    let ownerAddress = ""
    try {
      ownerAddress = String(await readContract.owner())
    } catch {
      // ignore owner check failures in diagnostics
    }

    const out: Record<string, unknown> = {
      ok: true,
      tokenId,
      expectedTokenURI,
      currentTokenURI,
      aligned: isAligned,
      buildNFT: CONTRACTS.BUILD_NFT,
      rpc: RPC_URL,
      autoSetEnabled: AUTO_SET_BASE_TOKEN_URI_ON_MINT,
    }

    if (!isAligned && AUTO_SET_BASE_TOKEN_URI_ON_MINT && BASE_TOKEN_URI_OWNER_KEY) {
      try {
        const signer = new ethers.Wallet(BASE_TOKEN_URI_OWNER_KEY, provider)
        if (!ownerAddress || signer.address.toLowerCase() !== ownerAddress.toLowerCase()) {
          out["autoSetAttempted"] = false
          out["autoSetReason"] = "owner key is not contract owner"
          out["contractOwner"] = ownerAddress || null
          out["ownerKeyAddress"] = signer.address
          return out
        }

        const writeContract = new ethers.Contract(CONTRACTS.BUILD_NFT, writeAbi, signer)
        const tx = await writeContract.setBaseTokenURI(targetBase)
        const rc = await tx.wait()
        const updatedTokenURI = await readContract.tokenURI(BigInt(tokenId))
        out["autoSetAttempted"] = true
        out["autoSetTxHash"] = tx.hash
        out["autoSetBlock"] = rc?.blockNumber ?? null
        out["updatedTokenURI"] = updatedTokenURI
        out["alignedAfterAutoSet"] = String(updatedTokenURI) === expectedTokenURI
      } catch (setErr: any) {
        out["autoSetAttempted"] = true
        out["autoSetError"] = setErr?.shortMessage || setErr?.message || "setBaseTokenURI failed"
      }
    }

    return out
  } catch (err: any) {
    return {
      ok: false,
      reason: err?.shortMessage || err?.message || "tokenURI check failed",
      buildNFT: CONTRACTS.BUILD_NFT,
      rpc: RPC_URL,
    }
  }
}

function buildMetadataFromBuild(build: Build) {
  const tokenId = String(build.tokenId)
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

  const attributes: { trait_type: string; value: string | number }[] = [
    { trait_type: "kind", value: kindLabel },
    { trait_type: "kindId", value: kind },
    { trait_type: "mass", value: mass },
    { trait_type: "density", value: density },
  ]

  if (build.geometryHash) attributes.push({ trait_type: "geometryHash", value: build.geometryHash })
  if (build.specKey) attributes.push({ trait_type: "specKey", value: build.specKey })
  if (build.bw_score) attributes.push({ trait_type: "bw_score", value: build.bw_score })
  if (w && d) {
    attributes.push({ trait_type: "width", value: w })
    attributes.push({ trait_type: "depth", value: d })
  }

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
