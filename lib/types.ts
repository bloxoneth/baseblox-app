export type Brick = {
  color: string
  position: [number, number, number] // x, y, z
  width: number
  depth: number
  nftGroupId?: string // Groups bricks that belong to the same placed NFT
}

export type Build = {
  id: string
  name: string
  creator: string
  bricks: Brick[]
  mass?: number // total BLOX mass
  colors?: number // unique colors used
  bw_score?: number // builder weight score: log(1+mass) * log(2+colors)
  created?: string // ISO date string
  baseWidth?: number // build base width in studs
  baseDepth?: number // build base depth in studs
  buildHash?: string // SHA-256 hash of build geometry for NFT minting
  tokenId?: string // NFT token ID after minting
  txHash?: string // Transaction hash of the mint
  mintedAt?: string // ISO date string when NFT was minted
  composition?: NftComposition // NFT builds used in this build
  buildId?: string // Redis build ID
  kind?: number // 0 = brick, 1+ = build
  density?: number // Brick density (uint16)
  brickWidth?: number // Brick width (for kind=0)
  brickDepth?: number // Brick depth (for kind=0)
  // Contract params stored after mint
  geometryHash?: string // keccak256 geometry hash sent to contract
  specKey?: string // keccak256(geometryHash, width, depth)
  componentBuildIds?: string[] // token IDs of component NFTs
  componentCounts?: number[] // counts of each component NFT
  // Metadata from build
  metadata?: {
    buildWidth: number
    buildDepth: number
    totalBricks: number
    totalInstances: number
    nftsUsed: number
  }
  // Timestamps
  timestamp?: number
  // IPFS sync status
  ipfsPending?: boolean
  ipfsCid?: string
  ipfsUri?: string
  ipfsGatewayUrl?: string
  ipfsSyncedAt?: string
  ipfsLastError?: string
  ipfsLastAttemptAt?: string
  onchainMinted?: boolean
}

export type BuildMetadata = {
  id: string
  name: string
  creator: string
  mass?: number
  colors?: number
  bw_score?: number
  created?: string
  buildHash?: string
  tokenId?: string
  mintedAt?: string
}

export type NftComposition = {
  [tokenId: string]: {
    count: number
    name: string
  }
}
