import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "BRICKS | BASEBLOX",
  description: "Geometry templates for building with BASEBLOX",
}

const brickTemplates = [
  {
    name: "v0 block",
    description: "The foundational 1×1 cube primitive",
    dimensions: "1×1×1",
    complexity: 1,
  },
  {
    name: "2×2 Platform",
    description: "Square base for stable structures",
    dimensions: "2×2×1",
    complexity: 1,
  },
  {
    name: "4×2 Beam",
    description: "Horizontal structural element",
    dimensions: "4×2×1",
    complexity: 2,
  },
  {
    name: "Corner 2×2",
    description: "L-shaped piece for corners and edges",
    dimensions: "2×2×1 (L)",
    complexity: 2,
  },
  {
    name: "Arch 4×3",
    description: "Curved architectural element",
    dimensions: "4×3×1",
    complexity: 3,
  },
  {
    name: "Cylinder 2×3",
    description: "Vertical round column",
    dimensions: "2×2×3 (round)",
    complexity: 3,
  },
]

export default function BricksPage() {
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-background pt-16">
        <div className="container py-12">
          <div className="max-w-4xl mx-auto mb-12">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">BRICKS</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Geometry templates that help you build complex structures from simple primitives.
            </p>

            <div className="p-6 bg-muted rounded-lg border border-border mb-12">
              <h2 className="text-lg font-semibold mb-2">What are BRICKS?</h2>
              <p className="text-muted-foreground leading-relaxed">
                BRICKS are reusable geometric templates (ERC-1155 tokens) that define common building patterns. Think of
                them as standardized components that make it easier to create complex structures. While you can build
                anything from individual BLOX, BRICKS provide helpful shortcuts for common shapes and patterns.
              </p>
            </div>

            <h2 className="text-2xl font-bold mb-6">Genesis BRICK Collection</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {brickTemplates.map((brick) => (
                <Card key={brick.name}>
                  <CardHeader>
                    <CardTitle className="text-primary">{brick.name}</CardTitle>
                    <CardDescription>{brick.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Dimensions</dt>
                        <dd className="font-mono font-medium">{brick.dimensions}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Complexity</dt>
                        <dd className="font-medium">
                          {"●".repeat(brick.complexity)}
                          {"○".repeat(3 - brick.complexity)}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 p-6 bg-muted rounded-lg border border-border">
              <h2 className="text-lg font-semibold mb-2">Coming Soon: Custom BRICKS</h2>
              <p className="text-muted-foreground leading-relaxed">
                Future versions will allow builders to mint their own BRICK templates from successful BUILDS, creating a
                composable library of community-created geometry. The most useful and popular BRICKS will naturally rise
                to prominence through usage and remixing.
              </p>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
