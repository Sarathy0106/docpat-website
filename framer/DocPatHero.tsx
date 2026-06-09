/**
 * DocPat — Scroll-Driven Block → Video Nodes
 *
 * HOW TO ADD IN FRAMER:
 * 1. Open your Framer project
 * 2. Go to Assets panel → Code → + New Component
 * 3. Paste this entire file
 * 4. Drag "DocPatHero" onto the canvas, set to full width/height
 * 5. Replace the video src paths with your actual Google Flow video URLs
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

// ── Video node data ──────────────────────────────────────────────
const VIDEO_NODES = [
    {
        id: "vn0",
        src: "https://your-cdn.com/clip1.mp4", // replace with your video URL
        tag: "Upload · OCR",
        title: "Capture & Store on IPFS",
    },
    {
        id: "vn1",
        src: "https://your-cdn.com/clip2.mp4",
        tag: "QR Share",
        title: "PIN-Protected Sharing",
    },
    {
        id: "vn2",
        src: "https://your-cdn.com/clip3.mp4",
        tag: "Blockchain",
        title: "On-Chain Verification",
    },
    {
        id: "vn3",
        src: "https://your-cdn.com/clip4.mp4",
        tag: "DocPat",
        title: "Your Health. Your Data.",
    },
]

// ── Grid tile positions (3×3 block face) ─────────────────────────
const TILE_EXPLODE = [
    { x: -60, y: -60 }, { x: 0, y: -70 }, { x: 60, y: -60 },
    { x: -70, y:   0 }, { x: 0, y:   0 }, { x: 70, y:   0 },
    { x: -60, y:  60 }, { x: 0, y:  70 }, { x: 60, y:  60 },
]

// ── Node final positions (2×2 grid, relative to center) ──────────
function nodeTargets(w: number, h: number) {
    const nx = Math.min(280, w * 0.21)
    const ny = Math.min(120, h * 0.20)
    return [
        { x: -nx, y: -ny },
        { x:  nx, y: -ny },
        { x: -nx, y:  ny },
        { x:  nx, y:  ny },
    ]
}

// ────────────────────────────────────────────────────────────────
export default function DocPatHero({
    videoWidth = 260,
    videoHeight = 180,
}: {
    videoWidth?: number
    videoHeight?: number
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapRef   = useRef<HTMLDivElement>(null)
    const threeRef  = useRef<any>(null)
    const [dims, setDims] = useState({ w: 1200, h: 800 })

    // ── Framer scroll tracking ──────────────────────────────────
    const { scrollYProgress } = useScroll({
        target: wrapRef,
        offset: ["start start", "end start"],
    })
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 60,
        damping: 20,
        restDelta: 0.001,
    })

    // ── Derived animation values from scroll ────────────────────

    // Block scale: 1 → 0.85 as nodes appear
    const blockScale = useTransform(smoothProgress, [0, 0.15, 0.55], [0.9, 1, 0.85])

    // Block face opacity: visible → invisible as it cracks
    const faceOpacity = useTransform(smoothProgress, [0.15, 0.50], [1, 0])

    // Scene label
    const labelOpacity = useTransform(
        smoothProgress,
        [0, 0.08, 0.75, 0.90],
        [0,  1,    1,    0   ]
    )

    // Each video node
    const nodeOpacities = VIDEO_NODES.map((_, i) =>
        useTransform(
            smoothProgress,
            [0.15 + i * 0.05, 0.45 + i * 0.03, 0.82, 1.0],
            [0,                1,                1,    0  ]
        )
    )
    const nodeScales = VIDEO_NODES.map((_, i) =>
        useTransform(
            smoothProgress,
            [0.15 + i * 0.05, 0.50 + i * 0.03],
            [0.5,              1               ]
        )
    )

    // Tile scatter values for each of the 9 tiles
    const tileProgress = useTransform(smoothProgress, [0.15, 0.50], [0, 1])

    // ── Three.js background particles ──────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        import("https://esm.sh/three@0.160.0" as any).then((THREE: any) => {
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
            renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
            renderer.setSize(canvas.clientWidth, canvas.clientHeight)

            const scene = new THREE.Scene()
            const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
            camera.position.z = 6

            // Particles
            const N = 600
            const geo = new THREE.BufferGeometry()
            const pos = new Float32Array(N * 3)
            for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 26
            geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
            scene.add(new THREE.Points(geo,
                new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.035, transparent: true, opacity: 0.35 })
            ))

            scene.add(new THREE.AmbientLight(0x001133, 2))
            const pl = new THREE.PointLight(0x00d4ff, 3, 20)
            pl.position.set(0, 4, 4)
            scene.add(pl)

            let mx = 0, my = 0, raf: number
            const onMouse = (e: MouseEvent) => {
                mx = (e.clientX / innerWidth  - 0.5) * 0.3
                my = (e.clientY / innerHeight - 0.5) * -0.3
            }
            window.addEventListener("mousemove", onMouse)

            const clock = new THREE.Clock()
            const loop = () => {
                raf = requestAnimationFrame(loop)
                const t = clock.getElapsedTime()
                camera.position.x += (mx - camera.position.x) * 0.04
                camera.position.y += (my - camera.position.y) * 0.04
                camera.lookAt(0, 0, 0)
                pl.intensity = 2.5 + Math.sin(t * 1.2) * 0.5
                renderer.render(scene, camera)
            }
            loop()

            const onResize = () => {
                const w = canvas.clientWidth, h = canvas.clientHeight
                camera.aspect = w / h
                camera.updateProjectionMatrix()
                renderer.setSize(w, h)
            }
            window.addEventListener("resize", onResize)

            threeRef.current = { renderer, raf, onMouse, onResize }
        })

        return () => {
            if (threeRef.current) {
                cancelAnimationFrame(threeRef.current.raf)
                window.removeEventListener("mousemove", threeRef.current.onMouse)
                window.removeEventListener("resize", threeRef.current.onResize)
                threeRef.current.renderer.dispose()
            }
        }
    }, [])

    // ── Resize dims ─────────────────────────────────────────────
    useEffect(() => {
        const update = () => setDims({ w: innerWidth, h: innerHeight })
        update()
        window.addEventListener("resize", update)
        return () => window.removeEventListener("resize", update)
    }, [])

    const targets = nodeTargets(dims.w, dims.h)

    // ── Label text driven by scroll ─────────────────────────────
    const [labelIdx, setLabelIdx] = useState(0)
    const LABELS = [
        { h: "One Block. Four Superpowers.", p: "Scroll to see the architecture unfold" },
        { h: "Decentralized Storage",        p: "Files pinned to IPFS — no central server" },
        { h: "Blockchain Verified",          p: "SHA-256 hash stored immutably on Polygon" },
        { h: "Secure QR Sharing",            p: "PIN-protected, time-limited, audited" },
    ]
    useEffect(() => {
        return smoothProgress.on("change", (v) => {
            const idx = Math.floor(v * LABELS.length)
            setLabelIdx(Math.min(idx, LABELS.length - 1))
        })
    }, [smoothProgress])

    // ────────────────────────────────────────────────────────────
    return (
        <div
            ref={wrapRef}
            style={{
                position: "relative",
                width: "100%",
                height: "500vh",          // scroll space
                fontFamily: "'Inter', sans-serif",
            }}
        >
            {/* Sticky viewport */}
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#03060f",
                }}
            >
                {/* Grid background */}
                <div
                    style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        backgroundImage: `
                            linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)
                        `,
                        backgroundSize: "64px 64px",
                    }}
                />

                {/* Three.js particle canvas */}
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "absolute", inset: 0,
                        width: "100%", height: "100%",
                        pointerEvents: "none",
                    }}
                />

                {/* ── THE BLOCK + NODES ── */}
                <motion.div
                    style={{
                        position: "relative",
                        width: 320, height: 320,
                        scale: blockScale,
                    }}
                >
                    {/* Block face — 3×3 tiles that scatter */}
                    <motion.div
                        style={{
                            position: "absolute", inset: 0,
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gridTemplateRows: "repeat(3, 1fr)",
                            gap: 6, padding: 6,
                            opacity: faceOpacity,
                            zIndex: 1,
                            pointerEvents: "none",
                        }}
                    >
                        {TILE_EXPLODE.map((explode, i) => (
                            <motion.div
                                key={i}
                                style={{
                                    borderRadius: 8,
                                    background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,80,255,0.1))",
                                    border: "1px solid rgba(0,212,255,0.18)",
                                    boxShadow: "inset 0 0 12px rgba(0,212,255,0.06)",
                                    x: useTransform(tileProgress, [0, 1], [0, explode.x]),
                                    y: useTransform(tileProgress, [0, 1], [0, explode.y]),
                                    scale: useTransform(tileProgress, [0, 1], [1, 0.4]),
                                    opacity: useTransform(tileProgress, [0, 0.6], [1, 0]),
                                }}
                            />
                        ))}
                    </motion.div>

                    {/* ── VIDEO NODES ── */}
                    {VIDEO_NODES.map((node, i) => (
                        <motion.div
                            key={node.id}
                            style={{
                                position: "absolute",
                                top: "50%", left: "50%",
                                width: videoWidth,
                                height: videoHeight,
                                borderRadius: 18,
                                overflow: "hidden",
                                border: "1px solid rgba(0,212,255,0.3)",
                                boxShadow: "0 0 40px rgba(0,212,255,0.15), inset 0 0 20px rgba(0,212,255,0.04)",
                                background: "#070f20",
                                zIndex: 10,
                                cursor: "pointer",
                                opacity: nodeOpacities[i],
                                scale: nodeScales[i],
                                x: useTransform(
                                    smoothProgress,
                                    [0.15 + i * 0.05, 0.50],
                                    [-(videoWidth / 2), targets[i].x - videoWidth / 2]
                                ),
                                y: useTransform(
                                    smoothProgress,
                                    [0.15 + i * 0.05, 0.50],
                                    [-(videoHeight / 2), targets[i].y - videoHeight / 2]
                                ),
                            }}
                            whileHover={{
                                boxShadow: "0 0 80px rgba(0,212,255,0.4), inset 0 0 20px rgba(0,212,255,0.08)",
                                borderColor: "rgba(0,212,255,0.7)",
                            }}
                        >
                            {/* Video */}
                            <video
                                src={node.src}
                                autoPlay
                                loop
                                muted
                                playsInline
                                style={{ width: "100%", height: "75%", objectFit: "cover", display: "block" }}
                            />

                            {/* Label bar */}
                            <div
                                style={{
                                    padding: "10px 14px",
                                    background: "linear-gradient(0deg, rgba(3,6,15,0.98) 0%, rgba(3,6,15,0.7) 100%)",
                                    height: "25%",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                }}
                            >
                                <div style={{
                                    fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                                    color: "#00d4ff", textTransform: "uppercase", marginBottom: 3,
                                }}>
                                    {node.tag}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#ddeeff" }}>
                                    {node.title}
                                </div>
                            </div>

                            {/* Glow ring on hover */}
                            <motion.div
                                style={{
                                    position: "absolute", inset: -1, borderRadius: 18,
                                    border: "1px solid rgba(0,212,255,0)",
                                    pointerEvents: "none",
                                }}
                                whileHover={{ borderColor: "rgba(0,212,255,0.6)" }}
                            />
                        </motion.div>
                    ))}
                </motion.div>

                {/* ── Scene label ── */}
                <motion.div
                    style={{
                        position: "absolute",
                        bottom: 60, left: "50%",
                        translateX: "-50%",
                        textAlign: "center",
                        pointerEvents: "none",
                        opacity: labelOpacity,
                        zIndex: 20,
                    }}
                >
                    <motion.h2
                        key={labelIdx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        style={{
                            fontSize: "clamp(18px, 2.5vw, 28px)",
                            fontWeight: 800,
                            color: "#00d4ff",
                            textShadow: "0 0 30px rgba(0,212,255,0.6)",
                            whiteSpace: "nowrap",
                            margin: 0,
                        }}
                        children={LABELS[labelIdx].h}
                    />
                    <motion.p
                        key={labelIdx + "-p"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                        style={{ fontSize: 14, color: "#4a6a8a", marginTop: 8 }}
                    >
                        {LABELS[labelIdx].p}
                    </motion.p>
                </motion.div>

            </div>
        </div>
    )
}

addPropertyControls(DocPatHero, {
    videoWidth: {
        type: ControlType.Number,
        title: "Video Width",
        defaultValue: 260,
        min: 160, max: 400, step: 10,
    },
    videoHeight: {
        type: ControlType.Number,
        title: "Video Height",
        defaultValue: 180,
        min: 120, max: 300, step: 10,
    },
})
