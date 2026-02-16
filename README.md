# ETHBLOX 3D Builder

A 3D voxel brick builder built with Next.js, Three.js, and React Three Fiber.

## SSR/CSP Invariants

### Architecture Rules (DO NOT BREAK)

#### Layer A - Server Route Component
- File: `app/build/page.tsx`
- Must be a Server Component (NO "use client")
- Must NOT import any Three.js or R3F code
- Only renders: `<BuildClient />`

#### Layer B - Client Wrapper
- File: `components/build/BuildClient.tsx`
- Must have "use client" directive
- Must use `dynamic()` with `{ ssr: false }` to import V0Blocks
- Provides loading state during client-side hydration

#### Layer C - Builder + Three.js
- File: `components/build/V0Blocks.tsx`
- Must have "use client" directive
- Contains all Three.js, R3F, and @react-three/drei imports
- Implements the full builder UI and 3D scene

### Why This Matters

1. **SSR Safety**: Three.js cannot run on the server (no DOM/WebGL)
2. **CSP Compliance**: Shader compilation needs specific CSP rules
3. **Next.js Warnings**: `dynamic({ ssr: false })` only works in client components

### How to Avoid Regressions

- NEVER import Three.js/R3F in server components
- NEVER use `dynamic({ ssr: false })` in server components
- ALWAYS guard `window`/`document` access with `typeof window !== "undefined"`
- Keep shared types in `lib/types.ts` with NO Three.js imports

### Development

```bash
npm run local:up
npm run dev
```

Visit http://localhost:3000/build

### Network Profiles

Switch app env to local Anvil:

```bash
npm run env:anvil
```

One-step local bootstrap (persistent Anvil + env wiring):

```bash
npm run local:up
```

This reads local contract addresses from `/Users/seangardner/dev/ETHBLOX/ethblox-contracts/deployments/anvil.contracts.json` when present.

Switch app env to Base Sepolia:

```bash
npm run env:sepolia
```

### Go-Live Checklist (App)

- Set `NEXT_PUBLIC_ENABLE_NETWORK_SWITCHER=false` to hide header chain toggle.
- Remove or hide any debug-only UI routes (`/mint-debug`, admin reset tools).
- Confirm app mint fee UI/diagnostics matches final on-chain `BuildNFT.FEE_PER_MINT` (remove temporary test fee assumptions).
- Confirm `NEXT_PUBLIC_*_ADDRESS` values point to audited production contracts only.
- Set `NEXT_PUBLIC_NETWORK_NAME` and explorer URL to production network values.
- Verify `REDIS_KEY_PREFIX` is production-scoped and isolated from staging/local data.
- Disable dangerous admin operations in production (`ADMIN_RESET_ENABLED=false`, no flush).
- Remove test wallet assumptions and local-chain-only helper copy from user-facing flows.
- Run a final smoke pass: connect wallet, mint, explore token page, gallery render, burn flow.

### Deployment

The CSP headers in `next.config.mjs` allow:
- `unsafe-eval` for Three.js shader compilation
- `blob:` for workers and WebGL contexts
- All necessary directives for production Vercel deployment

## Features

- Place rectangular bricks with configurable width/depth
- 8-color palette
- Build/Move/Erase modes
- Undo/Redo with full history
- localStorage persistence
- Keyboard shortcuts (Ctrl+Z, Ctrl+S, B/M/E, 1-9)
- Export/Import JSON
