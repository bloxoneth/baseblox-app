"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useRouter } from "next/navigation"
import * as THREE from "three"
import {
  Hammer,
  Move,
  Eraser,
  Undo2,
  Redo2,
  ArrowLeftRight,
  Save,
  FolderOpen,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Zap,
  Box,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import type { Brick } from "@/lib/types"
import { saveBuild, loadBuild, deleteBuild, type SavedBuild } from "@/lib/storage"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useMetaMask } from "@/contexts/metamask-context"
import { useBloxBalance } from "@/lib/web3/hooks/useBloxBalance"
import { BrickMintModal } from "./BrickMintModal"
import { calculateTotalBlox } from "@/lib/brick-utils"
import { getBrickByDimensions, type BrickNFT, BRICK_DENSITIES, normalizeBrickKey } from "@/data/bricks"
import { BUILD_NFT_ABI, CONTRACTS } from "@/lib/contracts/ethblox-contracts"
import { computeSpecKey } from "@/lib/brickSpec"
import { ethers } from "ethers"

const BRICK_HEIGHT = 1.0
const GROUND_HEIGHT = 0.25
const GRID_UNIT = 1.0
const LAYER_GAP = 0.005

const COLOR_THEMES = {
  default: [
    "#FF3333", // Red
    "#FF9933", // Orange
    "#FFCC33", // Yellow
    "#33CC66", // Green
    "#33CCFF", // Light Blue
    "#3366CC", // Dark Blue
    "#9933CC", // Purple
    "#333333", // Black
  ],
  muted: [
    "#D67070", // Muted Red
    "#D69970", // Muted Orange
    "#D6C670", // Muted Yellow
    "#70B270", // Muted Green
    "#70B2B2", // Muted Cyan
    "#7095CC", // Muted Blue
    "#9970B2", // Muted Purple
    "#606060", // Dark Gray
  ],
  monochrome: [
    "#FFFFFF", // White
    "#DDDDDD", // Light Gray 1
    "#BBBBBB", // Light Gray 2
    "#999999", // Mid Gray 1
    "#777777", // Mid Gray 2
    "#555555", // Dark Gray 1
    "#333333", // Dark Gray 2
    "#1A1A1A", // Near Black
  ],
}

type Mode = "build" | "move" | "erase"
type Theme = "default" | "muted" | "monochrome"

// V0BlocksProps interface removed - using inline type definition

