import { ethers } from "ethers"
import { computeSpecKey } from "../brickSpec"

// Constants
export const FEE_PER_MINT = ethers.parseEther("0.001") // 0.001 ETH mint fee (test)
export const BURN_FEE = ethers.parseEther("0.005") // 0.005 ETH burn fee
export const BLOX_DECIMALS = 18n
export const MINT_GAS_LIMIT = 700_000n // 600-800k recommended for BuildNFT.mint
export const MINT_GAS_LIMIT_FORCE = 800_000n // upper bound when force-sending

// Metadata via IPFS - baseTokenURI is set on-chain, no per-token URIs needed
export const BASE_METADATA_CID = "bafybeihf3bprrm6gr5prmzatwnjlnl3pmygw5xh44tvnwccejqo2yfoaii"
export const BASE_METADATA_URI =
  process.env.NEXT_PUBLIC_BASE_METADATA_URI ?? `ipfs://${BASE_METADATA_CID}`
export const BASE_METADATA_GATEWAY =
  process.env.NEXT_PUBLIC_BASE_METADATA_GATEWAY ??
  `https://gateway.pinata.cloud/ipfs/${BASE_METADATA_CID}`
export const tokenMetadataURI = (tokenId: string | number) =>
  `${BASE_METADATA_URI}/${tokenId}.json`
export const tokenMetadataGatewayURL = (tokenId: string | number) =>
  `${BASE_METADATA_GATEWAY}/${tokenId}.json`

// Images via IPFS - stored at root of images CID (no /images/ folder)
export const IMAGES_CID =
  process.env.NEXT_PUBLIC_IMAGES_CID ??
  "bafybeibnk4kq7mesrs7wtwi2ypwlnxhazoqkwgoycol55n64tqseox2q2a"
export const IMAGES_GATEWAY =
  process.env.NEXT_PUBLIC_IMAGES_GATEWAY ??
  `https://gateway.pinata.cloud/ipfs/${IMAGES_CID}`
export const tokenImageURI = (tokenId: string | number) =>
  `ipfs://${IMAGES_CID}/${tokenId}.png`
export const tokenImageGatewayURL = (tokenId: string | number) =>
  `${IMAGES_GATEWAY}/${tokenId}.png`

// Resolve any ipfs:// URI to a gateway URL
export const resolveIPFS = (uri: string) => {
  const gateway =
    process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/"
  return uri.replace("ipfs://", gateway)
}

// Build kinds
export const BUILD_KIND = {
  BRICK: 0, // kind=0 for individual bricks
  BUILD: 1, // kind>0 for composite builds
} as const

// Network: configurable via env, defaults to Base Sepolia
const DEFAULT_CHAIN_ID = 84532
const DEFAULT_CHAIN_HEX = "0x14a34"
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? DEFAULT_CHAIN_ID)
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.BASE_SEPOLIA_RPC_URL ||
  "https://sepolia.base.org"

// Contract addresses (env override with Base Sepolia fallback)
export const CONTRACTS = {
  MOCK_BLOX:
    process.env.NEXT_PUBLIC_BLOX_ADDRESS ?? "0x6578d53995FEB0e486135b893B8bC16AE1a5Ec52",
  BUILD_NFT:
    process.env.NEXT_PUBLIC_BUILDNFT_ADDRESS ?? "0x6Da8ABFeCfd468E6CfCc551E014388f7B279f1A3",
  LICENSE_REGISTRY:
    process.env.NEXT_PUBLIC_LICENSE_REGISTRY_ADDRESS ?? "0x6Fe315D0CA4EB570dC96d2b1C7E2a287d492Cc5A",
  LICENSE_NFT:
    process.env.NEXT_PUBLIC_LICENSE_NFT_ADDRESS ?? "0xfEb8dCa56E849E91E7D3B4a2Ba2673Bb5FDf080E",
  DISTRIBUTOR:
    process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS ?? "0xf9b225DAbD233a28da36C3379197bD165759E865",
  BASE_SEPOLIA_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_HEX ?? DEFAULT_CHAIN_HEX,
}

// Minimal ABIs
export const MOCK_BLOX_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]

