"use client"
import V0Blocks from "@/components/build/V0Blocks"
import { useState, useEffect, useMemo } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import type { Brick } from "@/lib/types"

type MintedBuild = {
  id: string
  name: string
  tokenId: number
  buildId?: string
  geoHash?: string
  bricks?: Brick[] // Make bricks optional to handle both embedded and lazy loading
  kind?: number
  brickWidth?: number
  brickDepth?: number
  baseWidth?: number
  baseDepth?: number
  density?: number
}

const loadNFTBuildData = async (tokenId: number): Promise<Brick[] | null> => {
  try {
    console.log("[v0] Loading NFT build data for token:", tokenId)
    const response = await fetch(`/api/builds/token/${tokenId}`)

    console.log("[v0] Token API response status:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Token API returned error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: `/api/builds/token/${tokenId}`,
      })
      return null
    }

    const buildData = await response.json()
    console.log("[v0] NFT build data received:", {
      tokenId: buildData.tokenId,
      name: buildData.name,
      bricksCount: buildData.bricks?.length || 0,
      buildId: buildData.buildId,
    })

    const loadedBricks = buildData.bricks

    if (Array.isArray(loadedBricks) && loadedBricks.length > 0) {
      console.log("[v0] Loaded bricks array with", loadedBricks.length, "bricks")

      let minX = Number.POSITIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        minZ = Number.POSITIVE_INFINITY

      let maxX = Number.NEGATIVE_INFINITY,
        maxY = Number.NEGATIVE_INFINITY,
        maxZ = Number.NEGATIVE_INFINITY

      loadedBricks.forEach((b: Brick) => {
        minX = Math.min(minX, b.position[0])
        minY = Math.min(minY, b.position[1])
        minZ = Math.min(minZ, b.position[2])
        maxX = Math.max(maxX, b.position[0])
        maxY = Math.max(maxY, b.position[1])
        maxZ = Math.max(maxZ, b.position[2])
      })

      console.log("[v0] NFT Bounds Before Normalization:", {
        minX,
        maxX,
        rangeX: maxX - minX,
        minY,
        maxY,
        rangeY: maxY - minY,
        minZ,
        maxZ,
        rangeZ: maxZ - minZ,
        count: loadedBricks.length,
      })

      const uniqueYValues = [...new Set(loadedBricks.map((b: Brick) => b.position[1]))].sort((a, b) => a - b)
      console.log("[v0] Unique Y values (layers) in NFT:", uniqueYValues)

      const normalizedBricks = loadedBricks.map((b: Brick) => ({
        ...b,
        position: [Math.round(b.position[0] - minX), b.position[1] - minY, Math.round(b.position[2] - minZ)] as [
          number,
          number,
          number,
        ],
      }))

      const normalizedYValues = [...new Set(normalizedBricks.map((b: Brick) => b.position[1]))].sort((a, b) => a - b)
      console.log("[v0] Unique Y values after normalization:", normalizedYValues)

      console.log("[v0] Successfully normalized", normalizedBricks.length, "bricks to min corner (0,0,0)")
      return normalizedBricks
    }

    console.log("[v0] Returning empty bricks array")
    return loadedBricks
  } catch (error) {
    console.error("[v0] Error loading NFT build:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tokenId,
    })
    return null
  }
}

