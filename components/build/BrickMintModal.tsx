"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { type BrickNFT, formatBrickName, BRICK_DENSITIES, calculateMass } from "@/data/bricks"
import { Box, Layers, Weight, Sparkles } from "lucide-react"
import { ethers } from "ethers"
import { FEE_PER_MINT } from "@/lib/contracts/ethblox-contracts"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface BrickMintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brick: BrickNFT | null
  onMintSuccess?: (brick: BrickNFT) => void
}

const BRICK_HEIGHT = 1.0

// 3D glass brick preview component
function GlassBrick3D({ width, depth, density }: { width: number; depth: number; density: number }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  // Build dome studs
  const studs: [number, number, number][] = []
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < depth; j++) {
      studs.push([i - width / 2 + 0.5, BRICK_HEIGHT / 2 + 0.025, j - depth / 2 + 0.5])
    }
  }

  // Opacity based on density - denser = more solid
  const opacity = 0.25 + (density / 125) * 0.55
  const ior = 1.5 + (density / 125) * 0.5
  const glassColor = density <= 1 ? "#88ccff" : density <= 8 ? "#66ddbb" : density <= 27 ? "#eecc44" : density <= 64 ? "#ee8844" : "#ee4466"

  return (
    <group ref={groupRef}>
      {/* Main brick body - glass material */}
      <mesh castShadow>
        <boxGeometry args={[width, BRICK_HEIGHT, depth]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={opacity}
          roughness={0.05}
          metalness={0.0}
          transmission={1 - opacity}
          thickness={0.5}
          ior={ior}
          envMapIntensity={1.5}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Glass edge highlight */}
      <mesh>
        <boxGeometry args={[width + 0.01, BRICK_HEIGHT + 0.01, depth + 0.01]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.08}
          roughness={0}
          metalness={0.1}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Dome studs */}
      {studs.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <sphereGeometry args={[0.25, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color={glassColor}
            transparent
            opacity={opacity + 0.1}
            roughness={0.05}
            metalness={0.0}
            transmission={1 - opacity - 0.1}
            thickness={0.3}
            ior={ior}
            envMapIntensity={1.5}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
          />
        </mesh>
      ))}
    </group>
  )
}

// Density labels for display
const DENSITY_LABELS: Record<number, string> = {
  1: "Hollow",
  8: "Light",
  27: "Standard",
  64: "Dense",
  125: "Ultra",
}

