"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useMetaMask } from "@/contexts/metamask-context"
import { ANVIL_LOCAL, BASE_SEPOLIA } from "@/lib/web3/chains"
import { cn } from "@/lib/utils"

interface NetworkSwitcherProps {
  compact?: boolean
}

function normalizeChainId(id: string | null): string | null {
  if (!id) return null
  if (id.startsWith("0x")) return id.toLowerCase()
  return `0x${Number.parseInt(id, 10).toString(16)}`
}

export function NetworkSwitcher({ compact = false }: NetworkSwitcherProps) {
  const enabled = (process.env.NEXT_PUBLIC_ENABLE_NETWORK_SWITCHER ?? "true") === "true"

  const { chainId, isConnected, switchChain } = useMetaMask()
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const currentChain = normalizeChainId(chainId)
  const expectedChain = BASE_SEPOLIA.chainId.toLowerCase()
  const appProfile = process.env.NEXT_PUBLIC_NETWORK_NAME ?? "base-sepolia"
  const mismatch = isConnected && currentChain && currentChain !== expectedChain

  const chainLabel = useMemo(() => {
    if (!currentChain) return "not connected"
    if (currentChain === ANVIL_LOCAL.chainId.toLowerCase()) return "anvil"
    if (currentChain === "0x14a34") return "base-sepolia"
    return currentChain
  }, [currentChain])

  const onSwitch = async (target: string) => {
    setError(null)
    setSwitching(target)
    try {
      await switchChain(target)
    } catch (err: any) {
      setError(err?.message || "Failed to switch network")
    } finally {
      setSwitching(null)
    }
  }

  if (!enabled) return null

  return (
    <div className={cn("flex items-center gap-2", compact ? "flex-wrap justify-end" : "flex-wrap")}>
      <span
        className={cn(
          "inline-flex items-center rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider",
          mismatch
            ? "border-yellow-600/70 text-yellow-300 bg-yellow-950/30"
            : "border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-tertiary))]",
        )}
      >
        Profile {appProfile} | Wallet {chainLabel}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[11px]"
        disabled={switching !== null}
        onClick={() => onSwitch(ANVIL_LOCAL.chainId)}
      >
        {switching === ANVIL_LOCAL.chainId ? "Switching..." : "Anvil"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[11px]"
        disabled={switching !== null}
        onClick={() => onSwitch("0x14a34")}
      >
        {switching === "0x14a34" ? "Switching..." : "Base Sepolia"}
      </Button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}
