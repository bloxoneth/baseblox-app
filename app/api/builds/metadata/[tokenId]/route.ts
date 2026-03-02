import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { redis } from "@/lib/redis"
import { rk } from "@/lib/redis-keys"
import { BUILD_NFT_ABI, CONTRACTS, RPC_URL } from "@/lib/contracts/ethblox-contracts"
import type { Build } from "@/lib/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await params
  const id = Number.parseInt(tokenId, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "invalid token id" }, { status: 400 })
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const buildNft = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

  try {
    const exists = Boolean(await buildNft.exists(id))
    if (!exists) {
      return NextResponse.json({ error: "token not found" }, { status: 404 })
    }

    // Prefer app-canonical metadata when present (captures composition, bw, custom name),
    // then fall back to chain-derived metadata.
    let build: Build | null = null
    try {
      const buildId = await redis.get<string>(rk(`token:${id}`))
      if (buildId) {
        build = await redis.get<Build>(rk(`build:${buildId}`))
      }
      // If mapped build is missing or synthetic, scan for a richer record with same tokenId.
      const mappedLooksSynthetic =
        !build ||
        (String(build.id || "").startsWith("build_backfilled_") &&
          !build.buildHash &&
          (!build.composition || Object.keys(build.composition).length === 0))
      if (mappedLooksSynthetic) {
        const keys = await redis.keys(rk("build:*"))
        for (const key of keys) {
          if (key.startsWith(rk("build:token:")) || key.startsWith(rk("build:hash:"))) continue
          const candidate = await redis.get<Build>(key)
          if (!candidate) continue
          if (String(candidate.tokenId) !== String(id)) continue
          const richer =
            !!candidate.buildHash ||
            (!!candidate.composition && Object.keys(candidate.composition).length > 0) ||
            (candidate.bricks?.length ?? 0) > 0
          if (!richer) continue
          build = candidate
          break
        }
      }
    } catch {
      build = null
    }

    const kind = Number(await buildNft.kindOf(id))
    const spec = await buildNft.brickSpecOf(id)
    const width = Number(spec.width ?? 0)
    const depth = Number(spec.depth ?? 0)
    const density = Number(spec.density ?? 0)
    const locked = (await buildNft.lockedBloxOf(id)) as bigint
    const mass = Number(locked / 10n ** 18n)
    const geometryHash = String(await buildNft.geometryOf(id))

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://baseblox-app.vercel.app"
    const kindLabel = kind === 0 ? "Brick" : kind === 2 ? "Collectors Edition" : "Build"
    const name =
      build?.name && String(build.name).trim().length > 0
        ? String(build.name).trim()
        : kind === 0
          ? `${Math.min(width, depth)}x${Math.max(width, depth)}-D${density}`
          : `BASEBLOX ${kindLabel} #${id}`

    const attributes: Array<{ trait_type: string; value: string | number }> = [
      { trait_type: "kind", value: kindLabel },
      { trait_type: "kindId", value: kind },
      { trait_type: "mass", value: mass },
      { trait_type: "density", value: density },
      { trait_type: "width", value: width },
      { trait_type: "depth", value: depth },
      { trait_type: "geometryHash", value: geometryHash },
    ]

    if (build?.bw_score !== undefined && build?.bw_score !== null) {
      attributes.push({ trait_type: "bw_score", value: Number(build.bw_score) })
    }

    if (build?.composition && typeof build.composition === "object") {
      const componentIds: string[] = []
      const componentCounts: number[] = []
      for (const [tokenId, info] of Object.entries(build.composition)) {
        const count = Number((info as any)?.count ?? 0)
        if (!tokenId || !Number.isFinite(count) || count <= 0) continue
        componentIds.push(String(tokenId))
        componentCounts.push(count)
      }
      if (componentIds.length > 0) {
        attributes.push({ trait_type: "componentBuildIds", value: componentIds.join(",") })
        attributes.push({ trait_type: "componentCounts", value: componentCounts.join(",") })
      }
    }

    return NextResponse.json({
      name,
      description: `BASEBLOX ${kindLabel} - ${width}x${depth} density ${density}`,
      image: `${appBaseUrl}/api/builds/image/${id}`,
      animation_url: `${appBaseUrl}/viewer/${id}`,
      external_url: `${appBaseUrl}/explore/${id}`,
      attributes,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.shortMessage || err?.message || "metadata error" }, { status: 500 })
  }
}
