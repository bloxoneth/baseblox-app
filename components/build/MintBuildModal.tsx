"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, X, Loader2, ExternalLink, CheckCircle2, AlertCircle, Bug } from "lucide-react"
import { MintPreviewCanvas } from "./MintPreviewCanvas"
import type { Brick } from "@/lib/types"
import { useMetaMask } from "@/contexts/metamask-context"
import { generateBuildHash } from "@/lib/build-hash"
import { calculateTotalBlox } from "@/lib/brick-utils"
import { ethers } from "ethers"
import {
  CONTRACTS,
  BUILD_KIND,
  FEE_PER_MINT,
  getBloxBalance,
  getBloxAllowance,
  getMaxMass,
  getNextTokenId,
  approveBlox,
  mintBuildNFTWithParams,
  getComponentLicenseStatus,
  buyMissingLicensesForComponents,
  isLicenseApproved,
  approveLicenseNFT,
  isHashMinted,
  addMintedHash,
} from "@/lib/contracts/ethblox-contracts"

interface MintBuildModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  buildId: string
  buildName: string
  bricks: Brick[]
  composition?: Record<string, { count: number; name: string }>
  metadata?: {
    buildWidth: number
    buildDepth: number
    totalBricks: number
    totalInstances: number
    nftsUsed: number
  }
}

function calculateBW(mass: number, uniqueColors: number): number {
  return Math.log(1 + mass) * Math.log(2 + uniqueColors)
}

// Calculate dynamic base dimensions from bricks
  function calculateBaseDimensions(bricks: Brick[]): { baseWidth: number; baseDepth: number } {
  if (bricks.length === 0) return { baseWidth: 1, baseDepth: 1 }
  
  let minX = Infinity, maxX = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  
  bricks.forEach(brick => {
  const halfW = brick.width / 2
  const halfD = brick.depth / 2
  minX = Math.min(minX, brick.position[0] - halfW)
  maxX = Math.max(maxX, brick.position[0] + halfW)
  minZ = Math.min(minZ, brick.position[2] - halfD)
  maxZ = Math.max(maxZ, brick.position[2] + halfD)
  })
  
  // Actual dimensions without padding - round to nearest integer
  const width = Math.max(1, Math.round(maxX - minX))
  const depth = Math.max(1, Math.round(maxZ - minZ))
  
  return {
  baseWidth: width,
  baseDepth: depth
  }
  }