// BuildNFT ABI
// Confirmed from on-chain tx 0x37c60c0d: MethodID 0x0923bb28
// mint(bytes32,uint256,string,uint256[],uint256[],uint8,uint8,uint8,uint16)
// Note: density is uint16 (NOT uint8)
export const BUILD_NFT_ABI = [
  "function mint(bytes32 geometryHash, uint256 mass, string uri, uint256[] componentBuildIds, uint256[] componentCounts, uint8 kind, uint8 width, uint8 depth, uint16 density) payable",
  "function isMinter(address) view returns (bool)",
  "function mintingOpen() view returns (bool)",
  // State reading
  "function kindOf(uint256 tokenId) view returns (uint8)",
  "function geometryOf(uint256 tokenId) view returns (bytes32)",
  "function brickSpecOf(uint256 tokenId) view returns (uint8 width, uint8 depth, uint16 density)",
  "function lockedBloxOf(uint256 tokenId) view returns (uint256)",
  "function kind(uint256 tokenId) view returns (uint8)",
  "function geometryHash(uint256 tokenId) view returns (bytes32)",
  "function brickSpec(uint256 tokenId) view returns (uint8 width, uint8 depth, uint16 density)",
  "function lockedBlox(uint256 tokenId) view returns (uint256)",
  "function escrowedLicenses(uint256 tokenId, uint256 licenseId) view returns (uint256)",
  "function maxMass() view returns (uint256)",
  "function nextTokenId() view returns (uint256)",
  "function hashToTokenId(bytes32) view returns (uint256)",
  "function brickSpecConsumed(bytes32) view returns (bool)",
  "function paused() view returns (bool)",
  "function blox() view returns (address)",
  "function bloxToken() view returns (address)",
  "function FEE_PER_MINT() view returns (uint256)",
  "function BURN_FEE() view returns (uint256)",
  "function mintFee() view returns (uint256)",
  "function owner() view returns (address)",
  "function distributor() view returns (address)",
  // ERC721 standard
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function exists(uint256 tokenId) view returns (bool)",
  "function safeOwnerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  // Burn (only for builds, not bricks)
  "function burn(uint256 tokenId) payable",
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]

// LicenseRegistry ABI - maps component tokenIds to license IDs
export const LICENSE_REGISTRY_ABI = [
  "function nextLicenseId() view returns (uint256)",
  "function licenseIdForBuild(uint256 buildId) view returns (uint256)",
  "function buildIdForLicense(uint256 licenseId) view returns (uint256)",
  "function quote(uint256 buildId, uint256 qty) view returns (uint256)",
  "function pricingForLicense(uint256 licenseId) view returns (uint256 startPrice, uint256 step, uint256 maxSupply, uint256 maxPrice)",
  "function mintLicenseForBuild(uint256 buildId, uint256 qty)",
  "function registerBuild(uint256 buildId, bytes32 expectedGeometryHash)",
  "function getLicenseId(uint256 componentTokenId) view returns (uint256)",
  "function getLicenseIds(uint256[] calldata componentTokenIds) view returns (uint256[])",
  "function isLicenseRequired(uint256 componentTokenId) view returns (bool)",
]

// LicenseNFT ABI - ERC1155 for license ownership
export const LICENSE_NFT_ABI = [
  // ERC1155 standard
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) view returns (uint256[])",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  // License-specific
  "function totalSupply(uint256 id) view returns (uint256)",
  "function maxSupply(uint256 id) view returns (uint256)",
]

// Distributor ABI - handles rewards distribution
export const DISTRIBUTOR_ABI = [
  "function claim()",
  "function claimTo(address to)",
  "function ethOwed(address account) view returns (uint256)",
  "function pendingLicenseRewards(address account, uint256[] licenseIds) view returns (uint256 total, uint256[] perId)",
  "function claimLicenseRewards(uint256[] licenseIds)",
  "function totalDistributed() view returns (uint256)",
]

async function resolveDistributorAddress(provider: ethers.BrowserProvider): Promise<string> {
  const fallback = CONTRACTS.DISTRIBUTOR
  if (fallback === "0x0000000000000000000000000000000000000000") return fallback
  try {
    const build = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
    const onchain = (await build.distributor()) as string
    if (onchain && onchain !== "0x0000000000000000000000000000000000000000") return onchain
  } catch {
    // fall through to configured distributor
  }
  return fallback
}

// Local storage registry for minted hashes
const MINTED_HASHES_KEY = "ethblox_minted_hashes"

export function getMintedHashes(): Set<string> {
  if (typeof window === "undefined") return new Set()
  const stored = localStorage.getItem(MINTED_HASHES_KEY)
  return new Set(stored ? JSON.parse(stored) : [])
}

export function addMintedHash(hash: string) {
  const hashes = getMintedHashes()
  hashes.add(hash.toLowerCase())
  localStorage.setItem(MINTED_HASHES_KEY, JSON.stringify(Array.from(hashes)))
}

export function isHashMinted(hash: string): boolean {
  return getMintedHashes().has(hash.toLowerCase())
}

// Contract interaction helpers
export async function getBloxBalance(provider: ethers.BrowserProvider, address: string): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.MOCK_BLOX, MOCK_BLOX_ABI, provider)
  return await contract.balanceOf(address)
}

export async function getBloxAllowance(
  provider: ethers.BrowserProvider,
  owner: string,
  spender: string,
): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.MOCK_BLOX, MOCK_BLOX_ABI, provider)
  return await contract.allowance(owner, spender)
}

export async function approveBlox(
  provider: ethers.BrowserProvider,
  amount: bigint,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.MOCK_BLOX, MOCK_BLOX_ABI, signer)
  return await contract.approve(CONTRACTS.BUILD_NFT, amount)
}

export async function getMaxMass(provider: ethers.BrowserProvider): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
  return await contract.maxMass()
}

export async function getNextTokenId(provider: ethers.BrowserProvider): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
  return await contract.nextTokenId()
}

