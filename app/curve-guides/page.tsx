import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Curve Guides - BASEBLOX",
  description:
    "Three perspectives on BASEBLOX: Left Curve (accessibility), Mid Curve (skepticism), and Right Curve (systems thinking). Comprehensive documentation on matter economics and memetic emergence.",
  keywords: [
    "BASEBLOX",
    "curve guides",
    "whitepaper",
    "matter economics",
    "memetic emergence",
    "blockchain building",
    "BLOX token",
  ],
}

const leftCurveContent = {
  title: "LEFT CURVE WHITEPAPER",
  subtitle: '"lego fun. block go up."',
  sections: [
    {
      heading: "What is BASEBLOX?",
      content:
        "BASEBLOX is digital LEGO on Ethereum.\nYou stack blocks. You make funny dogs. You mint them.\nPeople buy your funny dogs. Everyone has fun.\nAlso number go up.",
    },
    {
      heading: "How It Works (the easy version)",
      content:
        "There's matter called BLOX. You use BLOX to build stuff.\n\nThere are BRICKS (geometry templates) that help you make cool shapes.\n\nWhen you make something, it becomes a BUILD NFT.\n\nBUILD good → people want → BLOX locked → number go up.\n\nBUILD bad → break it → get BLOX back → try again.",
    },
    {
      heading: "Why BLOCK GO UP?",
      content:
        "When people build:\n\nBLOX gets locked inside cool objects\n\nYou can melt your build to get BLOX back\n\nBut building becomes addictive\n\nPeople show off their LEGO creations\n\nThey want MORE BLOX\n\nSupply stays low because everyone is hoarding BLOX inside giant dogs and statues\n\nSo BLOX number go up.",
    },
    {
      heading: "Magic License Thing",
      content:
        "You pay a little ETH to use special moulds (BRICKS)\n\nPart goes to the mould creator forever\n\nPart goes to BLOX liquidity\n\nEvery time someone builds, the BLOX/ETH pool gets juiced\n\nThe more people build → the richer the pool → smoother price → number go up harder.",
    },
    {
      heading: "CULTURE!!!",
      content:
        "First on-chain DOGE statue\n\nFirst PEPE\n\nFirst skateboard statue\n\nFirst BLOX PUNK\n\nFirst 69-block meme\n\nThese will become priceless.\nOn-chain museum pieces.\nDigital fossils of culture.",
    },
    {
      heading: "Conclusion",
      content: "It's LEGO.\nOn Ethereum.\nWith money physics.\n\nLeft curve rating: 10/10.\nLego fun = token go up.",
    },
  ],
}

const midCurveContent = {
  title: "MIDCURVE SKEPTIC PAPER",
  subtitle: '"This is not a metaverse. Stop projecting."',
  sections: [
    {
      heading: "The Midcurve Concerns",
      content: "",
    },
    {
      heading: 'Concern #1: "The metaverse is dead lol."',
      content:
        "People associate anything 3D with Web2 failures like Meta Horizons, Sandbox land speculation, or VR ghost towns.\n\nRebuttal:\n\nBASEBLOX is not a metaverse.\nNo land sales. No VR headsets. No persistent world.\nIt's 3D art tooling with on-chain physics, more akin to Autoglyphs + LEGO than Sandbox/Roblox.\n\nBASEBLOX is a limited-scope creative economy, not a virtual world.",
    },
    {
      heading: 'Concern #2: "Nobody wants to walk around in 3D."',
      content:
        "Correct. BASEBLOX doesn't require that.\n\nRebuttal:\n\nUsers don't walk — they build.\nBASEBLOX is a construction interface, more Minecraft Creative Mode than MMORPG.\n\nYou don't explore BASEBLOX — you express in it.",
    },
    {
      heading: 'Concern #3: "3D is expensive, gas is expensive, users won\'t build."',
      content:
        "Rebuttal:\n\nAll heavy lifting (geometry, voxel data, building tools) happens off-chain.\nOnly essential metadata hits Ethereum.\nActual building happens on Base (cheap), optionally mirrored to Solana (ultra-fast).\nEthereum remains the 'Genesis Vault' for provenance.\n\nBASEBLOX is engineered specifically to avoid metaverse bloat.",
    },
    {
      heading: 'Concern #4: "Isn\'t this just voxel art with NFTs?"',
      content:
        "Rebuttal:\n\nNo — BASEBLOX has closed-loop economic physics:\n\nBLOX = conserved matter → tied to supply/demand\n\nBRICKS = licence markets → dynamic bonding curves\n\nBUILDS = cultural storage → mass locking → supply sink\n\nBuilder Weight = prestige-as-yield\n\nThis is not a pixel art generator.\nIt's a creative economy with measurable physics.",
    },
    {
      heading: 'Concern #5: "What stops it from dying after a week?"',
      content:
        "Rebuttal:\n\nBASEBLOX has built-in long-term stickiness:\n\ndaily emissions reward builders\n\nmould creators earn forever\n\ncultural quests + challenges\n\nAI agents co-create and remix builds\n\nprotocol-owned liquidity strengthens over time\n\nthe first 210 Genesis BRICKS become legendary\n\nBASEBLOX becomes a historically layered museum of on-chain artifacts, not a fleeting NFT mint.",
    },
    {
      heading: "Conclusion (Midcurve)",
      content:
        "BASEBLOX is not a metaverse.\nIt's not VR.\nIt's not a game.\n\nIt's the simplest possible 3D creative primitive with crypto-native financial physics.",
    },
  ],
}