export default function V0BlocksV2({
  onClearSession,
  initialLoadedBuild,
  initialBricks,
  onAutoSave,
  onLoadBuild,
}: {
  onClearSession?: () => void
  initialLoadedBuild?: { name: string; bricks: Brick[] } | null
  initialBricks?: Brick[]
  onAutoSave?: (bricks: Brick[]) => void
  onLoadBuild?: (build: { name: string; bricks: Brick[] } | null) => void
}) {
  const { toast } = useToast()
  const [showNFTDrawer, setShowNFTDrawer] = useState(false)
  const [mintedBuilds, setMintedBuilds] = useState<MintedBuild[]>([])
  const [nftGeometry, setNftGeometry] = useState<Brick[] | null>(null)
  const [nftInfo, setNftInfo] = useState<{ tokenId: number; name: string; bricksCount: number } | null>(null)
  const [placedNFTs, setPlacedNFTs] = useState<
    Array<{ tokenId: number; name: string; bricksCount: number; brickIds: string[] }>
  >([])
  const [isNFTCounterExpanded, setIsNFTCounterExpanded] = useState(false)
  const [brickCounts, setBrickCounts] = useState<Array<{ width: number; depth: number; count: number; minted: boolean }>>([])
  const [brickSizeOverride, setBrickSizeOverride] = useState<{ width: number; depth: number; density?: number } | null>(null)

  const nftCounts = useMemo(() => {
    const counts = new Map<number, { name: string; tokenId: number; bricksCount: number; count: number }>()

    placedNFTs.forEach((nft) => {
      const existing = counts.get(nft.tokenId)
      if (existing) {
        existing.count++
      } else {
        counts.set(nft.tokenId, { ...nft, count: 1 })
      }
    })

    return Array.from(counts.values())
  }, [placedNFTs])

  const nftComposition = useMemo(() => {
    const composition: Record<string, { count: number; name: string }> = {}
    placedNFTs.forEach((nft) => {
      const tokenId = nft.tokenId.toString()
      if (!composition[tokenId]) {
        composition[tokenId] = {
          count: 0,
          name: nft.name,
        }
      }
      composition[tokenId].count++
    })
    return composition
  }, [placedNFTs])

  useEffect(() => {
    console.log("[v0] V0BlocksV2 mounted")
    if (showNFTDrawer && mintedBuilds.length === 0) {
      fetchMintedBuilds()
    }
  }, [showNFTDrawer, mintedBuilds.length])

  const fetchMintedBuilds = async () => {
    console.log("[v0 PRODUCTION DEBUG] Starting fetchMintedBuilds...")
    console.log("[v0 PRODUCTION DEBUG] API URL:", "/api/builds/minted")

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch("/api/builds/minted", {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))

      console.log("[v0 PRODUCTION DEBUG] Response status:", response.status)
      console.log("[v0 PRODUCTION DEBUG] Response headers:", Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log("[v0 PRODUCTION DEBUG] Response data structure:", {
          hasBuilds: !!data.builds,
          buildsType: Array.isArray(data.builds) ? "array" : typeof data.builds,
          buildsLength: data.builds?.length,
          firstBuild: data.builds?.[0]
            ? {
                tokenId: data.builds[0].tokenId,
                name: data.builds[0].name,
                hasBricks: !!data.builds[0].bricks,
                bricksLength: data.builds[0].bricks?.length,
              }
            : null,
        })
        setMintedBuilds(data.builds || [])
      } else {
        const errorText = await response.text()
        console.error("[v0 PRODUCTION DEBUG] Failed to fetch:", {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          url: "/api/builds/minted",
        })
        toast({
          title: "Failed to load NFTs",
          description: `HTTP ${response.status}: ${response.statusText}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[v0 PRODUCTION DEBUG] Request timed out after 10 seconds")
        toast({
          title: "Request Timeout",
          description: "NFT loading took too long. Please try again.",
          variant: "destructive",
        })
      } else {
        console.error("[v0 PRODUCTION DEBUG] Fetch error:", {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : "Unknown",
        })
        toast({
          title: "Failed to load NFTs",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        })
      }
    }
  }

  const handleNFTSelection = async (nft: MintedBuild) => {
    console.log("[v0 PRODUCTION DEBUG] NFT Selected:", {
      tokenId: nft.tokenId,
      name: nft.name,
      buildId: nft.buildId,
      hasBricksEmbedded: !!nft.bricks && nft.bricks.length > 0,
      bricksInList: nft.bricks?.length,
      bricksType: Array.isArray(nft.bricks) ? "array" : typeof nft.bricks,
      firstBrick: nft.bricks?.[0],
    })

    let nftBrickGeometry: Brick[] | null = null

    if (nft.bricks && Array.isArray(nft.bricks) && nft.bricks.length > 0) {
      console.log("[v0] Using embedded bricks for NFT:", nft.bricks.length, "bricks")
      nftBrickGeometry = nft.bricks
    } else {
      console.log("[v0] No embedded bricks, fetching separately for token:", nft.tokenId)
      nftBrickGeometry = await loadNFTBuildData(nft.tokenId)
    }

    if (nftBrickGeometry && nftBrickGeometry.length > 0) {
      console.log("[v0] ===== RAW NFT BRICK DATA BEFORE NORMALIZATION =====")
      console.log("[v0] Total bricks:", nftBrickGeometry.length)

      // Log ALL raw Y values to understand the vertical structure
      const rawYValues = nftBrickGeometry.map((b: Brick) => b.position[1])
      const uniqueRawYValues = [...new Set(rawYValues)].sort((a, b) => a - b)
      console.log("[v0] ALL raw Y values:", rawYValues)
      console.log("[v0] UNIQUE raw Y values (should show layers):", uniqueRawYValues)
      console.log("[v0] Number of unique Y levels (layers):", uniqueRawYValues.length)

      // Log first 5 bricks with full position data
      console.log("[v0] First 5 bricks (raw positions):")
      nftBrickGeometry.slice(0, 5).forEach((b, i) => {
        console.log(
          `[v0]   Brick ${i}: position=[${b.position.join(",")}], size=${b.width}x${b.depth}, color=${b.color}`,
        )
      })

      let minX = Number.POSITIVE_INFINITY,
        minY = Number.POSITIVE_INFINITY,
        minZ = Number.POSITIVE_INFINITY

      let maxX = Number.NEGATIVE_INFINITY,
        maxY = Number.NEGATIVE_INFINITY,
        maxZ = Number.NEGATIVE_INFINITY

      nftBrickGeometry.forEach((b: Brick) => {
        minX = Math.min(minX, b.position[0])
        minY = Math.min(minY, b.position[1])
        minZ = Math.min(minZ, b.position[2])
        maxX = Math.max(maxX, b.position[0])
        maxY = Math.max(maxY, b.position[1])
        maxZ = Math.max(maxZ, b.position[2])
      })

      console.log("[v0] NFT Bounds (Embedded Bricks):", {
        minX,
        maxX,
        rangeX: maxX - minX,
        minY,
        maxY,
        rangeY: maxY - minY,
        minZ,
        maxZ,
        rangeZ: maxZ - minZ,
        count: nftBrickGeometry.length,
      })

      if (uniqueRawYValues.length === 1) {
        console.warn("[v0] ⚠️ WARNING: All bricks have the SAME Y value! NFT appears flat.")
        console.warn("[v0] This means the vertical structure was NOT preserved when the NFT was saved.")
      }

      // Kind 0 brick NFTs: use the regular brick tool with brickWidth/brickDepth
      // This avoids issues where a single brick was saved as multiple sub-bricks
      const buildKind = nft.kind ?? 0
      const brickW = nft.brickWidth ?? nft.baseWidth
      const brickD = nft.brickDepth ?? nft.baseDepth
      const brickDensity = nft.density
      
      if (buildKind === 0 && brickW && brickD) {
        setNftGeometry(null)
        setNftInfo(null)
        setBrickSizeOverride({ width: brickW, depth: brickD, density: brickDensity })
        toast({
          title: `${nft.name || `Build #${nft.tokenId}`}`,
          description: `Brick set to ${brickW}x${brickD}${brickDensity ? ` D${brickDensity}` : ""}. Click to place!`,
        })
      } else {
        // Multi-brick builds: normalize positions (preserve exact sub-stud offsets)
        const normalizedBricks = nftBrickGeometry.map((b: Brick) => ({
          ...b,
          position: [b.position[0] - minX, b.position[1] - minY, b.position[2] - minZ] as [
            number,
            number,
            number,
          ],
        }))

        setBrickSizeOverride(null)
        setNftGeometry(normalizedBricks)
        setNftInfo({ tokenId: nft.tokenId, name: nft.name, bricksCount: normalizedBricks.length })
        toast({
          title: "NFT Ready",
          description: `${nft.name || `Build #${nft.tokenId}`} loaded with ${uniqueRawYValues.length} layer(s). Click to place!`,
        })
      }
    } else {
      console.error("[v0] Failed to load NFT geometry")
      toast({
        title: "Error",
        description: "Failed to load NFT build data",
        variant: "destructive",
      })
    }

    setShowNFTDrawer(false)
  }

  const handleNFTPlaced = (tokenId: number, name: string, bricksCount: number, brickIds: string[]) => {
    setPlacedNFTs((prev) => [...prev, { tokenId, name, bricksCount, brickIds }])
  }

  const handleBricksDeleted = (deletedBrickIds: string[]) => {
    // Find which NFT instances had bricks deleted by checking brickIds
    setPlacedNFTs((prev) => {
      const newPlacedNFTs: typeof prev = []
      
      for (const nft of prev) {
        // Check how many of this NFT instance's bricks were deleted
        const remainingBrickIds = nft.brickIds.filter((id) => !deletedBrickIds.includes(id))
        
        if (remainingBrickIds.length === nft.brickIds.length) {
          // No bricks from this instance were deleted, keep it
          newPlacedNFTs.push(nft)
        } else if (remainingBrickIds.length > 0) {
          // Some bricks deleted but not all - update the brick IDs
          // This handles partial deletion gracefully
          newPlacedNFTs.push({
            ...nft,
            brickIds: remainingBrickIds,
            bricksCount: remainingBrickIds.length,
          })
        }
        // If remainingBrickIds.length === 0, all bricks were deleted, don't add to new array
      }
      
      return newPlacedNFTs
    })
  }

  const handleBricksCleared = () => {
    setPlacedNFTs([])
    setNftGeometry(null)
    setNftInfo(null)
  }

  // Handle undo/redo - reconcile placedNFTs with actual bricks
  const handleBricksChanged = (currentBricks: { id: string; nftGroupId?: string }[] | undefined) => {
    // Safety check - if no bricks provided, clear all NFTs
    if (!currentBricks || !Array.isArray(currentBricks)) {
      setPlacedNFTs([])
      return
    }
    
    const currentBrickIds = new Set(currentBricks.map(b => b.id))
    
    setPlacedNFTs((prev) => {
      const newPlacedNFTs: typeof prev = []
      
      for (const nft of prev) {
        // Filter to only brick IDs that still exist
        const remainingBrickIds = nft.brickIds.filter(id => currentBrickIds.has(id))
        
        if (remainingBrickIds.length > 0) {
          newPlacedNFTs.push({
            ...nft,
            brickIds: remainingBrickIds,
            bricksCount: remainingBrickIds.length,
          })
        }
        // If no bricks remain, NFT instance is removed
      }
      
      return newPlacedNFTs
    })
  }

  // Clear NFT mode when user switches back to regular brick controls
  const handleClearNFTMode = () => {
    if (nftGeometry) {
      setNftGeometry(null)
      setNftInfo(null)
    }
    setBrickSizeOverride(null)
  }

  // Rotate NFT geometry 90 degrees clockwise
  const handleRotateNFT = () => {
    if (!nftGeometry) return
    
    // Rotate all bricks 90 degrees around the Y axis
    // For each brick: new_x = -z, new_z = x (clockwise rotation)
    const rotatedBricks = nftGeometry.map(brick => ({
      ...brick,
      position: [-brick.position[2], brick.position[1], brick.position[0]] as [number, number, number],
      // Swap width and depth for the brick itself
      width: brick.depth,
      depth: brick.width,
    }))
    
    setNftGeometry(rotatedBricks)
    toast({ title: "NFT rotated 90°" })
  }

  return (
    <div className="h-full w-full relative">
      <V0Blocks
        initialLoadedBuild={initialLoadedBuild}
      nftGeometry={nftGeometry}
      nftInfo={nftInfo}
      onNFTPlaced={handleNFTPlaced}
      onBricksCleared={handleBricksCleared}
      onBricksDeleted={handleBricksDeleted}
      onBricksChanged={handleBricksChanged}
      onClearNFTMode={handleClearNFTMode}
      onSetBrickSize={brickSizeOverride}
        onOpenNFTDrawer={() => {
          console.log("[v0] NFT button clicked")
          setShowNFTDrawer(true)
        }}
onRotateNFT={handleRotateNFT}
        onBrickCountsChange={setBrickCounts}
  />
  
  {/* Parts Used - inline in top bar after save/load buttons */}
  {(placedNFTs.length > 0 || brickCounts.length > 0) && (
        <div className="absolute top-[calc(3.5rem+0.5rem)] left-[180px] md:left-[220px] z-40">
          <div className="relative">
            <button
              onClick={() => setIsNFTCounterExpanded(!isNFTCounterExpanded)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/40 hover:bg-black/60 transition-colors"
            >
<span className="text-zinc-300 text-xs font-medium">Parts</span>
  <Badge variant="secondary" className="bg-[#CDFD3E] text-black text-xs px-2 py-0 h-5 min-w-[20px] flex items-center justify-center font-semibold">
  {placedNFTs.length + brickCounts.reduce((sum, b) => sum + b.count, 0)}
  </Badge>
              {isNFTCounterExpanded ? (
                <ChevronUp className="h-3 w-3 text-zinc-400" />
              ) : (
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              )}
            </button>

            {/* Dropdown */}
            {isNFTCounterExpanded && (
              <div className="absolute top-full left-0 mt-1 bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-lg border border-[hsl(210,8%,28%)] shadow-2xl overflow-hidden min-w-[180px]">
                <div className="px-3 py-2 max-h-48 overflow-y-auto">
                  <div className="space-y-1.5">
                    {/* NFT Builds */}
                    {nftCounts.length > 0 && (
                      <>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wide pb-1">NFT Builds</div>
                        {nftCounts.map((nft) => (
                          <div key={nft.tokenId} className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-zinc-300 truncate max-w-[100px]">{nft.name}</span>
                            <span className="text-[#CDFD3E] font-mono font-semibold">x{nft.count}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {/* Brick Types */}
                    {brickCounts.length > 0 && (
                      <>
                        {nftCounts.length > 0 && <div className="border-t border-zinc-700 my-2" />}
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wide pb-1">Bricks</div>
                        {brickCounts.map((brick) => (
                          <div key={`${brick.width}x${brick.depth}`} className="flex items-center justify-between gap-3 text-xs">
                            <span className={brick.minted ? "text-zinc-300" : "text-orange-400"}>
                              {brick.width}x{brick.depth}
                              {!brick.minted && <span className="ml-1 text-[10px]">(unminted)</span>}
                            </span>
                            <span className="text-[#CDFD3E] font-mono font-semibold">x{brick.count}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Sheet open={showNFTDrawer} onOpenChange={setShowNFTDrawer}>
        <SheetContent side="left" className="w-[400px] bg-[#0a0a0a] border-[hsl(210,8%,28%)]">
          <SheetHeader>
            <SheetTitle className="text-white">Place NFT Builds</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
            {mintedBuilds.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">Loading NFTs...</p>
            ) : (
              mintedBuilds.map((nft) => (
                <Card
                  key={nft.tokenId}
                  className="bg-[hsl(210,11%,15%)] border-[hsl(210,8%,28%)] cursor-pointer hover:border-[#CDFD3E] transition-colors"
                  onClick={() => handleNFTSelection(nft)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{nft.name || `Build #${nft.id.slice(0, 8)}`}</h3>
                        <div className="flex gap-2 mt-1">
                          <p className="text-sm text-zinc-400">{nft.bricks?.length || 0} bricks</p>
                          {nft.geoHash && <p className="text-xs text-zinc-500 font-mono">{nft.geoHash}</p>}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-[#CDFD3E] text-black">
                        #{nft.tokenId}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
