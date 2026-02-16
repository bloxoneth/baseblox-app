import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { rk } from "@/lib/redis-keys"

export interface ProfileData {
  address: string
  displayName: string
  bio: string
  pfpTokenId: number | null
  pinnedTokenIds: number[]
  updatedAt: string
}

// GET /api/profile/[address] - Get profile for address
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 })
    }

    const normalizedAddress = address.toLowerCase()
    const profile = await redis.get<ProfileData>(rk(`profile:${normalizedAddress}`))

    if (!profile) {
      // Return default profile
      return NextResponse.json({
        address: normalizedAddress,
        displayName: "",
        bio: "",
        pfpTokenId: null,
        pinnedTokenIds: [],
        updatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("[v0] Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// POST /api/profile/[address] - Update profile for address
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    const body = await request.json()
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 })
    }

    const normalizedAddress = address.toLowerCase()

    // Verify the connected wallet matches the address being updated
    const connectedWallet = body.connectedWallet?.toLowerCase()
    if (!connectedWallet || connectedWallet !== normalizedAddress) {
      return NextResponse.json({ error: "Unauthorized: Can only update your own profile" }, { status: 403 })
    }

    // Validate and sanitize input
    const displayName = (body.displayName || "").slice(0, 32).trim()
    const bio = (body.bio || "").slice(0, 160).trim()
    const pfpTokenId = typeof body.pfpTokenId === "number" ? body.pfpTokenId : null
    
    let pinnedTokenIds: number[] = []
    if (Array.isArray(body.pinnedTokenIds)) {
      pinnedTokenIds = body.pinnedTokenIds
        .filter((id: unknown) => typeof id === "number" && id >= 0)
        .slice(0, 10) // Max 10 pinned builds
    }

    const profile: ProfileData = {
      address: normalizedAddress,
      displayName,
      bio,
      pfpTokenId,
      pinnedTokenIds,
      updatedAt: new Date().toISOString(),
    }

    // Save to Redis (no expiration - profiles are permanent)
    await redis.set(rk(`profile:${normalizedAddress}`), profile)

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error("[v0] Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
