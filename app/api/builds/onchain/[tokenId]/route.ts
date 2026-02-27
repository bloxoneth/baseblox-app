import { NextResponse } from "next/server"
import { ethers } from "ethers"
import fs from "node:fs"
import path from "node:path"
import {
  CONTRACTS,
  BUILD_NFT_ABI,
  RPC_URL,
  CHAIN_ID,
  BASE_METADATA_URI,
  BASE_METADATA_CID,
} from "@/lib/contracts/ethblox-contracts"

// Reads token data directly from chain + IPNS metadata
// No Redis - purely decentralized sources for debugging
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const id = parseInt(tokenId)

  if (isNaN(id) || id < 1) {
    return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 })
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

  const onchain: Record<string, unknown> = { tokenId: id }
  const errors: string[] = []
  let tokenURI: string | null = null

  let exists = false
  try {
    exists = Boolean(await contract.exists(id))
  } catch (e: any) {
    errors.push(`exists: ${e.reason ?? e.message}`)
  }
  onchain.exists = exists

  if (!exists) {
    return NextResponse.json({
      onchain,
      ipfsMetadata: null,
      ipfsURL: null,
      contract: CONTRACTS.BUILD_NFT,
      chain: `${process.env.NEXT_PUBLIC_NETWORK_NAME ?? "Base Sepolia"} (${CHAIN_ID})`,
      baseMetadataURI: BASE_METADATA_URI,
      notFound: true,
      errors: errors.length > 0 ? errors : ["token does not exist"],
    })
  }

  // Owner
  try {
    onchain.owner = await contract.ownerOf(id)
  } catch (e: any) {
    errors.push(`ownerOf: ${e.reason ?? e.message}`)
  }

  // tokenURI (from contract baseTokenURI)
  try {
    tokenURI = String(await contract.tokenURI(id))
    onchain.tokenURI = tokenURI
  } catch (e: any) {
    errors.push(`tokenURI: ${e.reason ?? e.message}`)
  }

  // kind
  try {
    const k = await contract.kindOf(id)
    onchain.kind = Number(k)
  } catch (e: any) {
    errors.push(`kind: ${e.reason ?? e.message}`)
  }

  // geometryHash
  try {
    onchain.geometryHash = await contract.geometryOf(id)
  } catch (e: any) {
    errors.push(`geometryHash: ${e.reason ?? e.message}`)
  }

  // brickSpec (width, depth, density)
  try {
    const [w, d, dens] = await contract.brickSpecOf(id)
    onchain.brickSpec = { width: Number(w), depth: Number(d), density: Number(dens) }
  } catch (e: any) {
    errors.push(`brickSpec: ${e.reason ?? e.message}`)
  }

  // lockedBlox
  try {
    const blox = await contract.lockedBloxOf(id)
    onchain.lockedBlox = blox.toString()
  } catch (e: any) {
    errors.push(`lockedBlox: ${e.reason ?? e.message}`)
  }

  const ipfsToGateway = (uri: string, gatewayBase: string) =>
    `${gatewayBase.replace(/\/+$/, "")}/${uri.replace(/^ipfs:\/\//, "")}`

  // Fetch IPFS metadata from the actual on-chain tokenURI first.
  let ipfsMetadata: Record<string, unknown> | null = null
  let resolvedURL: string | null = null

  const fallbackGateways: string[] = []
  if (tokenURI) {
    if (tokenURI.startsWith("ipfs://")) {
      fallbackGateways.push(ipfsToGateway(tokenURI, "https://gateway.pinata.cloud/ipfs"))
      fallbackGateways.push(ipfsToGateway(tokenURI, "https://gateway.lighthouse.storage/ipfs"))
      fallbackGateways.push(ipfsToGateway(tokenURI, "https://dweb.link/ipfs"))
      fallbackGateways.push(ipfsToGateway(tokenURI, "https://ipfs.io/ipfs"))
    } else if (tokenURI.startsWith("http://") || tokenURI.startsWith("https://")) {
      fallbackGateways.push(tokenURI)
    }
  }
  // Legacy fallback for old CIDs/env defaults.
  fallbackGateways.push(`https://gateway.pinata.cloud/ipfs/${BASE_METADATA_CID}/${id}.json`)
  fallbackGateways.push(`https://gateway.lighthouse.storage/ipfs/${BASE_METADATA_CID}/${id}.json`)
  fallbackGateways.push(`https://dweb.link/ipfs/${BASE_METADATA_CID}/${id}.json`)
  fallbackGateways.push(`https://ipfs.io/ipfs/${BASE_METADATA_CID}/${id}.json`)

  for (const url of fallbackGateways) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        next: { revalidate: 60 },
      })
      if (res.ok) {
        ipfsMetadata = await res.json()
        resolvedURL = url
        break
      }
    } catch {
      // try next gateway
    }
  }

  if (!ipfsMetadata) {
    // Local fallback for dev/simulation runs.
    try {
      const simRunsDir = path.join(process.cwd(), "data", "sim-runs")
      if (fs.existsSync(simRunsDir)) {
        const runs = fs.readdirSync(simRunsDir)
          .map((name) => {
            const full = path.join(simRunsDir, name)
            const stat = fs.statSync(full)
            return { name, full, mtime: stat.mtimeMs, isDir: stat.isDirectory() }
          })
          .filter((x) => x.isDir)
          .sort((a, b) => b.mtime - a.mtime)

        for (const run of runs) {
          const metaPath = path.join(run.full, "metadata", `${id}.json`)
          if (!fs.existsSync(metaPath)) continue
          ipfsMetadata = JSON.parse(fs.readFileSync(metaPath, "utf8"))
          resolvedURL = `local://data/sim-runs/${run.name}/metadata/${id}.json`
          break
        }
      }
    } catch {
      // ignore local fallback failures
    }
  }

  if (!ipfsMetadata) {
    errors.push("IPFS metadata: all gateways failed")
  }

  return NextResponse.json({
    onchain,
    ipfsMetadata,
    ipfsURL: resolvedURL,
    contract: CONTRACTS.BUILD_NFT,
    chain: `${process.env.NEXT_PUBLIC_NETWORK_NAME ?? "Base Sepolia"} (${CHAIN_ID})`,
    baseMetadataURI: BASE_METADATA_URI,
    errors: errors.length > 0 ? errors : undefined,
  })
}
