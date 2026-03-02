import { NextResponse } from "next/server"
import { tokenImageURI } from "@/lib/contracts/ethblox-contracts"

function toGatewayUrls(ipfsUri: string): string[] {
  const cidPath = ipfsUri.replace(/^ipfs:\/\//, "")
  return [
    `https://gateway.pinata.cloud/ipfs/${cidPath}`,
    `https://dweb.link/ipfs/${cidPath}`,
    `https://ipfs.io/ipfs/${cidPath}`,
  ]
}

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000), cache: "no-store" })
    return res.ok
  } catch {
    return false
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await params
  const id = Number.parseInt(tokenId, 10)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "invalid token id" }, { status: 400 })
  }

  const ipfsUri = tokenImageURI(id)
  const urls = toGatewayUrls(ipfsUri)
  for (const url of urls) {
    if (await probe(url)) {
      return NextResponse.redirect(url, 302)
    }
  }

  const appBase = (process.env.NEXT_PUBLIC_APP_URL || "https://baseblox-app.vercel.app").replace(/\/+$/, "")
  return NextResponse.redirect(`${appBase}/baseblox-logo.svg`, 302)
}

