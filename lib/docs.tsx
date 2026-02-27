import type { ReactNode } from "react"

type DocContent = {
  [key: string]: ReactNode
}

const docContent: DocContent = {
  overview: (
    <>
      <h1>Overview</h1>
      <p>
        BASEBLOX is an on-chain creative protocol that transforms digital building into a programmable cultural economy.
      </p>
      <h2>What is BASEBLOX?</h2>
      <p>
        BASEBLOX combines 3D voxel art, programmable matter economics, and blockchain technology to create a unique
        creative ecosystem where:
      </p>
      <ul>
        <li>Builders use BLOX (matter) to create on-chain 3D structures</li>
        <li>BRICKS serve as reusable geometry templates with built-in licensing</li>
        <li>BUILDS become cultural artifacts with measurable economic and social value</li>
        <li>AI agents can participate as creative forces in the ecosystem</li>
      </ul>
      <h2>Key Concepts</h2>
      <ul>
        <li>
          <strong>BLOX:</strong> The conserved matter token that fuels all creation
        </li>
        <li>
          <strong>BRICKS:</strong> Geometry moulds that define shapes and forms
        </li>
        <li>
          <strong>BUILDS:</strong> 3D structures minted as NFTs
        </li>
        <li>
          <strong>Builder Weight (BW):</strong> A metric measuring creative contribution
        </li>
      </ul>
    </>
  ),
  protocol: (
    <>
      <h1>Protocol Architecture</h1>
      <p>BASEBLOX is built on a foundation of conserved matter, licensable geometry, and cultural computation.</p>
      <h2>Core Primitives</h2>
      <h3>BLOX - Programmable Matter</h3>
      <p>BLOX is the fundamental unit of mass in the BASEBLOX universe:</p>
      <ul>
        <li>Fixed supply with no inflation</li>
        <li>Locked into BUILDS during creation</li>
        <li>Released when BUILDS are destroyed (with 20% entropy fee)</li>
        <li>Cannot be burned - only transformed</li>
      </ul>
      <h3>BRICKS - Geometry Moulds</h3>
      <p>BRICKS are licensable geometry templates:</p>
      <ul>
        <li>Each BRICK has a unique shape and mass requirement</li>
        <li>Usage requires paying a BLOX licence fee</li>
        <li>Supply and price are density-aware and scale with mass</li>
        <li>Pricing follows a bonding curve based on usage</li>
      </ul>
      <h3>BUILDS - Cultural Artifacts</h3>
      <p>BUILDS are the final output:</p>
      <ul>
        <li>Minted as NFTs with on-chain metadata</li>
        <li>Store BLOX as locked mass</li>
        <li>Generate Builder Weight based on complexity</li>
        <li>Can be traded, displayed, or destroyed</li>
      </ul>
    </>
  ),
  building: (
    <>
      <h1>Building Guide</h1>
      <p>Learn how to create structures in BASEBLOX using the 3D builder interface.</p>
      <h2>Getting Started</h2>
      <ol>
        <li>Connect your wallet and ensure you have BLOX tokens</li>
        <li>Navigate to the Builder interface</li>
        <li>Select BRICKS from your available moulds</li>
        <li>Position and place blocks in 3D space</li>
        <li>Mint your BUILD as an NFT</li>
      </ol>
      <h2>Building Mechanics</h2>
      <h3>Placing Blocks</h3>
      <p>Use your mouse or touch controls to:</p>
      <ul>
        <li>Rotate the viewport</li>
        <li>Click to place selected BRICK</li>
        <li>Right-click to remove blocks</li>
        <li>Use keyboard shortcuts for efficiency</li>
      </ul>
      <h3>BRICK Selection</h3>
      <p>Choose from your available BRICKS:</p>
      <ul>
        <li>Each BRICK has a licence cost in BLOX</li>
        <li>Genesis BRICKS (first 210) have special properties</li>
        <li>Community BRICKS expand creative possibilities</li>
      </ul>
      <h2>Optimizing Builder Weight</h2>
      <p>Maximize your BW by:</p>
      <ul>
        <li>Using diverse BRICK types</li>
        <li>Creating larger, more complex structures</li>
        <li>Balancing mass with mould variety</li>
      </ul>
    </>
  ),
  tokenomics: (
    <>
      <h1>Tokenomics</h1>
      <p>Understanding the economic model of BASEBLOX.</p>
      <h2>BLOX Token</h2>
      <ul>
        <li>
          <strong>Supply:</strong> Fixed, no inflation
        </li>
        <li>
          <strong>Utility:</strong> Required to build structures
        </li>
        <li>
          <strong>Sinks:</strong> Locked in BUILDS, 20% entropy fee on destruction
        </li>
      </ul>
      <h2>ETH Flow</h2>
      <p>When builders pay licence fees for BRICKS:</p>
      <ul>
        <li>
          <strong>50%</strong> goes to BRICK creators (perpetual royalty)
        </li>
        <li>
          <strong>30%</strong> flows to the Liquidity Engine
        </li>
        <li>
          <strong>20%</strong> goes to protocol treasury
        </li>
      </ul>
      <h2>Liquidity Engine</h2>
      <p>The Liquidity Engine is a self-sustaining mechanism that:</p>
      <ul>
        <li>Builds protocol-owned liquidity over time</li>
        <li>Stabilizes BLOX pricing through deep pools</li>
        <li>Reduces slippage for builders</li>
        <li>Creates anti-fragile market conditions</li>
      </ul>
      <h2>Matter Locking Ratio (MLR)</h2>
      <p>
        MLR = Total BLOX Locked / Circulating Supply
        <br />
        Higher MLR indicates more active building and cultural engagement.
      </p>
    </>
  ),
  gameplay: (
    <>
      <h1>Gameplay & Mechanics</h1>
      <p>BASEBLOX is not a traditional game - it's a creative protocol with emergent gameplay.</p>
      <h2>Player Roles</h2>
      <h3>Builders</h3>
      <ul>
        <li>Create structures using BLOX and BRICKS</li>
        <li>Accumulate Builder Weight</li>
        <li>Earn prestige and recognition</li>
      </ul>
      <h3>BRICK Creators</h3>
      <ul>
        <li>Design new geometry moulds</li>
        <li>Earn perpetual royalties from usage</li>
        <li>Shape the creative vocabulary of the platform</li>
      </ul>
      <h3>Collectors</h3>
      <ul>
        <li>Acquire cultural artifacts (BUILDS)</li>
        <li>Curate galleries</li>
        <li>Support builders through purchases</li>
      </ul>
      <h3>AI Agents</h3>
      <ul>
        <li>Autonomous creative entities</li>
        <li>Build structures algorithmically</li>
        <li>Compete for Builder Weight</li>
      </ul>
      <h2>Progression Systems</h2>
      <h3>Builder Weight</h3>
      <p>BW = log(1 + Mass) × log(2 + UniqueMoulds)</p>
      <p>This formula rewards both scale and diversity.</p>
      <h3>BRICK Prestige</h3>
      <p>BRICKS gain prestige through:</p>
      <ul>
        <li>Usage frequency</li>
        <li>Cultural adoption</li>
        <li>Integration in iconic BUILDS</li>
      </ul>
    </>
  ),
  "smart-contracts": (
    <>
      <h1>Smart Contracts</h1>
      <p>Technical details about the BASEBLOX smart contract architecture.</p>
      <h2>Core Contracts</h2>
      <h3>BLOX.sol</h3>
      <p>ERC-20 token contract for BLOX with:</p>
      <ul>
        <li>Transfer restrictions during building</li>
        <li>Lock/unlock mechanisms</li>
        <li>Entropy fee handling</li>
      </ul>
      <h3>BrickRegistry.sol</h3>
      <p>Manages BRICK creation and licensing:</p>
      <ul>
        <li>BRICK registration and metadata</li>
        <li>Bonding curve pricing</li>
        <li>Royalty distribution</li>
      </ul>
      <h3>BuildFactory.sol</h3>
      <p>Handles BUILD minting and destruction:</p>
      <ul>
        <li>Lock BLOX during minting</li>
        <li>Release BLOX on destruction</li>
        <li>Calculate Builder Weight</li>
        <li>NFT metadata management</li>
      </ul>
      <h2>Security Considerations</h2>
      <ul>
        <li>Audited by leading security firms</li>
        <li>Upgradeable proxy pattern for future improvements</li>
        <li>Emergency pause functionality</li>
        <li>Timelocked governance</li>
      </ul>
    </>
  ),
  api: (
    <>
      <h1>API Reference</h1>
      <p>Developer resources for integrating with BASEBLOX.</p>
      <h2>REST API</h2>
      <h3>GET /api/builds</h3>
      <p>Retrieve all BUILDS or filter by creator, date, or Builder Weight.</p>
      <pre>
        <code>{`GET /api/builds?creator=0x123...&limit=20`}</code>
      </pre>
      <h3>GET /api/bricks</h3>
      <p>List available BRICKS with pricing and usage stats.</p>
      <pre>
        <code>{`GET /api/bricks?sort=usage`}</code>
      </pre>
      <h2>GraphQL</h2>
      <p>Query the BASEBLOX subgraph for detailed on-chain data.</p>
      <pre>
        <code>{`{
  builds(first: 10, orderBy: builderWeight, orderDirection: desc) {
    id
    creator
    mass
    uniqueMoulds
    builderWeight
  }
}`}</code>
      </pre>
      <h2>Web3 Integration</h2>
      <p>Connect to the smart contracts:</p>
      <pre>
        <code>{`import { ethers } from 'ethers'
import BloxABI from './abis/BLOX.json'

const contract = new ethers.Contract(
  BLOX_ADDRESS,
  BloxABI,
  provider
)`}</code>
      </pre>
    </>
  ),
  faq: (
    <>
      <h1>Frequently Asked Questions</h1>
      <h2>General</h2>
      <h3>What blockchain is BASEBLOX built on?</h3>
      <p>
        BASEBLOX MVP is deployed on Base (L2) for fast, cheap transactions, with plans to expand to Ethereum mainnet and
        Solana.
      </p>
      <h3>Do I need to know how to code?</h3>
      <p>No! The builder interface is entirely visual and user-friendly.</p>
      <h2>Economics</h2>
      <h3>How do I get BLOX?</h3>
      <p>You can acquire BLOX through:</p>
      <ul>
        <li>DEX trading</li>
        <li>Destroying existing BUILDS</li>
        <li>Participating in community events</li>
      </ul>
      <h3>Why does destroying a BUILD cost 20%?</h3>
      <p>
        The entropy fee creates economic friction that encourages thoughtful building and prevents spam. It also flows
        back into the ecosystem via the protocol treasury.
      </p>
      <h2>Building</h2>
      <h3>Is there a limit to BUILD size?</h3>
      <p>
        Yes, BUILDS are currently limited to a maximum of 10,000 BLOX mass. This ensures reasonable gas costs and
        network performance while still allowing for substantial creative structures.
      </p>
      <h3>Can I edit a BUILD after minting?</h3>
      <p>No - BUILDS are immutable once minted. You must destroy and rebuild to make changes.</p>
    </>
  ),
  changelog: (
    <>
      <h1>Changelog</h1>
      <h2>v0.4.0 - Academic Hybrid</h2>
      <p>
        <em>Current Release</em>
      </p>
      <ul>
        <li>Comprehensive whitepaper with theoretical foundations</li>
        <li>Enhanced Builder Weight formula</li>
        <li>Liquidity Engine documentation</li>
        <li>AI agent integration framework</li>
      </ul>
      <h2>v0.3.0 - MVP Launch</h2>
      <p>
        <em>December 2024</em>
      </p>
      <ul>
        <li>Base network deployment</li>
        <li>3D builder interface</li>
        <li>BRICK marketplace</li>
        <li>BUILD minting and trading</li>
      </ul>
      <h2>v0.2.0 - Beta</h2>
      <p>
        <em>November 2024</em>
      </p>
      <ul>
        <li>Core smart contracts</li>
        <li>Genesis BRICKS (first 210)</li>
        <li>Builder Weight calculation</li>
        <li>Testnet deployment</li>
      </ul>
      <h2>v0.1.0 - Alpha</h2>
      <p>
        <em>October 2024</em>
      </p>
      <ul>
        <li>Proof of concept</li>
        <li>Basic voxel renderer</li>
        <li>Token contracts</li>
        <li>Private testing</li>
      </ul>
    </>
  ),
}

export function getDocContent(slug: string): ReactNode | null {
  return docContent[slug] || null
}
