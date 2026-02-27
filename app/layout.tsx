import type React from "react"
import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { MetaMaskProvider } from "@/contexts/metamask-context"
import { ErrorSuppressor } from "@/components/ErrorSuppressor"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "BASEBLOX - On-Chain Creative Protocol",
  description:
    "Programmable matter for Ethereum's next cultural era. 3D on-chain art, programmable matter, AI-native agents & a circular economy.",
  generator: "v0.app",
  icons: {
    icon: [{ url: "/baseblox-logo.svg", type: "image/svg+xml" }],
    shortcut: "/baseblox-logo.svg",
    apple: "/baseblox-logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <ErrorSuppressor />
        <MetaMaskProvider>{children}</MetaMaskProvider>
        <Analytics />
      </body>
    </html>
  )
}