export async function isBrickSpecMintedOnChain(
  provider: ethers.BrowserProvider,
  width: number,
  depth: number,
  density: number,
): Promise<boolean> {
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
  const specKey = computeSpecKey(width, depth, density)
  return Boolean(await contract.brickSpecConsumed(specKey))
}

export async function mintBuildNFT(
  provider: ethers.BrowserProvider,
  geometryHash: string,
  mass: number,
): Promise<ethers.ContractTransactionResponse> {
  return mintBuildNFTWithParams(provider, {
    geometryHash,
    mass,
    uri: "",
    componentBuildIds: [],
    componentCounts: [],
    kind: 1,
    width: 0,
    depth: 0,
    density: 1,
  })
}

// New mint function with correct payload format
export interface MintParams {
  geometryHash: string
  mass: number
  uri: string
  componentBuildIds: bigint[]
  componentCounts: bigint[]
  kind: number
  width: number
  depth: number
  density: number
}

// Run pre-mint diagnostics - returns an object with all checks
export async function runMintDiagnostics(
  provider: ethers.BrowserProvider,
  params: MintParams,
  sender: string,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  
  try {
    const bloxContract = new ethers.Contract(CONTRACTS.MOCK_BLOX, MOCK_BLOX_ABI, provider)
    const buildContract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
    
    // Network
    const network = await provider.getNetwork()
    results["Chain ID"] = `${network.chainId} (expected: ${CHAIN_ID})`
    results["Correct Chain"] = network.chainId === BigInt(CHAIN_ID) ? "YES" : "NO"
    
    // Contract state checks
    results["--- CONTRACT STATE ---"] = ""
    
    try {
      const paused = await buildContract.paused()
      results["Contract Paused"] = paused ? "YES (MINTING BLOCKED!)" : "NO"
    } catch { results["Contract Paused"] = "N/A (no paused() function)" }
    
    try {
      const bloxTokenAddr = await buildContract.blox()
      results["Contract BLOX Token Addr"] = bloxTokenAddr
      results["BLOX Addr Matches Our Config"] = bloxTokenAddr.toLowerCase() === CONTRACTS.MOCK_BLOX.toLowerCase() ? "YES" : `NO! Contract uses ${bloxTokenAddr}, we use ${CONTRACTS.MOCK_BLOX}`
    } catch {
      try {
        const bloxTokenAddr = await buildContract.bloxToken()
        results["Contract BLOX Token Addr"] = bloxTokenAddr
        results["BLOX Addr Matches Our Config"] =
          bloxTokenAddr.toLowerCase() === CONTRACTS.MOCK_BLOX.toLowerCase()
            ? "YES"
            : `NO! Contract uses ${bloxTokenAddr}, we use ${CONTRACTS.MOCK_BLOX}`
      } catch {
        results["Contract BLOX Token Addr"] = "N/A (no blox/bloxToken function)"
      }
    }
    
    try {
      const onChainFee = await buildContract.FEE_PER_MINT()
      results["On-chain Mint Fee"] = `${ethers.formatEther(onChainFee)} ETH (raw: ${onChainFee.toString()})`
      results["Our Fee Matches"] = onChainFee === FEE_PER_MINT ? "YES" : `NO! Contract wants ${ethers.formatEther(onChainFee)} ETH, we send ${ethers.formatEther(FEE_PER_MINT)} ETH`
    } catch {
      try {
        const onChainFee = await buildContract.mintFee()
        results["On-chain Mint Fee"] = `${ethers.formatEther(onChainFee)} ETH (raw: ${onChainFee.toString()})`
        results["Our Fee Matches"] =
          onChainFee === FEE_PER_MINT
            ? "YES"
            : `NO! Contract wants ${ethers.formatEther(onChainFee)} ETH, we send ${ethers.formatEther(FEE_PER_MINT)} ETH`
      } catch {
        results["On-chain Mint Fee"] = "N/A (no fee getter)"
      }
    }
    
    try {
      const contractOwner = await buildContract.owner()
      results["Contract Owner"] = contractOwner
      results["Sender Is Owner"] = contractOwner.toLowerCase() === sender.toLowerCase() ? "YES" : "NO"
    } catch { results["Contract Owner"] = "N/A (no owner() function)" }
    
    // Check for whitelist/minter role
    try {
      const isMinter = await buildContract.isMinter(sender)
      results["Is Minter (whitelisted)"] = isMinter ? "YES" : "NO (MAY BLOCK MINTING!)"
    } catch { results["Is Minter"] = "N/A (no isMinter() function)" }
    
    try {
      const mintingOpen = await buildContract.mintingOpen()
      results["Minting Open"] = mintingOpen ? "YES" : "NO (MINTING CLOSED!)"
    } catch { results["Minting Open"] = "N/A (no mintingOpen() function)" }
    
    try {
      const nextId = await buildContract.nextTokenId()
      results["Next Token ID"] = nextId.toString()
    } catch { results["Next Token ID"] = "FAILED TO READ" }
    
    try {
      const maxM = await buildContract.maxMass()
      results["Max Mass"] = maxM.toString()
      results["Mass Within Limit"] = BigInt(params.mass) <= maxM ? "YES" : `NO (mass ${params.mass} > max ${maxM})`
    } catch { results["Max Mass"] = "FAILED TO READ" }
    
    // Hash check
    results["--- HASH CHECK ---"] = ""
    results["Geometry Hash"] = params.geometryHash
    try {
      const hashToToken = await buildContract.hashToTokenId(params.geometryHash)
      results["Hash Already Minted"] = hashToToken > 0n ? `YES - TOKEN #${hashToToken} (WILL REVERT!)` : "NO (available)"
    } catch { results["Hash Already Minted"] = "COULD NOT CHECK (no hashToTokenId function)" }
    
    // BLOX checks
    results["--- BLOX TOKEN ---"] = ""
    const balance = await bloxContract.balanceOf(sender)
    results["BLOX Balance"] = `${ethers.formatEther(balance)} BLOX (raw: ${balance.toString()})`
    
    const allowance = await bloxContract.allowance(sender, CONTRACTS.BUILD_NFT)
    results["BLOX Allowance (to BuildNFT)"] = `${ethers.formatEther(allowance)} BLOX (raw: ${allowance.toString()})`
    
    const requiredBlox = BigInt(params.mass) * 10n ** 18n
    results["Required BLOX"] = `${ethers.formatEther(requiredBlox)} (mass=${params.mass})`
    results["Balance Sufficient"] = balance >= requiredBlox ? "YES" : `NO (need ${ethers.formatEther(requiredBlox - balance)} more)`
    results["Allowance Sufficient"] = allowance >= requiredBlox ? "YES" : `NO (need ${ethers.formatEther(requiredBlox - allowance)} more)`
    
    // ETH check
    results["--- ETH ---"] = ""
    const ethBalance = await provider.getBalance(sender)
    results["ETH Balance"] = `${ethers.formatEther(ethBalance)} ETH`
    results["ETH Sufficient"] =
      ethBalance >= FEE_PER_MINT ? "YES" : `NO (need ${ethers.formatEther(FEE_PER_MINT)} ETH)`
    
    // Mint params summary
    results["--- MINT PARAMS ---"] = ""
    results["kind"] = params.kind.toString()
    results["mass"] = params.mass.toString()
    results["width"] = params.width.toString()
    results["depth"] = params.depth.toString()
    results["density"] = params.density.toString()
    results["componentBuildIds"] = `[${params.componentBuildIds.map(String).join(", ")}] (length: ${params.componentBuildIds.length})`
    results["componentCounts"] = `[${params.componentCounts.map(String).join(", ")}] (length: ${params.componentCounts.length})`
    results["uri"] = params.uri === "" ? '""  (empty string)' : params.uri
    
  } catch (err: any) {
    results["Diagnostic Error"] = err.message
  }
  
  return results
}

