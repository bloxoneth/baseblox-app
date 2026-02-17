import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://gateway.lighthouse.storage https://*.lighthouse.storage https://ipfs.io https://dweb.link",
              "media-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://gateway.lighthouse.storage https://*.lighthouse.storage https://ipfs.io https://dweb.link",
              "connect-src 'self' blob: https://gateway.lighthouse.storage https://*.lighthouse.storage https://ipfs.io https://dweb.link https://sepolia.base.org",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
