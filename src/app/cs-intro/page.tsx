"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Star {
  x: number; y: number; z: number;
  baseR: number;
  baseBright: number;
  twinklePhase: number;
  twinkleSpeed: number;
  fadeIn: number;
  hexColor: string; // precomputed css hex/rgb string
}

interface NeuralNode {
  id: number;
  x: number; y: number;
  r: number;
  conns: number[];
  fadeIn: number;
  pulseOff: number;
  hexColor: string;
}

interface Signal {
  from: number; to: number;
  t: number;
  speed: number;
  hexColor: string;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  baseAlpha: number;
  hexColor: string;
  fadeIn: number;
}

interface SpherePoint {
  phi: number;
  theta: number;
  r: number;
  fadeIn: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE  (CSS color strings — precomputed so no per-frame string building)
// ─────────────────────────────────────────────────────────────────────────────

const HEX = {
  cyan:   "#00d4ff",
  blue:   "#3b6ef0",
  purple: "#a855f7",
  white:  "#e8e8ef",
} as const;

type Hue = keyof typeof HEX;

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO ENGINE
// PLACEHOLDER: Replace createAmbientDrone() with /public/audio/cs-ambient.ogg
// PLACEHOLDER: Replace startNarration() with /public/audio/cs-narration.mp3
// ─────────────────────────────────────────────────────────────────────────────

function createAmbientDrone(ctx: AudioContext): () => void {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 5);
  master.connect(ctx.destination);

  // Open-fifth stack A1–E2–A2–E3–A3
  const layers = [
    { freq: 55.0, g: 0.38 }, { freq: 82.41, g: 0.30 },
    { freq: 110.0, g: 0.24 }, { freq: 164.81, g: 0.14 }, { freq: 220.0, g: 0.07 },
  ];

  const pairs: { osc: OscillatorNode; lfo: OscillatorNode }[] = [];

  layers.forEach(({ freq, g }, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = freq;

    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.11 + i * 0.03;
    lfoG.gain.value = freq * 0.0025;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);
    lfo.start();

    filter.type = "lowpass";
    filter.frequency.value = 520;
    gain.gain.value = g;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    pairs.push({ osc, lfo });
  });

  // Shimmer pad at 8 s
  setTimeout(() => {
    if (ctx.state === "closed") return;
    const sh = ctx.createOscillator();
    const shG = ctx.createGain();
    sh.type = "sine";
    sh.frequency.value = 880;
    shG.gain.setValueAtTime(0, ctx.currentTime);
    shG.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 4);
    sh.connect(shG);
    shG.connect(master);
    sh.start();
  }, 8000);

  return () => {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
    setTimeout(() => pairs.forEach(({ osc, lfo }) => { try { osc.stop(); lfo.stop(); } catch {} }), 3200);
  };
}

// PLACEHOLDER: load /public/audio/cs-narration.mp3 here instead
function startNarration(onLine: (n: number) => void): () => void {
  const synth = window.speechSynthesis;
  const lines = [
    { text: "Welcome", delay: 0 },
    { text: "to the World", delay: 2400 },
    { text: "of Computer Science", delay: 5000 },
  ];
  const timers: ReturnType<typeof setTimeout>[] = [];

  function speak() {
    const voices = synth.getVoices();
    const v =
      voices.find((v) => ["Daniel", "Alex", "Tom", "Rishi"].includes(v.name)) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];

    lines.forEach(({ text, delay }, i) => {
      const tid = setTimeout(() => {
        const u = new SpeechSynthesisUtterance(text);
        if (v) u.voice = v;
        u.pitch = 0.62; u.rate = 0.58; u.volume = 0.92;
        onLine(i);
        synth.speak(u);
      }, delay);
      timers.push(tid);
    });
  }

  synth.getVoices().length === 0
    ? synth.addEventListener("voiceschanged", speak, { once: true })
    : speak();

  return () => { timers.forEach(clearTimeout); synth.cancel(); };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS ENGINE  (performance-first design)
//
// Key rules that keep this at 60fps:
//   1. ZERO ctx.shadowBlur — replaced with a 2-circle fake-glow (halo + core).
//   2. ctx.save()/restore() called ONCE per render type, never per element.
//   3. globalCompositeOperation set ONCE per batch.
//   4. globalAlpha per element is fine (cheap register write).
//   5. Sphere reduced to 300 pts; particles to 280; stars to 180.
// ─────────────────────────────────────────────────────────────────────────────

class CinematicEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private W = 0; private H = 0;
  private raf = 0;
  private t0 = 0;
  private running = false;
  private mobile = false;

  private stars: Star[] = [];
  private nodes: NeuralNode[] = [];
  private signals: Signal[] = [];
  private particles: Particle[] = [];
  private sphere: SpherePoint[] = [];

  // Precomputed per-color RGBA strings so we never build strings in the hot loop
  private halos: Record<Hue, string> = {
    cyan:   "rgba(0,212,255,",
    blue:   "rgba(59,110,240,",
    purple: "rgba(168,85,247,",
    white:  "rgba(232,232,239,",
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.resize();
    this.mobile = this.W < 768;
    this.buildStars();
    this.buildNodes();
    this.buildSphere();
    this.buildParticles();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.canvas.style.width = `${this.W}px`;
    this.canvas.style.height = `${this.H}px`;
    this.ctx.scale(dpr, dpr);
  }

  private rand(min: number, max: number) { return min + Math.random() * (max - min); }

  private buildStars() {
    const count = this.mobile ? 110 : 180;
    const palette: Hue[] = ["white", "white", "white", "cyan", "blue"];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: this.rand(0, this.W),
        y: this.rand(0, this.H),
        z: Math.random(),
        baseR: this.rand(0.3, 1.7),
        baseBright: this.rand(0.25, 0.9),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: this.rand(0.2, 1.0),
        fadeIn: 0,
        hexColor: HEX[palette[Math.floor(Math.random() * palette.length)]],
      });
    }
  }

  private buildNodes() {
    const count = this.mobile ? 20 : 34;
    const m = 90;
    const palette: Hue[] = ["cyan", "blue", "purple"];
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        id: i,
        x: this.rand(m, this.W - m),
        y: this.rand(m, this.H - m),
        r: this.rand(1.6, 3.4),
        conns: [],
        fadeIn: 0,
        pulseOff: Math.random() * Math.PI * 2,
        hexColor: HEX[palette[Math.floor(Math.random() * palette.length)]],
      });
    }
    this.nodes.forEach((node, i) => {
      const sorted = this.nodes
        .map((n, j) => ({ j, d: Math.hypot(n.x - node.x, n.y - node.y) }))
        .filter(({ j }) => j !== i)
        .sort((a, b) => a.d - b.d);
      node.conns = sorted.slice(0, 2 + Math.floor(Math.random() * 3)).map(({ j }) => j);
    });
  }

  private buildSphere() {
    const count = this.mobile ? 200 : 300;
    const golden = (1 + Math.sqrt(5)) / 2;
    const r = Math.min(this.W, this.H) * 0.30;
    for (let i = 0; i < count; i++) {
      this.sphere.push({
        phi: Math.acos(1 - (2 * i) / count),
        theta: 2 * Math.PI * golden * i,
        r,
        fadeIn: 0,
      });
    }
  }

  private buildParticles() {
    const count = this.mobile ? 160 : 280;
    const palette: Hue[] = ["cyan", "cyan", "blue", "purple"];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = this.rand(0.10, 0.26);
      this.particles.push({
        x: this.rand(0, this.W),
        y: this.rand(0, this.H),
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        r: this.rand(0.4, 1.5),
        baseAlpha: this.rand(0.06, 0.38),
        hexColor: HEX[palette[Math.floor(Math.random() * palette.length)]],
        fadeIn: 0,
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now();
    this.loop();
  }

  private loop() {
    this.raf = requestAnimationFrame(() => this.loop());
    const t = (performance.now() - this.t0) / 1000;
    this.update(t);
    this.draw(t);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  private update(t: number) {
    const n = this.stars.length;
    this.stars.forEach((s, i) => {
      s.fadeIn = Math.min(1, Math.max(0, (t - i * (3 / n)) / 1.2));
    });

    const nn = this.nodes.length;
    this.nodes.forEach((node, i) => {
      node.fadeIn = Math.min(1, Math.max(0, (t - 3 - i * (2 / nn)) / 0.6));
    });

    const sn = this.sphere.length;
    this.sphere.forEach((sp, i) => {
      sp.fadeIn = Math.min(1, Math.max(0, (t - 6 - i * (2 / sn)) / 0.8));
    });

    const pn = this.particles.length;
    this.particles.forEach((p, i) => {
      p.fadeIn = Math.min(1, Math.max(0, (t - 4 - i * (1.5 / pn)) / 1.5));
      p.x += p.vx; p.y += p.vy;
      if (p.x < -2) p.x = this.W + 2;
      if (p.x > this.W + 2) p.x = -2;
      if (p.y < -2) p.y = this.H + 2;
      if (p.y > this.H + 2) p.y = -2;
    });

    if (t > 5 && this.signals.length < 16) {
      if (Math.random() < 0.06) {
        const node = this.nodes[Math.floor(Math.random() * this.nodes.length)];
        if (node.conns.length > 0 && node.fadeIn > 0.4) {
          const toId = node.conns[Math.floor(Math.random() * node.conns.length)];
          const col: Hue[] = ["cyan", "blue", "purple"];
          this.signals.push({
            from: node.id, to: toId, t: 0,
            speed: this.rand(0.007, 0.014),
            hexColor: HEX[col[Math.floor(Math.random() * col.length)]],
          });
        }
      }
    }
    this.signals = this.signals.filter(sig => { sig.t += sig.speed; return sig.t <= 1; });
  }

  // ── Draw (batched — zero shadowBlur) ───────────────────────────────────────

  private draw(t: number) {
    const ctx = this.ctx;
    const W = this.W; const H = this.H;

    // Slow camera drift
    const cx = Math.sin(t * 0.11) * 13;
    const cy = Math.sin(t * 0.08 + 0.6) * 8;

    // Partial clear → trail / motion-blur feel
    ctx.fillStyle = "#0b0b0f";
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    if (t < 0.3) {
      ctx.fillStyle = "#0b0b0f";
      ctx.fillRect(0, 0, W, H);
    }

    this.drawNebulae(ctx, t, W, H);
    this.drawStars(ctx, t, cx, cy);
    this.drawParticles(ctx, cx * 0.5, cy * 0.5);
    this.drawNet(ctx, t, cx * 0.85, cy * 0.85);
    this.drawSphere(ctx, t, cx * 0.4, cy * 0.4);
    this.drawVignette(ctx, W, H);
  }

  // ── Nebulae — pure radial gradient fills, virtually free ──────────────────

  private drawNebulae(ctx: CanvasRenderingContext2D, t: number, W: number, H: number) {
    const drift = Math.sin(t * 0.055) * 20;
    const clouds = [
      { x: W * 0.28 + drift, y: H * 0.38, r: H * 0.50, ra: this.halos.blue,   a: 0.028 },
      { x: W * 0.72 - drift, y: H * 0.62, r: H * 0.44, ra: this.halos.purple, a: 0.022 },
      { x: W * 0.50,         y: H * 0.50, r: H * 0.60, ra: this.halos.cyan,   a: 0.016 },
    ];
    clouds.forEach(({ x, y, r, ra, a }) => {
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `${ra}${a})`);
      grd.addColorStop(1, `${ra}0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, this.W, this.H);
    });
  }

  // ── Stars: one save/restore for the whole batch ───────────────────────────
  // Fake glow = 1 large transparent arc (halo) + 1 small bright arc (core).
  // NO shadowBlur.

  private drawStars(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    this.stars.forEach((s) => {
      if (s.fadeIn < 0.01) return;
      const twinkle = 0.72 + 0.28 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
      const a = s.baseBright * twinkle * s.fadeIn;
      const x = s.x + cx * s.z * 0.35;
      const y = s.y + cy * s.z * 0.35;
      const r = s.baseR * (0.5 + s.z * 0.5);

      ctx.fillStyle = s.hexColor;

      // Halo
      ctx.globalAlpha = a * 0.10;
      ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();

      // Core
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Neural net: connections → signals → nodes; ONE save/restore block ─────

  private drawNet(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // Connections — drawn as one big path per opacity level would be ideal,
    // but because each connection has unique alpha we keep individual strokes.
    // Still only ONE composite-op set instead of per-element.
    ctx.lineWidth = 0.65;
    this.nodes.forEach((node) => {
      if (node.fadeIn < 0.02) return;
      node.conns.forEach((toId) => {
        const to = this.nodes[toId];
        if (!to || to.fadeIn < 0.02) return;
        const a = Math.min(node.fadeIn, to.fadeIn) * 0.20;
        ctx.globalAlpha = a;
        ctx.strokeStyle = "#00d4ff";
        ctx.beginPath();
        ctx.moveTo(node.x + cx, node.y + cy);
        ctx.lineTo(to.x + cx, to.y + cy);
        ctx.stroke();
      });
    });

    // Signals — two-circle fake glow
    this.signals.forEach((sig) => {
      const from = this.nodes[sig.from]; const to = this.nodes[sig.to];
      if (!from || !to) return;
      const x = from.x + (to.x - from.x) * sig.t + cx;
      const y = from.y + (to.y - from.y) * sig.t + cy;

      ctx.fillStyle = sig.hexColor;
      ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    });

    // Nodes
    this.nodes.forEach((node) => {
      if (node.fadeIn < 0.02) return;
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.4 + node.pulseOff);
      const a = node.fadeIn * pulse;
      const x = node.x + cx; const y = node.y + cy;
      const r = node.r * (0.85 + 0.15 * pulse);

      ctx.fillStyle = node.hexColor;
      ctx.globalAlpha = a * 0.15;
      ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Sphere: one save/restore, no shadowBlur ───────────────────────────────

  private drawSphere(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number) {
    if (t < 5.5) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const ox = this.W / 2 + cx;
    const oy = this.H / 2 + cy;
    const rotY = t * 0.14;
    const tilt = Math.sin(t * 0.065) * 0.28;
    const cosTilt = Math.cos(tilt); const sinTilt = Math.sin(tilt);

    this.sphere.forEach((sp) => {
      if (sp.fadeIn < 0.01) return;
      const sinPhi = Math.sin(sp.phi);
      let x3 = sp.r * sinPhi * Math.cos(sp.theta + rotY);
      let y3 = sp.r * Math.cos(sp.phi);
      let z3 = sp.r * sinPhi * Math.sin(sp.theta + rotY);

      const y3t = y3 * cosTilt - z3 * sinTilt;
      const z3t = y3 * sinTilt + z3 * cosTilt;
      y3 = y3t; z3 = z3t;

      const camZ = sp.r * 3.2;
      const scale = camZ / (camZ + z3);
      const sx = ox + x3 * scale;
      const sy = oy + y3 * scale;
      const depth = (z3 + sp.r) / (2 * sp.r);
      const a = sp.fadeIn * (0.10 + depth * 0.55);
      const color = depth > 0.62 ? "#00d4ff" : depth > 0.34 ? "#3b6ef0" : "#a855f7";
      const coreR = Math.max(0.5, 1.1 * scale);

      ctx.fillStyle = color;
      ctx.globalAlpha = a * 0.10;
      ctx.beginPath(); ctx.arc(sx, sy, coreR * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(sx, sy, coreR, 0, Math.PI * 2); ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Ambient particles: one pass ───────────────────────────────────────────

  private drawParticles(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    this.particles.forEach((p) => {
      if (p.fadeIn < 0.02) return;
      const a = p.baseAlpha * p.fadeIn;
      const x = p.x + cx * 0.2; const y = p.y + cy * 0.2;

      ctx.fillStyle = p.hexColor;
      ctx.globalAlpha = a * 0.08;
      ctx.beginPath(); ctx.arc(x, y, p.r * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Vignette ──────────────────────────────────────────────────────────────

  private drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.90);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(11,11,15,0.78)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.running = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LETTER REVEAL
// No CSS filter:blur — the animation is opacity + translateY only.
// This keeps the GPU compositor free during the canvas peak load.
// ─────────────────────────────────────────────────────────────────────────────

function LetterReveal({
  text,
  show,
  delay = 0,
}: {
  text: string;
  show: boolean;
  delay?: number;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
        >
          {text.split("").map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1.4,
                delay: delay + i * 0.05,
                ease: [0.13, 1, 0.3, 1],
              }}
              style={{ display: "inline-block", whiteSpace: "pre" }}
            >
              {char}
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CSIntroPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CinematicEngine | null>(null);
  const stopDroneRef = useRef<(() => void) | null>(null);
  const stopNarrationRef = useRef<(() => void) | null>(null);
  const exitingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [line0, setLine0] = useState(false);
  const [line1, setLine1] = useState(false);
  const [line2, setLine2] = useState(false);
  const [showEnter, setShowEnter] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CinematicEngine(canvasRef.current);
    engineRef.current = engine;
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      engine.destroy();
      window.removeEventListener("resize", onResize);
      timersRef.current.forEach(clearTimeout);
      stopDroneRef.current?.();
      stopNarrationRef.current?.();
    };
  }, []);

  const doExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    stopDroneRef.current?.();
    stopNarrationRef.current?.();
    setExiting(true);
    const t = setTimeout(() => router.replace("/dashboard/study"), 1600);
    timersRef.current.push(t);
  }, [router]);

  const handleBegin = useCallback(() => {
    setAudioEnabled(true);
    engineRef.current?.start();

    try {
      const actx = new AudioContext();
      stopDroneRef.current = createAmbientDrone(actx);
    } catch { /* silently continue */ }

    const t1 = setTimeout(() => {
      stopNarrationRef.current = startNarration((i) => {
        if (i === 0) setLine0(true);
        if (i === 1) setLine1(true);
        if (i === 2) setLine2(true);
      });
    }, 6000);

    const t2 = setTimeout(() => setShowEnter(true), 15000);
    const t3 = setTimeout(() => doExit(), 22000);
    timersRef.current.push(t1, t2, t3);
  }, [doExit]);

  useEffect(() => {
    if (!audioEnabled) return;
    const onKey = () => doExit();
    window.addEventListener("keydown", onKey, { once: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [audioEnabled, doExit]);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0b0b0f" }}
      className="select-none"
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />

      {/* ── Audio prompt ── */}
      <AnimatePresence>
        {!audioEnabled && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.button
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 1, ease: [0.13, 1, 0.3, 1] }}
              onClick={handleBegin}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", background: "none", border: "none", cursor: "pointer" }}
              className="group"
            >
              <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <motion.div
                  animate={{ scale: [1, 1.65], opacity: [0.45, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(0,212,255,0.5)" }}
                />
                <motion.div
                  animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.55 }}
                  style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(0,212,255,0.35)" }}
                />
                <div style={{
                  width: 54, height: 54, borderRadius: "50%",
                  background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.55)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(12px)",
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M6 4l8 5-8 5V4z" fill="rgba(0,212,255,0.9)" />
                  </svg>
                </div>
              </div>
              <span style={{
                fontSize: "0.6rem", letterSpacing: "0.35em",
                color: "rgba(232,232,239,0.28)", textTransform: "uppercase",
                fontFamily: "var(--font-geist-sans)",
              }}
                className="group-hover:!text-[rgba(232,232,239,0.65)] transition-colors duration-300"
              >
                Click to Begin
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Title text ── */}
      <AnimatePresence>
        {audioEnabled && !exiting && (
          <motion.div
            key="text"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "0 1.5rem",
            }}
          >
            <div style={{
              textAlign: "center",
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontWeight: 300, lineHeight: 1.1,
            }}>
              <div style={{ fontSize: "clamp(2.4rem,7vw,5.5rem)", color: "rgba(232,232,239,0.92)", marginBottom: "0.25em" }}>
                <LetterReveal text="Welcome" show={line0} delay={0} />
              </div>
              <div style={{ fontSize: "clamp(1.5rem,4.5vw,3.5rem)", color: "rgba(232,232,239,0.60)", marginBottom: "0.15em" }}>
                <LetterReveal text="to the World" show={line1} delay={0.15} />
              </div>
              <div style={{
                fontSize: "clamp(1.8rem,5.5vw,4.2rem)",
                color: "#00d4ff",
                marginTop: "0.1em",
                textShadow: "0 0 40px rgba(0,212,255,0.45)",
              }}>
                <LetterReveal text="of Computer Science" show={line2} delay={0.12} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Enter cue ── */}
      <AnimatePresence>
        {showEnter && !exiting && (
          <motion.button
            key="enter"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.13, 1, 0.3, 1] }}
            onClick={doExit}
            style={{
              position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
              background: "none", border: "none", cursor: "pointer",
            }}
            className="group"
          >
            <motion.div
              animate={{ height: [32, 48, 32] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 1, background: "linear-gradient(to bottom,transparent,rgba(0,212,255,0.55),transparent)" }}
            />
            <span style={{
              fontSize: "0.6rem", letterSpacing: "0.45em", textTransform: "uppercase",
              color: "rgba(232,232,239,0.22)", fontFamily: "var(--font-geist-sans)",
            }}
              className="group-hover:!text-[rgba(0,212,255,0.7)] transition-colors duration-300"
            >
              Enter
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Skip ── */}
      <AnimatePresence>
        {audioEnabled && !exiting && !showEnter && (
          <motion.button
            key="skip"
            initial={{ opacity: 0 }} animate={{ opacity: 0.22 }}
            whileHover={{ opacity: 0.6 }} exit={{ opacity: 0 }}
            transition={{ delay: 3, duration: 1 }}
            onClick={doExit}
            style={{
              position: "absolute", top: "1.5rem", right: "2rem",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.58rem", letterSpacing: "0.35em",
              color: "rgba(232,232,239,1)", textTransform: "uppercase",
              fontFamily: "var(--font-geist-sans)",
            }}
          >
            Skip
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Exit veil ── */}
      <AnimatePresence>
        {exiting && (
          <motion.div
            key="exit"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1.6, ease: "easeIn" }}
            style={{ position: "absolute", inset: 0, background: "#0b0b0f" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
