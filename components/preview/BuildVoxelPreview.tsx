"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useMemo, useState } from "react"
import { tokenImageGatewayURL } from "@/lib/contracts/ethblox-contracts"

type Brick = {
  color?: string
  position: [number, number, number]
  width?: number
  depth?: number
}

function fallbackFromHash(hash?: string): Brick[] {
  if (!hash || !hash.startsWith("0x") || hash.length < 10) return []
  const hex = hash.slice(2)
  const out: Brick[] = []
  const count = Math.min(24, Math.floor(hex.length / 6))
  for (let i = 0; i < count; i++) {
    const a = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0
    const b = parseInt(hex.slice(i * 2 + 2, i * 2 + 4), 16) || 0
    const c = parseInt(hex.slice(i * 2 + 4, i * 2 + 6), 16) || 0
    const x = (a % 8) - 4
    const y = b % 6
    const z = (c % 8) - 4
    out.push({
      color: `#${hex.slice((i * 6) % (hex.length - 6), ((i * 6) % (hex.length - 6)) + 6)}`,
      position: [x, y, z],
      width: 1,
      depth: 1,
    })
  }
  return out
}

function normalizeBricks(bricks?: Brick[], geometryHash?: string): Brick[] {
  const source = bricks && bricks.length > 0 ? bricks : fallbackFromHash(geometryHash)
  if (!source || source.length === 0) return []

  const sanitized = source
    .filter((b) => Array.isArray(b.position) && b.position.length === 3)
    .map((b) => {
      const [x, y, z] = b.position
      return {
        ...b,
        position: [
          Number.isFinite(x) ? x : 0,
          Number.isFinite(y) ? y : 0,
          Number.isFinite(z) ? z : 0,
        ] as [number, number, number],
      }
    })
  if (!sanitized.length) return []

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const b of sanitized) {
    const [x, y, z] = b.position
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2

  return sanitized.map((b) => ({
    ...b,
    position: [b.position[0] - cx, b.position[1] - cy, b.position[2] - cz],
    width: b.width ?? 1,
    depth: b.depth ?? 1,
  }))
}

export function BuildVoxelPreview({
  bricks,
  geometryHash,
  tokenId,
  imageUrl,
  className,
}: {
  bricks?: Brick[]
  geometryHash?: string
  tokenId?: string | number
  imageUrl?: string
  className?: string
}) {
  const voxels = useMemo(() => normalizeBricks(bricks, geometryHash), [bricks, geometryHash])
  const [imageFailed, setImageFailed] = useState(false)
  const [disable3d, setDisable3d] = useState(false)
  const backupImage = imageUrl || (tokenId !== undefined && tokenId !== null ? tokenImageGatewayURL(tokenId) : "")

  const fallbackNode = (
    <div className={`${className ?? "w-full h-full"} bg-[hsl(var(--ethblox-bg))]`}>
      {!imageFailed && backupImage ? (
        <img
          src={backupImage}
          alt={`Token ${String(tokenId ?? "")}`}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
  )

  if (!voxels.length || disable3d) {
    return fallbackNode
  }

  return (
    <div className={className ?? "w-full h-full"}>
      <Canvas
        camera={{ position: [8, 8, 8], fov: 42 }}
        fallback={fallbackNode}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          const onLost = () => setDisable3d(true)
          canvas.addEventListener("webglcontextlost", onLost, { once: true })
        }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[8, 12, 8]} intensity={1.1} />
        <group>
          {voxels.map((b, i) => (
            <mesh key={i} position={b.position as [number, number, number]}>
              <boxGeometry args={[b.width ?? 1, 1, b.depth ?? 1]} />
              <meshStandardMaterial color={b.color ?? "#f0b429"} roughness={0.4} metalness={0.1} />
            </mesh>
          ))}
        </group>
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.9} />
      </Canvas>
    </div>
  )
}
