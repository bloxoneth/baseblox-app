"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useMetaMask } from "@/contexts/metamask-context"
import { useBloxBalance } from "@/lib/web3/hooks/useBloxBalance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Copy, Check, Edit3, ExternalLink, Download, User, Star, Layers } from "lucide-react"
import { CONTRACTS, tokenImageGatewayURL } from "@/lib/contracts/ethblox-contracts"
import { calculateTotalBlox } from "@/lib/brick-utils"
import type { Brick } from "@/lib/types"
import { fetchWithDataSource, useDataSourceMode } from "@/lib/data-source"
import { BuildVoxelPreview } from "@/components/preview/BuildVoxelPreview"

interface ProfileData {
  address: string
  displayName: string
  bio: string
  pfpTokenId: number | null
  pinnedTokenIds: number[]
  updatedAt: string
}

interface MintedBuild {
  tokenId: string
  buildId: string
  name: string
  mass: number
  kind?: number
  brickWidth?: number
  brickDepth?: number
  density?: number
  bw_score?: number
  buildHash?: string
  geometryHash?: string
  specKey?: string
  creator?: string
  bricks?: Brick[]
  composition?: Record<string, { name: string; count: number }>
  mintedAt?: string
}

interface ProfileClientProps {
  address: string
}

export default function ProfileClient({ address }: ProfileClientProps) {
  const { account, isConnected } = useMetaMask()
  const { balance: profileChainBalance, isCorrectChain } = useBloxBalance(address)
  const sourceMode = useDataSourceMode()
  const { toast } = useToast()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editPfpTokenId, setEditPfpTokenId] = useState("")
  const [editPinnedTokenIds, setEditPinnedTokenIds] = useState("")
  
  // Builds state
  const [mintedBuilds, setMintedBuilds] = useState<MintedBuild[]>([])
  const [buildsLoading, setBuildsLoading] = useState(true)
  const [pfpImageFailed, setPfpImageFailed] = useState(false)
  
  const isOwnProfile = useMemo(() => {
    return account?.toLowerCase() === address.toLowerCase()
  }, [account, address])

  const displayName = useMemo(() => {
    if (profile?.displayName) return profile.displayName
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [profile, address])

  useEffect(() => {
    fetchProfile()
    fetchBuilds()
    // fetchProfileBalance() // Comment out the original fetchProfileBalance function call
  }, [address, sourceMode])

  useEffect(() => {
    setPfpImageFailed(false)
  }, [profile?.pfpTokenId])

  // Fetch BLOX balance for the profile address (works for any address)
  // const fetchProfileBalance = async () => { // Comment out the original fetchProfileBalance function
  //   try {
  //     const ethereum = (window as any).ethereum
  //     if (!ethereum) return
      
  //     // Call balanceOf on the BLOX contract for the profile address
  //     const BLOX_CONTRACT = "0x5e9D63883A5Bb6A5136D59Dc4cff0205bC0Cc2A4" // From contracts
  //     const balanceHex = await ethereum.request({
  //       method: "eth_call",
  //       params: [
  //         {
  //           to: BLOX_CONTRACT,
  //           data: `0x70a08231000000000000000000000000${address.slice(2)}`, // balanceOf(address)
  //         },
  //         "latest",
  //       ],
  //     })

  //     if (!balanceHex || balanceHex === "0x" || balanceHex === "0x0") {
  //       setProfileBalance("0.00")
  //       return
  //     }

  //     const balanceWei = BigInt(balanceHex)
  //     const balanceEther = Number(balanceWei) / 1e18
  //     setProfileBalance(balanceEther.toFixed(2))
  //   } catch (err) {
  //     console.error("[v0] Failed to fetch profile BLOX balance:", err)
  //     setProfileBalance("0.00")
  //   }
  // }

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/profile/${address}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        // Initialize edit form
        setEditDisplayName(data.displayName || "")
        setEditBio(data.bio || "")
        setEditPfpTokenId(data.pfpTokenId?.toString() || "")
        setEditPinnedTokenIds(data.pinnedTokenIds?.join(", ") || "")
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBuilds = async () => {
    setBuildsLoading(true)
    try {
      const response = await fetchWithDataSource("/api/builds/minted")
      if (response.ok) {
        const data = await response.json()
        
        // Filter builds by this address (owner/creator)
        const userBuilds = (data.builds || []).filter(
          (b: MintedBuild) => b.creator?.toLowerCase() === address.toLowerCase()
        )
        
        // Fetch full build data (including bricks) for each build
        const buildsWithBricks = await Promise.all(
          userBuilds.map(async (build: MintedBuild) => {
            try {
              const buildResponse = await fetchWithDataSource(`/api/builds/token/${build.tokenId}`)
              if (buildResponse.ok) {
                const fullBuildData = await buildResponse.json()
                return { 
                  ...build, 
                  bricks: fullBuildData.bricks || []
                }
              }
            } catch (e) {
              // Silent fail - build will have no bricks
            }
            return build
          })
        )
        
        setMintedBuilds(buildsWithBricks)
      }
    } catch (error) {
      // Silent fail
    } finally {
      setBuildsLoading(false)
    }
  }

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveProfile = async () => {
    if (!account) return
    
    setSaving(true)
    try {
      const pinnedIds = editPinnedTokenIds
        .split(",")
        .map(s => s.trim())
        .filter(s => s !== "")
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n))

      const response = await fetch(`/api/profile/${address}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectedWallet: account,
          displayName: editDisplayName,
          bio: editBio,
          pfpTokenId: editPfpTokenId ? parseInt(editPfpTokenId, 10) : null,
          pinnedTokenIds: pinnedIds,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setEditDialogOpen(false)
        toast({
          title: "Profile updated",
          description: "Your changes have been saved.",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLoadBuild = async (tokenId: string) => {
    try {
      const response = await fetchWithDataSource(`/api/builds/token/${tokenId}`)
      if (response.ok) {
        const buildData = await response.json()
        if (typeof window !== "undefined") {
          localStorage.setItem("ethblox_load_build_data", JSON.stringify(buildData))
          window.location.href = "/build"
        }
      }
    } catch (error) {
      console.error("[v0] Error loading build:", error)
    }
  }

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  // Get pinned builds
  const pinnedBuilds = useMemo(() => {
    if (!profile?.pinnedTokenIds?.length) return []
    return mintedBuilds.filter(b => profile.pinnedTokenIds.includes(parseInt(b.tokenId, 10)))
  }, [profile, mintedBuilds])

  // Calculate locked BLOX (sum of all brick volumes: width × depth)
  const lockedBlox = useMemo(() => {
    return mintedBuilds.reduce((sum, build) => {
      if (build.bricks && build.bricks.length > 0) {
        return sum + calculateTotalBlox(build.bricks)
      }
      return sum
    }, 0)
  }, [mintedBuilds])

  // Get PFP build data
  const pfpBuild = useMemo(() => {
    if (!profile?.pfpTokenId) return null
    return mintedBuilds.find(b => parseInt(b.tokenId, 10) === profile.pfpTokenId) || null
  }, [profile, mintedBuilds])

  // Set NFT as PFP
  const handleSetAsPfp = useCallback(async (tokenId: string) => {
    if (!account || !isOwnProfile) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/profile/${address}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectedWallet: account,
          pfpTokenId: parseInt(tokenId, 10),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setEditPfpTokenId(tokenId)
        toast({
          title: "PFP updated",
          description: `Build #${tokenId} is now your profile picture.`,
        })
      }
    } catch (error) {
      console.error("[v0] Error setting PFP:", error)
      toast({
          title: "Error",
          description: "Failed to set PFP",
          variant: "destructive",
        })
    } finally {
      setSaving(false)
    }
  }, [account, address, isOwnProfile, toast])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-5xl">
        {/* Header Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar - IPFS Image PFP */}
              <div className="w-24 h-24 rounded-xl bg-[hsl(var(--ethblox-surface-elevated))] overflow-hidden shrink-0 border border-[hsl(var(--ethblox-border))]">
                {profile?.pfpTokenId ? (
                  pfpImageFailed ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--ethblox-yellow))] to-[hsl(var(--ethblox-accent-cyan))]">
                      <User className="h-10 w-10 text-black" />
                    </div>
                  ) : (
                    <img
                      src={tokenImageGatewayURL(profile.pfpTokenId)}
                      alt={`PFP #${profile.pfpTokenId}`}
                      className="w-full h-full object-contain bg-[hsl(var(--ethblox-bg))]"
                      onError={() => setPfpImageFailed(true)}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--ethblox-yellow))] to-[hsl(var(--ethblox-accent-cyan))]">
                    <User className="h-10 w-10 text-black" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))] mb-1">
                  {displayName}
                </h1>
                {profile?.bio && (
                  <p className="text-[hsl(var(--ethblox-text-secondary))] mb-3">{profile.bio}</p>
                )}
                <div className="flex items-center gap-2">
                  <code className="text-sm text-[hsl(var(--ethblox-text-tertiary))] font-mono bg-[hsl(var(--ethblox-surface-elevated))] px-2 py-1 rounded">
                    {truncateAddress(address)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyAddress}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <Button onClick={() => setEditDialogOpen(true)} variant="outline">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <Button variant="outline" disabled title="Coming soon">
                    Follow
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

