const CHAIN_NS = process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532"
const PREFIX = (process.env.REDIS_KEY_PREFIX ?? "").trim()

function normalizedPrefix(): string {
  if (!PREFIX) return ""
  return PREFIX.endsWith(":") ? PREFIX : `${PREFIX}:`
}

export function chainNamespace(): string {
  return normalizedPrefix() || `ethblox:${CHAIN_NS}:`
}

export function rk(key: string): string {
  return `${chainNamespace()}${key}`
}

export function rpat(pattern: string): string {
  return `${chainNamespace()}${pattern}`
}
