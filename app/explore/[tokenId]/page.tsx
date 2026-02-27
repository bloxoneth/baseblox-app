import { SiteHeader } from "@/components/site-header"
import { TokenDetailClient } from "@/components/explore/TokenDetailClient"

export async function generateMetadata({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params
  return {
    title: `Build #${tokenId} | BASEBLOX`,
    description: `On-chain details for BASEBLOX BuildNFT token #${tokenId}`,
  }
}

export default async function TokenDetailPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-20 pb-12">
        <TokenDetailClient tokenId={tokenId} />
      </main>
    </div>
  )
}
