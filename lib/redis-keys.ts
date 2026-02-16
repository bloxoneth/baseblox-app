const CHAIN_NS = process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532"

export function chainNamespace(): string {
  return CHAIN_NS
}

export function rk(key: string): string {
  return `ethblox:${CHAIN_NS}:${key}`
}

export function rpat(pattern: string): string {
  return `ethblox:${CHAIN_NS}:${pattern}`
}
