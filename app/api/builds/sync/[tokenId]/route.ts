import { NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { redis } from "@/lib/redis"
import { rk } from "@/lib/redis-keys"
import type { Build } from "@/lib/types"
import { BUILD_NFT_ABI, CONTRACTS, RPC_URL } from "@/lib/contracts/ethblox-contracts"

const ADMIN_TOKEN = process.env.ADMIN_RESET_TOKEN
const OWNER_AUTH_PREFIX = "BASEBLOX_SYNC"

async function authorize(request: NextRequest, tokenId: string): Promise<string | null> {
  // Admin override
  if (ADMIN_TOKEN) {
    const authHeader = request.headers.get("authorization") || ""
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const token = bearer || request.headers.get("x-admin-token") || ""
    if (token && token === ADMIN_TOKEN) return null
  }

  // Owner signed-message auth
  const ownerAddress = (request.headers.get("x-owner-address") || "").trim()
  const ownerSignature = (request.headers.get("x-owner-signature") || "").trim()
  if (!ownerAddress || !ownerSignature) {
    return "Missing auth: provide admin token or owner signature headers"
  }

  try {
    const message = `${OWNER_AUTH_PREFIX}:${tokenId}`
    const recovered = ethers.verifyMessage(message, ownerSignature)
    if (recovered.toLowerCase() !== ownerAddress.toLowerCase()) {
      return "Invalid owner signature"
    }
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, ["function ownerOf(uint256) view returns (address)"], provider)
    const onchainOwner = String(await contract.ownerOf(BigInt(tokenId)))
    if (onchainOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
      return "Signer is not current token owner"
    }
  } catch (err: any) {
    return err?.shortMessage || err?.message || "Owner authorization failed"
  }

  return null
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await context.params
  const authError = await authorize(request, tokenId)
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  const id = Number.parseInt(tokenId, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "invalid token id" }, { status: 400 })
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    const owner = String(await contract.ownerOf(BigInt(id)))
    const kind = Number(await contract.kindOf(BigInt(id)))
    const geometryHash = String(await contract.geometryOf(BigInt(id)))
    const [width, depth, density] = await contract.brickSpecOf(BigInt(id))
    const lockedBlox = BigInt(await contract.lockedBloxOf(BigInt(id)))
    const mass = Number(lockedBlox / 10n ** 18n)

    let buildId = await redis.get<string>(rk(`token:${id}`))
    const now = new Date().toISOString()

    if (!buildId) {
      buildId = `synced_${id}_${Date.now()}`
      await redis.set(rk(`token:${id}`), buildId)
    }

    const existing = await redis.get<Build>(rk(`build:${buildId}`))
    const synced: Build = {
      ...(existing || {
        id: buildId,
        name: kind === 0 ? `Brick ${Math.min(Number(width), Number(depth))}x${Math.max(Number(width), Number(depth))} D${Number(density)}` : `BASEBLOX #${id}`,
        creator: owner.toLowerCase(),
        bricks: [],
      }),
      tokenId: String(id),
      kind,
      geometryHash,
      brickWidth: Number(width),
      brickDepth: Number(depth),
      density: Number(density),
      mass,
      onchainMinted: true,
      created: existing?.created || now,
      timestamp: Date.now(),
    }

    await redis.set(rk(`build:${buildId}`), synced)
    await redis.sadd(rk("minted_tokens"), String(id))

    return NextResponse.json({
      success: true,
      tokenId: String(id),
      buildId,
      owner,
      syncedAt: now,
      build: synced,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.shortMessage || err?.message || "sync failed" }, { status: 500 })
  }
}

