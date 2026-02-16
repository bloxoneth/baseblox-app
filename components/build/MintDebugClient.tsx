"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw
} from "lucide-react"
import { useMetaMask } from "@/contexts/metamask-context"
import { ethers } from "ethers"
import { Canvas, PerspectiveCamera, OrbitControls } from '@react-three/fiber'
import {
  CONTRACTS,
  FEE_PER_MINT,
  BUILD_KIND,
  BASE_METADATA_URI,
  tokenMetadataURI,
  tokenImageURI,
  getBloxBalance,
  getBloxAllowance,
  getMaxMass,
  getNextTokenId,
  getLicenseIds,
  getLicenseBalances,
  getComponentLicenseStatus,
  isLicenseApproved,
  approveBlox,
  buyMissingLicensesForComponents,
  mintBuildNFTWithParams,
  addMintedHash,
  runMintDiagnostics,
  simulateMint,
  encodeMintCalldata,
  type MintParams,
} from "@/lib/contracts/ethblox-contracts"
import { generateBuildHash } from "@/lib/build-hash"
import { normalizeBrickKey } from "@/data/bricks"
import type { Brick } from "@/lib/types"
import { StandardBuildCapture } from "./StandardBuildCapture"

interface MintDebugData {
  buildId: string
  buildName: string
  buildHash: string | null
  bricks: Brick[]
  baseWidth: number
  baseDepth: number
  totalBloxMass: number
  uniqueColors: number
  composition?: Record<string, { count: number; name: string }>
  componentBuildIds?: Array<string | number>
  componentCounts?: Array<string | number>
  metadata?: {
    buildWidth: number
    buildDepth: number
    totalBricks: number
    totalInstances: number
    nftsUsed: number
  }
  account?: string
  timestamp: number
}

type CompositionMap = Record<string, { count: number; name: string }>

interface ContractState {
  bloxBalance: bigint | null
  bloxAllowance: bigint | null
  maxMass: bigint | null
  nextTokenId: bigint | null
  chainId: string | null
  isCorrectChain: boolean
  licenseIds: bigint[]
  licenseBalances: bigint[]
  licenseApproved: boolean
}

interface ValidationResult {
  passed: boolean
  message: string
  details?: string
}

// Determine build kind: explicit URL kind=0 means brick, otherwise multi-brick = BUILD
function detectKind(
  searchParams: URLSearchParams, 
  brickCount: number, 
  composition?: Record<string, any>
): number {
  const urlKind = searchParams.get("kind")
  if (urlKind === "0") return BUILD_KIND.BRICK
  if (urlKind === "1") return BUILD_KIND.BUILD
  // Multi-brick assemblies are builds (kind=1), even without NFT composition
  if (brickCount > 1) return BUILD_KIND.BUILD
  // Has NFT components = build
  if (composition && Object.keys(composition).length > 0) return BUILD_KIND.BUILD
  return BUILD_KIND.BRICK
}

// Generate specKey: keccak256(abi.encodePacked(width, depth, density))
// Must include density - this was the root cause of the density=1 bug
function generateSpecKey(width: number, depth: number, density: number): string {
  const w = Math.min(width, depth)
  const d = Math.max(width, depth)
  const encoded = ethers.solidityPacked(
    ["uint8", "uint8", "uint16"],
    [w, d, density]
  )
  return ethers.keccak256(encoded)
}

// Generate componentsHash: keccak256(abi.encodePacked(componentBuildIds))
function generateComponentsHash(componentIds: string[]): string {
  if (componentIds.length === 0) return ""
  const sorted = [...componentIds].sort((a, b) => Number(a) - Number(b))
  const encoded = ethers.solidityPacked(
    sorted.map(() => "uint256"),
    sorted.map(id => BigInt(id))
  )
  return ethers.keccak256(encoded)
}

function normalizeCompositionMap(debugData: MintDebugData | null): CompositionMap {
  if (!debugData) return {}

  const out: CompositionMap = {}
  const put = (idRaw: unknown, countRaw: unknown, nameRaw?: unknown) => {
    const id = String(idRaw ?? "").trim()
    const count = Number(countRaw ?? 0)
    if (!/^\d+$/.test(id) || Number(id) <= 0 || count <= 0) return
    const existing = out[id]
    out[id] = {
      count: (existing?.count ?? 0) + count,
      name: String(nameRaw ?? existing?.name ?? `Token #${id}`),
    }
  }

  if (debugData.composition && Object.keys(debugData.composition).length > 0) {
    for (const [id, data] of Object.entries(debugData.composition)) {
      put(id, data?.count, data?.name)
    }
  }

  if (Object.keys(out).length === 0) {
    const ids = Array.isArray(debugData.componentBuildIds) ? debugData.componentBuildIds : []
    const counts = Array.isArray(debugData.componentCounts) ? debugData.componentCounts : []
    for (let i = 0; i < Math.min(ids.length, counts.length); i++) {
      put(ids[i], counts[i])
    }
  }

  if (Object.keys(out).length === 0) {
    const metaComps = (debugData as any)?.metadata?.components
    if (Array.isArray(metaComps)) {
      for (const c of metaComps) {
        put(c?.componentId ?? c?.id, c?.count, c?.name)
      }
    }
  }

  return out
}

