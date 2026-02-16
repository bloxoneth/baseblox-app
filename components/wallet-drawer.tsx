"use client"

import type React from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ExternalLink, RefreshCw, LogOut, AlertCircle, Flame, Settings } from "lucide-react"
import { useMetaMask } from "@/contexts/metamask-context"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useBloxBalance } from "@/lib/web3/hooks/useBloxBalance"
import { useBurnBuild } from "@/lib/web3/hooks/useBurnBuild"
import { loadBuild } from "@/lib/storage"
import { getUserMintedBuilds, BUILD_KIND, canBurn } from "@/lib/contracts/ethblox-contracts"
import { ethers } from "ethers"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Build {
  id: string
  name: string
  blockCount: number
  createdAt: string
}

interface MintedBuild {
  tokenId: string
  tokenURI: string
}

interface WalletDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ADMIN_ADDRESS = "0xe258B3C38CC85e251a1bdB3E60A8A85a071090b7"

export function WalletDrawer({ open, onOpenChange }: WalletDrawerProps) {
  const { account, disconnect, switchAccount, switchChain } = useMetaMask()
  const [builds, setBuilds] = useState<Build[]>([])
  const [mintedBuilds, setMintedBuilds] = useState<MintedBuild[]>([])
  const [loading, setLoading] = useState(true)
  const [mintedLoading, setMintedLoading] = useState(true)
  const { balance, loading: balanceLoading, isCorrectChain, switchToBaseSepolia, refetch } = useBloxBalance()
  const [burnDialogOpen, setBurnDialogOpen] = useState(false)
  const [selectedBurnToken, setSelectedBurnToken] = useState<string | null>(null)
  const [burning, setBurning] = useState(false) // Declare setBurning variable
  const { toast } = useToast()
  
  const { burn, isLoading: burningAction, reset: resetBurn } = useBurnBuild({
    onSuccess: async (txHash) => {
      // Update local state
      setMintedBuilds((prev) => prev.filter((build) => build.tokenId !== selectedBurnToken))
      
      // Notify API
      await fetch("/api/builds/burn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: selectedBurnToken }),
      }).catch(console.error)
      
      // Refetch balance
      if (refetch) await refetch()
      
      toast({
        title: "Build burned",
        description: "BLOX returned to your wallet.",
        variant: "default",
      })
      
      setBurnDialogOpen(false)
      setSelectedBurnToken(null)
      resetBurn()
    },
    onError: (error) => {
      toast({
        title: "Burn Failed",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const isAdmin = account?.toLowerCase() === ADMIN_ADDRESS.toLowerCase()

  useEffect(() => {
    if (open && account) {
      fetchBuilds()
      fetchMintedBuilds()
    }
  }, [open, account])

  const fetchBuilds = async () => {
    setLoading(true)
    try {
      if (!account) {
        setBuilds([])
        return
      }

      const savedBuilds = loadBuild(account)

      const formattedBuilds = savedBuilds
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((build) => ({
          id: build.id,
          name: build.name || "Untitled Build",
          blockCount: build.bricks.length,
          createdAt: new Date(build.timestamp).toLocaleDateString(),
        }))

      setBuilds(formattedBuilds)
    } catch (error) {
      console.error("[v0] Failed to fetch builds:", error)
      setBuilds([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMintedBuilds = async () => {
    setMintedLoading(true)
    try {
      if (!account || typeof window === "undefined" || !window.ethereum) {
        setMintedBuilds([])
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const minted = await getUserMintedBuilds(provider, account)
      setMintedBuilds(minted)
    } catch (error) {
      console.error("[v0] Failed to fetch minted builds:", error)
      setMintedBuilds([])
    } finally {
      setMintedLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleDisconnect = () => {
    disconnect()
    onOpenChange(false)
  }

  const handleLoadBuild = (buildId: string) => {
    window.location.href = `/buildv2?load=${buildId}`
  }

  const handleViewMintedBuild = (tokenId: string) => {
    console.log("[v0] View minted build:", tokenId)
  }

  const handleSwitchToAnvil = async () => {
    try {
      await switchChain("0x7a69")
    } catch (error) {
      console.error("[v0] Failed to switch to Anvil:", error)
    }
  }

  const handleBurnClick = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedBurnToken(tokenId)
    setBurnDialogOpen(true)
  }

  const handleConfirmBurn = async () => {
    if (!selectedBurnToken) return
    
    toast({
      title: "Transaction Submitted",
      description: "Waiting for burn confirmation...",
    })
    
    await burn(selectedBurnToken)
  }

  if (!account) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[570px] bg-[hsl(var(--ethblox-surface))] border-l border-[hsl(var(--ethblox-border))] overflow-y-auto"
      >
        <SheetHeader className="border-b border-[hsl(var(--ethblox-border))] pb-6 px-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--ethblox-yellow))] to-[hsl(var(--ethblox-accent-cyan))] flex items-center justify-center text-2xl font-bold text-black">
              B
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl font-heading text-[hsl(var(--ethblox-text-primary))] mb-1">
                Builder 420
              </SheetTitle>
              <p className="text-sm text-[hsl(var(--ethblox-text-tertiary))] font-mono">{formatAddress(account)}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--ethblox-green))] animate-pulse" />
                <span className="text-xs text-[hsl(var(--ethblox-text-secondary))] border border-[hsl(var(--ethblox-border))] px-2 py-0.5 rounded">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6 px-6">
          {!isCorrectChain && account && (
            <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-200 mb-2">Wrong Network</p>
                <p className="text-xs text-yellow-300/80 mb-3">
                  Please switch to the correct network to view your BLOX balance and interact with contracts.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={switchToBaseSepolia}
                    size="sm"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  >
                    Switch to Base Sepolia
                  </Button>
                  <Button
                    onClick={handleSwitchToAnvil}
                    size="sm"
                    variant="outline"
                    className="border-yellow-500/70 text-yellow-200 hover:bg-yellow-700/20"
                  >
                    Switch to Anvil
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[hsl(var(--ethblox-surface-elevated))] border border-[hsl(var(--ethblox-border))] rounded-lg p-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-2">BLOX</p>
              {balanceLoading ? (
                <div className="h-9 flex items-center">
                  <div className="animate-pulse h-6 w-16 bg-[hsl(var(--ethblox-border))] rounded" />
                </div>
              ) : !isCorrectChain ? (
                <p className="text-xl font-bold text-[hsl(var(--ethblox-text-tertiary))]">--</p>
              ) : (
                <p className="text-3xl font-bold text-[hsl(var(--ethblox-text-primary))]">{balance || "0.00"}</p>
              )}
            </div>
            <div className="bg-[hsl(var(--ethblox-surface-elevated))] border border-[hsl(var(--ethblox-border))] rounded-lg p-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-2">
                MINTED BUILDS
              </p>
              <p className="text-3xl font-bold text-[hsl(var(--ethblox-text-primary))]">{mintedBuilds.length}</p>
            </div>
            <div className="bg-[hsl(var(--ethblox-surface-elevated))] border border-[hsl(var(--ethblox-border))] rounded-lg p-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-2">
                PENDING REWARDS
              </p>
              <p className="text-3xl font-bold text-[hsl(var(--ethblox-text-primary))]">0.00</p>
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">Unclaimed</p>
            </div>
            <div className="bg-[hsl(var(--ethblox-surface-elevated))] border border-[hsl(var(--ethblox-border))] rounded-lg p-4">
              <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] uppercase tracking-wider mb-2">APR</p>
              <p className="text-3xl font-bold text-[hsl(var(--ethblox-text-primary))]">0.00%</p>
            </div>
          </div>

          <Button
            asChild
            className="w-full bg-[hsl(var(--ethblox-green))] hover:bg-[hsl(var(--ethblox-green))]/90 text-black font-semibold py-6 text-base"
          >
            <a
              href="https://app.uniswap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              Buy $BLOX
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <p className="text-xs text-center text-[hsl(var(--ethblox-text-tertiary))]">
            Acquire BLOX to mint, sculpt, and power your Builds.
          </p>

          

          {isAdmin && (
            <div className="border-t border-[hsl(var(--ethblox-border))] pt-4">
              <Button
                asChild
                variant="outline"
                className="w-full bg-gradient-to-r from-[hsl(var(--ethblox-yellow))]/10 to-transparent border-[hsl(var(--ethblox-yellow))]/50 text-[hsl(var(--ethblox-yellow))] hover:border-[hsl(var(--ethblox-yellow))] hover:bg-[hsl(var(--ethblox-yellow))]/20"
              >
                <Link href="/admin" className="flex items-center justify-center gap-2">
                  <Settings className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              </Button>
            </div>
          )}

          <div className="border-t border-[hsl(var(--ethblox-border))] pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--ethblox-text-primary))] uppercase tracking-wider">
                MY BUILDS ({mintedBuilds.length})
              </h3>
            </div>

            {mintedLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--ethblox-green))]" />
              </div>
            ) : mintedBuilds.length === 0 ? (
              <div className="text-center py-8 text-[hsl(var(--ethblox-text-tertiary))] text-sm">
                No minted builds yet. Mint your first NFT!
              </div>
            ) : (
              <div className="space-y-3">
                {mintedBuilds.map((build) => (
                  <div
                    key={build.tokenId}
                    className="w-full bg-gradient-to-r from-[hsl(var(--ethblox-green))]/10 to-transparent border border-[hsl(var(--ethblox-green))]/50 hover:border-[hsl(var(--ethblox-green))] rounded-lg p-4 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <button onClick={() => handleViewMintedBuild(build.tokenId)} className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[hsl(var(--ethblox-green))]">NFT</span>
                          <h4 className="font-semibold text-[hsl(var(--ethblox-text-primary))] group-hover:text-[hsl(var(--ethblox-green))] transition-colors">
                            Build #{build.tokenId}
                          </h4>
                        </div>
                        <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1 font-mono">
                          Token ID: {build.tokenId}
                        </p>
                      </button>
                      <Button
                        onClick={(e) => handleBurnClick(build.tokenId, e)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        disabled={!isCorrectChain}
                      >
                        <Flame className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[hsl(var(--ethblox-border))] pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--ethblox-text-primary))] uppercase tracking-wider">
                DRAFT BUILDS ({builds.length})
              </h3>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-[hsl(var(--ethblox-accent-cyan))] hover:text-[hsl(var(--ethblox-accent-cyan))]/80"
              >
                <Link href="/build">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Open Builder
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--ethblox-green))]" />
              </div>
            ) : builds.length === 0 ? (
              <div className="text-center py-8 text-[hsl(var(--ethblox-text-tertiary))] text-sm">
                No draft builds yet. Create your first build!
              </div>
            ) : (
              <div className="space-y-3">
                {builds.slice(0, 3).map((build) => (
                  <button
                    key={build.id}
                    onClick={() => handleLoadBuild(build.id)}
                    className="w-full bg-[hsl(var(--ethblox-surface-elevated))] border border-[hsl(var(--ethblox-border))] hover:border-[hsl(var(--ethblox-green))] rounded-lg p-4 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-[hsl(var(--ethblox-text-primary))] group-hover:text-[hsl(var(--ethblox-green))] transition-colors">
                          {build.name}
                        </h4>
                        <p className="text-sm text-[hsl(var(--ethblox-text-tertiary))] mt-1">
                          {build.blockCount} blocks
                        </p>
                      </div>
                      <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">{build.createdAt}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[hsl(var(--ethblox-border))]">
            <Button
              onClick={switchAccount}
              variant="outline"
              className="bg-transparent border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-secondary))] hover:border-[hsl(var(--ethblox-green))] hover:text-[hsl(var(--ethblox-green))]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Switch Account
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="bg-transparent border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-secondary))] hover:border-red-500 hover:text-red-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>
      </SheetContent>

      <Dialog open={burnDialogOpen} onOpenChange={setBurnDialogOpen}>
        <DialogContent className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--ethblox-text-primary))]">Burn Build</DialogTitle>
            <DialogDescription className="text-[hsl(var(--ethblox-text-secondary))]">
              This will permanently destroy this Build NFT. All locked BLOX will be returned to your wallet. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBurnDialogOpen(false)}
              disabled={burning}
              className="border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-secondary))]"
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmBurn} disabled={burning} className="bg-red-600 hover:bg-red-700 text-white">
              {burning ? "Burning..." : "Confirm Burn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
