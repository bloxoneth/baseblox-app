import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import ProfileClient from "@/components/profile/ProfileClient"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ address: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { address } = await params
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`
  
  return {
    title: `${shortAddr} | BASEBLOX Builder`,
    description: `View the BASEBLOX builder profile for ${shortAddr}`,
  }
}

export default async function UserProfilePage({ params }: PageProps) {
  const { address } = await params
  
  // Validate address format
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    notFound()
  }

  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        <ProfileClient address={address} />
      </main>
      <SiteFooter />
    </>
  )
}
