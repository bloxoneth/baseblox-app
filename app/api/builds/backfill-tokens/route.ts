import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { redis } from "@/lib/redis"
import { rk } from "@/lib/redis-keys"
import { CONTRACTS, RPC_URL } from "@/lib/contracts/ethblox-contracts"

const CONTRACT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function nextTokenId() view returns (uint256)",
  "function kindOf(uint256 tokenId) view returns (uint8)",
]

async function backfill() {
  try {
    console.log("[v0] Starting token backfill...")

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, CONTRACT_ABI, provider)

    let nextTokenId = 1n
    try {
      nextTokenId = await contract.nextTokenId()
    } catch {
      const filter = contract.filters.Transfer(ethers.ZeroAddress, null, null)
      const events = await contract.queryFilter(filter, 0, "latest")
      nextTokenId = BigInt(events.length + 1)
    }

    const results = {
      scanned: Number(nextTokenId > 1n ? nextTokenId - 1n : 0n),
      added: 0,
      burned: 0,
      alreadyExists: 0,
      errors: [] as string[],
    }

    for (let id = 1n; id < nextTokenId; id++) {
      const tokenId = id.toString()
      try {
        const owner = await contract.ownerOf(tokenId)
        console.log(`[v0] Token ${tokenId} owned by ${owner}`)

        const existing = await redis.sismember(rk("minted_tokens"), tokenId)
        if (existing) {
          console.log(`[v0] Token ${tokenId} already in Redis`)
          results.alreadyExists++
          continue
        }

        await redis.sadd(rk("minted_tokens"), tokenId)

        const buildId = `build_backfilled_${tokenId}`
        await redis.set(rk(`token:${tokenId}`), buildId)
        let kind: number | undefined
        try {
          kind = Number(await contract.kindOf(id))
        } catch {
          kind = undefined
        }
        await redis.set(rk(`build:${buildId}`), {
          id: buildId,
          name: `BASEBLOX #${tokenId}`,
          creator: owner.toLowerCase(),
          bricks: [],
          tokenId,
          kind,
          created: new Date().toISOString(),
          timestamp: Date.now(),
        })

        console.log(`[v0] Added token ${tokenId} to Redis`)
        results.added++
      } catch (error: any) {
        if (error.message?.includes("owner query for nonexistent token")) {
          console.log(`[v0] Token ${tokenId} was burned`)
          results.burned++
        } else {
          console.error(`[v0] Error processing token ${tokenId}:`, error)
          results.errors.push(`Token ${tokenId}: ${error.message}`)
        }
      }
    }

    console.log("[v0] Backfill complete:", results)

    return NextResponse.json({
      success: true,
      contract: CONTRACTS.BUILD_NFT,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Backfill error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return backfill()
}

export async function POST() {
  return backfill()
}