export async function mintBuildNFTWithParams(
  provider: ethers.BrowserProvider,
  params: MintParams,
  forceSend = false,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  
  // JSON ABI matching on-chain contract (MethodID: 0x0923bb28)
  // density is uint16 (NOT uint8) - confirmed from BaseScan tx 0x37c60c0d
  const mintAbi = [{
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      { name: "geometryHash", type: "bytes32" },
      { name: "mass", type: "uint256" },
      { name: "uri", type: "string" },
      { name: "componentBuildIds", type: "uint256[]" },
      { name: "componentCounts", type: "uint256[]" },
      { name: "kind", type: "uint8" },
      { name: "width", type: "uint8" },
      { name: "depth", type: "uint8" },
      { name: "density", type: "uint16" },
    ],
    outputs: [],
  }]
  
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, mintAbi, signer)
  
  // Log the populated transaction to verify calldata before sending
  const populated = await contract.mint.populateTransaction(
    params.geometryHash,
    BigInt(params.mass),
    params.uri,
    params.componentBuildIds,
    params.componentCounts,
    params.kind,
    params.width,
    params.depth,
    params.density,
    { value: FEE_PER_MINT, gasLimit: forceSend ? MINT_GAS_LIMIT_FORCE : MINT_GAS_LIMIT }
  )
  
  if (!populated.data || populated.data.length < 10) {
    throw new Error(`Calldata is empty or too short: "${populated.data}"`)
  }
  
  const tx = await signer.sendTransaction({
    to: populated.to,
    data: populated.data,
    value: FEE_PER_MINT,
    gasLimit: forceSend ? MINT_GAS_LIMIT_FORCE : MINT_GAS_LIMIT,
  })
  
  return tx
}