const BrickMesh = React.memo(function BrickMesh({
  brick,
  isGhost,
  isEraseHover,
  onClick,
}: {
  brick: Brick
  isGhost?: boolean
  isEraseHover?: boolean
  onClick?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  // Only run animation frame for ghost/hover bricks
  useFrame(
    isGhost || isEraseHover
      ? (state) => {
          if (materialRef.current) {
            const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.05 + 0.95
            materialRef.current.emissiveIntensity = pulse
          }
        }
      : () => {},
  )

  // Memoize studs array to avoid recalculation on every render
  const studs = React.useMemo(() => {
    const result: [number, number, number][] = []
    for (let i = 0; i < Math.floor(brick.width); i++) {
      for (let j = 0; j < Math.floor(brick.depth); j++) {
        result.push([i - brick.width / 2 + 0.5, BRICK_HEIGHT / 2 + 0.025, j - brick.depth / 2 + 0.5])
      }
    }
    return result
  }, [brick.width, brick.depth])

  const color = isGhost ? "#ffff00" : isEraseHover ? "#ff0000" : brick.color
  const opacity = isGhost || isEraseHover ? 0.6 : 1.0
  const emissive = isGhost ? "#ffff00" : isEraseHover ? "#ff0000" : "#000000"

  return (
    <group ref={groupRef} position={brick.position}>
      <mesh onClick={onClick} castShadow receiveShadow>
        <boxGeometry args={[brick.width, BRICK_HEIGHT, brick.depth]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          transparent={opacity < 1}
          opacity={opacity}
          roughness={0.2}
          metalness={0.15}
          emissive={emissive}
          emissiveIntensity={isGhost || isEraseHover ? 0.9 : 0}
        />
      </mesh>
      {studs.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <sphereGeometry args={[0.25, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={color}
            transparent={opacity < 1}
            opacity={opacity}
            roughness={0.15}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  )
})

// Instanced NFT ghost preview - for rendering large NFT builds efficiently
const InstancedNFTGhost = React.memo(function InstancedNFTGhost({ 
  bricks 
}: { 
  bricks: Brick[] 
}) {
  const boxMeshRef = useRef<THREE.InstancedMesh>(null)
  const studMeshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const tempObject = React.useMemo(() => new THREE.Object3D(), [])
  const tempMatrix = React.useMemo(() => new THREE.Matrix4(), [])
  
  // Calculate total studs count
  const totalStuds = React.useMemo(() => {
    let count = 0
    for (const brick of bricks) {
      count += Math.floor(brick.width) * Math.floor(brick.depth)
    }
    return count
  }, [bricks])
  
  // Update instance matrices
  React.useEffect(() => {
    if (!boxMeshRef.current || !studMeshRef.current || bricks.length === 0) return
    
    // Set box instances
    bricks.forEach((brick, i) => {
      tempObject.position.set(brick.position[0], brick.position[1], brick.position[2])
      tempObject.scale.set(brick.width, BRICK_HEIGHT, brick.depth)
      tempObject.updateMatrix()
      boxMeshRef.current!.setMatrixAt(i, tempObject.matrix)
    })
    boxMeshRef.current.instanceMatrix.needsUpdate = true
    
    // Set stud instances
    let studIndex = 0
    for (const brick of bricks) {
      for (let i = 0; i < Math.floor(brick.width); i++) {
        for (let j = 0; j < Math.floor(brick.depth); j++) {
          const studX = brick.position[0] + i - brick.width / 2 + 0.5
          const studY = brick.position[1] + BRICK_HEIGHT / 2 + 0.025
          const studZ = brick.position[2] + j - brick.depth / 2 + 0.5
          
          tempObject.position.set(studX, studY, studZ)
          tempObject.scale.set(1, 1, 1)
          tempObject.updateMatrix()
          studMeshRef.current!.setMatrixAt(studIndex, tempObject.matrix)
          studIndex++
        }
      }
    }
    studMeshRef.current.instanceMatrix.needsUpdate = true
  }, [bricks, tempObject])
  
  // Pulse animation for ghost effect
  useFrame((state) => {
    if (materialRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.05 + 0.95
      materialRef.current.emissiveIntensity = pulse
    }
  })
  
  if (bricks.length === 0) return null
  
  return (
    <group>
      {/* Instanced boxes for brick bodies */}
      <instancedMesh ref={boxMeshRef} args={[undefined, undefined, bricks.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          ref={materialRef}
          color="#ffff00"
          transparent
          opacity={0.6}
          roughness={0.2}
          metalness={0.15}
          emissive="#ffff00"
          emissiveIntensity={0.9}
        />
      </instancedMesh>
      
      {/* Instanced studs */}
      <instancedMesh ref={studMeshRef} args={[undefined, undefined, totalStuds]}>
        <sphereGeometry args={[0.25, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color="#ffff00"
          transparent
          opacity={0.6}
          roughness={0.15}
          metalness={0.2}
        />
      </instancedMesh>
    </group>
  )
})

// Threshold for switching to instanced rendering
const INSTANCED_NFT_THRESHOLD = 50

// Stars background component - full sphere distribution
function Stars() {
  const starsRef = useRef<THREE.Points>(null)
  
  const [positions, colors] = React.useMemo(() => {
    const starCount = 2000 // Reduced for performance
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    
    for (let i = 0; i < starCount; i++) {
      // Distribute stars across full sphere (mostly upper hemisphere)
      const theta = Math.random() * Math.PI * 2
      // Bias toward upper hemisphere but include some below horizon for reflections
      const phi = Math.random() * Math.PI * 0.7
      const r = 300 + Math.random() * 150
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) + 20
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      
      // Varying star colors and brightness
      const brightness = 0.6 + Math.random() * 0.4
      const colorVariation = Math.random()
      if (colorVariation > 0.9) {
        // Some blue-ish stars
        colors[i * 3] = brightness * 0.7
        colors[i * 3 + 1] = brightness * 0.8
        colors[i * 3 + 2] = brightness
      } else if (colorVariation > 0.8) {
        // Some yellow-ish stars
        colors[i * 3] = brightness
        colors[i * 3 + 1] = brightness * 0.9
        colors[i * 3 + 2] = brightness * 0.6
      } else {
        // White stars
        colors[i * 3] = brightness
        colors[i * 3 + 1] = brightness
        colors[i * 3 + 2] = brightness
      }
    }
    
    return [positions, colors]
  }, [])
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={2000} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={2000} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={1.5} vertexColors sizeAttenuation transparent opacity={1} />
    </points>
  )
}

// Instanced studs component for performance
function InstancedStuds({ 
  positions, 
  color, 
  emissive,
  roughness = 0.2,
  metalness = 0.4,
  size = 0.2 
}: { 
  positions: [number, number, number][]
  color: string
  emissive: string
  roughness?: number
  metalness?: number
  size?: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const tempObject = React.useMemo(() => new THREE.Object3D(), [])
  
  React.useEffect(() => {
    if (!meshRef.current) return
    
    positions.forEach((pos, i) => {
      tempObject.position.set(pos[0], pos[1], pos[2])
      tempObject.updateMatrix()
      meshRef.current!.setMatrixAt(i, tempObject.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions, tempObject])
  
  if (positions.length === 0) return null
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
      <sphereGeometry args={[size, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial 
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={0.15}
      />
    </instancedMesh>
  )
}

// Space floor with dynamic used area highlighting - optimized with instancing
function SpaceFloor({ bricks }: { bricks: Brick[] }) {
  // Compute exact occupied cells + 1-cell border that hugs the build
  const { usedStuds, unusedStuds } = React.useMemo(() => {
    const used: [number, number, number][] = []
    const unused: [number, number, number][] = []
    const halfFloor = FLOOR_SIZE / 2
    const y = GROUND_HEIGHT / 2
    
    if (bricks.length === 0) {
      // No bricks - all studs are "unused" dark ones
      for (let x = -halfFloor; x < halfFloor; x++) {
        for (let z = -halfFloor; z < halfFloor; z++) {
          unused.push([x, y, z])
        }
      }
      return { usedStuds: used, unusedStuds: unused }
    }
    
    // Build a set of all grid cells occupied by bricks (ground-level projection)
    const occupiedCells = new Set<string>()
    for (const brick of bricks) {
      const startX = Math.round(brick.position[0] - brick.width / 2)
      const startZ = Math.round(brick.position[2] - brick.depth / 2)
      for (let dx = 0; dx < brick.width; dx++) {
        for (let dz = 0; dz < brick.depth; dz++) {
          occupiedCells.add(`${startX + dx},${startZ + dz}`)
        }
      }
    }
    
    // Build a border set: cells adjacent to occupied cells but not occupied themselves
    const borderCells = new Set<string>()
    for (const key of occupiedCells) {
      const [cx, cz] = key.split(",").map(Number)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue
          const nk = `${cx + dx},${cz + dz}`
          if (!occupiedCells.has(nk)) {
            borderCells.add(nk)
          }
        }
      }
    }
    
    // Now classify every floor stud
    for (let x = -halfFloor; x < halfFloor; x++) {
      for (let z = -halfFloor; z < halfFloor; z++) {
        const key = `${x},${z}`
        if (occupiedCells.has(key) || borderCells.has(key)) {
          used.push([x, y, z])
        } else {
          unused.push([x, y, z])
        }
      }
    }
    
    return { usedStuds: used, unusedStuds: unused }
  }, [bricks])
  
  return (
    <group>
      {/* Deep space background - full sphere around scene */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[500, 16, 8]} />
        <meshBasicMaterial color="#020208" side={THREE.BackSide} />
      </mesh>
      
      {/* Stars - visible in all directions */}
      <Stars />
      
      {/* Shiny black reflective floor surface - uniform across entire area */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial 
          color="#0c0c14"
          roughness={0.02}
          metalness={1}
          envMapIntensity={1.5}
        />
      </mesh>
      
      {/* Used area studs - bright and shiny (instanced) */}
      <InstancedStuds 
        positions={usedStuds}
        color="#f0f8ff"
        emissive="#667788"
        roughness={0.15}
        metalness={0.4}
        size={0.2}
      />
      
      {/* Unused area studs - dimmer (instanced) */}
      <InstancedStuds 
        positions={unusedStuds}
        color="#2a3545"
        emissive="#1a2530"
        roughness={0.25}
        metalness={0.5}
        size={0.18}
      />
    </group>
  )
}

const GroundHighlight = React.memo(function GroundHighlight({
  position,
  width,
  depth,
  isValid,
}: {
  position: [number, number, number]
  width: number
  depth: number
  isValid: boolean
}) {
  return (
    <mesh position={[position[0], 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial color={isValid ? "#00ff00" : "#ff0000"} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  )
})

function Scene({
  bricks,
  ghostBrick,
  groundHighlight,
  onCanvasClick,
  onBrickClick,
  mode,
  isPlaying,
  hoverGroupId,
  onMouseMove,
  isShiftPressed,
  nftGhostBricks,
  cameraRef,
  isMobile,
  ghostPositionRef,
  hoverGroupIdFromScene,
}: {
  bricks: Brick[]
  ghostBrick: Brick | null
  groundHighlight: { position: [number, number, number]; isValid: boolean } | null
  onCanvasClick: (point: THREE.Vector3) => void
  onBrickClick: (id: string) => void
  mode: "build" | "move" | "erase"
  isPlaying: boolean
  hoverGroupId: string | null
  onMouseMove: (event: PointerEvent) => void
  isShiftPressed: boolean
  nftGhostBricks: Brick[] | null
  cameraRef: any
  isMobile: boolean
  ghostPositionRef: React.MutableRefObject<{ x: number; z: number } | null>
  hoverGroupIdFromScene: string | null
}) {
  const { gl, scene, camera } = useThree()
  const controlsRef = useRef<any>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  
  // Reusable THREE objects to avoid GC pressure from creating new ones every frame
  const raycasterRef = useRef(new THREE.Raycaster())
  const groundPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const pointOnGroundRef = useRef(new THREE.Vector3())
  const intersectionPointRef = useRef(new THREE.Vector3())
  const minVecRef = useRef(new THREE.Vector3())
  const maxVecRef = useRef(new THREE.Vector3())
  const boxRef = useRef(new THREE.Box3())

  useEffect(() => {
    cameraRef.current = camera
  }, [camera, cameraRef])

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 15, 15)
      cameraRef.current.lookAt(0, 0, 0)
    }
  }, [cameraRef])

  // Only run frame updates when playing - skip entirely otherwise
  useFrame(
    isPlaying
      ? () => {
          if (controlsRef.current) {
            controlsRef.current.autoRotateSpeed = 1
          }
        }
      : () => {},
  )

  useEffect(() => {
    // Don't track mouse movement when in move mode or shift is pressed - let OrbitControls handle it
    if (mode === "move" || isShiftPressed) return

    const handlePointerMove = (e: PointerEvent) => {
      if (isMobile && touchStartRef.current) {
        const dx = e.clientX - touchStartRef.current.x
        const dy = e.clientY - touchStartRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance > 10) {
          isDraggingRef.current = true
        }
      }
      onMouseMove(e)
    }

    gl.domElement.addEventListener("pointermove", handlePointerMove)
    return () => gl.domElement.removeEventListener("pointermove", handlePointerMove)
  }, [gl.domElement, onMouseMove, mode, isShiftPressed, isMobile])

  useEffect(() => {
    if (isShiftPressed || mode !== "build") return

    const handlePointerDown = (e: PointerEvent) => {
      if (isMobile) {
        // Mobile: just record the start position, don't place yet
        touchStartRef.current = { x: e.clientX, y: e.clientY }
        isDraggingRef.current = false
        return
      }

      // Desktop: place immediately on click - reuse raycaster
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycasterRef.current.setFromCamera({ x, y }, camera)

      if (raycasterRef.current.ray.intersectPlane(groundPlaneRef.current, pointOnGroundRef.current)) {
        console.log("[v0] Desktop click detected at:", pointOnGroundRef.current)
        onCanvasClick(pointOnGroundRef.current.clone())
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isMobile) return

      if (!isDraggingRef.current && touchStartRef.current && ghostPositionRef.current) {
        // Use the ghost brick position instead of raycasting again
        // This ensures brick lands exactly where the ghost is showing
        pointOnGroundRef.current.set(ghostPositionRef.current.x, 0, ghostPositionRef.current.z)
        console.log("[v0] Mobile tap - placing at ghost position:", pointOnGroundRef.current)
        onCanvasClick(pointOnGroundRef.current.clone())
      }

      // Reset touch tracking
      touchStartRef.current = null
      isDraggingRef.current = false
    }

    gl.domElement.addEventListener("pointerdown", handlePointerDown)
    gl.domElement.addEventListener("pointerup", handlePointerUp)
    return () => {
      gl.domElement.removeEventListener("pointerdown", handlePointerDown)
      gl.domElement.removeEventListener("pointerup", handlePointerUp)
    }
  }, [gl.domElement, camera, onCanvasClick, mode, isShiftPressed, isMobile, ghostPositionRef])

  return (
    <>
<color attach="background" args={["#020208"]} />
  <ambientLight intensity={0.8} />
  {/* Main directional light */}
  <directionalLight position={[10, 25, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
  {/* Fill light from opposite side */}
  <directionalLight position={[-15, 15, -10]} intensity={0.8} />
  {/* Top-down light for shine */}
  <directionalLight position={[0, 30, 0]} intensity={0.6} />
  {/* Front fill light */}
  <pointLight position={[0, 10, 20]} intensity={0.5} />
  {/* Rim light for highlights */}
  <pointLight position={[-20, 8, 0]} intensity={0.4} color="#6688ff" />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        enabled={mode === "move" || isPlaying || isShiftPressed}
        autoRotate={isPlaying}
        autoRotateSpeed={1}
        minDistance={10}
        maxDistance={40}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.5}
      />

      <SpaceFloor bricks={bricks} />

      {bricks.map((brick, i) => (
        <BrickMesh
          key={i}
          brick={brick}
          isEraseHover={mode === "erase" && hoverGroupId !== null && (brick.nftGroupId === hoverGroupId || brick.id === hoverGroupId)}
          onClick={() => !isShiftPressed && onBrickClick(brick.id)}
        />
      ))}

      {ghostBrick && mode === "build" && <BrickMesh brick={ghostBrick} isGhost onClick={() => {}} />}

      {groundHighlight && mode === "build" && (
        <GroundHighlight position={groundHighlight.position} width={1} depth={1} isValid={groundHighlight.isValid} />
      )}

{nftGhostBricks && mode === "build" && nftGhostBricks.length > 0 && (
    nftGhostBricks.length > INSTANCED_NFT_THRESHOLD 
      ? <InstancedNFTGhost bricks={nftGhostBricks} />
      : nftGhostBricks.map((brick, i) => <BrickMesh key={i} brick={brick} isGhost onClick={() => {}} />)
  )}
    </>
  )
}

// Default floor size (large enough for any build)
const FLOOR_SIZE = 100

export default function V0Blocks({
  initialLoadedBuild = null,
  showLoadDialogImmediately = false,
  nftGeometry = null,
  nftInfo = null,
  onNFTPlaced,
  onBricksCleared,
  onBricksDeleted,
  onBricksChanged,
  nftComposition = {},
  initialBricks,
  onAutoSave,
  onClearNFTMode,
  onSetBrickSize,
  onOpenNFTDrawer,
  onRotateNFT,
  onBrickCountsChange,
}: {
  nftGeometry?: Brick[] | null
  nftInfo?: { name: string; tokenId: number } | null
  onNFTPlaced?: (tokenId: number, name: string, bricksCount: number, brickIds: string[]) => void
  onBricksCleared?: () => void
  onBricksDeleted?: (deletedBrickIds: string[]) => void
  onBricksChanged?: (currentBricks: Brick[]) => void
  nftComposition?: Record<string, { count: number; name: string }>
  initialLoadedBuild?: any
  showLoadDialogImmediately?: boolean
  initialBricks?: Brick[]
  onAutoSave?: (bricks: Brick[]) => void
  onClearNFTMode?: () => void
  onSetBrickSize?: { width: number; depth: number; density?: number } | null
  onOpenNFTDrawer?: () => void
  onRotateNFT?: () => void
  onBrickCountsChange?: (counts: Array<{ width: number; depth: number; count: number; minted: boolean }>) => void
} = {}) {
  const [bricks, setBricks] = useState<Brick[]>(initialBricks || [])
  const [history, setHistory] = useState<Brick[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [mode, setMode] = useState<Mode>("build")
  const [theme, setTheme] = useState<Theme>("default")
  const [colorIndex, setColorIndex] = useState(1)
  const [width, setWidth] = useState(1)
  const [depth, setDepth] = useState(3)
  const [density, setDensity] = useState(1)
  
  // Set of minted brick keys loaded from Redis: e.g. "1x1-D1", "2x2-D27"
  const [mintedBrickKeys, setMintedBrickKeys] = useState<Set<string>>(new Set())
  const onChainMintedBrickCacheRef = useRef<Map<string, boolean>>(new Map())

  const refreshMintedBrickKeys = useCallback(async (): Promise<Set<string>> => {
    try {
      const r = await fetch("/api/builds/check-minted")
      const data = await r.json()
      const next = new Set<string>(Array.isArray(data.mintedBricks) ? data.mintedBricks : [])
      setMintedBrickKeys(next)
      if (next.size > 0) {
        console.log("[v0] Loaded minted bricks:", next.size)
      }
      return next
    } catch {
      return new Set<string>()
    }
  }, [])

  const checkBrickMintedOnChain = useCallback(async (brickKey: string, w: number, d: number, dens: number) => {
    try {
      const cached = onChainMintedBrickCacheRef.current.get(brickKey)
      if (typeof cached === "boolean") return cached
      if (typeof window === "undefined") return false
      const eth = (window as unknown as { ethereum?: unknown }).ethereum
      if (!eth) return false
      const provider = new ethers.BrowserProvider(eth)
      const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
      const specKey = computeSpecKey(w, d, dens)
      const minted = Boolean(await contract.brickSpecConsumed(specKey))
      onChainMintedBrickCacheRef.current.set(brickKey, minted)
      return minted
    } catch (err) {
      console.warn("[v0] brickSpecConsumed on-chain check failed:", err)
      return false
    }
  }, [])

  // Load minted brick keys from Redis on mount
  useEffect(() => {
    void refreshMintedBrickKeys()
  }, [refreshMintedBrickKeys])
  const [ghostBrick, setGhostBrick] = useState<Brick | null>(null)
  const [groundHighlight, setGroundHighlight] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [buildName, setBuildName] = useState("")
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null)
  const [saves, setSaves] = useState<SavedBuild[]>([])
  const { toast } = useToast()
  const { account, isConnected, connect } = useMetaMask()
  const { isCorrectChain, switchToBaseSepolia } = useBloxBalance()
  const [buildId] = useState<string>(() => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const snapGridEnabled = true
  const [nftGhostBricks, setNftGhostBricks] = useState<Brick[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isPlacing, setIsPlacing] = useState(false)
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false)
  const [isBottomBarCollapsed, setIsBottomBarCollapsed] = useState(false)

  const ghostPositionRef = useRef<{ x: number; z: number } | null>(null)
  const lastNftGhostPositionRef = useRef<{ x: number; z: number } | null>(null) // Track last NFT position to avoid redundant updates
  const cameraRef = useRef<THREE.Camera | null>(null)
  
  // Reusable THREE objects for handleMouseMove to avoid GC pressure
  const mouseMoveRaycasterRef = useRef(new THREE.Raycaster())
  const mouseMoveGroundPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const mouseMovePointRef = useRef(new THREE.Vector3())
  const mouseMoveMinRef = useRef(new THREE.Vector3())
  const mouseMoveMaxRef = useRef(new THREE.Vector3())
  const mouseMoveBoxRef = useRef(new THREE.Box3())
  const mouseMoveIntersectRef = useRef(new THREE.Vector3())
  
  const [hoverBrick, setHoverBrick] = useState<Brick | null>(null)
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null) // Tracks NFT group or single brick ID for erase hover
  const [hoverGroupIdFromScene, setHoverGroupIdFromScene] = useState<string | null>(null) // Tracks NFT group or single brick ID for erase hover
  
  // Brick NFT integration state
  const [brickMintModalOpen, setBrickMintModalOpen] = useState(false)
  const [pendingBrickNFT, setPendingBrickNFT] = useState<BrickNFT | null>(null)
  const [pendingBrickPlacement, setPendingBrickPlacement] = useState<Brick | null>(null)
  const router = useRouter()

  const colors = COLOR_THEMES[theme]
  const selectedColor = colors[colorIndex]

  // Wrapper functions that clear NFT mode when user interacts with brick controls
  const handleColorSelect = useCallback((index: number) => {
    onClearNFTMode?.()
    setColorIndex(index)
  }, [onClearNFTMode])

  const handleWidthChange = useCallback((newWidth: number | ((w: number) => number)) => {
    onClearNFTMode?.()
    setWidth(newWidth)
  }, [onClearNFTMode])

  const handleDepthChange = useCallback((newDepth: number | ((d: number) => number)) => {
    onClearNFTMode?.()
    setDepth(newDepth)
  }, [onClearNFTMode])

  // Allow parent to set brick size (used for Kind 0 single-brick NFTs)
  useEffect(() => {
    if (onSetBrickSize) {
      setWidth(onSetBrickSize.width)
      setDepth(onSetBrickSize.depth)
      if (
        typeof onSetBrickSize.density === "number" &&
        BRICK_DENSITIES.includes(onSetBrickSize.density as (typeof BRICK_DENSITIES)[number])
      ) {
        setDensity(onSetBrickSize.density)
      }
    }
  }, [onSetBrickSize])

  // baseWidth/baseDepth removed - floor is now dynamic based on bricks
  
  // Calculate brick type usage counts - check minted status from Redis set, not static ALL_BRICKS
  const brickCounts = React.useMemo(() => {
    const counts: Record<string, { width: number; depth: number; count: number; minted: boolean }> = {}
    
    for (const brick of bricks) {
      // Skip NFT group bricks - they're counted separately
      if (brick.nftGroupId) continue
      
      const key = `${brick.width}x${brick.depth}`
      if (!counts[key]) {
        // Use mintedBrickKeys (loaded from Redis) to check minted status
        const brickKey = normalizeBrickKey(brick.width, brick.depth, density)
        counts[key] = { 
          width: brick.width, 
          depth: brick.depth, 
          count: 0,
          minted: mintedBrickKeys.has(brickKey)
        }
      }
      counts[key].count++
    }
    
    return Object.values(counts).sort((a, b) => b.count - a.count)
  }, [bricks, mintedBrickKeys, density])
  
  // Notify parent when brick counts change
  useEffect(() => {
    onBrickCountsChange?.(brickCounts)
  }, [brickCounts, onBrickCountsChange])

  const getNFTBounds = useCallback((geometry: Brick[]) => {
    let minX = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      minZ = Number.POSITIVE_INFINITY,
      maxZ = Number.NEGATIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY

    for (const brick of geometry) {
      const halfWidth = brick.width / 2
      const halfDepth = brick.depth / 2
      const halfHeight = BRICK_HEIGHT / 2

      minX = Math.min(minX, brick.position[0] - halfWidth)
      maxX = Math.max(maxX, brick.position[0] + halfWidth)
      minZ = Math.min(minZ, brick.position[2] - halfDepth)
      maxZ = Math.max(maxZ, brick.position[2] + halfDepth)
      minY = Math.min(minY, brick.position[1] - halfHeight)
    }

    return {
      minX,
      maxX,
      minZ,
      maxZ,
      minY,
      width: maxX - minX,
      depth: maxZ - minZ,
    }
  }, [])

  const calculateNFTMinimumY = useCallback(
    (nftGeo: typeof nftGeometry, clickX: number, clickZ: number) => {
      if (!nftGeo || nftGeo.length === 0) {
        return GROUND_HEIGHT + BRICK_HEIGHT / 2 + LAYER_GAP
      }

      let maxHeightBelow = 0

      // Check every brick position in the NFT to find the highest obstruction
      for (const nftBrick of nftGeo) {
        const brickWorldX = Math.round(clickX + nftBrick.position[0])
        const brickWorldZ = Math.round(clickZ + nftBrick.position[2])

        const evenOffsetX = nftBrick.width % 2 === 0 ? 0.5 : 0
        const evenOffsetZ = nftBrick.depth % 2 === 0 ? 0.5 : 0

        const finalX = brickWorldX + evenOffsetX
        const finalZ = brickWorldZ + evenOffsetZ

        // Check what's below this brick position
        for (const existingBrick of bricks) {
          const [bx, by, bz] = existingBrick.position
          const brickLeft = bx - existingBrick.width / 2
          const brickRight = bx + existingBrick.width / 2
          const brickFront = bz - existingBrick.depth / 2
          const brickBack = bz + existingBrick.depth / 2

          const newLeft = finalX - nftBrick.width / 2
          const newRight = finalX + nftBrick.width / 2
          const newFront = finalZ - nftBrick.depth / 2
          const newBack = finalZ + nftBrick.depth / 2

          const overlapsX = newLeft < brickRight && newRight > brickLeft
          const overlapsZ = newFront < brickBack && newBack > brickFront

          if (overlapsX && overlapsZ) {
            const brickTopY = by + BRICK_HEIGHT / 2
            if (brickTopY > maxHeightBelow) {
              maxHeightBelow = brickTopY
            }
          }
        }
      }

      const finalY =
        maxHeightBelow === 0
          ? GROUND_HEIGHT + BRICK_HEIGHT / 2 + LAYER_GAP
          : maxHeightBelow + BRICK_HEIGHT / 2 + LAYER_GAP

      console.log("[v0] NFT minimum Y calculation:", {
        clickX,
        clickZ,
        maxHeightBelow,
        finalY,
      })

      return finalY
    },
    [bricks],
  )

  const calculateYPosition = useCallback(
    (x: number, z: number, w: number, d: number): number => {
      let maxHeightBelow = 0

      for (const brick of bricks) {
        const [bx, by, bz] = brick.position
        const brickLeft = bx - brick.width / 2
        const brickRight = bx + brick.width / 2
        const brickFront = bz - brick.depth / 2
        const brickBack = bz + brick.depth / 2

        const newLeft = x - w / 2
        const newRight = x + w / 2
        const newFront = z - d / 2
        const newBack = z + d / 2

        const MIN_OVERLAP = 0.01
        const overlapsX = newLeft < brickRight - MIN_OVERLAP && newRight > brickLeft + MIN_OVERLAP
        const overlapsZ = newFront < brickBack - MIN_OVERLAP && newBack > brickFront + MIN_OVERLAP

        // Only consider this brick as "below" if it overlaps in both dimensions
        if (overlapsX && overlapsZ) {
          const brickTopY = brick.position[1] + BRICK_HEIGHT / 2
          if (brickTopY > maxHeightBelow) {
            maxHeightBelow = brickTopY
          }
        }
      }

      const finalY =
        maxHeightBelow === 0
          ? GROUND_HEIGHT + BRICK_HEIGHT / 2 + LAYER_GAP
          : maxHeightBelow + BRICK_HEIGHT / 2 + LAYER_GAP

      console.log("[v0] Y calculation:", {
        x,
        z,
        w,
        d,
        maxHeightBelow,
        finalY,
        layerCount: Math.round((finalY - GROUND_HEIGHT - BRICK_HEIGHT / 2) / (BRICK_HEIGHT + LAYER_GAP)) + 1,
      })

      return finalY
    },
    [bricks],
  )

  const positionNFTBricks = useCallback(
    (nftGeo: typeof nftGeometry, clickX: number, clickZ: number) => {
      if (!nftGeo || nftGeo.length === 0) {
        return []
      }

      const bounds = getNFTBounds(nftGeo)
      const nftY = calculateNFTMinimumY(nftGeo, clickX, clickZ)

      console.log("[v0] Positioning NFT as rigid object:", { clickX, clickZ, nftY, bounds })

      return nftGeo.map((nftBrick) => {
        const brickWorldX = Math.round(clickX + nftBrick.position[0])
        const brickWorldZ = Math.round(clickZ + nftBrick.position[2])

        const evenOffsetX = nftBrick.width % 2 === 0 ? 0.5 : 0
        const evenOffsetZ = nftBrick.depth % 2 === 0 ? 0.5 : 0

        const finalX = brickWorldX + evenOffsetX
        const finalZ = brickWorldZ + evenOffsetZ
        const finalY = nftY + nftBrick.position[1]

        return {
          id: `${Date.now()}-${Math.random()}`,
          position: [finalX, finalY, finalZ] as [number, number, number],
          color: nftBrick.color,
          width: nftBrick.width,
          depth: nftBrick.depth,
        }
      })
    },
    [getNFTBounds, calculateNFTMinimumY],
  )

  const addToHistory = useCallback(
    (newBricks: Brick[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1)
        newHistory.push(newBricks)
        return newHistory
      })
      setHistoryIndex((prev) => prev + 1)
      setBricks(newBricks)
    },
    [historyIndex],
  )

  // Modified checkCollision to accept bricks array as an argument
  const checkCollision = useCallback((newBrick: Brick, existingBricks: Brick[]): boolean => {
    const [x, y, z] = newBrick.position
    const halfW = newBrick.width / 2
    const halfD = newBrick.depth / 2
    const halfH = BRICK_HEIGHT / 2

    const newLeft = x - halfW
    const newRight = x + halfW
    const newFront = z - halfD
    const newBack = z + halfD
    const newBottom = y - halfH
    const newTop = y + halfH

    for (const brick of existingBricks) {
      const [bx, by, bz] = brick.position
      const bHalfW = brick.width / 2
      const bHalfD = brick.depth / 2
      const bHalfH = BRICK_HEIGHT / 2

      const bLeft = bx - bHalfW
      const bRight = bx + bHalfW
      const bFront = bz - bHalfD
      const bBack = bz + bHalfD
      const bBottom = by - bHalfH
      const bTop = by + bHalfH

      // Check for overlap in all three dimensions - no tolerance for edge touching
      const overlapsX = newLeft < bRight && newRight > bLeft
      const overlapsZ = newFront < bBack && newBack > bFront
      const overlapsY = newBottom < bTop && newTop > bBottom

      if (overlapsX && overlapsZ && overlapsY) {
        console.log("[v0] Collision detected with brick:", brick)
        return true
      }
    }

    return false
  }, [])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && history.length > 0) {
      const newIndex = historyIndex - 1
      const newBricks = history[newIndex] || []
      setHistoryIndex(newIndex)
      setBricks(newBricks)
      setNftGhostBricks([])
      onBricksChanged?.(newBricks)
      toast({ title: "Undo" })
    }
  }, [historyIndex, history, toast, onBricksChanged])

  const handleCanvasClick = useCallback(
    async (point: THREE.Vector3) => {
      const x = point.x
      const z = point.z

      if (isPlacing) return

      // Check if NFT is being placed
      if (nftGeometry && nftGeometry.length > 0 && nftInfo) {
        // Added check for nftInfo
        console.log("[v0] Placing NFT with", nftGeometry.length, "bricks")
        setIsPlacing(true)

        const snappedX = Math.round(x)
        const snappedZ = Math.round(z)

        // Position all NFT bricks with individual Y calculations
        const newBricks = positionNFTBricks(nftGeometry, snappedX, snappedZ)
        
        // Generate a unique group ID for this NFT placement
        const nftGroupId = `nft-${nftInfo.tokenId}-${Date.now()}`
        
        // Add nftGroupId to all bricks in this NFT
        const newBricksWithGroup = newBricks.map(brick => ({
          ...brick,
          nftGroupId,
        }))

        // Filter out bricks that collide
        const validBricks = newBricksWithGroup.filter((brick) => !checkCollision(brick, bricks))

        console.log("[v0] NFT bricks:", { total: newBricks.length, valid: validBricks.length })

        if (validBricks.length > 0) {
          addToHistory([...bricks, ...validBricks])

          console.log("[v0] NFT placed, clearing selection")
          toast({ title: `Placed ${nftInfo.name}` })
          onNFTPlaced?.(
            nftInfo.tokenId,
            nftInfo.name,
            nftGeometry.length,
            validBricks.map((b) => b.id),
          )
        } else {
          console.log("[v0] NFT placement blocked by collisions")
          toast({ title: "NFT placement blocked by collision", variant: "destructive" })
        }

        setTimeout(() => setIsPlacing(false), 100)
        return
      }

      // Regular brick placement
      const hasGhostBrick = ghostBrick !== null
      const isGroundValid = groundHighlight?.isValid === true

      console.log("[v0] Click check:", {
        hasNftGeometry: !!nftGeometry,
        mode,
        hasGhostBrick,
        isGroundValid,
      })

      if (mode !== "build" || !ghostBrick || !groundHighlight?.isValid) return

      const placementX = ghostPositionRef.current?.x ?? ghostBrick.position[0]
      const placementZ = ghostPositionRef.current?.z ?? ghostBrick.position[2]

      console.log("[v0] Placing regular brick at:", {
        x: placementX,
        z: placementZ,
        width: ghostBrick.width,
        depth: ghostBrick.depth,
      })

      // Use actual placement position for Y calculation (includes even-offset)
      const yPos = calculateYPosition(placementX, placementZ, ghostBrick.width, ghostBrick.depth)

      const newBrick: Brick = {
        id: Date.now().toString(),
        position: [placementX, yPos, placementZ],
        color: ghostBrick.color,
        width: ghostBrick.width,
        depth: ghostBrick.depth,
      }

      if (!checkCollision(newBrick, bricks)) {
        // Check if this brick size+density is minted (via Redis-cached set, normalized so 1x2 == 2x1)
        const brickKey = normalizeBrickKey(ghostBrick.width, ghostBrick.depth, density)
        
        if (mintedBrickKeys.has(brickKey)) {
          // Minted - allow placement
          addToHistory([...bricks, newBrick])
        } else {
          const latestMinted = await refreshMintedBrickKeys()
          if (latestMinted.has(brickKey)) {
            addToHistory([...bricks, newBrick])
            return
          }
          const onChainMinted = await checkBrickMintedOnChain(
            brickKey,
            ghostBrick.width,
            ghostBrick.depth,
            density,
          )
          if (onChainMinted) {
            setMintedBrickKeys((prev) => {
              const next = new Set(prev)
              next.add(brickKey)
              return next
            })
            addToHistory([...bricks, newBrick])
            return
          }
          // Not minted - show mint modal
          const brickNFT = getBrickByDimensions(ghostBrick.width, ghostBrick.depth, density)
          if (brickNFT) {
            setPendingBrickNFT(brickNFT)
            setPendingBrickPlacement(newBrick)
            setBrickMintModalOpen(true)
            toast({
              title: "Unminted Brick",
              description: `${brickKey} needs to be minted first`,
            })
          } else {
            // Brick not in catalogue - allow placement
            addToHistory([...bricks, newBrick])
          }
        }
      }
    },
    [
      mode,
      bricks,
      ghostBrick,
      groundHighlight,
      nftGeometry,
      nftInfo,
      isPlacing,
      density,
      mintedBrickKeys,
      addToHistory,
      checkCollision,
      calculateYPosition,
      positionNFTBricks,
      onNFTPlaced,
      toast,
      refreshMintedBrickKeys,
      checkBrickMintedOnChain,
    ],
  )

const handleBrickClick = useCallback(
  (_id: string) => {
  if (mode === "erase" && hoverGroupId) {
  // Use hoverGroupId from raycasting (correctly identifies closest brick)
  // instead of click event target (which can be wrong for stacked bricks)
  
  // Check if hoverGroupId is an NFT group or single brick
  const targetBrick = bricks.find((b) => b.nftGroupId === hoverGroupId || b.id === hoverGroupId)
  
  if (targetBrick?.nftGroupId) {
  // Delete all bricks in the same NFT group
  const groupId = targetBrick.nftGroupId
  const bricksToDelete = bricks.filter((b) => b.nftGroupId === groupId)
  const newBricks = bricks.filter((b) => b.nftGroupId !== groupId)
  addToHistory(newBricks)
  onBricksDeleted?.(bricksToDelete.map((b) => b.id))
  setHoverGroupId(null)
  toast({ title: `NFT removed (${bricksToDelete.length} bricks)` })
  } else if (targetBrick) {
  // Delete single brick
  const newBricks = bricks.filter((b) => b.id !== targetBrick.id)
  addToHistory(newBricks)
  onBricksDeleted?.([targetBrick.id])
  setHoverGroupId(null)
  toast({ title: "Brick removed" })
  }
  }
  },
  [mode, bricks, hoverGroupId, addToHistory, onBricksDeleted, toast],
  )

  const handleMouseMove = useCallback(
    (event: PointerEvent) => {
      if (isDragging) return

      const clientX = (event.clientX / window.innerWidth) * 2 - 1
      const clientY = -(event.clientY / window.innerHeight) * 2 + 1

      if (!cameraRef.current) return

      // Handle NFT ghost bricks
      if (nftGeometry && nftGeometry.length > 0 && nftInfo && mode === "build") {
        // Reuse raycaster and plane refs
        mouseMoveRaycasterRef.current.setFromCamera({ x: clientX, y: clientY }, cameraRef.current)

        if (mouseMoveRaycasterRef.current.ray.intersectPlane(mouseMoveGroundPlaneRef.current, mouseMovePointRef.current)) {
          const snappedX = Math.round(mouseMovePointRef.current.x)
          const snappedZ = Math.round(mouseMovePointRef.current.z)

ghostPositionRef.current = { x: snappedX, z: snappedZ }
  
  // Only update NFT ghost bricks if position changed (major performance optimization)
  const posChanged = !lastNftGhostPositionRef.current || 
    lastNftGhostPositionRef.current.x !== snappedX || 
    lastNftGhostPositionRef.current.z !== snappedZ
  
  if (posChanged) {
    lastNftGhostPositionRef.current = { x: snappedX, z: snappedZ }
    // Create ghost bricks for the entire NFT
    const nftGhostBrickList = positionNFTBricks(nftGeometry, snappedX, snappedZ)
    setNftGhostBricks(nftGhostBrickList)
  }
  setGhostBrick(null)
  setGroundHighlight({ position: [snappedX, 0, snappedZ], isValid: true })
        } else {
          setNftGhostBricks(null)
          setGhostBrick(null)
          setGroundHighlight(null)
          ghostPositionRef.current = null
        }
        return
      }

      setNftGhostBricks(null)

      // Handle erase mode - raycast to find brick under cursor
      if (mode === "erase") {
        setGhostBrick(null)
        setGroundHighlight(null)
        ghostPositionRef.current = null
        
        // Reuse raycaster ref
        mouseMoveRaycasterRef.current.setFromCamera({ x: clientX, y: clientY }, cameraRef.current)
        
        // Find which brick is under the cursor by checking intersection with brick bounding boxes
        let closestBrick: Brick | null = null
        let closestDistance = Infinity
        
        for (const brick of bricks) {
          // Reuse vector refs for bounding box
          const halfWidth = brick.width / 2
          const halfDepth = brick.depth / 2
          const halfHeight = BRICK_HEIGHT / 2
          
          mouseMoveMinRef.current.set(
            brick.position[0] - halfWidth,
            brick.position[1] - halfHeight,
            brick.position[2] - halfDepth
          )
          mouseMoveMaxRef.current.set(
            brick.position[0] + halfWidth,
            brick.position[1] + halfHeight,
            brick.position[2] + halfDepth
          )
          
          mouseMoveBoxRef.current.set(mouseMoveMinRef.current, mouseMoveMaxRef.current)
          
          if (mouseMoveRaycasterRef.current.ray.intersectBox(mouseMoveBoxRef.current, mouseMoveIntersectRef.current)) {
            const distance = mouseMoveRaycasterRef.current.ray.origin.distanceTo(mouseMoveIntersectRef.current)
            if (distance < closestDistance) {
              closestDistance = distance
              closestBrick = brick
            }
          }
        }
        
        // If brick is part of an NFT group, highlight the whole group, otherwise just the brick
        if (closestBrick) {
          setHoverGroupId(closestBrick.nftGroupId || closestBrick.id)
        } else {
          setHoverGroupId(null)
        }
        return
      }

      if (mode !== "build") {
        setGhostBrick(null)
        setGroundHighlight(null)
        ghostPositionRef.current = null
        setHoverGroupId(null)
        return
      }
      
      setHoverGroupId(null)

      // Reuse raycaster and plane refs
      mouseMoveRaycasterRef.current.setFromCamera({ x: clientX, y: clientY }, cameraRef.current)

      if (mouseMoveRaycasterRef.current.ray.intersectPlane(mouseMoveGroundPlaneRef.current, mouseMovePointRef.current)) {
        const snappedX = Math.round(mouseMovePointRef.current.x)
        const snappedZ = Math.round(mouseMovePointRef.current.z)

        const evenOffsetX = width % 2 === 0 ? 0.5 : 0
        const evenOffsetZ = depth % 2 === 0 ? 0.5 : 0
        const finalX = snappedX + evenOffsetX
        const finalZ = snappedZ + evenOffsetZ

        ghostPositionRef.current = { x: finalX, z: finalZ }

        // Use finalX/finalZ for Y calculation to match actual brick position
        const yPos = calculateYPosition(finalX, finalZ, width, depth)

        setGhostBrick({
          id: "ghost",
          color: selectedColor,
          position: [finalX, yPos, finalZ],
          width,
          depth,
        })
        setGroundHighlight({ position: [snappedX, 0, snappedZ], isValid: true })
      } else {
        setGhostBrick(null)
        setGroundHighlight(null)
        ghostPositionRef.current = null
      }
    },
    [isDragging, nftGeometry, nftInfo, mode, width, depth, selectedColor, calculateYPosition, positionNFTBricks, bricks],
  )

  const handleSave = async () => {
    if (!buildName.trim()) {
      toast({ title: "Error", description: "Please enter a build name", variant: "destructive" })
      return
    }

    if (!account) {
      toast({ title: "Error", description: "Please connect your wallet first", variant: "destructive" })
      return
    }

    try {
      // Check if a build with the same name already exists (for this user)
      const existingBuilds = loadBuild(account)
      const existingBuild = existingBuilds.find(b => b.name.toLowerCase() === buildName.trim().toLowerCase())

      // Use existing build ID if updating, or current build ID, or generate new one
      const saveId = existingBuild?.id || currentBuildId || undefined

      // Pass 0 for baseWidth/baseDepth since floor is now dynamic
      saveBuild(buildName, bricks, account, 0, 0, saveId)

      // Update current build ID to the saved build's ID
      const updatedBuilds = loadBuild(account)
      const savedBuild = updatedBuilds.find(b => b.name.toLowerCase() === buildName.trim().toLowerCase())
      if (savedBuild) {
        setCurrentBuildId(savedBuild.id)
      }

      setSaves(updatedBuilds)
      setShowSaveDialog(false)
      toast({ title: existingBuild ? "Updated" : "Saved", description: buildName })
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save build",
        variant: "destructive",
      })
    }
  }

  const handleLoad = (save: SavedBuild) => {
    // baseWidth/baseDepth no longer needed - floor is dynamic
    
    // Set the build name and ID so subsequent saves update this build
    setBuildName(save.name)
    setCurrentBuildId(save.id)

    addToHistory(save.bricks)
    setShowLoadDialog(false)
    toast({ title: "Loaded", description: save.name })
  }

  const handleClear = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ethblox_autosave")
    }
    addToHistory([])
    setShowClearDialog(false)
    onBricksCleared?.()
    // Session cleared
    toast({ title: "Build cleared, returning to base selection" })
  }

  const handleDelete = (id: string) => {
    if (!isConnected || !account) return

    deleteBuild(id, account)
    setSaves(loadBuild(account))
    toast({ title: "Deleted", description: "Build removed" })
  }

  const cycleTheme = () => {
    setTheme((t) => (t === "default" ? "muted" : t === "muted" ? "monochrome" : "default"))
  }

  const handleMint = () => {
    console.log("[v0] Mint button clicked")

    if (!isConnected || !account) {
      console.log("[v0] User not connected, prompting to connect")
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint your creation.",
        variant: "destructive",
      })
      return
    }

    if (bricks.length === 0) {
      console.log("[v0] No bricks to mint")
      toast({
        title: "Nothing to mint",
        description: "Add some bricks to your creation before minting.",
        variant: "destructive",
      })
      return
    }

    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minZ = Number.POSITIVE_INFINITY
    let maxZ = Number.NEGATIVE_INFINITY
    for (const b of bricks) {
      const halfW = b.width / 2
      const halfD = b.depth / 2
      minX = Math.min(minX, b.position[0] - halfW)
      maxX = Math.max(maxX, b.position[0] + halfW)
      minZ = Math.min(minZ, b.position[2] - halfD)
      maxZ = Math.max(maxZ, b.position[2] + halfD)
    }
    const baseWidth = Math.max(1, Math.round(maxX - minX))
    const baseDepth = Math.max(1, Math.round(maxZ - minZ))

    const mintDebugData = {
      buildId,
      buildName,
      buildHash: null as string | null,
      bricks,
      baseWidth,
      baseDepth,
      totalBloxMass: calculateTotalBlox(bricks),
      uniqueColors: new Set(bricks.map((b) => b.color)).size,
      composition: nftComposition,
      metadata: {
        buildWidth: baseWidth,
        buildDepth: baseDepth,
        totalBricks: bricks.length,
        totalInstances: bricks.length,
        nftsUsed: Object.keys(nftComposition).length,
      },
      account,
      timestamp: Date.now(),
    }
    sessionStorage.setItem("ethblox_mint_debug", JSON.stringify(mintDebugData))
    router.push(`/mint-debug?density=${density}`)
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key to place brick
      if (e.key === "Enter" && mode === "build") {
        console.log("[v0] Enter pressed - attempting to place brick")

        // If NFT geometry exists, place the NFT
        if (nftGeometry && nftGeometry.length > 0 && nftInfo && ghostPositionRef.current) {
          // Added check for nftInfo
          console.log("[v0] Enter: NFT geometry available, placing at:", ghostPositionRef.current)

          const { x, z } = ghostPositionRef.current
          const baseX = Math.round(x)
          const baseZ = Math.round(z)

          // Use positionNFTBricks to get properly positioned NFT bricks
          const nftBricks = positionNFTBricks(nftGeometry, baseX, baseZ)
          
          // Generate a unique group ID for this NFT placement
          const nftGroupId = `nft-${nftInfo.tokenId}-${Date.now()}`
          
          // Add nftGroupId to all bricks in this NFT
          const nftBricksWithGroup = nftBricks.map(brick => ({
            ...brick,
            nftGroupId,
          }))

          // Filter out bricks that collide
          const validBricks = nftBricksWithGroup.filter((brick) => !checkCollision(brick, bricks))

          console.log("[v0] NFT bricks:", { total: nftBricks.length, valid: validBricks.length })

          if (validBricks.length > 0) {
            addToHistory([...bricks, ...validBricks])
            console.log("[v0] NFT placed via Enter, clearing selection")
            toast({ title: `Placed ${nftInfo.name}` }) // Use nftInfo.name for toast
            onNFTPlaced?.(
              nftInfo.tokenId,
              nftInfo.name,
              nftGeometry.length,
              validBricks.map((b) => b.id),
            ) // Pass relevant data to onNFTPlaced
            // NFT placed
          } else {
            console.log("[v0] NFT placement blocked by collisions")
            toast({ title: "NFT placement blocked by collision", variant: "destructive" })
          }

          return
        }

        // Otherwise place regular brick at ghost position
        if (ghostBrick && groundHighlight?.isValid && ghostPositionRef.current) {
          console.log("[v0] Enter: Placing regular brick at:", ghostPositionRef.current)

          const placementX = ghostPositionRef.current.x
          const placementZ = ghostPositionRef.current.z
          // Use actual placement position for Y calculation (includes even-offset)
          const yPos = calculateYPosition(placementX, placementZ, ghostBrick.width, ghostBrick.depth)

          const newBrick: Brick = {
            id: Date.now().toString(),
            position: [placementX, yPos, placementZ],
            color: ghostBrick.color,
            width: ghostBrick.width,
            depth: ghostBrick.depth,
          }

          if (!checkCollision(newBrick, bricks)) {
            addToHistory([...bricks, newBrick])
            console.log("[v0] Regular brick placed via Enter")
          } else {
            console.log("[v0] Regular brick placement blocked by collision")
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    mode,
    nftGeometry,
    nftInfo, // Include nftInfo in dependencies
    ghostBrick,
    groundHighlight,
    bricks,
    positionNFTBricks,
    checkCollision,
    calculateYPosition,
    addToHistory,
    onNFTPlaced,
    
    toast, // Add toast to dependencies
  ])

  const loadFromGallery = async (buildId: string) => {
    try {
      const response = await fetch(`/api/builds/${buildId}`)
      if (!response.ok) throw new Error("Failed to load build")
      const build = await response.json()
      addToHistory(build.bricks)
      toast({ title: "Build loaded", description: `"${build.name}"` })
    } catch (error) {
      toast({ title: "Failed to load build", variant: "destructive" })
    }
  }

  // Track if we've loaded the initial build to prevent re-loading
  const hasLoadedInitialBuild = useRef(false)
  
  useEffect(() => {
    const initialLoadId = localStorage.getItem("ethblox_load_build")
    if (initialLoadId) {
      localStorage.removeItem("ethblox_load_build")
      loadFromGallery(initialLoadId)
    } else if (initialLoadedBuild && initialLoadedBuild.bricks && !hasLoadedInitialBuild.current) {
      hasLoadedInitialBuild.current = true
      // Set bricks directly instead of using addToHistory to avoid dependency loop
      setBricks(initialLoadedBuild.bricks)
      setHistory([initialLoadedBuild.bricks])
      setHistoryIndex(0)
      // Set the build name and ID so subsequent saves update this build
      if (initialLoadedBuild.name) {
        setBuildName(initialLoadedBuild.name)
      }
      if (initialLoadedBuild.id) {
        setCurrentBuildId(initialLoadedBuild.id)
      }
      toast({ title: "Build loaded", description: initialLoadedBuild.name || "Untitled" })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoadedBuild])

  useEffect(() => {
    const isClient = typeof window !== "undefined"
    if (isClient) {
      if (isConnected && account) {
        setSaves(loadBuild(account))
      } else {
        setSaves([])
      }
    }
  }, [isConnected, account])

  useEffect(() => {
    const isClient = typeof window !== "undefined"
    if (isClient) {
      localStorage.setItem(
        "ethblox_autosave",
        JSON.stringify({ bricks, width, depth, colorIndex, theme }),
      )
    }
  }, [bricks, width, depth, colorIndex, theme])

  // Auto-save callback for session persistence
  useEffect(() => {
    if (onAutoSave && bricks.length > 0) {
      onAutoSave(bricks)
    }
  }, [bricks, onAutoSave])

  // Update ghost brick color when color selection changes
  useEffect(() => {
    if (ghostBrick && ghostBrick.color !== selectedColor) {
      setGhostBrick(prev => prev ? { ...prev, color: selectedColor } : null)
    }
  }, [selectedColor, ghostBrick])

// Clear NFT ghost bricks when nftGeometry is cleared
  useEffect(() => {
  if (!nftGeometry) {
  setNftGhostBricks([])
  lastNftGhostPositionRef.current = null
  }
  }, [nftGeometry])

  useEffect(() => {
    if (showLoadDialogImmediately) {
      setShowLoadDialog(true)
    }
  }, [showLoadDialogImmediately])

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={{ position: [25, 25, 25], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => {}}
      >
        <Scene
          bricks={bricks}
          mode={mode}
          isPlaying={isPlaying}
          ghostBrick={ghostBrick}
          groundHighlight={groundHighlight}
          hoverGroupId={hoverGroupId}
          onCanvasClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          isShiftPressed={isShiftPressed} // Pass isShiftPressed to Scene
          onBrickClick={handleBrickClick} // Added onBrickClick prop
          nftGhostBricks={nftGhostBricks}
          cameraRef={cameraRef}
          isMobile={isMobile} // Pass isMobile to Scene
          ghostPositionRef={ghostPositionRef} // Pass ghostPositionRef to Scene
          hoverGroupIdFromScene={hoverGroupIdFromScene}
        />
      </Canvas>

      {/* Top bar - full width panel, below main header */}
      <div className="absolute top-14 left-0 right-0 z-30 bg-[hsl(210,11%,15%)] backdrop-blur-lg border-b border-[hsl(210,8%,28%)] px-2 md:px-4 py-2 shadow-2xl">
        <div className="flex items-center gap-3">
          {!isPlaying ? (
            <>
              {/* Undo/Redo */}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleUndo}
                disabled={historyIndex === 0}
                className="w-8 h-8 text-zinc-400 hover:text-white disabled:opacity-30"
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (historyIndex < history.length - 1) {
                    const newBricks = history[historyIndex + 1] || []
                    setHistoryIndex(historyIndex + 1)
                    setBricks(newBricks)
                    onBricksChanged?.(newBricks)
                  }
                }}
                disabled={historyIndex === history.length - 1}
                className="w-8 h-8 text-zinc-400 hover:text-white disabled:opacity-30"
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-zinc-600" />
              {/* Save/Load */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSaveDialog(true)}
                className="w-8 h-8 text-zinc-400 hover:text-white"
                title="Save Build"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowLoadDialog(true)}
                className="w-8 h-8 text-zinc-400 hover:text-white"
                title="Load Build"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-zinc-600" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">D</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white font-mono text-xs h-8 px-2">
                    {density} <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {BRICK_DENSITIES.map((d) => (
                    <DropdownMenuItem key={d} onClick={() => { onClearNFTMode?.(); setDensity(d) }}>
                      {d} <span className="ml-2 text-xs text-muted-foreground">{d === 1 ? "Hollow" : d === 8 ? "Light" : d === 27 ? "Standard" : d === 64 ? "Dense" : "Ultra"}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Parts counter rendered by V0BlocksV2 */}
            </>
          ) : (
            /* Play mode: show exit button */
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPlaying(false)}
              className="text-zinc-400 hover:text-white text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Exit Preview
            </Button>
          )}
        </div>
      </div>

      {/* Left toolbar - compact with modes, NFT, rotate, mint */}
      {!isPlaying && (
        <>
          <button
            onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
            className={`absolute top-1/2 -translate-y-1/2 z-30 bg-[hsl(210,11%,18%)] backdrop-blur-lg border border-[hsl(210,8%,28%)] shadow-2xl text-zinc-400 hover:text-white transition-all duration-300 ${
              isToolbarCollapsed ? "left-0 rounded-r-lg p-2" : "left-[52px] md:left-[56px] rounded-r-lg p-1"
            }`}
          >
            {isToolbarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>

          <div className={`absolute top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 transition-all duration-300 ${
            isToolbarCollapsed ? "-left-16" : "left-2"
          }`}>
            {/* Mode tools */}
            <div className="bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-xl border border-[hsl(210,8%,28%)] p-1 shadow-2xl flex flex-col gap-0.5">
              <Button
                size="icon"
                onClick={() => setMode("build")}
                className={`w-9 h-9 rounded-lg ${
                  mode === "build" ? "bg-[#cdfc2d] text-black" : "bg-black/30 text-zinc-400"
                }`}
                title="Build"
              >
                <Hammer className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => setMode("move")}
                className={`w-9 h-9 rounded-lg ${
                  mode === "move" ? "bg-[#cdfc2d] text-black" : "bg-black/30 text-zinc-400"
                }`}
                title="Move Camera"
              >
                <Move className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => setMode("erase")}
                className={`w-9 h-9 rounded-lg ${
                  mode === "erase" ? "bg-[#cdfc2d] text-black" : "bg-black/30 text-zinc-400"
                }`}
                title="Erase"
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>

            {/* NFT + Rotate */}
            <div className="bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-xl border border-[hsl(210,8%,28%)] p-1 shadow-2xl flex flex-col gap-0.5">
              {nftGeometry ? (
                <>
                  <Button
                    size="icon"
                    onClick={() => onClearNFTMode?.()}
                    className="w-9 h-9 bg-[#cdfc2d] text-black rounded-lg"
                    title="NFT Mode Active - Click to Exit"
                  >
                    <Box className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onRotateNFT}
                    className="w-9 h-9 text-zinc-400 hover:text-white"
                    title="Rotate NFT 90°"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onOpenNFTDrawer}
                  className="w-9 h-9 text-zinc-400 hover:text-white"
                  title="Place NFT Builds"
                >
                  <Box className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Mint button */}
            {bricks.length > 0 && (
              <div className="bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-xl border border-[#CDFD3E] p-1 shadow-2xl">
                <Button
                  size="icon"
                  onClick={handleMint}
                  className="w-9 h-9 bg-[#CDFD3E] text-black hover:bg-[#b8e835] rounded-lg"
                  title={`Mint Build`}
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* BLOX counter */}
            {bricks.length > 0 && (
              <div className="bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-xl border border-[hsl(210,8%,28%)] px-3 py-1.5 shadow-2xl flex items-center justify-center min-w-[40px]">
                <span className="text-[#CDFD3E] font-mono text-xs font-semibold text-center">{calculateTotalBlox(bricks)}</span>
              </div>
            )}
          </div>
        </>
      )}

      

      {/* Desktop bottom toolbar - collapsible */}
      {!isPlaying && !isMobile && (
        <>
          {/* Collapse toggle */}
          <button
            onClick={() => setIsBottomBarCollapsed(!isBottomBarCollapsed)}
            className={`absolute left-1/2 -translate-x-1/2 z-30 hidden md:flex bg-[hsl(210,11%,18%)] backdrop-blur-lg border border-[hsl(210,8%,28%)] shadow-2xl text-zinc-400 hover:text-white transition-all duration-300 rounded-t-lg px-3 py-1 ${
              isBottomBarCollapsed ? "bottom-0" : "bottom-[60px]"
            }`}
          >
            {isBottomBarCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <div className={`absolute left-1/2 -translate-x-1/2 z-30 hidden md:block transition-all duration-300 ${
            isBottomBarCollapsed ? "-bottom-20" : "bottom-4"
          }`}>
            <div className="flex items-center gap-1.5 bg-[hsl(210,11%,18%)] backdrop-blur-lg rounded-full border border-[hsl(210,8%,28%)] px-3 py-1.5 shadow-2xl">
              {colors.map((color, i) => (
                <button
                  key={i}
                  onClick={() => handleColorSelect(i)}
                  className={`w-5 h-5 rounded-full transition ${
                    colorIndex === i ? "ring-2 ring-white ring-offset-1 ring-offset-[hsl(210,11%,18%)] scale-125" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="w-px h-5 bg-zinc-700 mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white font-mono text-xs h-7 px-1.5">
                    {width} <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {[1, 2, 3, 4, 6, 8].map((w) => (
                    <DropdownMenuItem key={w} onClick={() => handleWidthChange(w)}>
                      {w}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  onClearNFTMode?.()
                  const temp = width
                  setWidth(depth)
                  setDepth(temp)
                }}
                className="w-6 h-6 text-zinc-400 hover:text-white"
              >
                <ArrowLeftRight className="h-3 w-3" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white font-mono text-xs h-7 px-1.5">
                    {depth} <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {[1, 2, 3, 4, 6, 8].map((d) => (
                    <DropdownMenuItem key={d} onClick={() => handleDepthChange(d)}>
                      {d}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-5 bg-zinc-700 mx-1" />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsPlaying(true)}
                className="w-6 h-6 text-zinc-400 hover:text-white"
              >
                <Play className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => bricks.length > 0 && setShowClearDialog(true)}
                disabled={bricks.length === 0}
                className="w-6 h-6 text-zinc-400 hover:text-white disabled:opacity-30"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Mobile bottom toolbar - collapsible */}
      {!isPlaying && isMobile && (
        <>
          {/* Collapse toggle for mobile */}
          <button
            onClick={() => setIsBottomBarCollapsed(!isBottomBarCollapsed)}
            className={`absolute left-1/2 -translate-x-1/2 z-30 md:hidden bg-[hsl(210,11%,18%)] backdrop-blur-lg border border-[hsl(210,8%,28%)] border-b-0 shadow-2xl text-zinc-400 hover:text-white transition-all duration-300 rounded-t-lg px-4 py-1 ${
              isBottomBarCollapsed ? "bottom-[env(safe-area-inset-bottom)]" : "bottom-[calc(88px+env(safe-area-inset-bottom))]"
            }`}
          >
            {isBottomBarCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <div className={`absolute left-0 right-0 z-30 md:hidden transition-all duration-300 ${
            isBottomBarCollapsed ? "-bottom-24" : "bottom-0"
          }`}>
            <div className="bg-[hsl(210,11%,18%)] border-t border-[hsl(210,8%,28%)] px-2 py-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {/* Color palette - smaller circles */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {colors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => handleColorSelect(i)}
                    className={`w-6 h-6 rounded-full flex-shrink-0 transition ${
                      colorIndex === i ? "ring-2 ring-white ring-offset-1 ring-offset-[hsl(210,11%,18%)] scale-125" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Size controls - compact row */}
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center bg-black/30 rounded-lg">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleWidthChange((w) => Math.max(1, w - 1))}
                    className="h-7 w-7 text-zinc-400 p-0 text-sm"
                  >
                    -
                  </Button>
                  <span className="text-white font-mono w-4 text-center text-xs">{width}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleWidthChange((w) => Math.min(FLOOR_SIZE, w + 1))}
                    className="h-7 w-7 text-zinc-400 p-0 text-sm"
                  >
                    +
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    onClearNFTMode?.()
                    const temp = width
                    setWidth(depth)
                    setDepth(temp)
                  }}
                  className="w-7 h-7 text-zinc-400 hover:text-white"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                </Button>
                <div className="flex items-center bg-black/30 rounded-lg">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDepthChange((d) => Math.max(1, d - 1))}
                    className="h-7 w-7 text-zinc-400 p-0 text-sm"
                  >
                    -
                  </Button>
                  <span className="text-white font-mono w-4 text-center text-xs">{depth}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDepthChange((d) => Math.min(FLOOR_SIZE, d + 1))}
                    className="h-7 w-7 text-zinc-400 p-0 text-sm"
                  >
                    +
                  </Button>
                </div>
                <div className="w-px h-5 bg-zinc-700" />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsPlaying(true)}
                  className="w-7 h-7 text-zinc-400 hover:text-white"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => bricks.length > 0 && setShowClearDialog(true)}
                  disabled={bricks.length === 0}
                  className="w-7 h-7 text-zinc-400 hover:text-white disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Move mode tip for mobile */}
      {isMobile && mode === "move" && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/70 text-white text-xs px-3 py-2 rounded-full font-mono">
            1 finger rotate / 2 fingers zoom & pan
          </div>
        </div>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Build</DialogTitle>
            <DialogDescription>
              {isConnected 
                ? (currentBuildId ? "Update your build or change the name to save as new" : "Give your creation a name")
                : "Connect your wallet to save builds"}
            </DialogDescription>
          </DialogHeader>
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You need to connect your wallet to save builds. Your wallet address will be used to identify your
                creations.
              </p>
              <Button onClick={connect} className="w-full">
                Connect Wallet
              </Button>
            </div>
          ) : (
            <>
              <Input
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                placeholder="Build name..."
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!buildName.trim()}>
                  {currentBuildId ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Build</DialogTitle>
            <DialogDescription>
              {isConnected ? "Select a saved build" : "Connect your wallet to load your builds"}
            </DialogDescription>
          </DialogHeader>
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Connect your wallet to see your saved builds.</p>
              <Button onClick={connect} className="w-full">
                Connect Wallet
              </Button>
            </div>
          ) : saves.length === 0 ? (
            <p className="text-muted-foreground">No saved builds</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {saves.map((save) => (
                <div key={save.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-accent">
                  <button onClick={() => handleLoad(save)} className="flex-1 text-left">
                    <div className="font-medium">{save.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(save.timestamp).toLocaleDateString()}</div>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(save.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear This Build?</DialogTitle>
            <DialogDescription>
              This will remove all {bricks.length} BLOX and reset the base. You'll need to select a new base size to
              start building again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              Clear Build & Base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

  <BrickMintModal
    open={brickMintModalOpen}
    onOpenChange={(open) => {
      setBrickMintModalOpen(open)
      if (!open) {
        setPendingBrickNFT(null)
        setPendingBrickPlacement(null)
      }
    }}
    brick={pendingBrickNFT}
    onMintSuccess={(mintedBrick) => {
      // Add to local minted set so future placements are instant (normalized)
      if (mintedBrick) {
        const key = normalizeBrickKey(mintedBrick.width, mintedBrick.depth, mintedBrick.density)
        onChainMintedBrickCacheRef.current.set(key, true)
        setMintedBrickKeys(prev => new Set([...prev, key]))
      }
      if (pendingBrickPlacement) {
        addToHistory([...bricks, pendingBrickPlacement])
      }
      setBrickMintModalOpen(false)
      setPendingBrickNFT(null)
      setPendingBrickPlacement(null)
    }}
  />
  
  <Toaster />
    </div>
  )
}
