import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { redis } from "@/lib/redis"
import { rk, rpat } from "@/lib/redis-keys"
import { CONTRACTS, RPC_URL } from "@/lib/contracts/ethblox-contracts"

const REGISTRY_ABI = [
  "function licenseIdForBuild(uint256 buildId) view returns (uint256)",
  "function quote(uint256 buildId, uint256 qty) view returns (uint256)",
  "function pricingForLicense(uint256 licenseId) view returns (uint256 startPrice, uint256 step, uint256 maxSupply, uint256 maxPrice)",
]

const LICENSE_NFT_ABI = [
  "function totalSupply(uint256 id) view returns (uint256)",
  "function maxSupply(uint256 id) view returns (uint256)",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  try {
    const { tokenId } = await params
    if (!/^\d+$/.test(tokenId)) {
      return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 })
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const registry = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, REGISTRY_ABI, provider)
    const licenseNft = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)

    const buildId = BigInt(tokenId)
    const licenseId = (await registry.licenseIdForBuild(buildId)) as bigint
    const isRegistered = licenseId > 0n

    let nextUnitPrice = 0n
    let startPrice = 0n
    let step = 0n
    let maxSupply = 0n
    let maxPrice = 0n
    let mintedSupply = 0n
    let mintedLast24h = 0n

    if (isRegistered) {
      nextUnitPrice = (await registry.quote(buildId, 1n)) as bigint
      const pricing = await registry.pricingForLicense(licenseId)
      startPrice = pricing.startPrice as bigint
      step = pricing.step as bigint
      maxSupply = pricing.maxSupply as bigint
      maxPrice = pricing.maxPrice as bigint

      mintedSupply = (await licenseNft.totalSupply(licenseId)) as bigint

      const latestBlock = await provider.getBlock("latest")
      const latestBlockNumber = Number(latestBlock?.number ?? 0)
      const cutoffTs = Math.floor(Date.now() / 1000) - 24 * 60 * 60
      const fromBlock = Math.max(0, latestBlockNumber - 60_000)

      const logs = await licenseNft.queryFilter(
        licenseNft.filters.TransferSingle(null, ethers.ZeroAddress, null, licenseId),
        fromBlock,
        latestBlockNumber,
      )

      for (const log of logs) {
        const blk = await provider.getBlock(log.blockNumber)
        if (!blk || blk.timestamp < cutoffTs) continue
        mintedLast24h += BigInt(log.args.value ?? 0n)
      }
    }

    const prevPrice =
      isRegistered && mintedLast24h > 0n
        ? nextUnitPrice > mintedLast24h * step
          ? nextUnitPrice - mintedLast24h * step
          : startPrice
        : nextUnitPrice
    const priceChangePct =
      isRegistered && prevPrice > 0n
        ? Number(((nextUnitPrice - prevPrice) * 10_000n) / prevPrice) / 100
        : 0

    const buildKeys = await redis.keys(rpat("build:*"))
    let usedInBuilds = 0
    for (const key of buildKeys ?? []) {
      if (key.startsWith(rk("build:token:")) || key.startsWith(rk("build:hash:"))) continue
      const build = await redis.get<any>(key)
      if (!build || Number(build.kind) === 0) continue

      const inIds = Array.isArray(build.componentBuildIds) && build.componentBuildIds.some((id: any) => String(id) === tokenId)
      const inComp =
        build.composition &&
        typeof build.composition === "object" &&
        Object.keys(build.composition).some((id) => id === tokenId)

      if (inIds || inComp) usedInBuilds += 1
    }

    return NextResponse.json({
      buildId: tokenId,
      isRegistered,
      licenseId: isRegistered ? licenseId.toString() : null,
      nextUnitPriceWei: nextUnitPrice.toString(),
      nextUnitPriceBlox: ethers.formatEther(nextUnitPrice),
      mintedSupply: mintedSupply.toString(),
      maxSupply: maxSupply.toString(),
      mintedLast24h: mintedLast24h.toString(),
      curve: {
        startPriceWei: startPrice.toString(),
        stepWei: step.toString(),
        maxPriceWei: maxPrice.toString(),
        startPriceBlox: ethers.formatEther(startPrice),
        stepBlox: ethers.formatEther(step),
        maxPriceBlox: ethers.formatEther(maxPrice),
        price24hChangePct: priceChangePct,
      },
      usedInBuilds,
      os: {
        collectionUrl: `${process.env.NEXT_PUBLIC_OPENSEA_COLLECTION_URL ?? ""}`,
        assetUrl: `${process.env.NEXT_PUBLIC_OPENSEA_ASSET_BASE_URL ?? ""}${tokenId}`,
        latestSalePrice: null,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch license snapshot" },
      { status: 500 },
    )
  }
}
