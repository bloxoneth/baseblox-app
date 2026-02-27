import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { CONTRACTS } from "@/lib/contracts/ethblox-contracts"

/**
 * Admin-only endpoint to reset all BASEBLOX app-level NFT data.
 * 
 * This clears Redis cache to restart the app in a "genesis" state.
 * It does NOT reset on-chain data - only app-level cached data.
 * 
 * Required env var: ADMIN_RESET_TOKEN
 * 
 * Usage:
 * POST /api/admin/reset-nfts
 * Headers: { "x-admin-token": "<ADMIN_RESET_TOKEN>" }
 * Body: { "confirmation": "RESET_NFTS" }
 */

// Redis key prefixes used by BASEBLOX
const BASEBLOX_KEY_PATTERNS = [
  "build:*",           // Individual build data
  "builds:*",          // Build lists (public, popular, by tag)
  "hash:*",            // Geometry hash to build ID mappings
  "minted:*",          // Minted NFT metadata cache
  "token:*",           // Token ID related caches
  "user:*",            // User-specific caches
  "gallery:*",         // Gallery caches
  "profile:*",         // Profile caches
] as const

// Specific keys (not patterns) that need to be deleted
const BASEBLOX_SPECIFIC_KEYS = [
  "minted_tokens",     // Set of all minted token IDs
  "builds:public",     // Sorted set of public builds
] as const

interface ResetResult {
  success: boolean
  timestamp: string
  operator: string
  network: string
  contracts: {
    buildNFT: string
    licenseRegistry: string
    licenseNFT: string
    distributor: string
  }
  keysDeleted: number
  deletedPatterns: Record<string, number>
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    // ========== SAFEGUARD 1: Validate admin token ==========
    const adminToken = request.headers.get("x-admin-token")
    const expectedToken = process.env.ADMIN_RESET_TOKEN
    
    if (!expectedToken) {
      console.error("[ADMIN RESET] ADMIN_RESET_TOKEN env var not configured")
      return NextResponse.json(
        { error: "Server misconfiguration: Admin token not configured" },
        { status: 500 }
      )
    }
    
    if (!adminToken || adminToken !== expectedToken) {
      console.warn("[ADMIN RESET] Unauthorized reset attempt at", timestamp)
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing admin token" },
        { status: 401 }
      )
    }
    
    // ========== SAFEGUARD 2: Validate confirmation phrase ==========
    let body: { confirmation?: string; operator?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }
    
    if (body.confirmation !== "RESET_NFTS") {
      console.warn("[ADMIN RESET] Invalid confirmation phrase at", timestamp)
      return NextResponse.json(
        { error: "Invalid confirmation phrase. Expected: RESET_NFTS" },
        { status: 400 }
      )
    }
    
    const operator = body.operator || "unknown"
    
    console.log("[ADMIN RESET] ========================================")
    console.log("[ADMIN RESET] Starting BASEBLOX data reset")
    console.log("[ADMIN RESET] Timestamp:", timestamp)
    console.log("[ADMIN RESET] Operator:", operator)
    console.log("[ADMIN RESET] Network: Base Sepolia")
    console.log("[ADMIN RESET] BuildNFT:", CONTRACTS.BUILD_NFT)
    console.log("[ADMIN RESET] ========================================")
    
    // ========== REDIS RESET: Delete all BASEBLOX-related keys ==========
    const deletedPatterns: Record<string, number> = {}
    let totalDeleted = 0
    
    // Delete pattern-based keys
    for (const pattern of BASEBLOX_KEY_PATTERNS) {
      try {
        // Get all keys matching this pattern
        const keys = await redis.keys(pattern)
        
        if (keys.length > 0) {
          // Delete keys in batches to avoid timeout
          const BATCH_SIZE = 100
          for (let i = 0; i < keys.length; i += BATCH_SIZE) {
            const batch = keys.slice(i, i + BATCH_SIZE)
            // Delete each key individually since Upstash doesn't support DEL with multiple keys via REST
            await Promise.all(batch.map(key => redis.del(key)))
          }
          
          deletedPatterns[pattern] = keys.length
          totalDeleted += keys.length
          console.log(`[ADMIN RESET] Deleted ${keys.length} keys matching "${pattern}"`)
        } else {
          deletedPatterns[pattern] = 0
        }
      } catch (err) {
        console.error(`[ADMIN RESET] Error deleting keys for pattern "${pattern}":`, err)
        deletedPatterns[pattern] = -1 // Mark as error
      }
    }
    
    // Delete specific keys (not patterns)
    for (const key of BASEBLOX_SPECIFIC_KEYS) {
      try {
        const deleted = await redis.del(key)
        if (deleted) {
          deletedPatterns[key] = 1
          totalDeleted += 1
          console.log(`[ADMIN RESET] Deleted specific key "${key}"`)
        } else {
          deletedPatterns[key] = 0
        }
      } catch (err) {
        console.error(`[ADMIN RESET] Error deleting key "${key}":`, err)
        deletedPatterns[key] = -1
      }
    }
    
    // ========== AUDIT LOG ==========
    const result: ResetResult = {
      success: true,
      timestamp,
      operator,
      network: "base-sepolia",
      contracts: {
        buildNFT: CONTRACTS.BUILD_NFT,
        licenseRegistry: CONTRACTS.LICENSE_REGISTRY,
        licenseNFT: CONTRACTS.LICENSE_NFT,
        distributor: CONTRACTS.DISTRIBUTOR,
      },
      keysDeleted: totalDeleted,
      deletedPatterns,
    }
    
    // Store audit log in Redis (this won't be deleted since it uses a different prefix)
    await redis.lpush("admin:reset-logs", JSON.stringify(result))
    // Keep only last 100 reset logs
    await redis.ltrim("admin:reset-logs", 0, 99)
    
    console.log("[ADMIN RESET] ========================================")
    console.log("[ADMIN RESET] Reset complete!")
    console.log("[ADMIN RESET] Total keys deleted:", totalDeleted)
    console.log("[ADMIN RESET] ========================================")
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error("[ADMIN RESET] Fatal error during reset:", error)
    return NextResponse.json(
      { 
        error: "Reset failed", 
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to view reset logs (admin only)
export async function GET(request: NextRequest) {
  const adminToken = request.headers.get("x-admin-token")
  const expectedToken = process.env.ADMIN_RESET_TOKEN
  
  if (!expectedToken || !adminToken || adminToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    const logs = await redis.lrange("admin:reset-logs", 0, 49) // Last 50 logs
    return NextResponse.json({ 
      logs: logs.map(log => typeof log === "string" ? JSON.parse(log) : log),
      contracts: {
        buildNFT: CONTRACTS.BUILD_NFT,
        licenseRegistry: CONTRACTS.LICENSE_REGISTRY,
        licenseNFT: CONTRACTS.LICENSE_NFT,
        distributor: CONTRACTS.DISTRIBUTOR,
      }
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
