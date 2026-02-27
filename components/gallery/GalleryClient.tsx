"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Download, ExternalLink } from "lucide-react"
import { CONTRACTS } from "@/lib/contracts/ethblox-contracts"
import { BuildVoxelPreview } from "@/components/preview/BuildVoxelPreview"

interface MintedBuild {
  tokenId: string
  buildId: string
  name: string
  mass: number
  buildHash?: string
  geometryHash?: string
  creator?: string
  mintedAt?: string
  txHash?: string
  bricks?: Array<{
    color?: string
    position: [number, number, number]
    width?: number
    depth?: number
  }>
  kind?: number
  density?: number
  brickWidth?: number
  brickDepth?: number
}

export default function GalleryClient() {
  const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.basescan.org"
  const [builds, setBuilds] = useState<MintedBuild[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchMintedBuilds()
  }, [])

  const fetchMintedBuilds = async () => {
    try {
      const response = await fetch("/api/builds/minted")
      if (response.ok) {
        const data = await response.json()
        setBuilds(data.builds || [])
        console.log("[v0] Loaded", data.builds?.length || 0, "minted builds from database")
      } else {
        console.error("[v0] Failed to fetch minted builds:", response.statusText)
        setBuilds([])
      }
    } catch (error) {
      console.error("[v0] Error fetching minted builds:", error)
      setBuilds([])
    } finally {
      setLoading(false)
    }
  }

  const filteredBuilds = builds.filter((build) => {
    const name = build.name || `Build #${build.tokenId}`
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      build.creator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      build.tokenId.includes(searchTerm)
    )
  })

  const handleLoadIntoBuilder = async (tokenId: string) => {
    try {
      const response = await fetch(`/api/builds/token/${tokenId}`)
      if (response.ok) {
        const buildData = await response.json()
        // Store in localStorage for the builder to load
        if (typeof window !== "undefined") {
          localStorage.setItem("ethblox_load_build_data", JSON.stringify(buildData))
          window.location.href = "/buildv2"
        }
      }
    } catch (error) {
      console.error("[v0] Error loading build into builder:", error)
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading minted NFTs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="max-w-4xl mx-auto mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Gallery</h1>
          <p className="text-lg text-muted-foreground mb-8">Explore minted Build NFTs from the BASEBLOX community</p>

          <Input
            type="search"
            placeholder="Search by name, token ID, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md mx-auto"
          />
        </div>

        {filteredBuilds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "No builds found matching your search" : "No builds minted yet"}
            </p>
            <Button asChild>
              <Link href="/buildv2">Start Building</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBuilds.map((build) => {
              const name = build.name || `Build #${build.tokenId}`
              const mass = build.mass || 0
              const isBrick = build.kind === 0
              const brickCount = build.bricks?.length || 0

              return (
                <Card key={build.tokenId} className="flex flex-col">
                  <div className="h-44 border-b border-[hsl(var(--ethblox-border))] bg-[hsl(var(--ethblox-bg))]">
                    <BuildVoxelPreview
                      bricks={build.bricks}
                      geometryHash={build.geometryHash || build.buildHash}
                      tokenId={build.tokenId}
                      transparentBricks={isBrick}
                      showStuds={isBrick}
                      className="h-full w-full"
                    />
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-1">{name}</CardTitle>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isBrick && (
                          <Badge variant="outline" className="text-xs">Brick</Badge>
                        )}
                        <Badge variant="secondary">
                          #{build.tokenId}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {isBrick 
                        ? `${build.brickWidth || 1}x${build.brickDepth || 1} - Density ${build.density || 1} - Mass ${mass}`
                        : mass > 0 ? `${brickCount} brick${brickCount !== 1 ? "s" : ""} - Mass ${mass}` : "Minted Build NFT"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Token ID</dt>
                        <dd className="font-medium">#{build.tokenId}</dd>
                      </div>
                      {mass > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">MASS</dt>
                          <dd className="font-medium">{mass} BLOX</dd>
                        </div>
                      )}
                      {build.creator && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Owner</dt>
                          <dd className="font-medium font-mono text-xs">{truncateAddress(build.creator)}</dd>
                        </div>
                      )}
                      {build.buildHash && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Hash</dt>
                          <dd className="font-medium font-mono text-xs">{build.buildHash.slice(0, 10)}...</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button className="flex-1" variant="secondary" onClick={() => handleLoadIntoBuilder(build.tokenId)}>
                      <Download className="mr-2 h-4 w-4" />
                      Load
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={`${explorerBase}/nft/${CONTRACTS.BUILD_NFT}/${build.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
