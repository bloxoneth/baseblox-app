import { TokenViewerClient } from "@/components/preview/TokenViewerClient"

export default async function ViewerPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params
  return <TokenViewerClient tokenId={tokenId} />
}

