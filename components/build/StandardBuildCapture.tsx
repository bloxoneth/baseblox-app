"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Brick } from "@/lib/types"
import { BUILD_CAPTURE_CONFIG, calculateCameraPosition } from "@/lib/build-capture-config"
import { Button } from "@/components/ui/button"
import { Download, Camera, Loader2 } from "lucide-react"

const { brick: BRICK_CONFIG, lighting: LIGHTING, background: BG } = BUILD_CAPTURE_CONFIG

// Standardized brick mesh
function StandardBrickMesh({ brick }: { brick: Brick }) {
  const studs: [number, number, number][] = []
  for (let i = 0; i < Math.floor(brick.width); i++) {
    for (let j = 0; j < Math.floor(brick.depth); j++) {
      studs.push([
        i - brick.width / 2 + 0.5,
        BRICK_CONFIG.height / 2 + 0.025,
        j - brick.depth / 2 + 0.5,
      ])
    }
  }

  return (
    <group position={brick.position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[brick.width, BRICK_CONFIG.height, brick.depth]} />
        <meshStandardMaterial
          color={brick.color}
          roughness={BRICK_CONFIG.roughness}
          metalness={BRICK_CONFIG.metalness}
        />
      </mesh>
      {studs.map((pos, idx) => (
        <mesh key={idx} position={pos} castShadow>
          <sphereGeometry args={[BRICK_CONFIG.studRadius, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={brick.color}
            roughness={BRICK_CONFIG.roughness}
            metalness={BRICK_CONFIG.metalness}
          />
        </mesh>
      ))}
    </group>
  )
}

// Ground plane
function Ground({ size }: { size: number }) {
  if (!BG.showGround) return null
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size * 2, size * 2]} />
      <meshStandardMaterial
        color={BG.groundColor}
        opacity={BG.groundOpacity}
        transparent
      />
    </mesh>
  )
}

// Scene with auto-positioning camera
function CaptureScene({
  bricks,
  onReady,
}: {
  bricks: Brick[]
  onReady: () => void
}) {
  const { camera, gl, scene } = useThree()
  const frameCount = useRef(0)
  const [isReady, setIsReady] = useState(false)

  // Position camera based on build bounds
  useEffect(() => {
    const { position, target } = calculateCameraPosition(bricks)
    camera.position.set(...position)
    camera.lookAt(...target)
    camera.updateProjectionMatrix()
  }, [bricks, camera])

  // Wait a few frames for scene to fully render before signaling ready
  useFrame(() => {
    frameCount.current++
    if (frameCount.current > 10 && !isReady) {
      setIsReady(true)
      onReady()
    }
  })

  // Calculate ground size
  const maxDim = bricks.length > 0
    ? Math.max(...bricks.map(b => Math.max(
        Math.abs(b.position[0]) + b.width,
        Math.abs(b.position[2]) + b.depth
      )))
    : 5

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={LIGHTING.ambient.intensity} />
      <directionalLight
        position={LIGHTING.keyLight.position}
        intensity={LIGHTING.keyLight.intensity}
        castShadow={LIGHTING.keyLight.castShadow}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight
        position={LIGHTING.fillLight.position}
        intensity={LIGHTING.fillLight.intensity}
      />
      <directionalLight
        position={LIGHTING.rimLight.position}
        intensity={LIGHTING.rimLight.intensity}
      />

      {/* Background */}
      <color attach="background" args={[BG.color]} />

      {/* Ground */}
      <Ground size={maxDim + 2} />

      {/* Bricks */}
      {bricks.map((brick, index) => (
        <StandardBrickMesh key={brick.id || index} brick={brick} />
      ))}
    </>
  )
}

interface StandardBuildCaptureProps {
  bricks: Brick[]
  buildName?: string
  buildId?: string
  autoCapture?: boolean
  onCapture?: (dataUrl: string) => void
  className?: string
  showControls?: boolean
}

