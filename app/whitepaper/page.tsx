import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Whitepaper - BASEBLOX | A Cultural, Cryptoeconomic, and Memetic Architecture",
  description:
    "BASEBLOX is an experiment in programmable matter and programmable culture: a protocol that reduces creative expression to three primitives — mass, form, and composition — and observes how social meaning, economic value, and structural complexity emerge over time.",
  keywords: [
    "BASEBLOX",
    "whitepaper",
    "programmable matter",
    "cryptoeconomics",
    "memetics",
    "blockchain",
    "BLOX token",
    "Builder Weight",
    "cultural computation",
    "on-chain art",
    "Ethereum",
  ],
  openGraph: {
    title: "BASEBLOX Whitepaper - A Cultural, Cryptoeconomic, and Memetic Architecture",
    description:
      "An experiment in programmable matter and culture. Three primitives — mass, form, and composition — generate emergent social meaning and economic value.",
    type: "article",
  },
}

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--ethblox-bg))] text-[hsl(var(--ethblox-text-primary))]">
      <SiteHeader />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="space-y-6 pb-8 border-b border-[hsl(var(--ethblox-border))]">
            <h1 className="text-5xl md:text-6xl font-heading font-bold tracking-tight text-[hsl(var(--ethblox-accent-yellow))]">
              BASEBLOX
            </h1>
            <h2 className="text-2xl md:text-3xl font-heading font-semibold text-[hsl(var(--ethblox-text-primary))]">
              A Cultural, Cryptoeconomic, and Memetic Architecture for Programmable Matter
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--ethblox-text-tertiary))]">
              <div>Version: 0.4 — Academic Hybrid</div>
              <div>·</div>
              <div>Length: Extended Intro + Core Theory</div>
              <div>·</div>
              <div>Tone: Technical, philosophical, memetic-aware</div>
            </div>
          </div>

          {/* Abstract */}
          <section className="space-y-4">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">ABSTRACT</h3>
            <div className="prose prose-invert max-w-none">
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                BASEBLOX is an experiment in programmable matter and programmable culture: a protocol that reduces
                creative expression to three primitives — mass, form, and composition — and observes how social meaning,
                economic value, and structural complexity emerge over time in a cryptographically constrained
                environment.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                It is an inquiry into how culture takes shape when built from atomic scarcity, economic incentives, and
                shared symbolic primitives, all operating within the public epistemology of blockchain systems.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Rather than simulating a world, BASEBLOX constructs a substrate on which human creativity, coordination,
                and memetic transmission can be studied. It sits at the intersection of cryptoeconomics, generative art,
                game theory, semiotics, and urban-cultural anthropology, proposing an ontology minimal enough to be
                legible yet rich enough to generate an evolving cultural landscape.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                This paper outlines the scientific, economic, and cultural foundations of BASEBLOX; its theoretical
                precedents; and the rationale behind its design as a medium for emergent collective construction.
              </p>
            </div>
          </section>

          {/* 1. Introduction */}
          <section className="space-y-6 p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">1. INTRODUCTION</h3>
            <h4 className="text-xl font-semibold text-[hsl(var(--ethblox-text-primary))]">
              Toward a science of programmable culture
            </h4>
            <div className="space-y-4">
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                For the last decade, blockchains have served as laboratories for new forms of social, economic, and
                cultural organization. NFTs, DAOs, memecoins, and on-chain art have demonstrated that digital artifacts
                can accrue meaning not because they are rare, but because they are <em>socially rare</em> — they encode
                shared narratives, intersubjective recognition, and collective participation.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                In parallel, the academic world has increasingly recognized memetics — once dismissed as pseudoscience —
                as a legitimate framework for understanding the transmission and evolution of symbolic forms across
                networks. The viral dynamics of culture, the evolution of memes, and the spread of collective rituals
                all follow quasi-biological patterns, but with information instead of DNA.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed font-semibold">
                BASEBLOX emerges within this intellectual lineage.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Rather than treating memes as incidental phenomena in digital culture, BASEBLOX treats them as
                first-class citizens of system design. <strong>BRICKS</strong> — the protocol's mould primitives — act
                as "genetic substrates" for cultural expression. <strong>BUILDS</strong> act as phenotypic outputs.{" "}
                <strong>BLOX</strong>, the conserved matter, introduces thermodynamic friction that forces creative
                decisions to carry economic and spatial consequences.
              </p>
            </div>
            <div className="pl-6 border-l-2 border-[hsl(var(--ethblox-accent-cyan))] space-y-3">
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">In this framing:</p>
              <ul className="space-y-2 text-[hsl(var(--ethblox-text-secondary))]">
                <li>
                  • A <strong>BRICK</strong> is a replicating meme template with cost and lineage.
                </li>
                <li>
                  • A <strong>BUILD</strong> is a cultural artifact whose structure encodes economic and social meaning.
                </li>
                <li>
                  • <strong>BLOX</strong> is the conserved matter that animates these forms, giving them weight —
                  literally and metaphorically.
                </li>
              </ul>
            </div>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              The MVP launched on Base is not a mere prototype; it is the first phase of an applied cultural experiment,
              designed to test hypotheses about how communities create symbolic structures under conditions of scarcity,
              coordination, and economic feedback.
            </p>
          </section>

          {/* 2. Theoretical Context */}
          <section className="space-y-6 p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">
              2. THEORETICAL CONTEXT
            </h3>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              BASEBLOX stands at the confluence of five research domains:
            </p>

            {/* 2.1 */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">2.1 Cryptoeconomics</h4>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Decentralized systems require:
              </p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• incentive-compatible coordination,</li>
                <li>• predictable resource allocation,</li>
                <li>• and mechanisms that resist exploitative equilibria.</li>
              </ul>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                The BASEBLOX economy is designed with no inflationary emissions, relying instead on usage-driven revenue
                and a Liquidity Engine that transforms creative action into market depth.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed text-sm">
                This reflects principles from: Buterin's writings on legitimacy and minimal viable ecosystems, Hasu's
                theories on protocol-market fit, and mechanism design literature emphasizing transparent, rule-based
                incentives.
              </p>
            </div>

            {/* 2.2 */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">
                2.2 Generative Systems & Complexity Science
              </h4>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                BASEBLOX is a descendant of generative art lineage:
              </p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• Autoglyphs (Snowfro)</li>
                <li>• Terraforms (Mathcastles)</li>
                <li>• Simpler systems like Conway's Life</li>
              </ul>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                These projects demonstrate that simple rule systems can generate complex, high-dimensional cultural
                space. BASEBLOX adopts an even stricter ontology — a trinity of matter, mould, and structure — to
                minimize constraints on emergent complexity.
              </p>
            </div>

            {/* 2.3 */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">
                2.3 Memetics & Symbolic Anthropology
              </h4>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Memes behave like replicators: units of culture that spread through transmission, resonance, and
                mutation. In BASEBLOX:
              </p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• BRICKS are memetic primitives</li>
                <li>• BUILDS are memetic expressions</li>
                <li>• The world as a whole is a memetic ecosystem</li>
              </ul>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed text-sm">
                This connects to: Dawkins' <em>Selfish Gene</em>, Mauss on gift economies, Lévi-Strauss on symbolic
                systems, Latour on actor-network theory. BASEBLOX frames digital artifacts not as commodities but as
                social actors, participating in cultural evolution.
              </p>
            </div>

            {/* 2.4 */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">
                2.4 Game Theory & Mechanism Design
              </h4>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Game theory in BASEBLOX is not adversarial; it is architectural. The system creates:
              </p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• anti-coordination games (choice of moulds, design space)</li>
                <li>• prestige games (complexity, Builder Weight)</li>
                <li>• cooperation games (remixing, shared structures)</li>
                <li>• common-resource games (AIR ↔ MATTER spatial dynamics)</li>
              </ul>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed text-sm">
                These are consistent with: Schelling coordination principles, Ostrom's models of commons governance,
                Axelrod's cooperative equilibrium dynamics.
              </p>
            </div>

            {/* 2.5 */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">
                2.5 Urbanism & Spatial Economics
              </h4>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                If the optional AIR ↔ MATTER extension is activated, BASEBLOX becomes a laboratory for studying spatial
                scarcity:
              </p>
              <div className="p-4 rounded bg-[hsl(var(--ethblox-bg))] border border-[hsl(var(--ethblox-accent-cyan))]/30">
                <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                  <strong>Rule:</strong> One unit of matter displaces one unit of air.
                </p>
              </div>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">This creates:</p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• emergent land value</li>
                <li>• volumetric economics</li>
                <li>• creative zoning conflicts</li>
                <li>• incentives for destruction and renewal</li>
              </ul>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed italic">
                In such a world, the shape of cities is not designed — it evolves.
              </p>
            </div>
          </section>

          {/* 3. The BASEBLOX Ontology */}
          <section className="space-y-6 p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">
              3. THE BASEBLOX ONTOLOGY
            </h3>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              The power of BASEBLOX is its refusal to introduce superfluous primitives.
            </p>
            <div className="space-y-3">
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">It has no:</p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• custom terrain,</li>
                <li>• narrative lore,</li>
                <li>• avatars,</li>
                <li>• leveling systems,</li>
                <li>• or external gameplay layer.</li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                The world is defined solely through:
              </p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• BLOX (mass)</li>
                <li>• BRICKS (generative moulds)</li>
                <li>• BUILDS (structures)</li>
              </ul>
            </div>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              This economy of concepts mirrors research in cellular automata, where minimal rule sets produce maximal
              complexity.
            </p>

            {/* 3.1 */}
            <div className="space-y-3 pt-4">
              <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">
                3.1 BLOX — Mass as Constraint
              </h4>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                In traditional game worlds, resources are abundant and meaningless. In BASEBLOX, mass is the ultimate
                constraint.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">This forces:</p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• intentionality,</li>
                <li>• composition,</li>
                <li>• destruction as rebirth,</li>
                <li>• and cultural stewardship.</li>
              </ul>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed italic">
                BLOX is not valuable because it is scarce; it is scarce because meaningful structure must require cost.
              </p>
            </div>

            {/* 3.2 */}
            <div className="space-y-3 pt-4">
              <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">
                3.2 BRICKS — Moulds as Memetic DNA
              </h4>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Every BRICK is a piece of cultural DNA. Their properties — geometry, complexity, scarcity — determine
                how they propagate through the world.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                A BRICK becomes "iconic" not because of initial rarity but because builders adopt it, remix it, and
                crystallize it into the collective visual language of BASEBLOX.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed italic">
                This is memetics applied to architectural form.
              </p>
            </div>

            {/* 3.3 */}
            <div className="space-y-3 pt-4">
              <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">
                3.3 BUILDS — Phenotypes of Culture
              </h4>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">A BUILD is:</p>
              <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
                <li>• a structural artifact,</li>
                <li>• a unit of creative expression,</li>
                <li>• an economic object,</li>
                <li>• a memetic transmission vector,</li>
                <li>• and a fragment of collective memory.</li>
              </ul>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed italic">
                Builders do not merely construct structures — they contribute to the ongoing anthology of the world.
              </p>
            </div>
          </section>

          {/* 4. Builder Weight */}
          <section className="space-y-6 p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">
              4. BUILDER WEIGHT — A Formula for Cultural Significance
            </h3>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              BW is not a financial primitive; it is a symbolic one.
            </p>
            <div className="p-6 rounded bg-[hsl(var(--ethblox-bg))] border border-[hsl(var(--ethblox-accent-cyan))]/30 text-center">
              <p className="text-xl font-mono text-[hsl(var(--ethblox-accent-cyan))]">
                BW = log(1 + Mass) × log(2 + UniqueMoulds)
              </p>
            </div>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              The canonical form captures two core dimensions of cultural expression:
            </p>
            <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
              <li>• Density (Mass)</li>
              <li>• Diversity (Unique Moulds)</li>
            </ul>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              Builders who create thoughtful, complex compositions are rewarded with a permanent signal of contribution.
              This metric becomes a form of measurable social capital — a way to quantify the structural importance of
              artifacts in the world.
            </p>
          </section>

          {/* 5. ETH Flow */}
          <section className="space-y-6 p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">
              5. ETH FLOW & THE CREATIVE ECONOMY
            </h3>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              BASEBLOX's economy is deceptively simple:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded bg-[hsl(var(--ethblox-bg))] border border-[hsl(var(--ethblox-border))] text-center space-y-2">
                <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">50%</div>
                <div className="text-sm text-[hsl(var(--ethblox-text-secondary))]">BRICK owners</div>
              </div>
              <div className="p-4 rounded bg-[hsl(var(--ethblox-bg))] border border-[hsl(var(--ethblox-border))] text-center space-y-2">
                <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">30%</div>
                <div className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Liquidity Engine</div>
              </div>
              <div className="p-4 rounded bg-[hsl(var(--ethblox-bg))] border border-[hsl(var(--ethblox-border))] text-center space-y-2">
                <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">20%</div>
                <div className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Protocol treasury</div>
              </div>
            </div>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              But this simplicity masks a deep mechanism:
            </p>
            <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
              <li>• Creativity funds liquidity.</li>
              <li>• Liquidity stabilizes matter.</li>
              <li>• Stable matter enables more creativity.</li>
            </ul>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed font-semibold">
              This is a closed creative-thermodynamic loop.
            </p>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              No inflation. No yield farming. No mercenary capital. The world grows because its inhabitants create.
            </p>
          </section>

          {/* 6. Liquidity Engine */}
          <section className="space-y-6 p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">
              6. THE LIQUIDITY ENGINE AS CULTURAL INFRASTRUCTURE
            </h3>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              The Liquidity Engine transforms every creative action into market depth.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">Economically:</h4>
                <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] text-sm">
                  <li>• It builds protocol-owned liquidity</li>
                  <li>• It stabilizes BLOX pricing</li>
                  <li>• It subsidizes building by reducing slippage</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-[hsl(var(--ethblox-accent-green))]">Culturally:</h4>
                <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] text-sm">
                  <li>• It recognizes creativity as the primary economic engine</li>
                  <li>• It aligns the value of matter with the richness of the world</li>
                  <li>• It produces an anti-fragile ecosystem resilient to speculation</li>
                </ul>
              </div>
            </div>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed italic">
              In effect, creativity becomes a public good.
            </p>
          </section>

          {/* 7. AIR ↔ MATTER */}
          <section className="space-y-6 p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">
              7. OPTIONAL EXTENSION: AIR ↔ MATTER SPATIAL PHYSICS
            </h3>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              If enabled, the AIR ↔ MATTER dynamic establishes a dual-token system mirroring urban density.
            </p>
            <div className="p-4 rounded bg-[hsl(var(--ethblox-bg))] border border-[hsl(var(--ethblox-accent-cyan))]/30">
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                <strong>Rule:</strong> One unit of matter displaces one unit of air.
              </p>
            </div>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">This creates:</p>
            <ul className="space-y-1 text-[hsl(var(--ethblox-text-secondary))] pl-6">
              <li>• emergent land value</li>
              <li>• volumetric economics</li>
              <li>• creative zoning conflicts</li>
              <li>• incentives for destruction and renewal</li>
            </ul>
            <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed italic">
              In such a world, the shape of cities is not designed — it evolves.
            </p>
          </section>

          {/* 8. Conclusion */}
          <section className="space-y-6 p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-accent-cyan))]">8. CONCLUSION</h3>
            <p className="text-xl font-semibold text-[hsl(var(--ethblox-accent-yellow))]">
              A protocol for programmable culture.
            </p>
            <div className="space-y-4">
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                BASEBLOX is not a game in the traditional sense. It is a platform for cultural computation — a way to
                observe how humans create meaning when given scarce matter, shared primitives, and visible lineage.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                In an age of digital abundance, BASEBLOX reintroduces friction, scarcity, and choice — the ingredients
                that make culture matter.
              </p>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed font-semibold text-lg">
                This protocol turns building into narrative, structure into value, and creativity into the economic
                heartbeat of a shared universe.
              </p>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
