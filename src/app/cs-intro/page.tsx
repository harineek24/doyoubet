"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getBuiltinTrack } from "@/lib/store/tracks";
import { getTrack } from "@/lib/repo";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Star       { x:number; y:number; z:number; baseR:number; baseBright:number; twPhase:number; twSpeed:number; fadeIn:number; hex:string }
interface NeuralNode { id:number; x:number; y:number; r:number; conns:number[]; fadeIn:number; pulseOff:number; hex:string }
interface Signal     { from:number; to:number; t:number; speed:number; hex:string }
interface Particle   { x:number; y:number; vx:number; vy:number; r:number; baseAlpha:number; hex:string; fadeIn:number }
interface SpherePoint{ phi:number; theta:number; r:number; fadeIn:number }

// ─────────────────────────────────────────────────────────────────────────────
// WARM PALETTE  —  amber / gold / sienna, echoing the Getty editorial warmth
// ─────────────────────────────────────────────────────────────────────────────

const WARM = {
  amber:  "#f59e0b",
  gold:   "#fbbf24",
  cream:  "#fef3c7",
  sienna: "#fb923c",
  pale:   "#fde68a",
} as const;

// Pre-built rgba prefix strings (avoid string concat in the hot path)
const RA = {
  amber:  "rgba(245,158,11,",
  gold:   "rgba(251,191,36,",
  cream:  "rgba(254,243,199,",
  sienna: "rgba(251,146,60,",
  pale:   "rgba(253,230,138,",
  bg:     "rgba(14,10,6,",      // warm very-dark bg (partial-clear trail)
};

// ─────────────────────────────────────────────────────────────────────────────
// AMBIENT AUDIO ENGINE
// PLACEHOLDER: replace createAmbientDrone() with /public/audio/cs-ambient.ogg
// ─────────────────────────────────────────────────────────────────────────────

