// Brick NFT data - core primitive for ETHBLOX
// Each brick represents a single-layer rectangle (up to 10x10)
// Fresh start - no dummy data, bricks are minted on-chain

export interface BrickNFT {
  id: string
  width: number
  depth: number
  density: 1 | 8 | 27 | 64 | 125 // Cube densities: 1^3, 2^3, 3^3, 4^3, 5^3
  mass: number // width * depth * density
  geometryHash: string
  minted: boolean
  owner?: string
  tokenId?: number
  priceETH?: number
  createdAt?: number
  usageCount?: number
}

// Calculate mass for a brick
export function calculateMass(width: number, depth: number, density: number): number {
  return width * depth * density
}

// Generate geometry hash (deterministic based on dimensions)
export function generateGeometryHash(width: number, depth: number, density: number): string {
  return `brick-${width}x${depth}-d${density}`
}

// All possible brick sizes (1x1 to 10x10) with various densities
// Starting fresh - all bricks are unminted until minted on-chain
export const BRICK_DENSITIES = [1, 8, 27, 64, 125] as const

// Generate all possible bricks - all unminted by default
// Minting status will be fetched from the blockchain
function generateAllBricks(): BrickNFT[] {
  const bricks: BrickNFT[] = []
  
  // Generate all possible bricks (1x1 to 10x10, all densities)
  // All start unminted - real minting status comes from blockchain
  for (let width = 1; width <= 10; width++) {
    for (let depth = width; depth <= 10; depth++) { // depth >= width to avoid duplicates
      for (const density of BRICK_DENSITIES) {
        const key = `${width}x${depth}-d${density}`
        const mass = calculateMass(width, depth, density)
        
        bricks.push({
          id: `brick-${key}`,
          width,
          depth,
          density: density as 1 | 8 | 27 | 64 | 125,
          mass,
          geometryHash: generateGeometryHash(width, depth, density),
          minted: false, // All unminted - blockchain is source of truth
          usageCount: 0,
        })
      }
    }
  }
  
  return bricks
}

// All bricks in the system (static definition, minting status from blockchain)
export const ALL_BRICKS = generateAllBricks()

// Helper functions
export function getBrickById(id: string): BrickNFT | undefined {
  return ALL_BRICKS.find(b => b.id === id)
}

export function getBrickByDimensions(width: number, depth: number, density: number = 1): BrickNFT | undefined {
  // Handle both orientations (width x depth or depth x width)
  const minDim = Math.min(width, depth)
  const maxDim = Math.max(width, depth)
  return ALL_BRICKS.find(
    b => b.width === minDim && b.depth === maxDim && b.density === density
  )
}

export function getMintedBricks(): BrickNFT[] {
  return ALL_BRICKS.filter(b => b.minted)
}

export function getUnmintedBricks(): BrickNFT[] {
  return ALL_BRICKS.filter(b => !b.minted)
}

export function getBricksByDensity(density: number): BrickNFT[] {
  return ALL_BRICKS.filter(b => b.density === density)
}

// Get mint fee (from contract: 0.001 ETH test setting)
export function getMintFee(): number {
  return 0.001
}

// Get suggested price for an unminted brick based on its properties
// This is informational only - actual mint fee is fixed at 0.001 ETH (test setting)
export function getSuggestedMintPrice(brick: BrickNFT): number {
  return 0.001 // Fixed mint fee from contract
}

// Format brick display name: WxD-D(x) e.g. 2x2-D1 (always normalized min x max)
export function formatBrickName(brick: BrickNFT): string {
  return normalizeBrickKey(brick.width, brick.depth, brick.density)
}

// Normalize a brick key so 1x2-D1 and 2x1-D1 produce the same string
export function normalizeBrickKey(w: number, d: number, density: number): string {
  const minDim = Math.min(w, d)
  const maxDim = Math.max(w, d)
  return `${minDim}x${maxDim}-D${density}`
}