{/* Portfolio Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-1">BLOX</p>
              <p className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))]">
                {isCorrectChain ? (profileChainBalance || "0.00") : "--"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-1">Locked</p>
              <p className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))]">
                {lockedBlox.toFixed(2)}
              </p>
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">in builds</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-1">Locked</p>
              <p className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))]">--</p>
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Coming soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-1">Fees</p>
              <p className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))]">--</p>
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Coming soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-1">Builds</p>
              <p className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))]">{mintedBuilds.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-1">Licenses</p>
              <p className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))]">--</p>
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Coming soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Builds Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Builds</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pinned">
              <TabsList className="mb-4">
                <TabsTrigger value="pinned">Pinned ({pinnedBuilds.length})</TabsTrigger>
                <TabsTrigger value="owned">Owned ({mintedBuilds.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pinned">
                {pinnedBuilds.length === 0 ? (
                  <div className="text-center py-8 text-[hsl(var(--ethblox-text-tertiary))]">
                    {isOwnProfile ? "Pin builds to showcase them on your profile" : "No pinned builds yet"}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pinnedBuilds.map((build) => (
                      <BuildCard
                        key={build.tokenId}
                        build={build}
                        onLoad={handleLoadBuild}
                        onSetAsPfp={handleSetAsPfp}
                        isOwnProfile={isOwnProfile}
                        isPfp={profile?.pfpTokenId === parseInt(build.tokenId, 10)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="owned">
                {buildsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--ethblox-green))]" />
                  </div>
                ) : mintedBuilds.length === 0 ? (
                  <div className="text-center py-8 text-[hsl(var(--ethblox-text-tertiary))]">
                    {isOwnProfile ? (
                      <>
                        No minted builds yet.{" "}
                        <Link href="/build" className="text-[hsl(var(--ethblox-accent-cyan))] hover:underline">
                          Create your first build
                        </Link>
                      </>
                    ) : (
                      "No builds yet"
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {mintedBuilds.map((build) => (
                      <BuildCard
                        key={build.tokenId}
                        build={build}
                        onLoad={handleLoadBuild}
                        onSetAsPfp={handleSetAsPfp}
                        isOwnProfile={isOwnProfile}
                        isPfp={profile?.pfpTokenId === parseInt(build.tokenId, 10)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Licenses Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Licenses</CardTitle>
            <CardDescription>Licenses owned by this builder</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-[hsl(var(--ethblox-text-tertiary))]">
              Coming soon
            </div>
          </CardContent>
        </Card>

        {/* Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-[hsl(var(--ethblox-text-tertiary))]">
              Coming soon
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <DialogHeader>
              <DialogTitle className="text-[hsl(var(--ethblox-text-primary))]">Edit Profile</DialogTitle>
              <DialogDescription className="text-[hsl(var(--ethblox-text-secondary))]">
                Update your public profile information
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-[hsl(var(--ethblox-text-secondary))] mb-1.5 block">
                  Display Name (max 32 chars)
                </label>
                <Input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value.slice(0, 32))}
                  placeholder="Enter display name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-[hsl(var(--ethblox-text-secondary))] mb-1.5 block">
                  Bio (max 160 chars)
                </label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value.slice(0, 160))}
                  placeholder="Tell others about yourself"
                  rows={3}
                />
                <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">
                  {editBio.length}/160
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[hsl(var(--ethblox-text-secondary))] mb-1.5 block">
                  PFP Token ID
                </label>
                <Input
                  type="number"
                  value={editPfpTokenId}
                  onChange={(e) => setEditPfpTokenId(e.target.value)}
                  placeholder="Enter a Build NFT token ID you own"
                />
                <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">
                  Set this to a BuildNFT tokenId you own
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[hsl(var(--ethblox-text-secondary))] mb-1.5 block">
                  Pinned Build IDs
                </label>
                <Input
                  value={editPinnedTokenIds}
                  onChange={(e) => setEditPinnedTokenIds(e.target.value)}
                  placeholder="e.g. 12, 45, 78"
                />
                <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">
                  Comma-separated list of token IDs to pin (max 10)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-[hsl(var(--ethblox-green))] text-black hover:bg-[hsl(var(--ethblox-green))]/90"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// Build Card Component with IPFS Image
function BuildCard({ 
  build, 
  onLoad, 
  onSetAsPfp, 
  isOwnProfile,
  isPfp 
}: { 
  build: MintedBuild
  onLoad: (tokenId: string) => void
  onSetAsPfp?: (tokenId: string) => void
  isOwnProfile?: boolean
  isPfp?: boolean
}) {
  const name = build.name || `Build #${build.tokenId}`
  const kindLabel = (build.kind === 0 || build.kind === undefined) ? "Brick" : "Build"
  const sizeLabel = build.brickWidth && build.brickDepth
    ? `${build.brickWidth}x${build.brickDepth}`
    : null
  const imageUrl = tokenImageGatewayURL(build.tokenId)
  const isBrick = build.kind === 0 || build.kind === undefined

  return (
    <Card className={`flex flex-col overflow-hidden ${isPfp ? 'ring-2 ring-[hsl(var(--ethblox-accent-cyan))]' : ''}`}>
      {/* IPFS Image */}
      <Link href={`/explore/${build.tokenId}`} className="block">
        <div className="w-full aspect-square bg-[hsl(var(--ethblox-bg))] relative overflow-hidden">
          <BuildVoxelPreview
            bricks={build.bricks}
            geometryHash={build.geometryHash || build.buildHash}
            tokenId={build.tokenId}
            imageUrl={imageUrl}
            transparentBricks={isBrick}
            showStuds={isBrick}
            className="w-full h-full"
          />
          <span className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            #{build.tokenId}
          </span>
          {isPfp && (
            <Badge className="absolute top-2 left-2 bg-[hsl(var(--ethblox-accent-cyan))] text-black">
              PFP
            </Badge>
          )}
        </div>
      </Link>
      
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="line-clamp-1 text-base">{name}</CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-[hsl(var(--ethblox-bg))] text-[hsl(var(--ethblox-text-secondary))] text-xs">
              {kindLabel}
            </span>
            {sizeLabel && (
              <span className="flex items-center gap-1 text-xs">
                <Layers className="h-3 w-3" />
                {sizeLabel}
              </span>
            )}
            {build.mass > 0 && (
              <span className="text-xs">{build.mass} BLOX</span>
            )}
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardFooter className="flex gap-2 pt-2 mt-auto">
        <Button className="flex-1" variant="secondary" size="sm" onClick={() => onLoad(build.tokenId)}>
          <Download className="mr-2 h-4 w-4" />
          Load
        </Button>
        {isOwnProfile && onSetAsPfp && !isPfp && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onSetAsPfp(build.tokenId)}
            title="Set as Profile Picture"
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/explore/${build.tokenId}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
