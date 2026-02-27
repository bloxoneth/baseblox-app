import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import GalleryClient from "@/components/gallery/GalleryClient"
import { TokenBackfillButton } from "@/components/admin/TokenBackfillButton"

export const metadata: Metadata = {
  title: "Gallery | BASEBLOX",
  description: "Explore public BUILDS from the BASEBLOX community",
}

export default function GalleryPage() {
  return (
    <>
      <SiteHeader />
      <div className="pt-16">
        <div className="container mx-auto px-4 py-4">
          <TokenBackfillButton />
        </div>
        <GalleryClient />
      </div>
      <SiteFooter />
    </>
  )
}
