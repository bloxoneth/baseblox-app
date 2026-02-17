"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Box, Layers, Hash, Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import type { Build } from "@/lib/types"
import { BuildVoxelPreview } from "@/components/preview/BuildVoxelPreview"
import { fetchWithDataSource, useDataSourceMode } from "@/lib/data-source"

const fetcher = (url: string) => fetchWithDataSource(url).then(r => r.json())

export function ExploreClient() {
  const networkName = process.env.NEXT_PUBLIC_NETWORK_NAME ?? "Base Sepolia"
  const sourceMode = useDataSourceMode()
  const { data, isLoading } = useSWR<{ builds: Build[]; source?: string; missing?: string[] }>(
    `/api/builds/minted?source=${sourceMode}`,
    fetcher,
    {
    revalidateOnFocus: false,
    },
  )
  const builds = data?.builds ?? []
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState<"all" | "brick" | "build">("all")

  // Only show minted builds (those with a tokenId)
  const mintedBuilds = (builds ?? []).filter(b => b.tokenId)

  // Apply filters
  const filteredBuilds = mintedBuilds.filter(b => {
    const matchesSearch = !search ||
      (b.name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(b.tokenId).includes(search)
    const matchesKind = kindFilter === "all" ||
      (kindFilter === "brick" && (b.kind === 0 || b.kind === undefined)) ||
      (kindFilter === "build" && b.kind !== undefined && b.kind > 0)
    return matchesSearch && matchesKind
  })

  return (
    <div className="container mx-auto px-6 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">
          Explore Builds
        </h1>
        <p className="text-[hsl(var(--ethblox-text-secondary))]">
          {mintedBuilds.length} minted NFTs on {networkName}
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />
          <Input
            placeholder="Search by name or token ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-primary))]"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--ethblox-border))] bg-[hsl(var(--ethblox-surface))] p-0.5">
          {(["all", "brick", "build"] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setKindFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                kindFilter === f
                  ? "bg-[hsl(var(--ethblox-green))] text-black"
                  : "text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-text-primary))]"
              }`}
            >
              {f === "all" ? "All" : f === "brick" ? "Bricks" : "Builds"}
            </button>
          ))}
        </div>
      </div>

      {sourceMode === "truth" && (data?.missing?.length ?? 0) > 0 && (
        <div className="mb-4 rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          Truth mode missing: {data?.missing?.join(", ")}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-[hsl(var(--ethblox-surface))] overflow-hidden">
              <div className="aspect-square bg-[hsl(var(--ethblox-bg))] animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-[hsl(var(--ethblox-bg))] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-[hsl(var(--ethblox-bg))] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredBuilds.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredBuilds.map(build => (
            <BuildCard key={build.id || build.tokenId} build={build} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredBuilds.length === 0 && mintedBuilds.length > 0 && (
        <div className="text-center py-16">
          <SlidersHorizontal className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--ethblox-text-tertiary))]" />
          <h3 className="text-lg font-semibold text-[hsl(var(--ethblox-text-primary))] mb-2">
            No matches
          </h3>
          <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">
            Try adjusting your search or filter.
          </p>
        </div>
      )}

      {!isLoading && mintedBuilds.length === 0 && (
        <div className="text-center py-16">
          <Box className="h-16 w-16 mx-auto mb-6 text-[hsl(var(--ethblox-text-tertiary))]" />
          <h3 className="text-xl font-semibold text-[hsl(var(--ethblox-text-primary))] mb-2">
            No Builds Yet
          </h3>
          <p className="text-[hsl(var(--ethblox-text-secondary))] mb-6 max-w-md mx-auto">
            Start by minting bricks in the builder, then create and mint your first build.
          </p>
          <Link href="/buildv2">
            <Button className="bg-[hsl(var(--ethblox-green))] text-black hover:bg-[hsl(var(--ethblox-green)/0.9)] font-semibold">
              Start Building
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

function BuildCard({ build }: { build: Build }) {
  const kindLabel = (build.kind === 0 || build.kind === undefined) ? "Brick" : "Build"
  const sizeLabel = build.brickWidth && build.brickDepth
    ? `${build.brickWidth}x${build.brickDepth}`
    : build.baseWidth && build.baseDepth
      ? `${build.baseWidth}x${build.baseDepth}`
      : null
  const massLabel = build.mass ? `${build.mass} BLOX` : null

  return (
    <Link href={`/explore/${build.tokenId}`}>
      <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] hover:border-[hsl(var(--ethblox-green)/0.5)] transition-all cursor-pointer group overflow-hidden">
        {/* Image */}
        <div className="aspect-square bg-[hsl(var(--ethblox-bg))] relative overflow-hidden">
          <BuildVoxelPreview
            bricks={build.bricks}
            geometryHash={build.geometryHash || build.buildHash}
            tokenId={build.tokenId}
            transparentBricks={build.kind === 0}
            showStuds={build.kind === 0}
            className="h-full w-full"
          />
          {/* Token ID badge */}
          <span className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            #{build.tokenId}
          </span>
        </div>

        {/* Info */}
        <CardContent className="p-3 space-y-1.5">
          <p className="text-sm font-medium text-[hsl(var(--ethblox-text-primary))] truncate">
            {build.name || `Build #${build.tokenId}`}
          </p>

          <div className="flex items-center gap-2 flex-wrap text-xs text-[hsl(var(--ethblox-text-tertiary))]">
            <span className="px-1.5 py-0.5 rounded bg-[hsl(var(--ethblox-bg))] text-[hsl(var(--ethblox-text-secondary))]">
              {kindLabel}
            </span>
            {sizeLabel && (
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {sizeLabel}
              </span>
            )}
            {massLabel && (
              <span className="text-[hsl(var(--ethblox-text-tertiary))]">
                {massLabel}
              </span>
            )}
          </div>

          {build.buildHash && (
            <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--ethblox-text-tertiary))] font-mono truncate">
              <Hash className="h-3 w-3 flex-shrink-0" />
              {build.buildHash.slice(0, 10)}...
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
