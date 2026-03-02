"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useMemo, useState } from "react"
import * as THREE from "three"
import { tokenImageGatewayURL } from "@/lib/contracts/ethblox-contracts"

type Brick = {
  color?: string
  position: [number, number, number]
  width?: number
  depth?: number
}

const BRICK_HEIGHT = 1
const STUD_RADIUS = 0.22

function BrickMesh({
  brick,
  glass = false,
  showStuds = false,
}: {
  brick: Brick
  glass?: boolean
  showStuds?: boolean
}) {
  const width = brick.width ?? 1
  const depth = brick.depth ?? 1
  const color = brick.color ?? "#f0b429"
  const glassColor = "#8ecfff"
  const [x, y, z] = brick.position

  const studs = useMemo(() => {
    if (!showStuds) return []
    const maxStuds = 100
    const out: Array<[number, number, number]> = []
    for (let ix = 0; ix < width; ix++) {
      for (let iz = 0; iz < depth; iz++) {
        if (out.length >= maxStuds) break
        out.push([
          x + ix - width / 2 + 0.5,
          y + BRICK_HEIGHT / 2 + 0.02,
          z + iz - depth / 2 + 0.5,
        ])
      }
    }
    return out
  }, [showStuds, width, depth, x, y, z])

  if (glass) {
    return (
      <group>
        <mesh position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[width, BRICK_HEIGHT, depth]} />
          <meshPhysicalMaterial
            color={glassColor}
            transparent
            opacity={0.62}
            roughness={0.03}
            metalness={0}
            transmission={0.9}
            thickness={0.45}
            ior={1.45}
            envMapIntensity={1.55}
            clearcoat={1}
            clearcoatRoughness={0.04}
          />
        </mesh>
        {studs.map((pos, idx) => (
          <mesh key={idx} position={pos} castShadow>
            <sphereGeometry args={[STUD_RADIUS, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial
              color={glassColor}
              transparent
              opacity={0.68}
              roughness={0.03}
              metalness={0}
              transmission={0.92}
              thickness={0.25}
              ior={1.45}
              envMapIntensity={1.6}
              clearcoat={1}
              clearcoatRoughness={0.04}
            />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group>
      <mesh position={[x, y, z]} castShadow receiveShadow>
        <boxGeometry args={[width, BRICK_HEIGHT, depth]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.12} />
      </mesh>
      {studs.map((pos, idx) => (
        <mesh key={idx} position={pos} castShadow>
          <sphereGeometry args={[STUD_RADIUS, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.18} />
        </mesh>
      ))}
    </group>
  )
}

function StudField({ radius = 18, spacing = 1.1 }: { radius?: number; spacing?: number }) {
  const studs = useMemo(() => {
    const out: Array<[number, number, number]> = []
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (x * x + z * z > radius * radius) continue
        out.push([x * spacing, -0.55, z * spacing])
      }
    }
    return out
  }, [radius, spacing])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
        <circleGeometry args={[radius * spacing + 2, 80]} />
        <meshStandardMaterial color="#243248" roughness={0.85} metalness={0.04} />
      </mesh>
      {studs.map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} receiveShadow>
          <sphereGeometry args={[0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={i % 7 === 0 ? "#f5f8ff" : "#3c5a84"} roughness={0.22} metalness={0.28} />
        </mesh>
      ))}
    </group>
  )
}

function fallbackFromHash(hash?: string): Brick[] {
  // Geometry hash alone is not enough to reconstruct canonical brick layout.
  // Prefer image fallback instead of rendering synthetic/random cubes.
  return []
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
  transparentBricks = false,
  showStuds = false,
  sceneMode = "default",
}: {
  bricks?: Brick[]
  geometryHash?: string
  tokenId?: string | number
  imageUrl?: string
  className?: string
  transparentBricks?: boolean
  showStuds?: boolean
  sceneMode?: "default" | "marketplace"
}) {
  const voxels = useMemo(() => normalizeBricks(bricks, geometryHash), [bricks, geometryHash])
  const [imageFailed, setImageFailed] = useState(false)
  const [disable3d, setDisable3d] = useState(false)
  const backupImage = imageUrl || (tokenId !== undefined && tokenId !== null ? tokenImageGatewayURL(tokenId) : "")

  const fallbackNode = (
    <div className={`${className ?? "w-full h-full"} bg-[hsl(var(--ethblox-surface))]`}>
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
        camera={sceneMode === "marketplace" ? { position: [9, 6.5, 9], fov: 38 } : { position: [8, 8, 8], fov: 42 }}
        shadows
        fallback={fallbackNode}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          const onLost = () => setDisable3d(true)
          canvas.addEventListener("webglcontextlost", onLost, { once: true })
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = sceneMode === "marketplace" ? 1.06 : 1
        }}
      >
        <color attach="background" args={sceneMode === "marketplace" ? ["#29364a"] : ["#36465c"]} />
        <ambientLight intensity={sceneMode === "marketplace" ? 0.75 : 0.92} />
        <hemisphereLight intensity={sceneMode === "marketplace" ? 0.7 : 0.5} color="#eef5ff" groundColor="#3f4d63" />
        <directionalLight position={[9, 12, 8]} intensity={sceneMode === "marketplace" ? 1.55 : 1.3} castShadow />
        <pointLight position={[-6, 5, -3]} intensity={sceneMode === "marketplace" ? 0.85 : 0.55} color="#cfe7ff" />
        {sceneMode === "marketplace" && <StudField />}
        <group>
          {voxels.map((b, i) => <BrickMesh key={i} brick={b} glass={transparentBricks} showStuds={showStuds} />)}
        </group>
        <OrbitControls
          enablePan={false}
          enableZoom={sceneMode === "marketplace"}
          autoRotate
          autoRotateSpeed={sceneMode === "marketplace" ? 0.55 : 0.9}
          minDistance={5}
          maxDistance={20}
        />
      </Canvas>
    </div>
  )
}
