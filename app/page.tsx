import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Box, Layers, Sparkles, Lock } from "lucide-react"
import { HeroVideo } from "@/components/hero-video"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-heading font-bold text-[hsl(var(--ethblox-yellow))] mb-6 text-balance">
                BASEBLOX
              </h1>
              <p className="text-2xl md:text-3xl text-[hsl(var(--ethblox-text-primary))] mb-6 text-balance leading-relaxed">
                A live programmable matter sandbox on Base.
              </p>
              <p className="text-base md:text-lg text-[hsl(var(--ethblox-text-secondary))] mb-8 leading-relaxed">
                This MVP is running in public so we can pressure-test minting, composition, licensing, burn behavior,
                and reward routing with real wallets and real transactions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  className="bg-[hsl(var(--ethblox-green))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-green))]/90 font-heading text-base"
                  size="lg"
                >
                  <Link href="/whitepaper">READ SPEC</Link>
                </Button>
                <Button
                  asChild
                  className="bg-[hsl(var(--ethblox-yellow))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-yellow))]/90 font-heading text-base"
                  size="lg"
                >
                  <Link href="/build">BUILD NOW</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-primary))] hover:bg-[hsl(var(--ethblox-surface))] hover:border-[hsl(var(--ethblox-green))] font-heading text-base bg-transparent"
                  size="lg"
                >
                  <Link href="/explore">EXPLORE BUILDS</Link>
                </Button>
              </div>
            </div>

            {/* Right: Video Player Placeholder */}
            <div className="relative aspect-video bg-[hsl(var(--ethblox-surface))] rounded-lg border border-[hsl(var(--ethblox-border))] overflow-hidden">
              <HeroVideo />
            </div>
          </div>

          {/* Physics Engine Tagline */}
          <div className="mt-16 text-center">
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-4xl mx-auto">
              BASEBLOX enforces on-chain constraints: density-aware mass, brick composition, BLOX licensing, and
              immutable geometry history for minted builds.
            </p>
          </div>
        </section>

        {/* Three Primitives Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-center text-[hsl(var(--ethblox-text-primary))] mb-4">
            Three Core Primitives
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {/* BLOX Card */}
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg">
                  <Box className="h-6 w-6 text-[hsl(var(--ethblox-yellow))]" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-1">BLOX</h3>
                  <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))] font-mono">
                    ERC20 · Mass + Licensing
                  </span>
                </div>
              </div>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                BLOX is the protocol material. It is locked when minting, used for license purchases, and partially
                returned on burn for eligible kinds.
              </p>
            </Card>

            {/* BRICKS Card */}
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg">
                  <Layers className="h-6 w-6 text-[hsl(var(--ethblox-green))]" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-1">
                    BRICKS
                  </h3>
                  <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))] font-mono">
                    ERC721 · Kind 0
                  </span>
                </div>
              </div>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Bricks are canonical reusable components. 1x1 genesis bricks seed each density, then larger bricks are
                minted from components with density checks and unique brick specs.
              </p>
            </Card>

            {/* BUILDS Card */}
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg">
                  <Sparkles className="h-6 w-6 text-[hsl(var(--ethblox-blue))]" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-1">
                    BUILDS
                  </h3>
                  <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))] font-mono">
                    ERC721 + ERC1155 · Kind 1 / Kind 2
                  </span>
                </div>
              </div>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Kind 1 builds and Kind 2 collector editions carry composition lineage, locked BLOX, and builder weight.
                Licensing is BLOX-only and tracks supply against mass and density.
              </p>
            </Card>
          </div>
        </section>

        {/* Not a Metaverse Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-6">
              MVP Sandbox Scope
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              The current phase focuses on correctness and game design: minting rules, license enforcement paths,
              treasury routing, burn behavior, BW distribution, metadata publishing, and marketplace rendering.
            </p>
          </div>
        </section>

        {/* Genesis BRICKS Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">
              Brick Grid and Density Matrix
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl mx-auto">
              Bricks are tested across sizes and densities with square/rectangle normalization, density matching, and
              composition coverage before higher kinds are opened.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              "Density 1 Brick Sweep",
              "Density 8 Brick Sweep",
              "Density 27 Brick Sweep",
              "Density 64 Brick Sweep",
              "Density 125 Brick Sweep",
              "Kind Unlock Coverage",
            ].map((name) => (
              <Card
                key={name}
                className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-6 hover:border-[hsl(var(--ethblox-green))] transition-all"
              >
                <div className="aspect-square bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg mb-4 flex items-center justify-center">
                  <Lock className="h-12 w-12 text-[hsl(var(--ethblox-text-tertiary))]" />
                </div>
                <h3 className="font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">{name}</h3>
                <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Integrated in active test runs</p>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              asChild
              className="bg-[hsl(var(--ethblox-green))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-green))]/90 font-heading"
              size="lg"
            >
              <Link href="/bricks">EXPLORE GENESIS BRICKS</Link>
            </Button>
          </div>
        </section>

        {/* Builder Weight Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-center text-[hsl(var(--ethblox-text-primary))] mb-12">
              Builder Weight
            </h2>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Formula & Example */}
              <div>
                <div className="bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg p-8 mb-6">
                  <p className="text-[hsl(var(--ethblox-text-secondary))] mb-4">
                    Builder Weight is tunable and evaluated in simulations against locked BLOX and usage:
                  </p>
                  <div className="bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg p-6 mb-6 text-center">
                    <code className="text-xl text-[hsl(var(--ethblox-yellow))]">
                      emissions weight = locked BLOX share × BW multiplier policy
                    </code>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg p-4">
                      <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-green))]">42.7</div>
                      <div className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">Simulated BW</div>
                    </div>
                    <div className="bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg p-4">
                      <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-blue))]">127</div>
                      <div className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">Locked BLOX</div>
                    </div>
                    <div className="bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg p-4">
                      <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-yellow))]">8</div>
                      <div className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">Unique Users</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Benefits List */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--ethblox-green))]/20 flex items-center justify-center">
                    <span className="text-[hsl(var(--ethblox-green))]">✓</span>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--ethblox-text-primary))] leading-relaxed">
                      Weight models can be tuned without changing core mint invariants
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--ethblox-green))]/20 flex items-center justify-center">
                    <span className="text-[hsl(var(--ethblox-green))]">✓</span>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--ethblox-text-primary))] leading-relaxed">
                      Distribution behavior is tested against reuse and self-pay scenarios
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--ethblox-green))]/20 flex items-center justify-center">
                    <span className="text-[hsl(var(--ethblox-green))]">✓</span>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--ethblox-text-primary))] leading-relaxed">
                      Burned component handling routes safely instead of reverting flows
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--ethblox-green))]/20 flex items-center justify-center">
                    <span className="text-[hsl(var(--ethblox-green))]">✓</span>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--ethblox-text-primary))] leading-relaxed">
                      BW + locked BLOX shaping is benchmarked before final production parameters
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Circular Economy Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">
              Active Fee Routing
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl mx-auto">
              Current mint fee flow follows the live MVP split and is exercised in simulation and UI mint paths.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 text-center hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="text-6xl font-heading font-bold text-[hsl(var(--ethblox-green))] mb-2">40%</div>
              <h3 className="font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">Builder Share</h3>
              <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Accrued via Distributor</p>
            </Card>

            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 text-center hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="text-6xl font-heading font-bold text-[hsl(var(--ethblox-blue))] mb-2">30%</div>
              <h3 className="font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">Liquidity</h3>
              <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Protocol routing target</p>
            </Card>

            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 text-center hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="text-6xl font-heading font-bold text-[hsl(var(--ethblox-yellow))] mb-2">30%</div>
              <h3 className="font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">Protocol Treasury</h3>
              <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Operations and runway</p>
            </Card>
          </div>

          <p className="text-center text-lg text-[hsl(var(--ethblox-text-secondary))]">
            License purchases are paid in BLOX and supply is density-aware.
          </p>
        </section>

        {/* AI-Native Builders Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">
              Creator Workflow in MVP
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl mx-auto">
              Designers can create and save compositions locally, then mint on-chain when ready. Metadata and previews
              are validated across app, chain, and IPFS paths.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              "Generate builds",
              "Compose with licensed components",
              "Mint Kind 0 / Kind 1 / Kind 2",
              "Inspect pre-mint diagnostics",
              "Verify metadata parity",
              "Test burn and reward flows",
            ].map((capability) => (
              <Card
                key={capability}
                className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-6 hover:border-[hsl(var(--ethblox-green))] transition-all"
              >
                <p className="text-[hsl(var(--ethblox-text-primary))]">{capability}</p>
              </Card>
            ))}
          </div>

          <p className="text-center text-lg text-[hsl(var(--ethblox-text-secondary))] mt-12">
            This is shipping code under active economic and UX testing.
          </p>
        </section>

        {/* API Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">
              Data and Verification Surface
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl mx-auto">
              Fast app reads, on-chain critical checks, and explicit diff tooling for chain/IPFS/app consistency.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              "Token-level chain inspection",
              "Composition and component lineage",
              "License curve and supply visibility",
              "Canonical metadata publishing",
              "Batch simulation imports",
              "Production readiness checks",
            ].map((feature) => (
              <Card
                key={feature}
                className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-6 hover:border-[hsl(var(--ethblox-green))] transition-all"
              >
                <p className="text-[hsl(var(--ethblox-text-primary))]">{feature}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-6">
              Build With Us
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed mb-8">
              BASEBLOX MVP is intentionally open and iterative. If you break an edge case, find a data mismatch, or
              discover an economic exploit, that feedback directly shapes the production deployment.
            </p>
            <Button
              asChild
              className="bg-[hsl(var(--ethblox-yellow))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-yellow))]/90 font-heading text-lg"
              size="lg"
            >
              <Link href="/build">START BUILDING</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