// Encode calldata for mint - density is uint16
export function encodeMintCalldata(params: MintParams): string {
  const mintAbi = [{
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      { name: "geometryHash", type: "bytes32" },
      { name: "mass", type: "uint256" },
      { name: "uri", type: "string" },
      { name: "componentBuildIds", type: "uint256[]" },
      { name: "componentCounts", type: "uint256[]" },
      { name: "kind", type: "uint8" },
      { name: "width", type: "uint8" },
      { name: "depth", type: "uint8" },
      { name: "density", type: "uint16" },
    ],
    outputs: [],
  }]
  const iface = new ethers.Interface(mintAbi)
  return iface.encodeFunctionData("mint", [
    params.geometryHash,
    BigInt(params.mass),
    params.uri,
    params.componentBuildIds,
    params.componentCounts,
    params.kind,
    params.width,
    params.depth,
    params.density,
  ])
}

// Simulate mint via eth_call using the signer (ensures from is set correctly)
export async function simulateMint(
  provider: ethers.BrowserProvider,
  params: MintParams,
  from: string,
): Promise<{ success: boolean; result: string; decodedError?: string }> {
  const calldata = encodeMintCalldata(params)
  const signer = await provider.getSigner()
  
  // Use signer.call() which automatically sets from to the signer's address
  // and properly routes through MetaMask's eth_call
  try {
    const result = await signer.call({
      to: CONTRACTS.BUILD_NFT,
      data: calldata,
      value: FEE_PER_MINT,
      gasLimit: MINT_GAS_LIMIT, // Match normal mint gas limit to avoid false simulation reverts
    })
    return { success: true, result }
  } catch (err: any) {
    // Try to extract revert data from various error shapes
    const data = err.data || err.error?.data || err.info?.error?.data || "0x"
    let decodedError = undefined
    
    if (data && data !== "0x" && data.length > 2) {
      // Try to decode as Error(string) - selector 0x08c379a0
      if (data.startsWith("0x08c379a0")) {
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], "0x" + data.slice(10))
          decodedError = `Revert: "${decoded[0]}"`
        } catch {
          decodedError = `Raw revert data: ${data}`
        }
      } else {
        decodedError = `Raw revert data: ${data}`
      }
    } else {
      // No revert data - try to extract from error message
      const msg = err.message || ""
      if (msg.includes("insufficient funds")) {
        decodedError = `Insufficient ETH (need ${ethers.formatEther(FEE_PER_MINT)} ETH for mint fee + gas)`
      } else if (msg.includes("require(false)")) {
        decodedError = "Bare require(false) - contract rejected call. Check BLOX approval, balance, and fee."
      } else {
        decodedError = `No revert data. Error: ${msg.slice(0, 200)}`
      }
    }
    
    return { success: false, result: data, decodedError }
  }
}

export async function burnBuildNFT(
  provider: ethers.BrowserProvider,
  tokenId: string,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, signer)
  // Convert tokenId string to BigInt for contract call
  return await contract.burn(BigInt(tokenId), { value: BURN_FEE })
}

// ========== NEW: Brick Minting ==========

export interface BrickSpec {
  width: number
  depth: number
  density: number
}

export async function mintBrick(
  provider: ethers.BrowserProvider,
  geometryHash: string,
  spec: BrickSpec,
): Promise<ethers.ContractTransactionResponse> {
  const mass = Math.max(1, spec.width * spec.depth)
  return mintBuildNFTWithParams(provider, {
    geometryHash,
    mass,
    uri: "",
    componentBuildIds: [],
    componentCounts: [],
    kind: 0,
    width: spec.width,
    depth: spec.depth,
    density: spec.density,
  })
}

// ========== NEW: Build Minting with Components ==========

export async function mintBuild(
  provider: ethers.BrowserProvider,
  geometryHash: string,
  mass: number,
  kind: number,
  componentTokenIds: bigint[],
): Promise<ethers.ContractTransactionResponse> {
  return mintBuildNFTWithParams(provider, {
    geometryHash,
    mass,
    uri: "",
    componentBuildIds: componentTokenIds,
    componentCounts: componentTokenIds.map(() => 1n),
    kind,
    width: 0,
    depth: 0,
    density: 1,
  })
}

// ========== NEW: License Registry Functions ==========

export async function getLicenseIds(
  provider: ethers.BrowserProvider,
  componentTokenIds: bigint[],
): Promise<bigint[]> {
  if (CONTRACTS.LICENSE_REGISTRY === "0x0000000000000000000000000000000000000000") {
    // Contract not deployed yet - return empty array
    return []
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, LICENSE_REGISTRY_ABI, provider)
  try {
    return await contract.getLicenseIds(componentTokenIds)
  } catch {
    const ids: bigint[] = []
    for (const tokenId of componentTokenIds) {
      ids.push(await contract.licenseIdForBuild(tokenId))
    }
    return ids
  }
}

export interface ComponentLicenseStatus {
  componentBuildIds: bigint[]
  licenseIds: bigint[]
  balances: bigint[]
  missingComponentBuildIds: bigint[]
  missingLicenseIds: bigint[]
}