export function MintDebugClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { account, isConnected, connect, switchChain } = useMetaMask()
  const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.basescan.org"
  const expectedNetworkName = process.env.NEXT_PUBLIC_NETWORK_NAME ?? "configured network"
  
  const [debugData, setDebugData] = useState<MintDebugData | null>(null)
  const [contractState, setContractState] = useState<ContractState>({
    bloxBalance: null,
    bloxAllowance: null,
    maxMass: null,
    nextTokenId: null,
    chainId: null,
    isCorrectChain: false,
    licenseIds: [],
    licenseBalances: [],
    licenseApproved: true,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [generatedHash, setGeneratedHash] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [skipChecks, setSkipChecks] = useState(false)
  const [minting, setMinting] = useState(false)
  const [buyingLicenses, setBuyingLicenses] = useState(false)
  const [autoBuyMissingLicenses, setAutoBuyMissingLicenses] = useState(true)
  const [approving, setApproving] = useState(false)
  const [mintTxHash, setMintTxHash] = useState<string | null>(null)
  const [mintError, setMintError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<Record<string, string> | null>(null)
  const [runningDiagnostics, setRunningDiagnostics] = useState(false)
  const [baseBrickTokensByDensity, setBaseBrickTokensByDensity] = useState<Record<string, string>>({})
  const [brickSpecToTokenId, setBrickSpecToTokenId] = useState<Record<string, string>>({})
  const explicitCompositionMap = useMemo(() => normalizeCompositionMap(debugData), [debugData])
  const compositionMap = useMemo(() => {
    if (!debugData) return {}
    if (Object.keys(explicitCompositionMap).length > 0) return explicitCompositionMap

    const kind = detectKind(searchParams, debugData.bricks.length, explicitCompositionMap)
    if (kind === BUILD_KIND.BRICK) return explicitCompositionMap
    if (!Array.isArray(debugData.bricks) || debugData.bricks.length === 0) return explicitCompositionMap

    const densFromUrl = Number(searchParams.get("density") || "")
    const dens = Number.isFinite(densFromUrl) && densFromUrl > 0 ? densFromUrl : 1
    const inferred: CompositionMap = {}

    for (const b of debugData.bricks) {
      const spec = normalizeBrickKey(Number(b.width || 1), Number(b.depth || 1), dens)
      const tokenId = brickSpecToTokenId[spec]
      if (!tokenId) continue
      if (!inferred[tokenId]) inferred[tokenId] = { count: 0, name: spec }
      inferred[tokenId].count += 1
    }

    return Object.keys(inferred).length > 0 ? inferred : explicitCompositionMap
  }, [debugData, explicitCompositionMap, searchParams, brickSpecToTokenId])

  // Load debug data from sessionStorage or URL params (from BrickMintModal redirect)
  // Runs once on mount only - searchParams are stable from useSearchParams()
  const dataLoadedRef = useRef(false)
  useEffect(() => {
    if (dataLoadedRef.current) return
    dataLoadedRef.current = true

    // Check URL params first (from BrickMintModal redirect)
    const kind = searchParams.get("kind")
    const brickWidth = searchParams.get("width")
    const brickDepth = searchParams.get("depth")
    const brickDensity = searchParams.get("density")
    const brickName = searchParams.get("name")
    
    if (kind === "0" && brickWidth && brickDepth) {
      const w = parseInt(brickWidth)
      const d = parseInt(brickDepth)
      const dens = brickDensity ? parseInt(brickDensity) : 1
      const name = brickName || `${w}x${d}-D${dens}`
      
      setDebugData({
        buildId: `brick_${w}x${d}_d${dens}`,
        buildName: name,
        buildHash: null,
        bricks: [{ id: "1", position: [0, 0.5, 0] as [number, number, number], color: "#e8d44d", width: w, depth: d }],
        baseWidth: w,
        baseDepth: d,
        totalBloxMass: w * d * dens,
        uniqueColors: 1,
        timestamp: Date.now(),
        metadata: {
          buildWidth: w,
          buildDepth: d,
          totalBricks: 1,
          totalInstances: 1,
          nftsUsed: 0,
        },
      })
      setLoading(false)
      return
    }
    
    // Fallback: load from sessionStorage
    const stored = sessionStorage.getItem("ethblox_mint_debug")
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setDebugData(data)
      } catch (e) {
        console.error("Failed to parse mint debug data:", e)
      }
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load canonical 1x1 base brick tokens by density (used for kind=0 component composition)
  useEffect(() => {
    fetch("/api/builds/check-minted")
      .then((r) => r.json())
      .then((data) => {
        setBaseBrickTokensByDensity(data?.baseBrickTokensByDensity || {})
        setBrickSpecToTokenId(data?.brickSpecToTokenId || {})
      })
      .catch(() => {
        setBaseBrickTokensByDensity({})
        setBrickSpecToTokenId({})
      })
  }, [])

  // Generate hash when data is loaded
  useEffect(() => {
    if (!debugData?.bricks || debugData.bricks.length === 0) return
    
    generateBuildHash({
      bricks: debugData.bricks.map((b) => ({
        position: b.position,
        color: b.color,
        width: b.width,
        depth: b.depth,
      })),
      baseWidth: debugData.baseWidth,
      baseDepth: debugData.baseDepth,
    }).then((hash) => {
      setGeneratedHash(hash)
    })
  }, [debugData])

  // Fetch contract state
  const fetchContractState = async () => {
    if (!isConnected || !account) return
    
    const ethereum = (window as any).ethereum
    if (!ethereum) return

    setRefreshing(true)
    try {
      const chainId = await ethereum.request({ method: "eth_chainId" })
      const currentChainDecimal = chainId ? parseInt(chainId, 16) : 0
      const expectedChainDecimal = parseInt(CONTRACTS.BASE_SEPOLIA_CHAIN_ID, 16)
      const isCorrectChain = currentChainDecimal === expectedChainDecimal

      if (!isCorrectChain) {
        setContractState({
          bloxBalance: null,
          bloxAllowance: null,
          maxMass: null,
          nextTokenId: null,
          chainId,
          isCorrectChain,
          licenseIds: [],
          licenseBalances: [],
          licenseApproved: true,
        })
        setRefreshing(false)
        return
      }

      const provider = new ethers.BrowserProvider(ethereum)

      const [balance, allowance, maxMass, nextId] = await Promise.all([
        getBloxBalance(provider, account).catch(() => null),
        getBloxAllowance(provider, account, CONTRACTS.BUILD_NFT).catch(() => null),
        getMaxMass(provider).catch(() => null),
        getNextTokenId(provider).catch(() => null),
      ])

      const componentTokenIds = Object.keys(compositionMap).map(id => BigInt(id))

      let licenseIds: bigint[] = []
      let licenseBalances: bigint[] = []
      let licenseApproved = true

      if (componentTokenIds.length > 0 && isCorrectChain) {
        try {
          licenseIds = await getLicenseIds(provider, componentTokenIds)
          if (licenseIds.length > 0) {
            licenseBalances = await getLicenseBalances(provider, account, licenseIds)
            licenseApproved = await isLicenseApproved(provider, account, CONTRACTS.BUILD_NFT)
          }
        } catch (e) {
          console.error("[v0] Failed to fetch license data:", e)
        }
      }

      setContractState({
        bloxBalance: balance,
        bloxAllowance: allowance,
        maxMass,
        nextTokenId: nextId,
        chainId,
        isCorrectChain,
        licenseIds,
        licenseBalances,
        licenseApproved,
      })
    } catch (error) {
      console.error("[v0] Failed to fetch contract state:", error)
    }
    setRefreshing(false)
  }

  // Fetch on connection changes, with retry for slow MetaMask initialization
  useEffect(() => {
    if (!isConnected || !account) return

    // Fetch immediately
    fetchContractState()

    // Retry after a short delay in case MetaMask provider wasn't fully ready
    const retryTimer = setTimeout(() => {
      fetchContractState()
    }, 1500)

    return () => clearTimeout(retryTimer)
  }, [isConnected, account, debugData, compositionMap])

  // Also poll for ethereum provider if wallet was previously connected but provider is slow to inject
  useEffect(() => {
    if (isConnected && account) return // Already connected, no need to poll
    
    const savedAccount = typeof window !== "undefined" ? localStorage.getItem("metamask_account") : null
    if (!savedAccount) return // No saved session

    // MetaMask provider can be slow to inject on page load - poll for it
    let attempts = 0
    const maxAttempts = 10
    const pollInterval = setInterval(() => {
      attempts++
      const ethereum = (window as any).ethereum
      if (ethereum && ethereum.isMetaMask) {
        clearInterval(pollInterval)
        // Provider is now available - the MetaMask context should pick it up
        // but trigger a re-check just in case
        ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
          if (accounts.length > 0) {
            fetchContractState()
          }
        }).catch(() => {})
      }
      if (attempts >= maxAttempts) {
        clearInterval(pollInterval)
      }
    }, 500)

    return () => clearInterval(pollInterval)
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  // Handle BLOX approval
  const handleApproveBlox = async () => {
    if (!isConnected || !account || !debugData) return
    setApproving(true)
    setMintError(null)
    
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) throw new Error("No wallet found")
      
      const provider = new ethers.BrowserProvider(ethereum)
      const requiredBlox = BigInt(debugData.totalBloxMass) * 10n ** 18n
      // Approve a large amount to avoid repeated approvals
      const approvalAmount = requiredBlox * 100n
      
      const tx = await approveBlox(provider, approvalAmount)
      await tx.wait()
      
      // Refresh state
      await fetchContractState()
    } catch (err: any) {
      console.error("[v0] Approval error:", err)
      setMintError(err.message || "Approval failed")
    }
    setApproving(false)
  }

  // Build mint params helper
  const buildMintParams = (): MintParams | null => {
    if (!debugData || !generatedHash) return null
    
    const kind = detectKind(searchParams, debugData.bricks.length, compositionMap)
    const hasComponents = Object.keys(compositionMap).length > 0

    // Read density from URL params or sessionStorage data
    const urlDensity = searchParams.get("density")
    let mintDensity = urlDensity ? parseInt(urlDensity) : 0
    
    // For bricks, density is REQUIRED and must be valid
    const validDensities = [1, 8, 27, 64, 125]
    if (kind === BUILD_KIND.BRICK) {
      if (!mintDensity || !validDensities.includes(mintDensity)) {
        setMintError(`Density is required for brick mints. Got: ${mintDensity || "none"}. Valid values: ${validDensities.join(", ")}. Go back and select a density in the brick mint modal.`)
        return null
      }
      if (debugData.baseWidth < 1 || debugData.baseDepth < 1 || debugData.baseWidth > 10 || debugData.baseDepth > 10) {
        setMintError(`Brick dimensions must be within 1..10. Got ${debugData.baseWidth}x${debugData.baseDepth}.`)
        return null
      }
    }
    
    // For builds (kind > 0), density defaults to 1 (single assembly)
    if (kind !== BUILD_KIND.BRICK && !mintDensity) {
      mintDensity = 1
    }

    let componentIds: bigint[] = []
    let componentCounts: bigint[] = []

    if (kind === BUILD_KIND.BRICK) {
      const area = debugData.baseWidth * debugData.baseDepth
      const isPrimitive1x1 = area === 1
      if (!isPrimitive1x1) {
        const baseTokenId = baseBrickTokensByDensity[String(mintDensity)]
        if (!baseTokenId) {
          setMintError(`Missing base component 1x1-D${mintDensity}. Mint that primitive first, then mint ${debugData.baseWidth}x${debugData.baseDepth}-D${mintDensity}.`)
          return null
        }
        componentIds = [BigInt(baseTokenId)]
        componentCounts = [BigInt(area)]
      }
    } else if (hasComponents) {
      const validComponents = Object.entries(compositionMap)
        .filter(([id, data]) => Number(id) > 0 && data.count > 0)
      componentIds = validComponents.map(([id]) => BigInt(id))
      componentCounts = validComponents.map(([, data]) => BigInt(data.count))
    }

    return {
      geometryHash: generatedHash,
      mass: debugData.totalBloxMass,
      uri: "",
      componentBuildIds: componentIds,
      componentCounts: componentCounts,
      kind,
      width: debugData.baseWidth,
      depth: debugData.baseDepth,
      density: mintDensity,
    }
  }

  // Run diagnostics
  const handleRunDiagnostics = async () => {
    if (!isConnected || !account || !debugData || !generatedHash) return
    setRunningDiagnostics(true)
    setDiagnostics(null)
    if (!contractState.isCorrectChain) {
      setDiagnostics({
        "Network/Profile Mismatch": `Wallet chain does not match app profile (${expectedNetworkName}).`,
        "Expected Chain ID": String(parseInt(CONTRACTS.BASE_SEPOLIA_CHAIN_ID, 16)),
        "Current Chain ID": contractState.chainId ? String(parseInt(contractState.chainId, 16)) : "unknown",
        "Fix": "Switch app profile (env:anvil or env:sepolia) OR switch wallet network.",
      })
      setRunningDiagnostics(false)
      return
    }
    
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) throw new Error("No wallet found")
      const provider = new ethers.BrowserProvider(ethereum)
      
      const params = buildMintParams()
      if (!params) {
        setDiagnostics({ "ERROR": "Could not build mint params - check density is set in URL (?density=8)" })
        setRunningDiagnostics(false)
        return
      }
      
      const results = await runMintDiagnostics(provider, params, account)
      
      // Add full decoded payload
      results["--- PAYLOAD BEING SENT ---"] = ""
      results["[0] geometryHash (bytes32)"] = params.geometryHash
      results["[1] mass (uint256)"] = BigInt(params.mass).toString()
      results["[2] uri (string)"] = params.uri === "" ? '""  (empty)' : params.uri
      results["[3] componentBuildIds (uint256[])"] = JSON.stringify(params.componentBuildIds.map(String))
      results["[4] componentCounts (uint256[])"] = JSON.stringify(params.componentCounts.map(String))
      results["[5] kind (uint8)"] = params.kind.toString()
      results["[6] width (uint8)"] = params.width.toString()
      results["[7] depth (uint8)"] = params.depth.toString()
      results["[8] density (uint8)"] = params.density.toString()
      results["msg.value (wei)"] = FEE_PER_MINT.toString() + " (" + ethers.formatEther(FEE_PER_MINT) + " ETH)"
      results["to"] = CONTRACTS.BUILD_NFT
      results["from"] = account

      // Known-good reference payload for comparison
      results["--- EXPECTED (from user spec) ---"] = ""
      results["ref[0] geometryHash"] = "0xeb38ea055d70d348cf22350be92b9fd5bd2e313dc6f092d109a07a405aac1a35"
      results["ref[1] mass"] = "1"
      results["ref[2] uri"] = '""'
      results["ref[3] componentBuildIds"] = "[]"
      results["ref[4] componentCounts"] = "[]"
      results["ref[5] kind"] = "0"
      results["ref[6] width"] = "1"
      results["ref[7] depth"] = "1"
      results["ref[8] density"] = "1"
      results["ref msg.value"] = "10000000000000000 (0.01 ETH)"
      
      // Add raw calldata
      try {
        const calldata = encodeMintCalldata(params)
        results["--- RAW CALLDATA ---"] = ""
        results["Function Selector"] = calldata.slice(0, 10)
        results["Calldata Length"] = calldata.length.toString() + " chars"
        results["Full Calldata"] = calldata
      } catch (e: any) {
        results["Calldata Error"] = e.message
      }
      
      // Add simulation result
      try {
        const sim = await simulateMint(provider, params, account)
        results["--- SIMULATION ---"] = ""
        results["Simulation Result"] = sim.success ? "SUCCESS" : "REVERTED"
        if (sim.decodedError) {
          results["Revert Reason"] = sim.decodedError
        }
        results["Raw Result Data"] = sim.result || "(empty)"
      } catch (e: any) {
        results["Simulation Error"] = e.message
      }
      
      setDiagnostics(results)
    } catch (err: any) {
      setDiagnostics({ "Error": err.message })
    }
    setRunningDiagnostics(false)
  }

  // Handle mint - always sends with gasLimit to bypass estimateGas failures
  // forceSend uses higher gasLimit (1M vs 500k)
  const handleMint = async (forceSend = false) => {
    if (!isConnected || !account || !debugData || !generatedHash) return
    setMinting(true)
    setMintError(null)
    setMintTxHash(null)
    
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) throw new Error("No wallet found")
      
      const currentChainId = await ethereum.request({ method: "eth_chainId" })
      const currentChainDecimal = parseInt(currentChainId, 16)
      const expectedChainDecimal = parseInt(CONTRACTS.BASE_SEPOLIA_CHAIN_ID, 16)
      
      if (currentChainDecimal !== expectedChainDecimal && !skipChecks) {
        throw new Error(`Wrong network! Current: ${currentChainDecimal}, Expected: ${expectedChainDecimal} (Base Sepolia). Please switch networks first.`)
      }
      
      const provider = new ethers.BrowserProvider(ethereum)
      const params = buildMintParams()
      if (!params) {
        // buildMintParams already set a detailed mintError via setMintError - just bail
        if (!mintError) setMintError("Could not build mint params - check density and parameters")
        setMinting(false)
        return
      }

      if (params.componentBuildIds.length > 0) {
        const status = await getComponentLicenseStatus(provider, account, params.componentBuildIds)
        if (status.missingComponentBuildIds.length > 0) {
          if (!autoBuyMissingLicenses) {
            throw new Error(
              `Missing licenses for component builds: ${status.missingComponentBuildIds.map((id) => id.toString()).join(", ")}. Buy licenses first or enable auto-buy.`,
            )
          }
          const purchaseResult = await buyMissingLicensesForComponents(
            provider,
            account,
            params.componentBuildIds,
          )
          if (purchaseResult.txHashes.length > 0 || purchaseResult.registeredBuilds.length > 0) {
            await fetchContractState()
          }
        }
      }

      // Send tx directly with gasLimit - no staticCall pre-check
      const tx = await mintBuildNFTWithParams(provider, params, forceSend)
      setMintTxHash(tx.hash)
      
      // Wait for confirmation
      const receipt = await tx.wait()
      if (receipt && receipt.status === 0) {
        throw new Error("Transaction reverted on-chain. Check BaseScan for details.")
      }
      
      addMintedHash(generatedHash)
      
      // Parse tokenId from Transfer event in receipt logs
      let mintedTokenId: string | null = null
      if (receipt?.logs) {
        const contractAddr = CONTRACTS.BUILD_NFT.toLowerCase()
        const transferTopic = ethers.id("Transfer(address,address,uint256)")
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === contractAddr && log.topics[0] === transferTopic) {
            mintedTokenId = BigInt(log.topics[3]).toString()
            break
          }
        }
      }
      
      // Save full build data + mint info to Redis
      if (mintedTokenId && debugData) {
        const urlKind = searchParams.get("kind")
        const urlDensity = searchParams.get("density")
        const urlWidth = searchParams.get("width")
        const urlDepth = searchParams.get("depth")
        
        const mass = debugData.totalBloxMass ?? debugData.bricks.length
        const colors = debugData.uniqueColors ?? new Set(debugData.bricks.map(b => b.color)).size
        
        try {
          await fetch("/api/builds/mint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // Chain data
              tokenId: mintedTokenId,
              buildHash: generatedHash,
              txHash: tx.hash,
              walletAddress: account,
              
              // Build identity
              buildName: debugData.buildName,
              
              // Full geometry
              bricks: debugData.bricks,
              baseWidth: debugData.baseWidth,
              baseDepth: debugData.baseDepth,
              
              // Scores (calculated here so they match what was displayed)
              mass,
              colors,
              bw_score: parseFloat((Math.log(1 + mass) * Math.log(2 + colors)).toFixed(2)),
              
              // Build type
              kind: urlKind ? parseInt(urlKind) : (params.kind ?? 0),
              density: urlDensity ? parseInt(urlDensity) : (params.density ?? 1),
              brickWidth: urlWidth ? parseInt(urlWidth) : debugData.baseWidth,
              brickDepth: urlDepth ? parseInt(urlDepth) : debugData.baseDepth,
              
              // Composition (which existing NFTs are used in this build)
              composition: compositionMap,
              
              // Contract params (for verification / future IPFS upload)
              geometryHash: params.geometryHash,
              componentBuildIds: params.componentBuildIds,
              componentCounts: params.componentCounts,
              
              // Build metadata
              metadata: debugData.metadata,
            }),
          })
        } catch (saveErr) {
          console.error("Failed to save mint to Redis:", saveErr)
        }
      }
      
      await fetchContractState()
    } catch (err: any) {
      console.error("[v0] Mint error:", err)
      let errorMessage = "Mint failed"
      if (err.reason) {
        errorMessage = err.reason
      } else if (err.message) {
        if (err.message.includes("user rejected") || err.message.includes("ACTION_REJECTED")) {
          errorMessage = "Transaction rejected by user"
        } else if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas + mint fee (0.01 ETH)"
        } else {
          errorMessage = err.message
        }
      }
      setMintError(errorMessage)
    }
    setMinting(false)
  }

  // Handle chain switch with state refresh
  const handleSwitchChain = async () => {
    try {
      await switchChain(CONTRACTS.BASE_SEPOLIA_CHAIN_ID)
      // Wait a moment for the chain to actually switch
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Refresh contract state after switch
      await fetchContractState()
    } catch (err: any) {
      console.error("[v0] Switch chain error:", err)
      setMintError(err.message || "Failed to switch chain")
    }
  }

  const getDisplayComponentPayload = () => {
    if (!debugData) return { ids: [] as string[], counts: [] as number[] }

    const kind = detectKind(searchParams, debugData.bricks.length, compositionMap)
    const mintDensity = parseInt(searchParams.get("density") || "1")

    if (kind === BUILD_KIND.BRICK) {
      const area = debugData.baseWidth * debugData.baseDepth
      if (area === 1) return { ids: [] as string[], counts: [] as number[] }
      const baseTokenId = baseBrickTokensByDensity[String(mintDensity)]
      if (!baseTokenId) {
        return { ids: [] as string[], counts: [] as number[], error: `Missing base 1x1-D${mintDensity}` }
      }
      return { ids: [String(baseTokenId)], counts: [area] }
    }

    if (Object.keys(compositionMap).length > 0) {
      const validComponents = Object.entries(compositionMap)
        .filter(([id, data]) => Number(id) > 0 && data.count > 0)
      return {
        ids: validComponents.map(([id]) => String(id)),
        counts: validComponents.map(([, data]) => data.count),
      }
    }

    return { ids: [] as string[], counts: [] as number[] }
  }

  // Calculate validation results
  const getValidations = (): ValidationResult[] => {
    if (!debugData) return []

    const validations: ValidationResult[] = []
    const requiredBlox = BigInt(debugData.totalBloxMass) * 10n ** 18n

    // Wallet connection
    validations.push({
      passed: isConnected && !!account,
      message: "Wallet Connected",
      details: account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not connected",
    })

    // Correct chain - convert hex to decimal for display
    const currentChainDecimal = contractState.chainId ? parseInt(contractState.chainId, 16) : null
    const expectedChainDecimal = parseInt(CONTRACTS.BASE_SEPOLIA_CHAIN_ID, 16)
    validations.push({
      passed: contractState.isCorrectChain,
      message: `Correct Network (${expectedNetworkName})`,
      details: currentChainDecimal 
        ? `Current: ${currentChainDecimal} (Expected: ${expectedChainDecimal})`
        : "Unknown",
    })

    // Build name (must be saved first)
    validations.push({
      passed: !!debugData.buildName && debugData.buildName.trim() !== "" && debugData.buildName !== "Untitled",
      message: "Build Saved with Name",
      details: debugData.buildName || "Not saved - please save your build first",
    })

    // Build hash valid
    validations.push({
      passed: !!generatedHash && /^0x[0-9a-fA-F]{64}$/.test(generatedHash),
      message: "Valid Geometry Hash",
      details: generatedHash || "Not generated",
    })

    // Bricks exist
    validations.push({
      passed: debugData.bricks.length > 0,
      message: "Build Has Bricks",
      details: `${debugData.bricks.length} bricks`,
    })

    // Mass > 0
    validations.push({
      passed: debugData.totalBloxMass > 0,
      message: "Mass > 0",
      details: `${debugData.totalBloxMass} BLOX`,
    })

    // Mass within limit
    if (contractState.maxMass !== null) {
      validations.push({
        passed: BigInt(debugData.totalBloxMass) <= contractState.maxMass,
        message: "Mass Within Contract Limit",
        details: `${debugData.totalBloxMass} <= ${contractState.maxMass.toString()}`,
      })
    }

    // BLOX balance sufficient
    if (contractState.bloxBalance !== null) {
      validations.push({
        passed: contractState.bloxBalance >= requiredBlox,
        message: "Sufficient BLOX Balance",
        details: `Have: ${ethers.formatEther(contractState.bloxBalance)} BLOX, Need: ${ethers.formatEther(requiredBlox)} BLOX`,
      })
    }

    // BLOX allowance
    if (contractState.bloxAllowance !== null) {
      validations.push({
        passed: contractState.bloxAllowance >= requiredBlox,
        message: "BLOX Approval",
        details: contractState.bloxAllowance >= requiredBlox 
          ? `Approved: ${ethers.formatEther(contractState.bloxAllowance)} BLOX`
          : `Need to approve ${ethers.formatEther(requiredBlox)} BLOX`,
      })
    }

    // Component licenses (if any)
    if (Object.keys(compositionMap).length > 0) {
      const hasAllLicenses = contractState.licenseBalances.every(b => b > 0n)
      validations.push({
        passed: hasAllLicenses || autoBuyMissingLicenses,
        message: "Component Licenses Owned",
        details: hasAllLicenses
          ? `${contractState.licenseBalances.filter(b => b > 0n).length}/${contractState.licenseIds.length} licenses`
          : autoBuyMissingLicenses
            ? `Missing licenses will be purchased before mint (${contractState.licenseBalances.filter(b => b > 0n).length}/${contractState.licenseIds.length} owned)`
            : `${contractState.licenseBalances.filter(b => b > 0n).length}/${contractState.licenseIds.length} licenses`,
      })

      validations.push({
        passed: contractState.licenseApproved,
        message: "License NFT Approval",
        details: contractState.licenseApproved ? "Approved for BuildNFT" : "Need to approve",
      })
    }

    return validations
  }

  const validations = getValidations()
  const allPassed = validations.length > 0 && validations.every(v => v.passed)
  const canMint = skipChecks || allPassed
  const componentTokenIds = Object.keys(compositionMap).map((id) => BigInt(id))
  const missingLicenseBuildIds = componentTokenIds.filter((_, i) => {
    const id = contractState.licenseIds[i] ?? 0n
    const bal = contractState.licenseBalances[i] ?? 0n
    return id === 0n || bal < 1n
  })

  const handleBuyMissingLicenses = async () => {
    if (!isConnected || !account) return
    if (componentTokenIds.length === 0) return
    setBuyingLicenses(true)
    setMintError(null)
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) throw new Error("No wallet found")
      const provider = new ethers.BrowserProvider(ethereum)
      const result = await buyMissingLicensesForComponents(provider, account, componentTokenIds)
      await fetchContractState()
      if (result.purchasedBuilds.length === 0 && result.registeredBuilds.length === 0) {
        setMintError("No missing licenses were found.")
      }
    } catch (err: any) {
      console.error("[v0] Buy licenses error:", err)
      setMintError(err?.message || "Failed to buy missing licenses")
    }
    setBuyingLicenses(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--ethblox-text-tertiary))]" />
      </div>
    )
  }

  if (!debugData) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--ethblox-text-tertiary))]" />
          <h1 className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">
            No Mint Data Found
          </h1>
          <p className="text-[hsl(var(--ethblox-text-secondary))] mb-6">
            Please go to the builder and click "Mint in Dev Mode" from the mint dialog.
          </p>
          <Button onClick={() => router.push("/buildv2")}>
            Go to Builder
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="text-[hsl(var(--ethblox-text-secondary))]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))]">
            Mint Debug Mode
          </h1>
          <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">
            Review all mint parameters before submitting transaction
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchContractState}
          disabled={refreshing}
          className="border-[hsl(var(--ethblox-border))] bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Save Warning Banner */}
      {(!debugData.buildName || debugData.buildName === "Untitled") && (
        <div className="mb-6 p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-400">
                Build Not Saved
              </p>
              <p className="text-xs text-[hsl(var(--ethblox-text-secondary))] mt-1">
                Please go back to the builder and save your build with a name before minting.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Build Data */}
        <div className="space-y-6">
          {/* Build Info */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Build Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Name</span>
                <span className="text-[hsl(var(--ethblox-text-primary))] font-medium">
                  {debugData.buildName || "Untitled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Build ID</span>
                <span className="text-[hsl(var(--ethblox-text-primary))] font-mono text-sm">
                  {debugData.buildId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Total Bricks</span>
                <span className="text-[hsl(var(--ethblox-text-primary))]">
                  {debugData.bricks.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Unique Colors</span>
                <span className="text-[hsl(var(--ethblox-text-primary))]">
                  {debugData.uniqueColors}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Dimensions</span>
                <span className="text-[hsl(var(--ethblox-text-primary))]">
                  {debugData.baseWidth} x {debugData.baseDepth}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* On-Chain Mint Parameters - JSON Format */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                  On-Chain Mint Parameters
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const kind = detectKind(searchParams, debugData.bricks.length, compositionMap)
                    const componentPayload = getDisplayComponentPayload()
                    const mintDensityCopy = parseInt(searchParams.get("density") || "1")
                    const mintParams = {
                      geometryHash: generatedHash || "",
                      mass: debugData.totalBloxMass,
                      kind,
                      density: mintDensityCopy,
                      width: debugData.baseWidth,
                      depth: debugData.baseDepth,
                      componentBuildIds: componentPayload.ids,
                      componentCounts: componentPayload.counts,
                      payer: account?.toLowerCase() || "",
                      mintFeeWei: FEE_PER_MINT.toString()
                    }
                    copyToClipboard(JSON.stringify(mintParams, null, 2), 'mintParams')
                  }}
                  className="h-8"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied === 'mintParams' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-xs font-mono text-[hsl(var(--ethblox-green))] overflow-auto max-h-80">
{(() => {
  const kind = detectKind(searchParams, debugData.bricks.length, compositionMap)
  const componentPayload = getDisplayComponentPayload()
  const mintDensityDisplay = parseInt(searchParams.get("density") || "1")
  return JSON.stringify({
    geometryHash: generatedHash || "generating...",
    mass: debugData.totalBloxMass,
    kind,
    density: mintDensityDisplay,
    width: debugData.baseWidth,
    depth: debugData.baseDepth,
    componentBuildIds: componentPayload.ids,
    componentCounts: componentPayload.counts,
    componentError: componentPayload.error,
    payer: account?.toLowerCase() || "not connected",
    mintFeeWei: FEE_PER_MINT.toString()
  }, null, 2)
})()}
              </pre>
            </CardContent>
          </Card>

          {/* IPFS Metadata */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                  IPFS Metadata
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const kind = detectKind(searchParams, debugData.bricks.length, compositionMap)
                    const componentPayload = getDisplayComponentPayload()
                    const mintDensity = parseInt(searchParams.get("density") || "1")
                    const specKey = generateSpecKey(debugData.baseWidth, debugData.baseDepth, mintDensity)
                    const componentsHash = generateComponentsHash(componentPayload.ids)
                    const metadata = {
                      name: debugData.buildName || `ETHBLOX #${contractState.nextTokenId?.toString() || "?"}`,
                      description: "ETHBLOX build/brick",
                      image: tokenImageURI(contractState.nextTokenId?.toString() || "?"),
                      external_url: "https://ethblox.art",
                      attributes: [
                        { trait_type: "kind", value: kind },
                        { trait_type: "mass", value: debugData.totalBloxMass },
                        { trait_type: "density", value: mintDensity },
                        { trait_type: "geometryHash", value: generatedHash || "" },
                        { trait_type: "specKey", value: specKey },
                        { trait_type: "componentsHash", value: componentsHash }
                      ]
                    }
                    copyToClipboard(JSON.stringify(metadata, null, 2), 'ipfsMetadata')
                  }}
                  className="h-8"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied === 'ipfsMetadata' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-xs font-mono text-[hsl(var(--ethblox-accent-cyan))] overflow-auto max-h-96">
{(() => {
  const kind = detectKind(searchParams, debugData.bricks.length, compositionMap)
  const componentPayload = getDisplayComponentPayload()
  const mintDensity = parseInt(searchParams.get("density") || "1")
  const specKey = generateSpecKey(debugData.baseWidth, debugData.baseDepth, mintDensity)
  const componentsHash = generateComponentsHash(componentPayload.ids)
  return JSON.stringify({
    name: debugData.buildName || `ETHBLOX #${contractState.nextTokenId?.toString() || "?"}`,
    description: "ETHBLOX build/brick",
    image: tokenImageURI(contractState.nextTokenId?.toString() || "?"),
    external_url: "https://ethblox.art",
    attributes: [
      { trait_type: "kind", value: kind },
      { trait_type: "mass", value: debugData.totalBloxMass },
      { trait_type: "density", value: mintDensity },
      { trait_type: "geometryHash", value: generatedHash || "" },
      { trait_type: "specKey", value: specKey },
      { trait_type: "componentsHash", value: componentsHash }
    ]
  }, null, 2)
})()}
              </pre>
              <div className="mt-3 p-2 bg-[hsl(var(--ethblox-bg))] rounded text-xs text-[hsl(var(--ethblox-text-tertiary))]">
                <p><strong>Token URI:</strong> {"${baseUri}/${tokenId}.json"}</p>
                <p><strong>Base URI:</strong> {BASE_METADATA_URI}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contract Addresses */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Contract Addresses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(CONTRACTS).filter(([key]) => key !== 'BASE_SEPOLIA_CHAIN_ID').map(([name, address]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--ethblox-text-secondary))]">{name}</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-[hsl(var(--ethblox-text-tertiary))]">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </code>
                    <a 
                      href={`${explorerBase}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[hsl(var(--ethblox-accent-cyan))]"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Validations & State */}
        <div className="space-y-6">
          {/* Validation Checklist */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                  Pre-Mint Checklist
                </CardTitle>
                <Badge 
                  variant={allPassed ? "default" : "destructive"}
                  className={allPassed 
                    ? "bg-[hsl(var(--ethblox-green))] text-black" 
                    : "bg-red-500 text-white"
                  }
                >
                  {validations.filter(v => v.passed).length}/{validations.length} Passed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {validations.map((v, i) => (
                <div 
                  key={i} 
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    v.passed 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  {v.passed 
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      v.passed ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {v.message}
                    </p>
                    {v.details && (
                      <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-0.5 break-all">
                        {v.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Wallet State */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Wallet State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isConnected ? (
                <Button onClick={connect} className="w-full">
                  Connect Wallet
                </Button>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--ethblox-text-secondary))]">Address</span>
                    <code className="text-[hsl(var(--ethblox-text-primary))] font-mono text-sm">
                      {account?.slice(0, 6)}...{account?.slice(-4)}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--ethblox-text-secondary))]">BLOX Balance</span>
                    <span className="text-[hsl(var(--ethblox-text-primary))]">
                      {contractState.bloxBalance !== null 
                        ? `${ethers.formatEther(contractState.bloxBalance)} BLOX`
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--ethblox-text-secondary))]">BLOX Allowance</span>
                    <span className="text-[hsl(var(--ethblox-text-primary))]">
                      {contractState.bloxAllowance !== null 
                        ? `${ethers.formatEther(contractState.bloxAllowance)} BLOX`
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--ethblox-text-secondary))]">Chain ID</span>
                    <span className={contractState.isCorrectChain 
                      ? "text-green-400" 
                      : "text-red-400"
                    }>
                      {contractState.chainId || "Unknown"}
                    </span>
                  </div>
                  {!contractState.isCorrectChain && (
                    <Button 
                      onClick={handleSwitchChain}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Switch to Base Sepolia (Chain ID: 84532)
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Contract State */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Contract State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Next Token ID</span>
                <code className="text-[hsl(var(--ethblox-text-primary))] font-mono">
                  {contractState.nextTokenId?.toString() ?? "?"}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Max Mass</span>
                <code className="text-[hsl(var(--ethblox-text-primary))] font-mono">
                  {contractState.maxMass?.toString() ?? "?"}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Mint Fee</span>
                <code className="text-[hsl(var(--ethblox-yellow))] font-mono">
                  {ethers.formatEther(FEE_PER_MINT)} ETH
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Mint Actions */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] border-2 border-[hsl(var(--ethblox-yellow)/0.5)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Mint Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Skip Checks Toggle */}
              <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <div>
                  <p className="text-sm font-medium text-orange-400">Skip Validation Checks</p>
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">
                    Enable to bypass failed checks (use for testing)
                  </p>
                </div>
                <Button
                  variant={skipChecks ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSkipChecks(!skipChecks)}
                  className={skipChecks 
                    ? "bg-orange-500 hover:bg-orange-600 text-white" 
                    : "border-orange-500/50 text-orange-400 bg-transparent hover:bg-orange-500/10"
                  }
                >
                  {skipChecks ? "ON" : "OFF"}
                </Button>
              </div>

              {/* BLOX Balance Warning */}
              {contractState.bloxBalance !== null && contractState.bloxBalance === 0n && (
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-sm font-medium text-red-400">BLOX Balance is 0</p>
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">
                    You need {ethers.formatEther(BigInt(debugData.totalBloxMass) * 10n ** 18n)} BLOX to mint. 
                    The contract locks BLOX tokens during minting.
                  </p>
                </div>
              )}

              {/* Approve BLOX Button - always show if allowance insufficient */}
              {contractState.bloxAllowance !== null && 
               contractState.bloxAllowance < BigInt(debugData.totalBloxMass) * 10n ** 18n && (
                <Button
                  onClick={handleApproveBlox}
                  disabled={approving || !isConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {approving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {approving ? "Approving..." : `Approve BLOX (${debugData.totalBloxMass} BLOX)`}
                </Button>
              )}

              {/* Approve status */}
              {contractState.bloxAllowance !== null && 
               contractState.bloxAllowance >= BigInt(debugData.totalBloxMass) * 10n ** 18n && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    BLOX Approved ({ethers.formatEther(contractState.bloxAllowance)} BLOX)
                  </p>
                </div>
              )}

              {componentTokenIds.length > 0 && (
                <div className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg border border-[hsl(var(--ethblox-border))] space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[hsl(var(--ethblox-text-primary))]">License handling</p>
                    <Button
                      variant={autoBuyMissingLicenses ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutoBuyMissingLicenses(!autoBuyMissingLicenses)}
                      className={autoBuyMissingLicenses ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                    >
                      {autoBuyMissingLicenses ? "Auto-buy ON" : "Auto-buy OFF"}
                    </Button>
                  </div>
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">
                    Missing component licenses: {missingLicenseBuildIds.length}
                  </p>
                  {missingLicenseBuildIds.length > 0 && (
                    <Button
                      onClick={handleBuyMissingLicenses}
                      disabled={buyingLicenses || !isConnected}
                      variant="outline"
                      className="w-full border-[hsl(var(--ethblox-accent-cyan))] text-[hsl(var(--ethblox-accent-cyan))] bg-transparent hover:bg-[hsl(var(--ethblox-accent-cyan)/0.1)]"
                    >
                      {buyingLicenses && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {buyingLicenses ? "Buying Missing Licenses..." : "Buy Missing Licenses Now"}
                    </Button>
                  )}
                </div>
              )}

              {/* Run Diagnostics Button */}
              <Button
                onClick={handleRunDiagnostics}
                disabled={runningDiagnostics || !isConnected || !generatedHash}
                variant="outline"
                className="w-full border-[hsl(var(--ethblox-accent-cyan))] text-[hsl(var(--ethblox-accent-cyan))] bg-transparent hover:bg-[hsl(var(--ethblox-accent-cyan)/0.1)]"
              >
                {runningDiagnostics && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {runningDiagnostics ? "Running Diagnostics..." : "Run Pre-Mint Diagnostics"}
              </Button>

              {/* Diagnostics Results */}
              {diagnostics && (
                <div className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg border border-[hsl(var(--ethblox-border))] space-y-1 max-h-[600px] overflow-auto">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-medium text-[hsl(var(--ethblox-text-primary))]">Diagnostic Results:</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs text-[hsl(var(--ethblox-accent-cyan))]"
                      onClick={() => {
                        const text = Object.entries(diagnostics)
                          .map(([k, v]) => k.startsWith("---") ? `\n${k}` : `${k}: ${String(v ?? "")}`)
                          .join("\n")
                        copyToClipboard(text, "allDiagnostics")
                      }}
                    >
                      {copied === "allDiagnostics" ? "Copied!" : "Copy All"}
                    </Button>
                  </div>
                  {Object.entries(diagnostics).map(([key, rawValue]) => {
                    const value = String(rawValue ?? "")
                    const isPass = value === "YES" || value.startsWith("YES") || value.includes("available") || value === "SUCCESS"
                    const isFail = value === "NO" || value.startsWith("NO") || value.includes("FAILED") || value === "REVERTED"
                    const isSeparator = key.startsWith("---")
                    const isLongValue = value.length > 80
                    
                    if (isSeparator) {
                      return <Separator key={key} className="bg-[hsl(var(--ethblox-border))] my-2" />
                    }
                    
                    if (isLongValue) {
                      return (
                        <div key={key} className="text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[hsl(var(--ethblox-text-secondary))]">{key}</span>
                            <Button variant="ghost" size="sm" className="h-5 px-1 text-xs"
                              onClick={() => copyToClipboard(value, key)}>
                              {copied === key ? "Copied!" : "Copy"}
                            </Button>
                          </div>
                          <pre className="mt-1 p-2 bg-black/30 rounded text-[10px] font-mono text-[hsl(var(--ethblox-text-tertiary))] break-all whitespace-pre-wrap">
                            {value}
                          </pre>
                        </div>
                      )
                    }
                    
                    return (
                      <div key={key} className="flex justify-between text-xs gap-2">
                        <span className="text-[hsl(var(--ethblox-text-secondary))] shrink-0">{key}</span>
                        <span className={`font-mono text-right break-all ${
                          isFail ? "text-red-400" : isPass ? "text-green-400" : "text-[hsl(var(--ethblox-text-primary))]"
                        }`}>
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              <Separator className="bg-[hsl(var(--ethblox-border))]" />

              {/* Mint Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={() => handleMint(false)}
                  disabled={minting || buyingLicenses || !isConnected || !generatedHash || (!canMint && !skipChecks)}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
                >
                  {(minting || buyingLicenses) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {buyingLicenses
                    ? "Buying Licenses..."
                    : minting
                      ? "Sending TX..."
                      : `Mint NFT (${ethers.formatEther(FEE_PER_MINT)} ETH + 500k gas)`}
                </Button>
                <Button
                  onClick={() => handleMint(true)}
                  disabled={minting || buyingLicenses || !isConnected || !generatedHash}
                  variant="outline"
                  className="w-full border-red-500/50 text-red-400 bg-transparent hover:bg-red-500/10"
                >
                  {(minting || buyingLicenses) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Force Send (1M gas limit)
                </Button>
                <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] text-center">
                  If auto-buy is ON, missing component licenses are purchased before mint.
                  Mint + license purchase are sequential transactions, not a single on-chain atomic call.
                </p>
              </div>

              {/* Mint Status */}
              {mintTxHash && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-sm font-medium text-green-400 mb-1">Transaction Submitted!</p>
                  <a 
                    href={`${explorerBase}/tx/${mintTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[hsl(var(--ethblox-accent-cyan))] flex items-center gap-1 hover:underline"
                  >
                    View on BaseScan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {mintError && (
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-sm font-medium text-red-400 mb-1">Error</p>
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] break-all">
                    {mintError}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw JSON Data */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                  Raw Build Data
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(JSON.stringify(debugData, null, 2), 'json')}
                  className="h-8"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied === 'json' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-xs font-mono text-[hsl(var(--ethblox-text-tertiary))] overflow-auto max-h-64">
                {JSON.stringify({
                  ...debugData,
                  bricks: `[${debugData.bricks.length} bricks]`, // Truncate for display
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Width Section - Build Preview & Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* 3D Preview with Auto-Capture */}
        <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
              Build Preview (IPFS Image)
            </CardTitle>
            <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">
              Standardized camera angle: 45° horizontal, 35° elevation. Auto-captures on load.
            </p>
          </CardHeader>
          <CardContent>
            <StandardBuildCapture
              bricks={debugData.bricks}
              buildName={debugData.buildName}
              buildId={debugData.buildId}
              autoCapture={true}
              onCapture={(dataUrl) => setScreenshotUrl(dataUrl)}
              showControls={true}
            />
          </CardContent>
        </Card>

        {/* Full Build Data (Geometry Hash Source) */}
        <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Full Build Data (Geometry Hash Source)
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  const fullData = {
                    buildId: debugData.buildId,
                    buildName: debugData.buildName,
                    baseWidth: debugData.baseWidth,
                    baseDepth: debugData.baseDepth,
                    bricks: debugData.bricks.map(b => ({
                      position: b.position,
                      color: b.color,
                      width: b.width,
                      depth: b.depth,
                    }))
                  }
                  copyToClipboard(JSON.stringify(fullData, null, 2), 'fullBuildData')
                }}
                className="h-8"
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied === 'fullBuildData' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mb-3">
              This is the normalized data used to generate the geometryHash. 
              The hash is deterministic based on brick positions, colors, and dimensions.
            </p>
            <pre className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-xs font-mono text-[hsl(var(--ethblox-text-secondary))] overflow-auto max-h-96">
{JSON.stringify({
  buildId: debugData.buildId,
  buildName: debugData.buildName,
  baseWidth: debugData.baseWidth,
  baseDepth: debugData.baseDepth,
  totalBricks: debugData.bricks.length,
  bricks: debugData.bricks.map(b => ({
    position: b.position,
    color: b.color,
    width: b.width,
    depth: b.depth,
  }))
}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
