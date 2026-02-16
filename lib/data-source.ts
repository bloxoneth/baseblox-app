"use client"

import { useEffect, useState } from "react"

export type DataSourceMode = "cache" | "truth"

const STORAGE_KEY = "ethblox:data-source"

export function getDataSourceMode(): DataSourceMode {
  if (typeof window === "undefined") return "cache"
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === "truth" ? "truth" : "cache"
}

export function setDataSourceMode(mode: DataSourceMode) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, mode)
  window.dispatchEvent(new CustomEvent("ethblox:data-source", { detail: mode }))
}

export async function fetchWithDataSource(input: string, init?: RequestInit): Promise<Response> {
  const mode = getDataSourceMode()
  const url = input.startsWith("/api/")
    ? (() => {
        const u = new URL(input, window.location.origin)
        u.searchParams.set("source", mode)
        return `${u.pathname}${u.search}`
      })()
    : input
  const headers = new Headers(init?.headers ?? {})
  headers.set("x-ethblox-source", mode)
  return fetch(url, { ...init, headers })
}

export function useDataSourceMode(): DataSourceMode {
  const [mode, setMode] = useState<DataSourceMode>("cache")

  useEffect(() => {
    const sync = () => setMode(getDataSourceMode())
    sync()
    const onCustom = () => sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync()
    }
    window.addEventListener("ethblox:data-source", onCustom as EventListener)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("ethblox:data-source", onCustom as EventListener)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return mode
}