export async function getComponentLicenseStatus(
  provider: ethers.BrowserProvider,
  account: string,
  componentBuildIds: bigint[],
): Promise<ComponentLicenseStatus> {
  const licenseIds = await getLicenseIds(provider, componentBuildIds)
  const balances =
    licenseIds.length > 0 ? await getLicenseBalances(provider, account, licenseIds) : []
  const missingComponentBuildIds: bigint[] = []
  const missingLicenseIds: bigint[] = []

  for (let i = 0; i < componentBuildIds.length; i++) {
    const licenseId = licenseIds[i] ?? 0n
    const balance = balances[i] ?? 0n
    if (licenseId === 0n || balance < 1n) {
      missingComponentBuildIds.push(componentBuildIds[i])
      if (licenseId > 0n) missingLicenseIds.push(licenseId)
    }
  }

  return {
    componentBuildIds,
    licenseIds,
    balances,
    missingComponentBuildIds,
    missingLicenseIds,
  }
}

export async function registerBuildLicenseIfOwner(
  provider: ethers.BrowserProvider,
  buildId: bigint,
): Promise<boolean> {
  const signer = await provider.getSigner()
  const registry = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, LICENSE_REGISTRY_ABI, signer)
  const build = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

  const existing = await registry.licenseIdForBuild(buildId)
  if (existing > 0n) return false

  try {
    const exists = await build.exists(buildId).catch(() => null)
    if (exists === false) {
      throw new Error(
        `Build #${buildId.toString()} does not exist on the connected network. Check chain selection and component token IDs.`,
      )
    }

    await build.ownerOf(buildId)
  } catch (error: any) {
    throw new Error(
      `Cannot register license for build #${buildId.toString()}: ${error?.message || "build not found or not active on this chain"}`,
    )
  }

  const geometryHash = await build.geometryOf(buildId)
  const tx = await registry.registerBuild(buildId, geometryHash)
  await tx.wait()
  return true
}

export async function quoteLicenseForBuild(
  provider: ethers.BrowserProvider,
  buildId: bigint,
  qty = 1n,
): Promise<bigint> {
  const registry = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, LICENSE_REGISTRY_ABI, provider)
  return await registry.quote(buildId, qty)
}

export async function mintLicenseForBuild(
  provider: ethers.BrowserProvider,
  buildId: bigint,
  qty = 1n,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const registry = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, LICENSE_REGISTRY_ABI, signer)
  const price = await registry.quote(buildId, qty)
  const owner = await signer.getAddress()
  const blox = new ethers.Contract(CONTRACTS.MOCK_BLOX, MOCK_BLOX_ABI, signer)
  const allowance = await blox.allowance(owner, CONTRACTS.LICENSE_REGISTRY)
  if (allowance < price) {
    const approveTx = await blox.approve(CONTRACTS.LICENSE_REGISTRY, ethers.MaxUint256)
    await approveTx.wait()
  }
  return await registry.mintLicenseForBuild(buildId, qty)
}

export interface LicensePurchaseResult {
  registeredBuilds: bigint[]
  purchasedBuilds: bigint[]
  txHashes: string[]
}

export async function buyMissingLicensesForComponents(
  provider: ethers.BrowserProvider,
  account: string,
  componentBuildIds: bigint[],
): Promise<LicensePurchaseResult> {
  const uniqueBuildIds = Array.from(new Set(componentBuildIds.map((id) => id.toString()))).map(
    (id) => BigInt(id),
  )

  const statusBefore = await getComponentLicenseStatus(provider, account, uniqueBuildIds)
  const targetBuildIds = statusBefore.missingComponentBuildIds
  const result: LicensePurchaseResult = { registeredBuilds: [], purchasedBuilds: [], txHashes: [] }

  for (const buildId of targetBuildIds) {
    const licenseIdBefore = (
      await getLicenseIds(provider, [buildId])
    )[0] ?? 0n
    if (licenseIdBefore === 0n) {
      const registered = await registerBuildLicenseIfOwner(provider, buildId)
      if (registered) result.registeredBuilds.push(buildId)
    }

    const statusNow = await getComponentLicenseStatus(provider, account, [buildId])
    const hasLicense = (statusNow.balances[0] ?? 0n) >= 1n
    if (!hasLicense) {
      const tx = await mintLicenseForBuild(provider, buildId, 1n)
      result.txHashes.push(tx.hash)
      await tx.wait()
      result.purchasedBuilds.push(buildId)
    }
  }

  return result
}

export async function isLicenseRequired(
  provider: ethers.BrowserProvider,
  componentTokenId: bigint,
): Promise<boolean> {
  if (CONTRACTS.LICENSE_REGISTRY === "0x0000000000000000000000000000000000000000") {
    return false
  }
  const ids = await getLicenseIds(provider, [componentTokenId])
  return ids.length > 0 && ids[0] > 0n
}

// ========== NEW: License NFT Functions ==========

export async function getLicenseBalance(
  provider: ethers.BrowserProvider,
  account: string,
  licenseId: bigint,
): Promise<bigint> {
  if (CONTRACTS.LICENSE_NFT === "0x0000000000000000000000000000000000000000") {
    return 0n
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)
  return await contract.balanceOf(account, licenseId)
}

