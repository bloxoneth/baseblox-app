import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { BUILD_NFT_ABI, CONTRACTS, RPC_URL, tokenImageURI } from "@/lib/contracts/ethblox-contracts"

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

    const kind = Number(await buildNft.kindOf(id))
    const spec = await buildNft.brickSpecOf(id)
    const width = Number(spec.width ?? 0)
    const depth = Number(spec.depth ?? 0)
    const density = Number(spec.density ?? 0)
    const locked = (await buildNft.lockedBloxOf(id)) as bigint
    const mass = Number(locked / 10n ** 18n)
    const geometryHash = String(await buildNft.geometryOf(id))

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ethblox-app.vercel.app"
    const kindLabel = kind === 0 ? "Brick" : kind === 2 ? "Collectors Edition" : "Build"
    const name = kind === 0 ? `${Math.min(width, depth)}x${Math.max(width, depth)}-D${density}` : `BASEBLOX ${kindLabel} #${id}`

    return NextResponse.json({
      name,
      description: `BASEBLOX ${kindLabel} - ${width}x${depth} density ${density}`,
      image: tokenImageURI(id),
      animation_url: `${appBaseUrl}/viewer/${id}`,
      external_url: `${appBaseUrl}/explore/${id}`,
      attributes: [
        { trait_type: "kind", value: kindLabel },
        { trait_type: "kindId", value: kind },
        { trait_type: "mass", value: mass },
        { trait_type: "density", value: density },
        { trait_type: "width", value: width },
        { trait_type: "depth", value: depth },
        { trait_type: "geometryHash", value: geometryHash },
      ],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.shortMessage || err?.message || "metadata error" }, { status: 500 })
  }
}