const rightCurveContent = {
  title: "RIGHT CURVE WHITEPAPER",
  subtitle:
    '"Matter economics, memetic emergence, AI co-creation, and the scarcity geometry of a bounded on-chain universe."',
  sections: [
    {
      heading: "Introduction",
      content:
        "BASEBLOX is a study in digitized matter, competitive creativity, and cultural crystallization under economic constraints.\n\nIts core thesis:\n\nWhen expressive freedom is governed by finite matter,\ncreativity becomes a market,\nand culture becomes a measurable physical phenomenon.\n\nBASEBLOX is an engineered microcosm of:\n\non-chain energy flow\n\nsupply-induced creativity\n\nmemetic hypertrophy\n\neconomic gravity\n\nand emergent social organization\n\n…all expressed through geometry.",
    },
    {
      heading: "Part I — Matter Physics",
      content:
        "BLOX: Conserved Digital Mass\n\nBLOX is the atomic unit of the BASEBLOX universe.\n\nIt obeys conservation rules (no burning)\n\nLocked into BUILDS → temporarily removed from circulation\n\nReleased on destruction with entropy cost (20% fee → value redistribution)\n\nMass becomes a productive asset —\nnot because it yields, but because it enables creation.",
    },
    {
      heading: "Part II — Geometry as Scarcity",
      content:
        "BRICKS (moulds) introduce non-fungible geometry into an otherwise uniform voxel plane.\n\nDemand → rising licence curves\n\nUsage → prestige\n\nScarcity anchored to mould mass\n\nThis creates geometric scarcity markets.\n\nA '2x2 ear' mould might become the premier asset for character creators.\nA 'sloped 4x8 panel' mould might dominate infrastructure builders.\nThe economy shifts around geometry, not land.",
    },
    {
      heading: "Part III — Cultural Energy & Value Capture",
      content:
        "Every creative act:\n\nlocks BLOX (mass sink)\n\nconsumes ETH (licence)\n\nincreases mould prestige\n\nincreases builder BW\n\ntriggers liquidity deepening\n\nstrengthens the treasury\n\nIt is a closed-loop thermodynamic system where:\n\nenergy ← ETH spent\n\nmatter ← BLOX locked\n\nstructure ← BUILDS created\n\nreputation ← BW\n\nliquidity ← protocol flywheel\n\nThis is the Nouns model → recast as a material culture simulator.",
    },
    {
      heading: "Part IV — Emergence & Hierarchy",
      content:
        "Builders organically stratify into:\n\nSculptors — optimize BW through monumental builds\n\nMould Lords — own scarce geometry licences\n\nEngineers — minimal-block maximal-BW designers\n\nAI Agents — autonomous creative forces\n\nCollectors — accumulate cultural mass\n\nCurators — direct the narrative\n\nBASEBLOX becomes a microsociety with resource flow, status, and memetic warfare.",
    },
    {
      heading: "Part V — AI Co-Creation Economics",
      content:
        "AI agents introduce computational creativity:\n\nagents propose builds\n\nhumans refine\n\nAI competes for BW\n\nagents maximize ROI on mould licences\n\nemergent markets form for build styles, block count optimizations, and creative arbitrage\n\nAIs become economic actors in the matter economy.",
    },
    {
      heading: "Part VI — Shortages & Shock Events",
      content:
        "BASEBLOX is designed with scarcities that trigger emergent behavior:\n\nBLOX shortages → high-value build recycling\n\nmould scarcity → black markets for licences\n\nAI flooding → human-only prestige quests\n\nbuild destruction cascades → mass return → liquidity shock\n\nIt is a full-stack cultural simulation.",
    },
    {
      heading: "Part VII — Mathematical Appendix (Sketch)",
      content:
        "Builder Weight\nBW = log(1 + mass) × log(2 + diversity)\n\nA proxy for:\n\nlabor\n\ncomplexity\n\nstructural information\n\nLicence Pricing\ncost = base × (1 + k × sqrt(usage))\n\nMatter Locking Ratio\nMLR = totalBloxLocked / circulatingSupply\n\nCultural Energy Index\nCEI = ETHSpentOnLicences × BWmean × BuildSurvivalRate\n\nYou can derive economic stability from:\n\nhigh CEI\n\nhigh MLR\n\nmoderate mould churn\n\nand rising BW over time\n\nIt becomes a culture-as-equation system.",
    },
    {
      heading: "Conclusion (Right Curve)",
      content:
        "BASEBLOX is not a game.\nIt is a physics engine for culture.\n\nMatter is scarce\n\nGeometry is scarce\n\nPrestige is measurable\n\nMemes are structural\n\nCreativity is economic\n\nAI is a stakeholder\n\nBASEBLOX is the next great experiment in on-chain cultural macroeconomics.",
    },
  ],
}

