import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Docs | BASEBLOX",
  description: "Developer documentation for BASEBLOX protocol",
}

const docSections = [
  {
    title: "Getting Started",
    items: [
      { label: "Quick Start Guide", href: "#quick-start" },
      { label: "Builder Tutorial", href: "#tutorial" },
      { label: "Key Concepts", href: "#concepts" },
    ],
  },
  {
    title: "Core Protocol",
    items: [
      { label: "BLOX Token (ERC-20)", href: "#blox" },
      { label: "BRICKS Templates (ERC-1155)", href: "#bricks" },
      { label: "BUILD NFTs (ERC-721)", href: "#builds" },
    ],
  },
  {
    title: "Builder Weight",
    items: [
      { label: "BW Formula", href: "#bw-formula" },
      { label: "Mass Component", href: "#mass" },
      { label: "Color Complexity", href: "#colors" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { label: "REST API", href: "#api" },
      { label: "GraphQL Endpoint", href: "#graphql" },
      { label: "WebSocket Events", href: "#websocket" },
    ],
  },
]

export default function DocsPage() {
  redirect("/docs/overview")
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background pt-16">
        <div className="container py-12">
          <div className="max-w-6xl mx-auto">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">
              ← Back to Home
            </Link>

            <div className="grid lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="sticky top-8 space-y-6">
                  {docSections.map((section) => (
                    <div key={section.title}>
                      <h3 className="font-semibold mb-2">{section.title}</h3>
                      <ul className="space-y-1">
                        {section.items.map((item) => (
                          <li key={item.href}>
                            <a
                              href={item.href}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {item.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </aside>

              {/* Main Content */}
              <main className="lg:col-span-3 space-y-12">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">Documentation</h1>
                  <p className="text-xl text-muted-foreground">Everything you need to build with BASEBLOX protocol.</p>
                </div>

                <Card id="quick-start">
                  <CardHeader>
                    <CardTitle>Quick Start</CardTitle>
                    <CardDescription>Get building in 5 minutes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">1. Open the Builder</h3>
                      <p className="text-sm text-muted-foreground">Navigate to /build to access the 3D canvas.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">2. Place BLOX</h3>
                      <p className="text-sm text-muted-foreground">
                        Click on the canvas to place colored blocks. Use the sidebar to change colors and sizes.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">3. Save or Publish</h3>
                      <p className="text-sm text-muted-foreground">
                        Save locally for iteration, or publish to the gallery to share with the community.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card id="bw-formula">
                  <CardHeader>
                    <CardTitle>Builder Weight Formula</CardTitle>
                    <CardDescription>How BUILD scores are calculated</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg font-mono text-sm">BW = MASS × (1 + log₁₀(COLORS + 1))</div>
                    <div>
                      <h3 className="font-semibold mb-2">Components</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>
                          <strong className="text-foreground">MASS:</strong> Total number of BLOX used in the BUILD
                        </li>
                        <li>
                          <strong className="text-foreground">COLORS:</strong> Number of unique colors in the
                          composition
                        </li>
                        <li>
                          <strong className="text-foreground">log₁₀:</strong> Logarithmic scaling prevents linear
                          explosion while rewarding diversity
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Examples</h3>
                      <ul className="space-y-2 text-sm font-mono text-muted-foreground">
                        <li>10 BLOX, 1 color: BW = 10 × 1.30 = 13.0</li>
                        <li>10 BLOX, 3 colors: BW = 10 × 1.60 = 16.0</li>
                        <li>50 BLOX, 8 colors: BW = 50 × 1.95 = 97.5</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card id="api">
                  <CardHeader>
                    <CardTitle>REST API</CardTitle>
                    <CardDescription>HTTP endpoints for builds and metadata</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2 font-mono text-sm">GET /api/builds</h3>
                      <p className="text-sm text-muted-foreground mb-2">List all public builds</p>
                      <div className="p-3 bg-muted rounded text-xs font-mono">
                        Response: Build[]
                        <br />
                        {"{ id, name, creator, mass, colors, bw_score, created }"}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 font-mono text-sm">GET /api/builds/:id</h3>
                      <p className="text-sm text-muted-foreground mb-2">Get a specific build with full brick data</p>
                      <div className="p-3 bg-muted rounded text-xs font-mono">
                        Response: Build
                        <br />
                        {"{ id, name, creator, bricks: Brick[], mass, ... }"}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 font-mono text-sm">POST /api/builds</h3>
                      <p className="text-sm text-muted-foreground mb-2">Publish a new build</p>
                      <div className="p-3 bg-muted rounded text-xs font-mono">
                        Body: {"{ name, creator, bricks: Brick[] }"}
                        <br />
                        Response: {"{ success: true, build: Build }"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-8 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">Need more help?</p>
                  <div className="flex gap-4">
                    <Link href="/build" className="text-sm text-primary hover:underline">
                      Try the Builder →
                    </Link>
                    <Link href="/curve-guides" className="text-sm text-primary hover:underline">
                      Read the Guides →
                    </Link>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
