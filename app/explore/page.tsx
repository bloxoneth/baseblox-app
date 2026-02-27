import { SiteHeader } from "@/components/site-header"
import { ExploreClient } from "@/components/explore/ExploreClient"

export const metadata = {
  title: "Explore Builds | BASEBLOX",
  description: "Discover and browse placeholder builds in the BASEBLOX ecosystem",
}

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-20 pb-12">
        <ExploreClient />
      </main>
    </div>
  )
}
