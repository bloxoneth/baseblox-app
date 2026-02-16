import { Suspense } from "react"
import { SiteHeader } from "@/components/site-header"
import { MintDebugClient } from "@/components/build/MintDebugClient"

export default function MintDebugPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--ethblox-bg))]">
      <SiteHeader />
      <Suspense fallback={null}>
        <MintDebugClient />
      </Suspense>
    </div>
  )
}
