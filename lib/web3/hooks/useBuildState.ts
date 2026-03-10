"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { useMetaMask } from "@/contexts/metamask-context"
import {
  CONTRACTS,
  BUILD_KIND,
  getBuildState,
  getPendingRewards,
  canBurn,
  type BuildState,
} from "@/lib/contracts/ethblox-contracts"

export interface UseBuildStateResult extends BuildState {
  pendingRewards: bigint
  canBurn: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBuildState(tokenId: bigint | string | null) {
  const { chainId, account } = useMetaMask()
  const [state, setState] = useState<BuildState | null>(null)
  const [pendingRewards, setPendingRewards] = useState<bigint>(0n)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCorrectChain = chainId === CONTRACTS.BASE_SEPOLIA_CHAIN_ID

  const getProvider = useCallback(() => {
    if (typeof window === "undefined") return null
    const ethereum = (window as any).ethereum
    if (!ethereum) return null
    return new ethers.BrowserProvider(ethereum)
  }, [])

  const fetchState = useCallback(async () => {
    if (!tokenId || !isCorrectChain) {
      setState(null)
      return
    }

    const provider = getProvider()
    if (!provider) return

    setIsLoading(true)
    setError(null)

    try {
      const tokenIdBigInt = typeof tokenId === "string" ? BigInt(tokenId) : tokenId

      const [buildState, rewards] = await Promise.all([
        getBuildState(provider, tokenIdBigInt),
        account ? getPendingRewards(provider, account).catch(() => 0n) : Promise.resolve(0n),
      ])

      setState(buildState)
      setPendingRewards(rewards)
    } catch (err: any) {
      setError(err.message || "Failed to fetch build state")
      setState(null)
    } finally {
      setIsLoading(false)
    }
  }, [tokenId, isCorrectChain, getProvider, account])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  return {
    ...(state || {
      kind: 0,
      geometryHash: "",
      lockedBlox: 0n,
    }),
    pendingRewards,
    canBurn: state ? canBurn(state.kind) : false,
    isLoading,
    error,
    refetch: fetchState,
  }
}
