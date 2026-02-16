"use client"

import { useEffect, useState } from "react"
import { useMetaMask } from "@/contexts/metamask-context"
import { MOCKBLOX_CONTRACT, BASE_SEPOLIA } from "@/lib/web3/chains"

export function useBloxBalance(targetAddress?: string) {
  const { account, chainId, isConnected } = useMetaMask()
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeChainId = (id: string | null): string | null => {
    if (!id) return null
    // If it's already hex, return as is
    if (id.startsWith("0x")) return id.toLowerCase()
    // If it's a number string, convert to hex
    return `0x${Number.parseInt(id).toString(16)}`
  }

  const normalizedChainId = normalizeChainId(chainId)
  const isCorrectChain = normalizedChainId === BASE_SEPOLIA.chainId.toLowerCase()
  const addressToRead = targetAddress || account

  useEffect(() => {
    if (!addressToRead || !isConnected || !isCorrectChain) {
      setBalance(null)
      return
    }

    fetchBalance()

    // Poll every 10 seconds
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [addressToRead, isConnected, isCorrectChain])

  const fetchBalance = async () => {
    if (!addressToRead || !isCorrectChain) return

    setLoading(true)
    setError(null)

    try {
      const ethereum = (window as any).ethereum

      if (!ethereum) {
        setBalance("0.00")
        return
      }

      // Call balanceOf function
      const balanceHex = await ethereum.request({
        method: "eth_call",
        params: [
          {
            to: MOCKBLOX_CONTRACT.address,
            data: `0x70a08231000000000000000000000000${addressToRead.slice(2)}`, // balanceOf(address)
          },
          "latest",
        ],
      })

      if (!balanceHex || balanceHex === "0x" || balanceHex === "0x0") {
        setBalance("0.00")
        return
      }

      // Convert hex balance to decimal with 18 decimals
      const balanceWei = BigInt(balanceHex)
      const balanceEther = Number(balanceWei) / 1e18

      setBalance(balanceEther.toFixed(2))
    } catch {
      // Silently handle network errors - contract may not exist or network issues
      // Set balance to 0.00 as fallback without logging errors
      setBalance("0.00")
    } finally {
      setLoading(false)
    }
  }

  const switchToBaseSepolia = async () => {
    const ethereum = (window as any).ethereum

    if (!ethereum) return

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA.chainId }],
      })
    } catch (switchError: any) {
      // Chain not added, try adding it
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BASE_SEPOLIA.chainId,
                chainName: BASE_SEPOLIA.chainName,
                nativeCurrency: BASE_SEPOLIA.nativeCurrency,
                rpcUrls: BASE_SEPOLIA.rpcUrls,
                blockExplorerUrls: BASE_SEPOLIA.blockExplorerUrls,
              },
            ],
          })
        } catch (addError) {
          console.error("[v0] Failed to add Base Sepolia:", addError)
          throw addError
        }
      } else {
        throw switchError
      }
    }
  }

  return {
    balance,
    loading,
    error,
    isCorrectChain,
    switchToBaseSepolia,
    refetch: fetchBalance,
  }
}
