import { ethers } from "ethers"

// Valid densities: cube numbers 1^3, 2^3, 3^3, 4^3, 5^3
export const VALID_DENSITIES = [1, 8, 27, 64, 125] as const
export type ValidDensity = (typeof VALID_DENSITIES)[number]

export function isValidDensity(d: number): d is ValidDensity {
  return (VALID_DENSITIES as readonly number[]).includes(d)
}

export function isValidBrickDimension(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 10
}

/**
 * Compute a canonical specKey matching the contract expectation:
 * keccak256(abi.encodePacked(width, depth, density))
 * Width/depth are normalized so min comes first (1x3 == 3x1).
 */
export function computeSpecKey(width: number, depth: number, density: number): string {
  const w = Math.min(width, depth)
  const d = Math.max(width, depth)
  const encoded = ethers.solidityPacked(
    ["uint8", "uint8", "uint16"],
    [w, d, density]
  )
  return ethers.keccak256(encoded)
}

/**
 * Validate all brick params. Returns null if valid, or an error string.
 */
export function validateBrickParams(
  width: number,
  depth: number,
  density: number
): string | null {
  if (!isValidBrickDimension(width)) return `Invalid width: ${width} (must be 1-10)`
  if (!isValidBrickDimension(depth)) return `Invalid depth: ${depth} (must be 1-10)`
  if (!isValidDensity(density)) return `Invalid density: ${density} (must be one of ${VALID_DENSITIES.join(", ")})`
  return null
}

/**
 * Compute canonical mass for a brick: width * depth * density
 */
export function computeBrickMass(width: number, depth: number, density: number): number {
  return Math.min(width, depth) * Math.max(width, depth) * density
}