export async function getLicenseBalances(
  provider: ethers.BrowserProvider,
  account: string,
  licenseIds: bigint[],
): Promise<bigint[]> {
  if (CONTRACTS.LICENSE_NFT === "0x0000000000000000000000000000000000000000") {
    return licenseIds.map(() => 0n)
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)
  const accounts = licenseIds.map(() => account)
  return await contract.balanceOfBatch(accounts, licenseIds)
}

export interface OwnedLicense {
  licenseId: bigint
  buildId: bigint
  balance: bigint
}

export async function getOwnedLicenses(
  provider: ethers.BrowserProvider,
  account: string,
): Promise<OwnedLicense[]> {
  if (
    CONTRACTS.LICENSE_NFT === "0x0000000000000000000000000000000000000000" ||
    CONTRACTS.LICENSE_REGISTRY === "0x0000000000000000000000000000000000000000"
  ) {
    return []
  }

  const registry = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, LICENSE_REGISTRY_ABI, provider)
  const licenseNft = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)
  const nextLicenseId = BigInt(await registry.nextLicenseId())
  if (nextLicenseId <= 1n) return []

  const licenseIds: bigint[] = []
  for (let id = 1n; id < nextLicenseId; id++) {
    licenseIds.push(id)
  }

  const balances = await licenseNft.balanceOfBatch(
    licenseIds.map(() => account),
    licenseIds,
  )

  const owned: OwnedLicense[] = []
  for (let i = 0; i < licenseIds.length; i++) {
    const bal = balances[i] ?? 0n
    if (bal > 0n) {
      const buildId = await registry.buildIdForLicense(licenseIds[i])
      owned.push({
        licenseId: licenseIds[i],
        buildId: BigInt(buildId),
        balance: BigInt(bal),
      })
    }
  }
  return owned
}

export async function approveLicenseNFT(
  provider: ethers.BrowserProvider,
  operator: string,
  approved: boolean,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, signer)
  return await contract.setApprovalForAll(operator, approved)
}

export async function isLicenseApproved(
  provider: ethers.BrowserProvider,
  account: string,
  operator: string,
): Promise<boolean> {
  if (CONTRACTS.LICENSE_NFT === "0x0000000000000000000000000000000000000000") {
    return true // No license contract = no approval needed
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)
  return await contract.isApprovedForAll(account, operator)
}

// ========== NEW: Build State Reading ==========

export interface BuildState {
  kind: number
  geometryHash: string
  lockedBlox: bigint
  brickSpec?: BrickSpec
}

export async function getBuildState(
  provider: ethers.BrowserProvider,
  tokenId: bigint,
): Promise<BuildState | null> {
  try {
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
    
    const [kind, geometryHash, lockedBlox] = await Promise.all([
      contract.kindOf(tokenId),
      contract.geometryOf(tokenId),
      contract.lockedBloxOf(tokenId),
    ])

  const state: BuildState = {
    kind: Number(kind),
    geometryHash,
    lockedBlox,
  }

  // If it's a brick (kind=0), fetch brick spec
  if (state.kind === BUILD_KIND.BRICK) {
    const [width, depth, density] = await contract.brickSpecOf(tokenId)
    state.brickSpec = {
      width: Number(width),
      depth: Number(depth),
      density: Number(density),
    }
  }

  return state
  } catch {
    // Token may not support getBuildState (e.g. test mints, non-burnable builds)
    return null
  }
}

export async function getEscrowedLicenses(
  provider: ethers.BrowserProvider,
  tokenId: bigint,
  licenseIds: bigint[],
): Promise<Map<bigint, bigint>> {
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
  const result = new Map<bigint, bigint>()
  
  for (const licenseId of licenseIds) {
    const amount = await contract.escrowedLicenses(tokenId, licenseId)
    if (amount > 0n) {
      result.set(licenseId, amount)
    }
  }
  
  return result
}

// ========== NEW: Distributor Functions ==========

export async function getPendingRewards(
  provider: ethers.BrowserProvider,
  account: string,
): Promise<bigint> {
  const distributor = await resolveDistributorAddress(provider)
  if (distributor === "0x0000000000000000000000000000000000000000") {
    return 0n
  }
  const contract = new ethers.Contract(distributor, DISTRIBUTOR_ABI, provider)
  return await contract.ethOwed(account)
}

export async function claimRewards(
  provider: ethers.BrowserProvider,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const distributor = await resolveDistributorAddress(provider)
  const contract = new ethers.Contract(distributor, DISTRIBUTOR_ABI, signer)
  return await contract.claim()
}

export async function getPendingLicenseRewards(
  provider: ethers.BrowserProvider,
  account: string,
  licenseIds: bigint[],
): Promise<{ total: bigint; perId: bigint[] }> {
  const distributor = await resolveDistributorAddress(provider)
  if (distributor === "0x0000000000000000000000000000000000000000" || licenseIds.length === 0) {
    return { total: 0n, perId: [] }
  }
  const contract = new ethers.Contract(distributor, DISTRIBUTOR_ABI, provider)
  const [total, perId] = await contract.pendingLicenseRewards(account, licenseIds)
  return { total, perId }
}

