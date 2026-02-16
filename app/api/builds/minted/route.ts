import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { redis } from "@/lib/redis"
import { rk } from "@/lib/redis-keys"
import { CONTRACTS, BUILD_NFT_ABI, RPC_URL } from "@/lib/contracts/ethblox-contracts"
import type { Build } from "@/lib/types"

// GET /api/builds/minted - Chain is truth, Redis is cache
export async function GET(request: Request) {
  const loadFromRedisCache = async () => {
    const tokenIds = await redis.smembers(rk("minted_tokens"))
    if (!tokenIds?.length) {
      const buildsFromScan = await loadFromBuildScan()
      return NextResponse.json({ builds: buildsFromScan, source: "cache", missing: ["cache_index_missing"] })
    }

    const tokenLookupKeys = tokenIds.map((tokenId) => rk(`token:${tokenId}`))
    const buildIds = await redis.mget<string[]>(...tokenLookupKeys)
    const byToken = new Map<string, string>()
    const uniqueBuildIds = new Set<string>()
    for (let i = 0; i < tokenIds.length; i++) {
      const buildId = buildIds?.[i]
      if (!buildId) continue
      byToken.set(String(tokenIds[i]), String(buildId))
      uniqueBuildIds.add(String(buildId))
    }

    if (uniqueBuildIds.size === 0) return NextResponse.json({ builds: [], source: "cache", missing: ["cache_index_missing"] })

    const buildKeys = Array.from(uniqueBuildIds).map((buildId) => rk(`build:${buildId}`))
    const buildValues = await redis.mget<Build[]>(...buildKeys)
    const buildById = new Map<string, Build>()
    for (let i = 0; i < buildKeys.length; i++) {
      const build = buildValues?.[i]
      if (!build) continue
      const buildId = buildKeys[i].replace(rk("build:"), "")
      buildById.set(buildId, build)
    }

    const builds: Build[] = []
    for (const tokenId of tokenIds) {
      const buildId = byToken.get(String(tokenId))
      if (!buildId) continue
      const build = buildById.get(buildId)
      if (!build) continue
      builds.push({ ...build, tokenId: String(tokenId), buildId })
    }
    if (builds.length === 0) {
      const buildsFromScan = await loadFromBuildScan()
      return NextResponse.json({ builds: buildsFromScan, source: "cache", missing: ["cache_index_missing"] })
    }
    builds.sort((a, b) => Number(b.tokenId) - Number(a.tokenId))
    return NextResponse.json({ builds, source: "cache", missing: [] })
  }

  const loadFromBuildScan = async (): Promise<Build[]> => {
    const keys = await redis.keys(rk("build:*"))
    if (!keys?.length) return []
    const values = await redis.mget<Build[]>(...keys)
    const out: Build[] = []
    for (const b of values ?? []) {
      if (!b) continue
      if (b.tokenId === undefined || b.tokenId === null || String(b.tokenId) === "") continue
      out.push({ ...b, tokenId: String(b.tokenId) })
    }
    out.sort((a, b) => Number(b.tokenId) - Number(a.tokenId))
    return out
  }

  try {
    const url = new URL(request.url)
    const querySource = (url.searchParams.get("source") ?? "").toLowerCase()
    const headerSource = (request.headers.get("x-ethblox-source") ?? "").toLowerCase()
    const requestedSource = querySource || headerSource

    // Default to cache for speed. `truth` forces chain scan.
    if (requestedSource !== "truth") {
      return loadFromRedisCache()
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    let nextTokenId = 1n
    try {
      nextTokenId = await contract.nextTokenId()
    } catch {
      // if nextTokenId not available, fall back to Redis-only
    }

    const chainTokenIds: number[] = []
    const owners = new Map<number, string>()
    let chainProbeOk = false

    const chunkSize = 50n
    for (let start = 1n; start < nextTokenId; start += chunkSize) {
      const end = start + chunkSize < nextTokenId ? start + chunkSize : nextTokenId
      const ids: bigint[] = []
      for (let id = start; id < end; id++) ids.push(id)
      const results = await Promise.allSettled(ids.map((id) => contract.ownerOf(id)))

      for (let i = 0; i < ids.length; i++) {
        const result = results[i]
        if (result.status !== "fulfilled") continue
        const tokenId = Number(ids[i])
        chainTokenIds.push(tokenId)
        owners.set(tokenId, result.value)
        chainProbeOk = true
      }
    }

    if (nextTokenId <= 1n) {
      try {
        await provider.getBlockNumber()
        chainProbeOk = true
      } catch {
        chainProbeOk = false
      }
    }

    // Sync Redis minted_tokens with chain truth only when chain returned at least one token.
    if (chainTokenIds.length > 0) {
      await Promise.all(chainTokenIds.map((id) => redis.sadd(rk("minted_tokens"), String(id))))

      const mintedSet = new Set(chainTokenIds.map(String))
      const cachedTokenIds = await redis.smembers(rk("minted_tokens"))
      if (chainProbeOk && cachedTokenIds?.length) {
        const stale = cachedTokenIds.filter((id) => !mintedSet.has(id))
        if (stale.length > 0) {
          await Promise.all(stale.map((id) => redis.srem(rk("minted_tokens"), id)))
        }
      }
    }

    if (!chainProbeOk) {
      return NextResponse.json({
        builds: [],
        source: "truth",
        missing: ["chain_unreachable_or_incompatible"],
      })
    }

    const builds: Build[] = []

    for (const tokenId of chainTokenIds) {
      try {
        const buildId = await redis.get<string>(rk(`token:${tokenId}`))
        if (buildId) {
          const build = await redis.get<Build>(rk(`build:${buildId}`))
          if (build) {
            builds.push({ ...build, tokenId: String(tokenId), buildId })
            continue
          }
        }

        // Fallback: minimal build from chain
        let kind: number | undefined
        try {
          const k = await contract.kindOf(tokenId)
          kind = Number(k)
        } catch {
          // ignore
        }

        const owner = owners.get(tokenId) ?? "0x0000000000000000000000000000000000000000"

        builds.push({
          id: `chain_${tokenId}`,
          name: `ETHBLOX #${tokenId}`,
          creator: owner.toLowerCase(),
          bricks: [],
          tokenId: String(tokenId),
          kind,
        })
      } catch {
        // skip token on error
      }
    }

    builds.sort((a, b) => Number(b.tokenId) - Number(a.tokenId))
    return NextResponse.json({
      builds,
      source: "truth",
      missing: builds.length === 0 ? ["chain_has_no_minted_tokens"] : [],
    })
  } catch (error) {
    console.error("Failed to fetch minted builds in truth mode:", error)
    return NextResponse.json({
      builds: [],
      source: "truth",
      missing: ["truth_query_failed"],
    })
  }
}
