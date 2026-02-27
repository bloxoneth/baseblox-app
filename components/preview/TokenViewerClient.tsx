"use client"

import useSWR from "swr"
import { BuildVoxelPreview } from "@/components/preview/BuildVoxelPreview"
import { resolveIPFS, tokenImageGatewayURL } from "@/lib/contracts/ethblox-contracts"

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) return null
  return r.json()
}

export function TokenViewerClient({ tokenId }: { tokenId: string }) {
  const { data: appData } = useSWR(`/api/builds/token/${tokenId}`, fetcher, { revalidateOnFocus: false })
  const { data: onchainData } = useSWR(`/api/builds/onchain/${tokenId}`, fetcher, { revalidateOnFocus: false })

  const bricks = Array.isArray(appData?.bricks) && appData.bricks.length > 0 ? appData.bricks : undefined
  const geometryHash = appData?.geometryHash || appData?.buildHash || onchainData?.onchain?.geometryHash || ""
  const title = appData?.name || onchainData?.ipfsMetadata?.name || `BASEBLOX #${tokenId}`
  const kind = Number(onchainData?.onchain?.kind ?? appData?.kind ?? -1)
  const isBrick = kind === 0
  const imageFromMetadataRaw = typeof onchainData?.ipfsMetadata?.image === "string" ? onchainData.ipfsMetadata.image : ""
  const imageFromMetadata = imageFromMetadataRaw.startsWith("ipfs://")
    ? resolveIPFS(imageFromMetadataRaw)
    : imageFromMetadataRaw
  const fallbackImage = imageFromMetadata || tokenImageGatewayURL(tokenId)

  return (
    <main className="w-screen h-screen bg-[#0b1220] flex items-center justify-center overflow-hidden">
      <div className="w-full h-full relative">
        <BuildVoxelPreview
          bricks={bricks}
          geometryHash={geometryHash}
          tokenId={tokenId}
          imageUrl={fallbackImage}
          transparentBricks={isBrick}
          showStuds={isBrick}
          sceneMode="marketplace"
          className="w-full h-full"
        />
        <div className="absolute left-3 bottom-3 px-2 py-1 rounded bg-black/40 text-white text-xs font-mono">
          {title}
        </div>
      </div>
    </main>
  )
}
