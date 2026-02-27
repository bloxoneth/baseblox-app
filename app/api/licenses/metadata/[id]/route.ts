import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { BUILD_NFT_ABI, CONTRACTS, LICENSE_REGISTRY_ABI, RPC_URL } from "@/lib/contracts/ethblox-contracts"

const LICENSE_NFT_ABI = [
  "function totalSupply(uint256 id) view returns (uint256)",
  "function maxSupply(uint256 id) view returns (uint256)",
]

function parseLicenseId(raw: string): bigint {
  const clean = raw.trim().replace(/\.json$/i, "")
  if (/^0x[0-9a-fA-F]+$/.test(clean)) return BigInt(clean)
  if (/^[0-9]+$/.test(clean)) return BigInt(clean)
  // ERC-1155 URI substitution often uses 64-char lowercase hex without 0x
  if (/^[0-9a-fA-F]{64}$/.test(clean)) return BigInt(`0x${clean}`)
  throw new Error("invalid id")
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

function ipfsToGateway(uri: string): string {
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/"
  return uri.replace("ipfs://", gateway)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const licenseId = parseLicenseId(id)
    const provider = new ethers.JsonRpcProvider(RPC_URL)

    const registry = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, LICENSE_REGISTRY_ABI, provider)
    const licenseNft = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)
    const buildNft = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    const buildId = (await registry.buildIdForLicense(licenseId)) as bigint
    if (buildId === 0n) {
      return NextResponse.json({ error: "license not found" }, { status: 404 })
    }

    const [minted, max, pricing] = await Promise.all([
      licenseNft.totalSupply(licenseId) as Promise<bigint>,
      licenseNft.maxSupply(licenseId) as Promise<bigint>,
      registry.pricingForLicense(licenseId),
    ])

    let buildName = `BASEBLOX Build #${buildId.toString()}`
    let buildImage: string | null = null
    let buildAnimation: string | null = null
    let geometryHash = "0x"
    let kind: number | null = null
    let width = 0
    let depth = 0
    let density = 0
    let mass = 0n

    try {
      kind = Number(await buildNft.kindOf(buildId))
      const spec = await buildNft.brickSpecOf(buildId)
      width = Number(spec.width ?? 0)
      depth = Number(spec.depth ?? 0)
      density = Number(spec.density ?? 0)
      const locked = (await buildNft.lockedBloxOf(buildId)) as bigint
      mass = locked / 10n ** 18n
      geometryHash = (await buildNft.geometryOf(buildId)) as string

      const tokenUri = (await buildNft.tokenURI(buildId)) as string
      const meta = tokenUri ? await fetchJson(ipfsToGateway(tokenUri)) : null
      if (meta?.name) buildName = String(meta.name)
      if (meta?.image) buildImage = String(meta.image)
      if (meta?.animation_url) buildAnimation = String(meta.animation_url)
    } catch {
      // keep fallback metadata if build token metadata lookup fails
    }

    const remaining = max > minted ? max - minted : 0n
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ethblox-app.vercel.app"

    return NextResponse.json({
      name: `License for ${buildName}`,
      description: `ERC-1155 license for using BASEBLOX Build #${buildId.toString()} as a component.`,
      image: buildImage,
      animation_url: buildAnimation,
      external_url: `${baseUrl}/explore/${buildId.toString()}`,
      supply: minted.toString(),
      attributes: [
        { trait_type: "kind", value: "License" },
        { trait_type: "licenseId", value: licenseId.toString() },
        { trait_type: "buildId", value: buildId.toString() },
        { trait_type: "buildKind", value: kind ?? -1 },
        { trait_type: "mass", value: Number(mass) },
        { trait_type: "density", value: density },
        { trait_type: "width", value: width },
        { trait_type: "depth", value: depth },
        { trait_type: "geometryHash", value: geometryHash },
        { trait_type: "mintedSupply", value: minted.toString() },
        { trait_type: "maxSupply", value: max.toString() },
        { trait_type: "remainingSupply", value: remaining.toString() },
        { trait_type: "startPriceBLOX", value: ethers.formatEther(pricing.startPrice ?? 0n) },
        { trait_type: "stepBLOX", value: ethers.formatEther(pricing.step ?? 0n) },
        { trait_type: "maxPriceBLOX", value: ethers.formatEther(pricing.maxPrice ?? 0n) },
      ],
    })
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 })
  }
}