export async function claimLicenseRewards(
  provider: ethers.BrowserProvider,
  licenseIds: bigint[],
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const distributor = await resolveDistributorAddress(provider)
  const contract = new ethers.Contract(distributor, DISTRIBUTOR_ABI, signer)
  return await contract.claimLicenseRewards(licenseIds)
}

// ========== NEW: Validation Helpers ==========

export function calculateBloxLock(mass: number): bigint {
  return BigInt(mass) * 10n ** BLOX_DECIMALS
}

export function canBurn(kind: number): boolean {
  // Only builds (kind > 0) can be burned, not bricks (kind = 0)
  return kind > BUILD_KIND.BRICK
}

export async function getUserMintedBuilds(
  provider: ethers.BrowserProvider,
  address: string,
): Promise<Array<{ tokenId: string; tokenURI: string }>> {
  try {
    console.log("[v0] Fetching minted builds for address:", address)
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    // Query Transfer events where 'to' is the user's address
    const filter = contract.filters.Transfer(null, address)
    const currentBlock = await provider.getBlockNumber()
    const fromBlock = Math.max(0, currentBlock - 10000) // Last ~10k blocks (adjust if needed)

    console.log("[v0] Querying Transfer events from block", fromBlock, "to", currentBlock)
    const events = await contract.queryFilter(filter, fromBlock, currentBlock)
    console.log("[v0] Found", events.length, "Transfer events")

    // Collect unique token IDs and verify current ownership
    const tokenIds = new Set<bigint>()
    for (const event of events) {
      if (event.args && event.args.tokenId) {
        tokenIds.add(event.args.tokenId)
      }
    }

    console.log(
      "[v0] Unique token IDs from events:",
      Array.from(tokenIds).map((id) => id.toString()),
    )

    // Verify ownership and fetch metadata
    const builds = []
    for (const tokenId of tokenIds) {
      try {
        const owner = await contract.ownerOf(tokenId)
        if (owner.toLowerCase() === address.toLowerCase()) {
          const tokenURI = await contract.tokenURI(tokenId)
          builds.push({
            tokenId: tokenId.toString(),
            tokenURI,
          })
          console.log("[v0] Confirmed ownership of token", tokenId.toString())
        } else {
          console.log("[v0] Token", tokenId.toString(), "no longer owned by user")
        }
      } catch (error) {
        console.log("[v0] Token", tokenId.toString(), "may not exist or is not accessible")
      }
    }

    console.log("[v0] Final builds owned by user:", builds.length)
    return builds
  } catch (error) {
    console.error("[v0] Error fetching minted builds:", error)
    return []
  }
}

export async function getAllMintedBuilds(
  provider: ethers.BrowserProvider,
): Promise<Array<{ tokenId: string; owner: string; tokenURI: string }>> {
  try {
    console.log("[v0] Fetching all minted builds for gallery")
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    const currentBlock = await provider.getBlockNumber()
    const CHUNK_SIZE = 50000 // Safe chunk size under 100k limit
    const allEvents: ethers.EventLog[] = []

    // Query from contract deployment or recent history
    // For Base Sepolia, we'll query from a reasonable starting point
    const deploymentBlock = 0 // You can set this to the actual deployment block if known

    console.log("[v0] Querying mint events in chunks from block", deploymentBlock, "to", currentBlock)

    for (let fromBlock = deploymentBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock)
      console.log(`[v0] Querying chunk: blocks ${fromBlock} to ${toBlock}`)

      try {
        const filter = contract.filters.Transfer(ethers.ZeroAddress, null)
        const events = await contract.queryFilter(filter, fromBlock, toBlock)
        allEvents.push(...(events as ethers.EventLog[]))
        console.log(`[v0] Found ${events.length} events in this chunk`)
      } catch (chunkError) {
        console.error(`[v0] Error querying chunk ${fromBlock}-${toBlock}:`, chunkError)
        // Continue with next chunk even if one fails
      }
    }

    console.log("[v0] Found", allEvents.length, "total mint events")

    // Collect token data with ownership verification
    const builds = []
    const processedTokens = new Set<string>()

    for (const event of allEvents) {
      if (event.args && event.args.tokenId) {
        const tokenId = event.args.tokenId.toString()

        // Skip if already processed
        if (processedTokens.has(tokenId)) continue
        processedTokens.add(tokenId)

        try {
          // Verify token still exists and get current owner
          const owner = await contract.ownerOf(tokenId)
          const tokenURI = await contract.tokenURI(tokenId)

          builds.push({
            tokenId,
            owner,
            tokenURI,
          })
          console.log("[v0] Added token", tokenId, "owned by", owner)
        } catch (error) {
          console.log("[v0] Token", tokenId, "may have been burned or is not accessible")
        }
      }
    }

    console.log("[v0] Total minted builds in gallery:", builds.length)
    // Sort by tokenId descending (newest first)
    return builds.sort((a, b) => Number(b.tokenId) - Number(a.tokenId))
  } catch (error) {
    console.error("[v0] Error fetching all minted builds:", error)
    return []
  }
}