export default function CurveGuidesPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--ethblox-bg))] text-[hsl(var(--ethblox-text-primary))]">
      <SiteHeader />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto max-h-[calc(100vh-12rem)] overflow-y-auto pr-4">
          {/* Header */}
          <div className="mb-12 space-y-6">
            <h1 className="text-4xl font-heading font-bold tracking-tight">Curve Guides</h1>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl">
              Three perspectives on BASEBLOX — from accessibility to skepticism to systems thinking.
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="left" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] p-1 sticky top-0 z-10">
              <TabsTrigger
                value="left"
                className="data-[state=active]:bg-[hsl(var(--ethblox-surface-elevated))] data-[state=active]:text-[hsl(var(--ethblox-accent-cyan))] text-[hsl(var(--ethblox-text-secondary))]"
              >
                Left Curve
              </TabsTrigger>
              <TabsTrigger
                value="mid"
                className="data-[state=active]:bg-[hsl(var(--ethblox-surface-elevated))] data-[state=active]:text-[hsl(var(--ethblox-accent-cyan))] text-[hsl(var(--ethblox-text-secondary))]"
              >
                Mid Curve
              </TabsTrigger>
              <TabsTrigger
                value="right"
                className="data-[state=active]:bg-[hsl(var(--ethblox-surface-elevated))] data-[state=active]:text-[hsl(var(--ethblox-accent-cyan))] text-[hsl(var(--ethblox-text-secondary))]"
              >
                Right Curve
              </TabsTrigger>
            </TabsList>

            {/* Left Curve Content */}
            <TabsContent value="left" className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-heading font-bold">{leftCurveContent.title}</h2>
                <p className="text-xl text-[hsl(var(--ethblox-accent-cyan))] font-mono">{leftCurveContent.subtitle}</p>
              </div>

              {leftCurveContent.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg space-y-4"
                >
                  <h3 className="text-xl font-heading font-semibold text-[hsl(var(--ethblox-accent-cyan))]">
                    {section.heading}
                  </h3>
                  <div className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed whitespace-pre-line font-mono text-sm">
                    {section.content}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Mid Curve Content */}
            <TabsContent value="mid" className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-heading font-bold">{midCurveContent.title}</h2>
                <p className="text-xl text-[hsl(var(--ethblox-accent-cyan))] font-mono">{midCurveContent.subtitle}</p>
              </div>

              {midCurveContent.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg space-y-4"
                >
                  <h3 className="text-xl font-heading font-semibold text-[hsl(var(--ethblox-accent-cyan))]">
                    {section.heading}
                  </h3>
                  {section.content && (
                    <div className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed whitespace-pre-line font-mono text-sm">
                      {section.content}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* Right Curve Content */}
            <TabsContent value="right" className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-heading font-bold">{rightCurveContent.title}</h2>
                <p className="text-xl text-[hsl(var(--ethblox-accent-cyan))] font-mono">{rightCurveContent.subtitle}</p>
              </div>

              {rightCurveContent.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="p-6 bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg space-y-4"
                >
                  <h3 className="text-xl font-heading font-semibold text-[hsl(var(--ethblox-accent-cyan))]">
                    {section.heading}
                  </h3>
                  <div className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed whitespace-pre-line font-mono text-sm">
                    {section.content}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