export function MintBuildModal({
  open,
  onOpenChange,
  buildId,
  buildName,
  bricks,
  composition = {},
  metadata,
}: MintBuildModalProps) {
  const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.basescan.org"
  // Calculate base dimensions dynamically from bricks
  const { baseWidth, baseDepth } = calculateBaseDimensions(bricks)
  const [isMinting, setIsMinting] = useState(false)
  const [mintSuccess, setMintSuccess] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)
  const [showJsonData, setShowJsonData] = useState(false)
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [buildHash, setBuildHash] = useState<string | null>(null)
  const [mintStep, setMintStep] = useState<
    "idle" | "approving" | "approvingLicenses" | "buyingLicenses" | "minting" | "success" | "error"
  >("idle")
  const [bloxBalance, setBloxBalance] = useState<bigint | null>(null)
  const [bloxAllowance, setBloxAllowance] = useState<bigint | null>(null)
  const [maxMass, setMaxMass] = useState<bigint | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [autoBuyMissingLicenses, setAutoBuyMissingLicenses] = useState(true)
  const [missingLicenseCount, setMissingLicenseCount] = useState(0)

  const { account, isConnected, switchChain } = useMetaMask()
  const router = useRouter()

  const totalBloxMass = calculateTotalBlox(bricks)
  
  // Handler for Dev Mode - stores build data and navigates to debug page
  const handleDevMode = () => {
    // Store all mint data in sessionStorage for the debug page
    const mintDebugData = {
      buildId,
      buildName,
      buildHash,
      bricks,
      baseWidth,
      baseDepth,
      totalBloxMass,
      uniqueColors: new Set(bricks.map((b) => b.color)).size,
      composition,
      metadata,
      account,
      timestamp: Date.now(),
    }
    sessionStorage.setItem("ethblox_mint_debug", JSON.stringify(mintDebugData))
    onOpenChange(false)
    router.push("/mint-debug")
  }
  const uniqueColors = new Set(bricks.map((b) => b.color)).size
  const bw = calculateBW(totalBloxMass, uniqueColors)
  const estimatedBloxCost = totalBloxMass // 1:1 ratio
  const estimatedLicenseFeeEth = Number(ethers.formatEther(FEE_PER_MINT)) // mint fee
  const estimatedApy = (totalBloxMass * 0.05).toFixed(2)

  useEffect(() => {
    if (open && bricks.length > 0) {
      // Debug: Log all Y values to check vertical structure
      const yValues = bricks.map((b) => b.position[1])
      const uniqueYValues = [...new Set(yValues)].sort((a, b) => a - b)
      console.log("[v0 MINT DEBUG] ===== BRICKS RECEIVED BY MINT MODAL =====")
      console.log("[v0 MINT DEBUG] Total bricks:", bricks.length)
      console.log("[v0 MINT DEBUG] ALL Y values:", yValues)
      console.log("[v0 MINT DEBUG] UNIQUE Y values (layers):", uniqueYValues)
      console.log("[v0 MINT DEBUG] Number of layers:", uniqueYValues.length)

      if (uniqueYValues.length === 1) {
        console.warn("[v0 MINT DEBUG] ⚠️ WARNING: All bricks have SAME Y value - structure is FLAT!")
      } else {
        console.log("[v0 MINT DEBUG] ✓ Multiple Y levels detected - vertical structure preserved")
      }

      // Log first 5 bricks
      console.log("[v0 MINT DEBUG] First 5 bricks:")
      bricks.slice(0, 5).forEach((b, i) => {
        console.log(`[v0 MINT DEBUG]   Brick ${i}: pos=[${b.position.join(",")}], size=${b.width}x${b.depth}`)
      })

      generateBuildHash({
        bricks: bricks.map((b) => ({
          position: b.position,
          color: b.color,
          width: b.width,
          depth: b.depth,
        })),
        baseWidth,
        baseDepth,
      }).then((hash) => {
        console.log("[v0] Generated build hash:", hash)
        setBuildHash(hash)
      })
    }
  }, [open, bricks, baseWidth, baseDepth])

  useEffect(() => {
    if (!open || !isConnected || !account) return

    const fetchContractData = async () => {
      try {
        const ethereum = (window as any).ethereum
        if (!ethereum) return

        const provider = new ethers.BrowserProvider(ethereum)

        const [balance, allowance, maxMassValue] = await Promise.all([
          getBloxBalance(provider, account).catch(() => 0n),
          getBloxAllowance(provider, account, CONTRACTS.BUILD_NFT).catch(() => 0n),
          getMaxMass(provider).catch(() => 1000n),
        ])

        console.log("[v0] Contract data fetched:", {
          balance: ethers.formatEther(balance),
          allowance: ethers.formatEther(allowance),
          maxMass: maxMassValue.toString(),
        })

        setBloxBalance(balance)
        setBloxAllowance(allowance)
        setMaxMass(maxMassValue)

        // Check if approval is needed
        const requiredAmount = BigInt(totalBloxMass) * 10n ** 18n
        setNeedsApproval(allowance < requiredAmount)
      } catch (error) {
        // Only log if it's not the initial "0x" empty response
        if (error && typeof error === "object" && "code" in error && error.code !== "BAD_DATA") {
          console.error("[v0] Error fetching contract data:", error)
        }
      }
    }

    fetchContractData()
  }, [open, isConnected, account, totalBloxMass])

  useEffect(() => {
    if (!open || !isConnected || !account) {
      setMissingLicenseCount(0)
      return
    }
    const componentBuildIds = Object.entries(composition)
      .filter(([id, data]) => Number(id) > 0 && data.count > 0)
      .map(([id]) => BigInt(id))
    if (componentBuildIds.length === 0) {
      setMissingLicenseCount(0)
      return
    }

    const fetchMissing = async () => {
      try {
        const ethereum = (window as any).ethereum
        if (!ethereum) return
        const provider = new ethers.BrowserProvider(ethereum)
        const status = await getComponentLicenseStatus(provider, account, componentBuildIds)
        setMissingLicenseCount(status.missingComponentBuildIds.length)
      } catch {
        setMissingLicenseCount(0)
      }
    }
    fetchMissing()
  }, [open, isConnected, account, composition])

  const buildJsonData = {
    version: "0.1",
    sceneType: "ethblox-v0",
    buildId: buildId,
    buildHash: buildHash,
    composition: composition,
    metadata: metadata || {
      buildWidth: (() => {
        const minX = Math.min(...bricks.map((b) => b.position[0]))
        const maxX = Math.max(...bricks.map((b) => b.position[0] + b.width - 1))
        return Math.floor(maxX - minX + 1)
      })(),
      buildDepth: (() => {
        const minZ = Math.min(...bricks.map((b) => b.position[2]))
        const maxZ = Math.max(...bricks.map((b) => b.position[2] + b.depth - 1))
        return Math.floor(maxZ - minZ + 1)
      })(),
      totalBricks: bricks.length,
      totalInstances: Object.values(composition).reduce((sum, data) => sum + data.count, 0),
      nftsUsed: Object.keys(composition).length,
    },
    bricks: bricks.map((brick, index) => ({
      id: `blox-${index}-${Date.now()}`,
      position: brick.position,
      color: brick.color,
      width: brick.width,
      depth: brick.depth,
    })),
  }

  const handleConfirmMint = async () => {
    if (!isConnected || !account) {
      setErrorMessage("Please connect your wallet to mint")
      setMintStep("error")
      return
    }

    if (!buildHash) {
      setErrorMessage("Generating build hash, please wait...")
      setMintStep("error")
      return
    }

    const ethereum = (window as any).ethereum
    const currentChainId = await ethereum.request({ method: "eth_chainId" })
    if (currentChainId !== CONTRACTS.BASE_SEPOLIA_CHAIN_ID) {
      setErrorMessage("Please switch to Base Sepolia network")
      setMintStep("error")
      return
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(buildHash)) {
      setErrorMessage("Invalid build hash format")
      setMintStep("error")
      return
    }

    if (isHashMinted(buildHash)) {
      setErrorMessage("This build hash has already been minted and is permanently consumed.")
      setMintStep("error")
      return
    }

    if (totalBloxMass <= 0) {
      setErrorMessage("Build must have at least 1 BLOX")
      setMintStep("error")
      return
    }

    if (maxMass !== null && BigInt(totalBloxMass) > maxMass) {
      setErrorMessage(`Build exceeds maximum mass of ${maxMass.toString()} BLOX`)
      setMintStep("error")
      return
    }

    const requiredAmount = BigInt(totalBloxMass) * 10n ** 18n
    if (bloxBalance !== null && bloxBalance < requiredAmount) {
      setErrorMessage(`Insufficient BLOX balance. Need ${ethers.formatEther(requiredAmount)} BLOX`)
      setMintStep("error")
      return
    }

    setErrorMessage(null)
    setMintStep("idle")

    try {
      const provider = new ethers.BrowserProvider(ethereum)
      const componentEntries = Object.entries(composition).filter(([id, data]) => Number(id) > 0 && data.count > 0)
      const componentBuildIds = componentEntries.map(([id]) => BigInt(id))
      const componentCounts = componentEntries.map(([, data]) => BigInt(data.count))

      const currentAllowance = await getBloxAllowance(provider, account, CONTRACTS.BUILD_NFT)
      const needsApprovalNow = currentAllowance < requiredAmount

      if (needsApprovalNow) {
        setMintStep("approving")
        console.log("[v0] Requesting BLOX approval for:", ethers.formatEther(requiredAmount))

        const approveTx = await approveBlox(provider, requiredAmount)
        console.log("[v0] Approval tx sent:", approveTx.hash)

        await approveTx.wait()
        console.log("[v0] Approval confirmed")

        const newAllowance = await getBloxAllowance(provider, account, CONTRACTS.BUILD_NFT)
        setBloxAllowance(newAllowance)
        setNeedsApproval(false)
      }

      if (componentBuildIds.length > 0) {
        const status = await getComponentLicenseStatus(provider, account, componentBuildIds)
        if (status.missingComponentBuildIds.length > 0) {
          if (!autoBuyMissingLicenses) {
            throw new Error(
              `Missing licenses for component builds: ${status.missingComponentBuildIds.map((id) => id.toString()).join(", ")}.`,
            )
          }
          setMintStep("buyingLicenses")
          const purchaseResult = await buyMissingLicensesForComponents(provider, account, componentBuildIds)
          if (purchaseResult.txHashes.length > 0 || purchaseResult.registeredBuilds.length > 0) {
            const refreshed = await getComponentLicenseStatus(provider, account, componentBuildIds)
            setMissingLicenseCount(refreshed.missingComponentBuildIds.length)
          }
        }

        const licenseApproved = await isLicenseApproved(provider, account, CONTRACTS.BUILD_NFT)
        if (!licenseApproved) {
          setMintStep("approvingLicenses")
          const licenseApproveTx = await approveLicenseNFT(provider, CONTRACTS.BUILD_NFT, true)
          await licenseApproveTx.wait()
        }
      }

      setMintStep("minting")
      console.log("[v0] Minting NFT with hash:", buildHash, "mass:", totalBloxMass)

      const nextId = await getNextTokenId(provider)
      setTokenId(nextId)

      const mintTx = await mintBuildNFTWithParams(provider, {
        geometryHash: buildHash,
        mass: totalBloxMass,
        uri: "",
        componentBuildIds,
        componentCounts,
        kind: BUILD_KIND.BUILD,
        width: baseWidth,
        depth: baseDepth,
        density: 1,
      })
      console.log("[v0] Mint tx sent:", mintTx.hash)
      setTxHash(mintTx.hash)

      await mintTx.wait()
      console.log("[v0] Mint confirmed, tokenId:", nextId.toString())

      addMintedHash(buildHash)

      const [newBalance, newAllowance] = await Promise.all([
        getBloxBalance(provider, account),
        getBloxAllowance(provider, account, CONTRACTS.BUILD_NFT),
      ])
      setBloxBalance(newBalance)
      setBloxAllowance(newAllowance)
      setNeedsApproval(false)

      try {
        // Debug: Log bricks being sent to API
        console.log("[v0 MINT DEBUG] ===== SENDING TO API =====")
        console.log("[v0 MINT DEBUG] Bricks count:", bricks.length)
        const apiYValues = bricks.map((b) => b.position[1])
        const uniqueApiYValues = [...new Set(apiYValues)].sort((a, b) => a - b)
        console.log("[v0 MINT DEBUG] Y values being sent:", uniqueApiYValues)
        console.log("[v0 MINT DEBUG] Layers being sent:", uniqueApiYValues.length)

        const saveResponse = await fetch("/api/builds/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buildId,
            tokenId: nextId.toString(),
            buildHash,
            txHash: mintTx.hash,
            walletAddress: account,
            buildName,
            bricks,
            baseWidth,
            baseDepth,
          }),
        })

        if (!saveResponse.ok) {
          console.error("[v0] Failed to save mint data to database")
        } else {
          console.log("[v0] Mint data saved to database")
        }
      } catch (dbError) {
        console.error("[v0] Database save error:", dbError)
      }

      setMintStep("success")

      setTimeout(() => {
        onOpenChange(false)
        setTimeout(() => {
          setMintStep("idle")
          setErrorMessage(null)
          setTxHash(null)
          setTokenId(null)
        }, 500)
      }, 5000)
    } catch (error: any) {
      console.error("[v0] Error during mint:", error)
      let message = "Transaction failed. Please try again."

      if (error.code === 4001) {
        message = "Transaction rejected by user"
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        message = "Insufficient ETH for gas fees"
      } else if (error.message) {
        message = error.message
      }

      setErrorMessage(message)
      setMintStep("error")
    }
  }

  const handleSwitchNetwork = async () => {
    try {
      await switchChain(CONTRACTS.BASE_SEPOLIA_CHAIN_ID)
      // Clear error after successful switch
      setErrorMessage(null)
      setMintStep("idle")
    } catch (error: any) {
      console.error("[v0] Failed to switch network:", error)
      setErrorMessage(error.message || "Failed to switch network")
    }
  }

  const getButtonText = () => {
    if (mintStep === "approving") return "Approving BLOX..."
    if (mintStep === "buyingLicenses") return "Buying Missing Licenses..."
    if (mintStep === "approvingLicenses") return "Approving License NFT..."
    if (mintStep === "minting") return "Minting NFT..."
    if (mintStep === "success") return "Minted!"
    if (needsApproval) return "Approve BLOX"
    return "Confirm Mint"
  }

  const isLoading =
    mintStep === "approving" ||
    mintStep === "buyingLicenses" ||
    mintStep === "approvingLicenses" ||
    mintStep === "minting"
  const isSuccess = mintStep === "success"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[hsl(210,11%,18%)] border-[hsl(210,8%,28%)] text-white rounded-[28px]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-3xl font-bold text-white mb-2">Mint This Build</DialogTitle>
              <p className="text-gray-300 text-sm">Review price and preview the final NFT before minting.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {mintStep === "success" && (
          <div className="bg-green-900/30 border border-green-500 rounded-lg p-6 space-y-3">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-bold text-lg">🎉 Successfully Minted!</span>
            </div>
            {tokenId && (
              <p className="text-base text-gray-200">
                Your build has been minted as NFT{" "}
                <span className="font-mono text-green-400 font-bold">#{tokenId.toString()}</span>
              </p>
            )}
            <p className="text-sm text-gray-300">{totalBloxMass} BLOX have been locked and are now earning rewards.</p>
            {txHash && (
              <a
                href={`${explorerBase}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                View Transaction on BaseScan <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {tokenId && (
              <a
                href={`${explorerBase}/nft/${CONTRACTS.BUILD_NFT}/${tokenId.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                View NFT on BaseScan <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.includes("switch to Base Sepolia") && (
              <Button onClick={handleSwitchNetwork} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white">
                Switch to Base Sepolia
              </Button>
            )}
          </div>
        )}

        {(mintStep === "approving" ||
          mintStep === "buyingLicenses" ||
          mintStep === "approvingLicenses" ||
          mintStep === "minting") && (
          <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold">
                {mintStep === "approving" && "Step 1: Approving BLOX..."}
                {mintStep === "buyingLicenses" && "Step 2: Buying Missing Licenses..."}
                {mintStep === "approvingLicenses" && "Step 3: Approving License NFT..."}
                {mintStep === "minting" && "Step 4: Minting NFT..."}
              </span>
            </div>
            <p className="text-sm text-gray-300">Please confirm the transaction in your wallet</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Build Details</h3>

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Name:</span>
                <span className="text-white font-medium">{buildName}</span>
              </div>

              {buildHash && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Build Hash:</span>
                  <span className="text-gray-400 font-mono text-xs">
                    {buildHash.slice(0, 10)}...{buildHash.slice(-8)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total BLOX Used:</span>
                <span className="text-white font-medium">{totalBloxMass}</span>
              </div>

              {metadata && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Build Dimensions:</span>
                    <span className="text-white font-medium">
                      {metadata.buildWidth} × {metadata.buildDepth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Total Instances:</span>
                    <span className="text-white font-medium">{metadata.totalInstances}</span>
                  </div>
                </>
              )}

              {Object.keys(composition).length > 0 && (
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <h4 className="text-sm font-semibold text-white mb-2">NFT Composition:</h4>
                  <div className="space-y-2">
                    {Object.entries(composition).map(([tokenId, data]) => (
                      <div key={tokenId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">
                          NFT #{tokenId}: {data.name}
                        </span>
                        <span className="text-white font-medium">x {data.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2">
                    <span className="text-sm text-blue-200">Missing Component Licenses:</span>
                    <span className="font-medium text-blue-100">{missingLicenseCount}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-300">Auto-buy missing licenses:</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={autoBuyMissingLicenses ? "default" : "outline"}
                      disabled={isLoading || isSuccess}
                      onClick={() => setAutoBuyMissingLicenses((v) => !v)}
                      className={autoBuyMissingLicenses ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                    >
                      {autoBuyMissingLicenses ? "ON" : "OFF"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Estimated APY:</span>
                <span className="text-green-400 font-medium">{estimatedApy}%</span>
              </div>

              {bloxBalance !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Your BLOX Balance:</span>
                  <span className="text-white font-medium">{ethers.formatEther(bloxBalance)} BLOX</span>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white">Price Breakdown</h3>

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Estimated BLOX Locked:</span>
                <span className="text-white font-medium">{estimatedBloxCost} BLOX</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Estimated License Fee:</span>
                <span className="text-white font-medium">{estimatedLicenseFeeEth.toFixed(4)} ETH</span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                <span className="text-white font-bold">Total Cost:</span>
                <span className="text-white font-bold">
                  {estimatedBloxCost} BLOX + {estimatedLicenseFeeEth.toFixed(4)} ETH
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs text-yellow-800">
                💡 <strong>Note:</strong> These are estimated values. Actual costs will be determined at mint time based
                on current network conditions.
              </p>
            </div>
          </div>

          <div>
            <MintPreviewCanvas
              bricks={bricks}
              baseWidth={baseWidth}
              baseDepth={baseDepth}
              onScreenshotCaptured={setScreenshotDataUrl}
              screenshotDataUrl={screenshotDataUrl}
            />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <button
            onClick={() => setShowJsonData(!showJsonData)}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            {showJsonData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Build JSON Data
          </button>

          {showJsonData && (
            <div className="mt-3 bg-gray-100 rounded-lg p-3 max-h-64 overflow-auto">
              <pre className="text-xs font-mono text-black">{JSON.stringify(buildJsonData, null, 2)}</pre>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDevMode}
            disabled={isLoading || isSuccess}
            className="rounded-full border-orange-500/50 hover:bg-orange-500/10 text-orange-400 hover:text-orange-300"
          >
            <Bug className="h-4 w-4 mr-2" />
            Mint in Dev Mode
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isSuccess}
              className="rounded-full border-[hsl(210,8%,28%)] hover:bg-[hsl(210,11%,22%)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMint}
              disabled={isLoading || isSuccess}
              className="rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {getButtonText()}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