export function StandardBuildCapture({
  bricks,
  buildName,
  buildId,
  autoCapture = false,
  onCapture,
  className = "",
  showControls = true,
}: StandardBuildCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const sceneCameraRef = useRef<THREE.Camera | null>(null)
  const activeCameraRef = useRef<THREE.Camera | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const autoCaptureTriggered = useRef(false)

  const captureScreenshot = useCallback(() => {
    const renderer = glRef.current
    const scene = sceneRef.current
    if (!renderer || !scene) return null
    setIsCapturing(true)

    // Pick whichever camera is currently available.
    const cam = cameraRef.current ?? activeCameraRef.current ?? sceneCameraRef.current

    // Safer than instanceof (handles duplicate three builds too).
    const isThreeCamera = (v: unknown): v is THREE.Camera =>
      !!v && typeof v === "object" && (v as any).isCamera === true

    if (!isThreeCamera(cam)) {
      console.warn("captureScreenshot skipped: invalid camera", cam)
      setIsCapturing(false)
      return null
    }

    renderer.render(scene, cam)

    const dataUrl = renderer.domElement.toDataURL("image/png")
    setScreenshotUrl(dataUrl)
    setIsCapturing(false)

    onCapture?.(dataUrl)
    return dataUrl
  }, [onCapture])

  // Auto-capture when scene is ready
  useEffect(() => {
    if (autoCapture && sceneReady && !autoCaptureTriggered.current && glRef.current) {
      autoCaptureTriggered.current = true
      // Small delay to ensure render is complete
      setTimeout(() => {
        captureScreenshot()
      }, 100)
    }
  }, [autoCapture, sceneReady, captureScreenshot])

  const handleSceneReady = useCallback(() => {
    setSceneReady(true)
  }, [])

  const downloadScreenshot = useCallback(() => {
    if (!screenshotUrl) return
    const link = document.createElement("a")
    link.href = screenshotUrl
    link.download = `${buildName || buildId || "ethblox-build"}.png`
    link.click()
  }, [screenshotUrl, buildName, buildId])

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Canvas */}
      <div className="relative aspect-square rounded-lg overflow-hidden border border-[hsl(var(--ethblox-border))]">
        <Canvas
          ref={canvasRef}
          shadows
          camera={{ fov: BUILD_CAPTURE_CONFIG.camera.fov, position: [5, 5, 5] }}
          gl={{
            preserveDrawingBuffer: true,
            antialias: BUILD_CAPTURE_CONFIG.render.antialias,
            pixelRatio: BUILD_CAPTURE_CONFIG.render.pixelRatio,
          }}
          onCreated={({ gl }) => {
            glRef.current = gl
            sceneRef.current = gl.scene
            sceneCameraRef.current = gl.camera
            activeCameraRef.current = gl.camera
            cameraRef.current = gl.camera
          }}
        >
          <CaptureScene bricks={bricks} onReady={handleSceneReady} />
        </Canvas>

        {/* Loading indicator */}
        {!sceneReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--ethblox-bg))]">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--ethblox-text-tertiary))]" />
          </div>
        )}

        {/* Capture button overlay */}
        {showControls && sceneReady && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button
              onClick={captureScreenshot}
              size="sm"
              disabled={isCapturing}
              className="bg-[hsl(var(--ethblox-surface))] hover:bg-[hsl(var(--ethblox-surface-elevated))] text-[hsl(var(--ethblox-text-primary))] border border-[hsl(var(--ethblox-border))]"
            >
              {isCapturing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Camera className="h-4 w-4 mr-1" />
              )}
              Capture
            </Button>
          </div>
        )}
      </div>

      {/* Screenshot preview */}
      {screenshotUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">
              Captured Image (IPFS Ready)
            </span>
            <Button
              onClick={downloadScreenshot}
              size="sm"
              variant="outline"
              className="h-7 text-xs border-[hsl(var(--ethblox-green))] text-[hsl(var(--ethblox-green))] bg-transparent hover:bg-[hsl(var(--ethblox-green)/0.1)]"
            >
              <Download className="h-3 w-3 mr-1" />
              Download PNG
            </Button>
          </div>
          <img
            src={screenshotUrl || "/placeholder.svg"}
            alt="Build preview"
            className="w-full rounded-lg border border-[hsl(var(--ethblox-border))]"
          />
        </div>
      )}
    </div>
  )
}