export function BrickMintModal({ open, onOpenChange, brick, onMintSuccess }: BrickMintModalProps) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [selectedDensity, setSelectedDensity] = useState<number>(brick?.density ?? 1)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!brick) return null

  // Normalize dimensions so 2x1 and 1x2 are treated identically
  const minDim = Math.min(brick.width, brick.depth)
  const maxDim = Math.max(brick.width, brick.depth)
  const mass = calculateMass(minDim, maxDim, selectedDensity)
  const mintFeeETH = ethers.formatEther(FEE_PER_MINT)
  const brickName = formatBrickName({ ...brick, width: minDim, depth: maxDim, density: selectedDensity as BrickNFT["density"] })

  // Redirect to mint-debug page with pre-populated brick data (normalized dims)
  const handleMintRedirect = () => {
    const params = new URLSearchParams({
      kind: "0",
      width: minDim.toString(),
      depth: maxDim.toString(),
      density: selectedDensity.toString(),
      name: brickName,
    })
    router.push(`/mint-debug?${params.toString()}`)
  }

  const handleClose = () => {
    onOpenChange(false)
  }
  
  // Allow placing without minting
  const handlePlaceAnyway = () => {
    if (brick) {
      onMintSuccess?.(brick)
    }
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--ethblox-text-primary))] flex items-center gap-2">
            <Box className="h-5 w-5 text-[hsl(var(--ethblox-yellow))]" />
            Mint This Brick
          </DialogTitle>
          <DialogDescription className="text-[hsl(var(--ethblox-text-secondary))]">
            Be the first to mint and own this brick. Once minted, you can use it in any build.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 3D Glass Brick Preview */}
          <div className="relative rounded-lg border border-[hsl(var(--ethblox-border))] overflow-hidden bg-[hsl(var(--ethblox-bg))]">
            <div className="h-40">
              {isMounted ? (
                <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }} gl={{ alpha: true }}>
                  <ambientLight intensity={0.4} />
                  <directionalLight position={[5, 8, 5]} intensity={1.2} />
                  <directionalLight position={[-3, 4, -3]} intensity={0.3} />
                  <pointLight position={[0, 3, 0]} intensity={0.5} color="#88ccff" />
                  <GlassBrick3D width={brick.width} depth={brick.depth} density={selectedDensity} />
                </Canvas>
              ) : null}
            </div>
            <p className="text-center text-lg font-bold text-[hsl(var(--ethblox-text-primary))] pb-3">
              {formatBrickName({ ...brick, density: selectedDensity as BrickNFT["density"] })}
            </p>
          </div>

          {/* Brick Stats + Density Selector */}
          <>
              {/* Density Selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[hsl(var(--ethblox-text-secondary))]">Select Density</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {BRICK_DENSITIES.map((d) => {
                    const isSelected = selectedDensity === d
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDensity(d)}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all ${
                          isSelected 
                            ? "border-[hsl(var(--ethblox-yellow))] bg-[hsl(var(--ethblox-yellow)/0.15)]"
                            : "border-[hsl(var(--ethblox-border))] bg-[hsl(var(--ethblox-bg))] hover:border-[hsl(var(--ethblox-text-tertiary))]"
                        }`}
                      >
                        <span className={`text-sm font-bold ${isSelected ? "text-[hsl(var(--ethblox-yellow))]" : "text-[hsl(var(--ethblox-text-primary))]"}`}>
                          {d}
                        </span>
                        <span className="text-[10px] text-[hsl(var(--ethblox-text-tertiary))]">
                          {DENSITY_LABELS[d]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-center">
                  <Layers className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--ethblox-text-tertiary))]" />
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Size</p>
                  <p className="text-sm font-semibold text-[hsl(var(--ethblox-text-primary))]">
                    {minDim}x{maxDim}
                  </p>
                </div>
                <div className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-center">
                  <Weight className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--ethblox-text-tertiary))]" />
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Mass</p>
                  <p className="text-sm font-semibold text-[hsl(var(--ethblox-text-primary))]">
                    {mass}
                  </p>
                </div>
                <div className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-center">
                  <Box className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--ethblox-text-tertiary))]" />
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Density</p>
                  <p className="text-sm font-semibold text-[hsl(var(--ethblox-yellow))]">
                    {selectedDensity}
                  </p>
                </div>
              </div>

              <Separator className="bg-[hsl(var(--ethblox-border))]" />

              {/* Scarcity Info */}
              <div className="p-3 bg-[hsl(var(--ethblox-yellow)/0.1)] rounded-lg border border-[hsl(var(--ethblox-yellow)/0.3)]">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-[hsl(var(--ethblox-yellow))] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--ethblox-yellow))]">
                      Unique Brick NFT
                    </p>
                    <p className="text-xs text-[hsl(var(--ethblox-text-secondary))] mt-1">
                      Only one {minDim}x{maxDim} brick with density {selectedDensity} can exist. 
                      As the owner, you earn fees when others use this brick in their builds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mint Fee */}
              <div className="flex items-center justify-between p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg">
                <span className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Mint Fee</span>
                <span className="text-lg font-bold text-[hsl(var(--ethblox-green))]">
                  {mintFeeETH} ETH
                </span>
              </div>
            </>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-secondary))] bg-transparent hover:bg-[hsl(var(--ethblox-surface-elevated))]"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[hsl(var(--ethblox-yellow))] text-black hover:bg-[hsl(var(--ethblox-yellow)/0.9)] font-semibold"
              onClick={handleMintRedirect}
            >
              Mint for {mintFeeETH} ETH
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full text-xs text-[hsl(var(--ethblox-text-tertiary))] hover:text-[hsl(var(--ethblox-text-secondary))] hover:bg-transparent"
            onClick={handlePlaceAnyway}
          >
            Place anyway (skip minting)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