function createAmbientDrone(ctx: AudioContext): () => void {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 5);
  master.connect(ctx.destination);

  // A1–E2–A2–E3–A3  open-fifth stack — warm, cinematic
  const layers = [
    { freq: 55.0, g: 0.38 }, { freq: 82.41, g: 0.30 },
    { freq: 110.0, g: 0.24 }, { freq: 164.81, g: 0.14 }, { freq: 220.0, g: 0.07 },
  ];

  const pairs: { osc: OscillatorNode; lfo: OscillatorNode }[] = [];
  layers.forEach(({ freq, g }, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sine"; osc.frequency.value = freq;

    const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
    lfo.frequency.value = 0.11 + i * 0.03; lfoG.gain.value = freq * 0.0025;
    lfo.connect(lfoG); lfoG.connect(osc.frequency); lfo.start();

    filter.type = "lowpass"; filter.frequency.value = 520;
    gain.gain.value = g;
    osc.connect(filter); filter.connect(gain); gain.connect(master); osc.start();
    pairs.push({ osc, lfo });
  });

  // Warm shimmer pad fades in at 8 s
  setTimeout(() => {
    if (ctx.state === "closed") return;
    const sh = ctx.createOscillator(); const shG = ctx.createGain();
    sh.type = "sine"; sh.frequency.value = 550; // tuned slightly warm (not A5)
    shG.gain.setValueAtTime(0, ctx.currentTime);
    shG.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 4);
    sh.connect(shG); shG.connect(master); sh.start();
  }, 8000);

  return () => {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
    setTimeout(() => pairs.forEach(({ osc, lfo }) => { try { osc.stop(); lfo.stop(); } catch {} }), 3200);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS ENGINE  —  warm amber / gold palette, zero shadowBlur, batched draws
// ─────────────────────────────────────────────────────────────────────────────

class CinematicEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private W = 0; private H = 0;
  private raf = 0; private t0 = 0; private running = false;
  private mobile = false;

  private stars:   Star[]        = [];
  private nodes:   NeuralNode[]  = [];
  private signals: Signal[]      = [];
  private parts:   Particle[]    = [];
  private sphere:  SpherePoint[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.resize();
    this.mobile = this.W < 768;
    this.buildStars(); this.buildNodes(); this.buildSphere(); this.buildParts();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width  = this.W * dpr; this.canvas.height = this.H * dpr;
    this.canvas.style.width = `${this.W}px`; this.canvas.style.height = `${this.H}px`;
    this.ctx.scale(dpr, dpr);
  }

  private rnd(a: number, b: number) { return a + Math.random() * (b - a); }

  private buildStars() {
    const count = this.mobile ? 120 : 200;
    const pal = [WARM.cream, WARM.cream, WARM.cream, WARM.gold, WARM.amber, WARM.pale];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: this.rnd(0, this.W), y: this.rnd(0, this.H), z: Math.random(),
        baseR: this.rnd(0.3, 1.8), baseBright: this.rnd(0.25, 0.9),
        twPhase: Math.random() * Math.PI * 2, twSpeed: this.rnd(0.2, 1.0),
        fadeIn: 0,
        hex: pal[Math.floor(Math.random() * pal.length)],
      });
    }
  }

  private buildNodes() {
    const count = this.mobile ? 20 : 32;
    const m = 90;
    const pal = [WARM.amber, WARM.gold, WARM.pale, WARM.sienna];
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        id: i,
        x: this.rnd(m, this.W - m), y: this.rnd(m, this.H - m),
        r: this.rnd(1.6, 3.2), conns: [], fadeIn: 0,
        pulseOff: Math.random() * Math.PI * 2,
        hex: pal[Math.floor(Math.random() * pal.length)],
      });
    }
    this.nodes.forEach((n, i) => {
      const sorted = this.nodes
        .map((o, j) => ({ j, d: Math.hypot(o.x - n.x, o.y - n.y) }))
        .filter(({ j }) => j !== i).sort((a, b) => a.d - b.d);
      n.conns = sorted.slice(0, 2 + Math.floor(Math.random() * 3)).map(({ j }) => j);
    });
  }

  private buildSphere() {
    const count = this.mobile ? 180 : 280;
    const golden = (1 + Math.sqrt(5)) / 2;
    const r = Math.min(this.W, this.H) * 0.30;
    for (let i = 0; i < count; i++) {
      this.sphere.push({
        phi: Math.acos(1 - (2 * i) / count),
        theta: 2 * Math.PI * golden * i,
        r, fadeIn: 0,
      });
    }
  }

  private buildParts() {
    const count = this.mobile ? 150 : 260;
    const pal = [WARM.amber, WARM.amber, WARM.gold, WARM.cream, WARM.sienna];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = this.rnd(0.08, 0.24);
      this.parts.push({
        x: this.rnd(0, this.W), y: this.rnd(0, this.H),
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        r: this.rnd(0.4, 1.5), baseAlpha: this.rnd(0.06, 0.36),
        hex: pal[Math.floor(Math.random() * pal.length)], fadeIn: 0,
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true; this.t0 = performance.now(); this.loop();
  }

  private loop() {
    this.raf = requestAnimationFrame(() => this.loop());
    const t = (performance.now() - this.t0) / 1000;
    this.update(t); this.draw(t);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  private update(t: number) {
    const sn = this.stars.length;
    this.stars.forEach((s, i) => {
      s.fadeIn = Math.min(1, Math.max(0, (t - i * (3 / sn)) / 1.2));
    });
    const nn = this.nodes.length;
    this.nodes.forEach((n, i) => {
      n.fadeIn = Math.min(1, Math.max(0, (t - 2 - i * (2 / nn)) / 0.6));
    });
    const spn = this.sphere.length;
    this.sphere.forEach((sp, i) => {
      sp.fadeIn = Math.min(1, Math.max(0, (t - 5 - i * (2 / spn)) / 0.8));
    });
    const pn = this.parts.length;
    this.parts.forEach((p, i) => {
      p.fadeIn = Math.min(1, Math.max(0, (t - 3 - i * (1.5 / pn)) / 1.5));
      p.x += p.vx; p.y += p.vy;
      if (p.x < -2) p.x = this.W + 2; if (p.x > this.W + 2) p.x = -2;
      if (p.y < -2) p.y = this.H + 2; if (p.y > this.H + 2) p.y = -2;
    });
    if (t > 4 && this.signals.length < 14) {
      if (Math.random() < 0.055) {
        const node = this.nodes[Math.floor(Math.random() * this.nodes.length)];
        if (node.conns.length > 0 && node.fadeIn > 0.4) {
          const toId = node.conns[Math.floor(Math.random() * node.conns.length)];
          const pal = [WARM.gold, WARM.amber, WARM.pale];
          this.signals.push({ from: node.id, to: toId, t: 0,
            speed: this.rnd(0.007, 0.013), hex: pal[Math.floor(Math.random() * pal.length)] });
        }
      }
    }
    this.signals = this.signals.filter(sig => { sig.t += sig.speed; return sig.t <= 1; });
  }

  // ── Draw (zero shadowBlur, one save/restore per batch) ────────────────────

  private draw(t: number) {
    const ctx = this.ctx; const W = this.W; const H = this.H;
    const cx = Math.sin(t * 0.11) * 12;
    const cy = Math.sin(t * 0.08 + 0.6) * 7;

    // Partial clear — warm dark, not cold black → gives trail / bloom feel
    ctx.fillStyle = "#0e0a06"; ctx.globalAlpha = 0.11;
    ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    if (t < 0.3) { ctx.fillStyle = "#0e0a06"; ctx.fillRect(0, 0, W, H); }

    this.drawNebulae(ctx, t, W, H);
    this.drawStars(ctx, t, cx, cy);
    this.drawParts(ctx, cx * 0.5, cy * 0.5);
    this.drawNet(ctx, t, cx * 0.85, cy * 0.85);
    this.drawSphere(ctx, t, cx * 0.4, cy * 0.4);
    this.drawVignette(ctx, W, H);
  }

  // Nebulae — warm amber / sienna / gold gas clouds
  private drawNebulae(ctx: CanvasRenderingContext2D, t: number, W: number, H: number) {
    const drift = Math.sin(t * 0.055) * 18;
    const clouds = [
      { x: W * 0.28 + drift, y: H * 0.38, r: H * 0.52, ra: RA.amber,  a: 0.030 },
      { x: W * 0.72 - drift, y: H * 0.62, r: H * 0.45, ra: RA.sienna, a: 0.024 },
      { x: W * 0.50,         y: H * 0.50, r: H * 0.62, ra: RA.gold,   a: 0.018 },
    ];
    clouds.forEach(({ x, y, r, ra, a }) => {
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `${ra}${a})`); grd.addColorStop(1, `${ra}0)`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, this.W, this.H);
    });
  }

  // Stars — one save/restore; fake glow = halo circle + bright core
  private drawStars(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number) {
    ctx.save(); ctx.globalCompositeOperation = "screen";
    this.stars.forEach(s => {
      if (s.fadeIn < 0.01) return;
      const tw = 0.72 + 0.28 * Math.sin(t * s.twSpeed + s.twPhase);
      const a  = s.baseBright * tw * s.fadeIn;
      const x  = s.x + cx * s.z * 0.35;
      const y  = s.y + cy * s.z * 0.35;
      const r  = s.baseR * (0.5 + s.z * 0.5);
      ctx.fillStyle = s.hex;
      ctx.globalAlpha = a * 0.10;
      ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);     ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.restore();
  }

  // Neural net — connections, traveling gold signals, pulsing nodes
  private drawNet(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number) {
    ctx.save(); ctx.globalCompositeOperation = "screen";

    ctx.lineWidth = 0.6;
    this.nodes.forEach(n => {
      if (n.fadeIn < 0.02) return;
      n.conns.forEach(toId => {
        const to = this.nodes[toId];
        if (!to || to.fadeIn < 0.02) return;
        ctx.globalAlpha = Math.min(n.fadeIn, to.fadeIn) * 0.18;
        ctx.strokeStyle = WARM.amber;
        ctx.beginPath(); ctx.moveTo(n.x + cx, n.y + cy); ctx.lineTo(to.x + cx, to.y + cy); ctx.stroke();
      });
    });

    this.signals.forEach(sig => {
      const from = this.nodes[sig.from]; const to = this.nodes[sig.to];
      if (!from || !to) return;
      const x = from.x + (to.x - from.x) * sig.t + cx;
      const y = from.y + (to.y - from.y) * sig.t + cy;
      ctx.fillStyle = sig.hex;
      ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.88;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    });

    this.nodes.forEach(n => {
      if (n.fadeIn < 0.02) return;
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.4 + n.pulseOff);
      const a = n.fadeIn * pulse;
      const x = n.x + cx; const y = n.y + cy; const r = n.r * (0.85 + 0.15 * pulse);
      ctx.fillStyle = n.hex;
      ctx.globalAlpha = a * 0.14;
      ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);     ctx.fill();
    });

    ctx.globalAlpha = 1; ctx.restore();
  }

  // Sphere — warm amber→gold by depth
  private drawSphere(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number) {
    if (t < 4.5) return;
    ctx.save(); ctx.globalCompositeOperation = "screen";
    const ox = this.W / 2 + cx; const oy = this.H / 2 + cy;
    const rotY = t * 0.13;
    const tilt = Math.sin(t * 0.065) * 0.28;
    const cosTilt = Math.cos(tilt); const sinTilt = Math.sin(tilt);

    this.sphere.forEach(sp => {
      if (sp.fadeIn < 0.01) return;
      const sinPhi = Math.sin(sp.phi);
      let x3 = sp.r * sinPhi * Math.cos(sp.theta + rotY);
      let y3 = sp.r * Math.cos(sp.phi);
      let z3 = sp.r * sinPhi * Math.sin(sp.theta + rotY);
      const y3t = y3 * cosTilt - z3 * sinTilt;
      const z3t = y3 * sinTilt + z3 * cosTilt;
      y3 = y3t; z3 = z3t;

      const camZ = sp.r * 3.2; const scale = camZ / (camZ + z3);
      const sx = ox + x3 * scale; const sy = oy + y3 * scale;
      const depth = (z3 + sp.r) / (2 * sp.r);
      const a = sp.fadeIn * (0.08 + depth * 0.50);
      const color = depth > 0.62 ? WARM.gold : depth > 0.34 ? WARM.amber : WARM.sienna;
      const coreR = Math.max(0.5, 1.1 * scale);

      ctx.fillStyle = color;
      ctx.globalAlpha = a * 0.10;
      ctx.beginPath(); ctx.arc(sx, sy, coreR * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(sx, sy, coreR, 0, Math.PI * 2); ctx.fill();
    });

    ctx.globalAlpha = 1; ctx.restore();
  }

  // Ambient particles
  private drawParts(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save(); ctx.globalCompositeOperation = "screen";
    this.parts.forEach(p => {
      if (p.fadeIn < 0.02) return;
      const a = p.baseAlpha * p.fadeIn;
      const x = p.x + cx * 0.2; const y = p.y + cy * 0.2;
      ctx.fillStyle = p.hex;
      ctx.globalAlpha = a * 0.08;
      ctx.beginPath(); ctx.arc(x, y, p.r * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2);       ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.restore();
  }

  // Warm vignette — amber-tinted edges like old parchment / candlelight falloff
  private drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.20, W / 2, H / 2, H * 0.90);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.7, "rgba(14,10,6,0.25)");
    grd.addColorStop(1, "rgba(14,10,6,0.82)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }

  destroy() { cancelAnimationFrame(this.raf); this.running = false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// LETTER REVEAL
// Opacity + translateY only — no CSS blur during canvas peak load.
// Playfair Display loaded in layout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

const SERIF = 'var(--font-playfair), Georgia, "Book Antiqua", Palatino, serif';


// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

function CSIntroInner() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CinematicEngine | null>(null);
  const stopDroneRef = useRef<(() => void) | null>(null);
  const exitingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const touchStartY = useRef(0);

  const track = trackId ? (getBuiltinTrack(trackId) ?? (user ? getTrack(user.id, trackId) : undefined)) : undefined;
  const subjectLabel = track?.title ?? null;
  const exitTarget = trackId ? `/hub?trackId=${trackId}` : "/hub";

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [line0, setLine0] = useState(false);
  const [line1, setLine1] = useState(false);
  const [line2, setLine2] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CinematicEngine(canvasRef.current);
    engineRef.current = engine;
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      engine.destroy(); window.removeEventListener("resize", onResize);
      timersRef.current.forEach(clearTimeout); stopDroneRef.current?.();
    };
  }, []);

  const doExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    stopDroneRef.current?.();
    setExiting(true);
    const t = setTimeout(() => router.replace(exitTarget), 1600);
    timersRef.current.push(t);
  }, [router, exitTarget]);

  const handleBegin = useCallback(() => {
    setAudioEnabled(true);
    engineRef.current?.start();

    try {
      const actx = new AudioContext();
      stopDroneRef.current = createAmbientDrone(actx);
    } catch { /* audio unavailable */ }

    // Text reveals — timing reduced for snappier feel
    const t0 = setTimeout(() => setLine0(true), 1800);
    const t1 = setTimeout(() => setLine1(true), 3000);
    const t2 = setTimeout(() => setLine2(true), 4200);
    const t3 = setTimeout(() => setShowScroll(true), 6000);
    // Safety-net auto-exit after 3 minutes of no interaction
    const t4 = setTimeout(() => doExit(), 180_000);
    timersRef.current.push(t0, t1, t2, t3, t4);
  }, [doExit]);

  // Scroll (wheel) → exit
  useEffect(() => {
    if (!audioEnabled) return;
    const onWheel = (e: WheelEvent) => { if (e.deltaY > 4) doExit(); };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [audioEnabled, doExit]);

  // Touch swipe-up → exit (mobile)
  useEffect(() => {
    if (!audioEnabled) return;
    const onStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
    const onEnd   = (e: TouchEvent) => {
      if (touchStartY.current - e.changedTouches[0].clientY > 50) doExit();
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend",   onEnd);
    };
  }, [audioEnabled, doExit]);

  return (
    <div
      style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0e0a06" }}
      className="select-none"
    >
      {/* ── Canvas ── */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />

      {/* ── Begin prompt ── */}
      <AnimatePresence>
        {!audioEnabled && (
          <motion.div key="prompt"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.button
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1, ease: [0.13, 1, 0.3, 1] }}
              onClick={handleBegin}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem",
                background: "none", border: "none", cursor: "pointer" }}
              className="group"
            >
              {/* Outer pulse rings */}
              <div style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <motion.div
                  animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                  style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(245,158,11,0.75)" }}
                />
                <motion.div
                  animate={{ scale: [1, 1.38], opacity: [0.65, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                  style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(245,158,11,0.55)" }}
                />
                {/* Core button */}
                <div style={{
                  width: 76, height: 76, borderRadius: "50%",
                  background: "rgba(245,158,11,0.18)",
                  border: "2px solid rgba(245,158,11,0.85)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 32px rgba(245,158,11,0.35), 0 0 8px rgba(245,158,11,0.25) inset",
                }}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <path d="M9 6l13 7-13 7V6z" fill="rgba(251,191,36,1)" />
                  </svg>
                </div>
              </div>

              <span style={{
                fontSize: "0.85rem",
                letterSpacing: "0.32em",
                color: "rgba(254,243,199,0.75)",
                textTransform: "uppercase",
                fontFamily: SERIF,
                fontStyle: "italic",
              }}
                className="group-hover:!text-[rgba(254,243,199,1)] transition-colors duration-300"
              >
                Click to Begin
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Title text — always in DOM, animate opacity+y to avoid layout shifts ── */}
      <div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "0 2rem",
        }}
      >
        <div style={{ textAlign: "center", fontFamily: SERIF, lineHeight: 1.15 }}>

          {/* "Welcome" */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={
              line0 && audioEnabled && !exiting
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 32 }
            }
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(3rem, 8vw, 6.5rem)",
              fontStyle: "italic", fontWeight: 400,
              color: "rgba(254,243,199,0.90)",
              marginBottom: "0.1em",
              letterSpacing: "-0.01em",
              willChange: "transform, opacity",
            }}
          >
            Welcome
          </motion.div>

          {/* "to the World" */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={
              line1 && audioEnabled && !exiting
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 24 }
            }
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: "clamp(1.4rem, 4vw, 3.2rem)",
              fontStyle: "italic", fontWeight: 400,
              color: "rgba(254,243,199,0.50)",
              marginBottom: "0.25em",
              letterSpacing: "0.02em",
              willChange: "transform, opacity",
            }}
          >
            to the World
          </motion.div>

          {subjectLabel && (
            <>
              {/* Divider — scaleX so it "draws" in from centre */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={
                  line2 && audioEnabled && !exiting
                    ? { scaleX: 1, opacity: 1 }
                    : { scaleX: 0, opacity: 0 }
                }
                transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: "clamp(60px, 10vw, 120px)", height: 1,
                  background: "rgba(245,158,11,0.45)",
                  margin: "0.6em auto 0.6em",
                  transformOrigin: "center",
                  willChange: "transform, opacity",
                }}
              />

              {/* "of {subject}" */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={
                  line2 && audioEnabled && !exiting
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 20 }
                }
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
                style={{
                  fontSize: "clamp(1.6rem, 4.5vw, 3.8rem)",
                  fontStyle: "normal", fontWeight: 400,
                  color: "#f59e0b",
                  letterSpacing: "0.05em",
                  textShadow: "0 0 50px rgba(245,158,11,0.30)",
                  willChange: "transform, opacity",
                }}
              >
                {subjectLabel}
              </motion.div>
            </>
          )}

        </div>
      </div>

      {/* ── Scroll hint — appears after all text is shown ── */}
      <AnimatePresence>
        {showScroll && !exiting && (
          <motion.div key="scroll-hint"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.13, 1, 0.3, 1] }}
            style={{
              position: "absolute", bottom: "2.5rem", left: "50%",
              transform: "translateX(-50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem",
              pointerEvents: "none",
            }}
          >
            {/* Animated line that breathes */}
            <motion.div
              animate={{ height: [28, 44, 28] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 1,
                background: "linear-gradient(to bottom, transparent, rgba(245,158,11,0.85), transparent)",
              }}
            />
            <span style={{
              fontSize: "0.75rem", letterSpacing: "0.38em",
              color: "rgba(245,158,11,0.85)", textTransform: "uppercase",
              fontFamily: SERIF, fontStyle: "italic",
            }}>
              scroll
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip (subtle, top-right) ── */}
      <AnimatePresence>
        {audioEnabled && !exiting && !showScroll && (
          <motion.button key="skip"
            initial={{ opacity: 0 }} animate={{ opacity: 0.20 }}
            whileHover={{ opacity: 0.55 }} exit={{ opacity: 0 }}
            transition={{ delay: 3, duration: 1 }}
            onClick={doExit}
            style={{
              position: "absolute", top: "1.5rem", right: "2rem",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.56rem", letterSpacing: "0.35em",
              color: "rgba(254,243,199,1)", textTransform: "uppercase",
              fontFamily: SERIF, fontStyle: "italic",
            }}
          >
            skip
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Exit veil — fades to warm dark ── */}
      <AnimatePresence>
        {exiting && (
          <motion.div key="exit"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1.6, ease: "easeIn" }}
            style={{ position: "absolute", inset: 0, background: "#0e0a06" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CSIntroPage() {
  return <Suspense><CSIntroInner /></Suspense>;
}
