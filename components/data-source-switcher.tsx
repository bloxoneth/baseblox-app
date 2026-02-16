"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { setDataSourceMode, useDataSourceMode } from "@/lib/data-source"

interface DataSourceSwitcherProps {
  compact?: boolean
}

export function DataSourceSwitcher({ compact = false }: DataSourceSwitcherProps) {
  const mode = useDataSourceMode()

  return (
    <div className={cn("flex items-center gap-2", compact ? "flex-wrap justify-end" : "flex-wrap")}>
      <span className="inline-flex items-center rounded border border-[hsl(var(--ethblox-border))] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--ethblox-text-tertiary))]">
        Source {mode}
      </span>
      <Button
        size="sm"
        variant={mode === "cache" ? "default" : "outline"}
        className="h-7 px-2 text-[11px]"
        onClick={() => setDataSourceMode("cache")}
      >
        Cache
      </Button>
      <Button
        size="sm"
        variant={mode === "truth" ? "default" : "outline"}
        className="h-7 px-2 text-[11px]"
        onClick={() => setDataSourceMode("truth")}
      >
        Truth
      </Button>
    </div>
  )
}
