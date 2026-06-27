// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER DEFINITIONS & CANVAS RENDERERS
// Each chapter is a self-contained cinematic world.
// Renderers follow the same performance rules as the intro:
//   • Zero ctx.shadowBlur (fake glow = halo circle + core circle)
//   • One save()/restore() per visual layer, never per element
//   • globalAlpha per element is fine (cheap register write)
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChapterConfig {
  id: number;
  title: string;
  subtitle: string;
  bg: string;       // background clear color (CSS hex)
  accent: string;   // primary accent (CSS hex)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Entities = Record<string, any>;

// ── Shared helpers ───────────────────────────────────────────────────────────

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, col: string) {
  const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, h * 0.88);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(0.65, "rgba(0,0,0,0.18)");
  grd.addColorStop(1, col + "cc");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
  ctx.fillStyle = col;
  ctx.globalAlpha = a * 0.12;
  ctx.beginPath(); ctx.arc(x, y, r * 3.8, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// ── Chapter 0 — Welcome ──────────────────────────────────────────────────────
// Warm amber starfield; echoes the cs-intro palette so the transition is seamless.

function initWelcome(w: number, h: number): Entities {
  return {
    stars: Array.from({ length: 220 }, () => ({
      x: rnd(0, w), y: rnd(0, h), z: Math.random(),
      r: rnd(0.3, 1.8), bright: rnd(0.25, 0.9),
      ph: Math.random() * Math.PI * 2, sp: rnd(0.2, 1.0),
      col: ["#fef3c7", "#fbbf24", "#f59e0b"][Math.floor(Math.random() * 3)],
    })),
    pts: Array.from({ length: 260 }, () => ({
      x: rnd(0, w), y: rnd(0, h),
      vx: rnd(-0.15, 0.15), vy: rnd(-0.15, 0.15),
      r: rnd(0.4, 1.4), a: rnd(0.06, 0.35),
      col: ["#f59e0b", "#fbbf24", "#fef3c7"][Math.floor(Math.random() * 3)],
    })),
  };
}

function renderWelcome(ctx: CanvasRenderingContext2D, _p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#0e0a06"; ctx.fillRect(0, 0, w, h);
  // nebulae
  for (const [cx, cy, r, rg] of [[w*.28,h*.38,h*.52,"245,158,11"],[w*.72,h*.62,h*.45,"251,146,60"],[w*.5,h*.5,h*.6,"251,191,36"]] as [number,number,number,string][]) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${rg},0.03)`); g.addColorStop(1, `rgba(${rg},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  ctx.save(); ctx.globalCompositeOperation = "screen";
  e.stars.forEach((s: Entities) => {
    const a = s.bright * (0.72 + 0.28 * Math.sin(t * s.sp + s.ph));
    dot(ctx, s.x + Math.sin(t * 0.11) * s.z * 12, s.y + Math.sin(t * 0.08) * s.z * 8, s.r * (0.5 + s.z * 0.5), s.col, a);
  });
  e.pts.forEach((p: Entities) => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    dot(ctx, p.x, p.y, p.r, p.col, p.a * 0.6);
  });
  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#0e0a06");
}

// ── Chapter 1 — Digital Foundations ─────────────────────────────────────────
// Floating wireframe cubes; bits drifting in 3D perspective.

function initDigitalFoundations(w: number, h: number): Entities {
  return {
    cubes: Array.from({ length: 28 }, () => ({
      x: rnd(0, w), y: rnd(0, h), z: rnd(0.2, 1),
      size: rnd(20, 70), rot: rnd(0, Math.PI * 2), rotSpd: rnd(-0.4, 0.4),
      col: ["#60a5fa", "#06b6d4", "#818cf8"][Math.floor(Math.random() * 3)],
    })),
    bits: Array.from({ length: 180 }, () => ({
      x: rnd(0, w), y: rnd(0, h), z: Math.random(),
      char: Math.random() < 0.5 ? "0" : "1", a: rnd(0.1, 0.5),
      ph: Math.random() * Math.PI * 2,
    })),
  };
}

function renderDigitalFoundations(ctx: CanvasRenderingContext2D, _p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#040810"; ctx.fillRect(0, 0, w, h);
  const drift = Math.sin(t * 0.08) * 20;
  // nebula
  const g = ctx.createRadialGradient(w * 0.5 + drift, h * 0.5, 0, w * 0.5 + drift, h * 0.5, h * 0.6);
  g.addColorStop(0, "rgba(59,130,246,0.06)"); g.addColorStop(1, "rgba(59,130,246,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  ctx.save(); ctx.globalCompositeOperation = "screen";
  // Cubes (wireframe with manual edge drawing)
  e.cubes.forEach((c: Entities) => {
    c.rot += c.rotSpd * 0.016;
    const s = c.size * c.z; const cos = Math.cos(c.rot); const sin = Math.sin(c.rot);
    const pts: [number, number][] = [[-1,-1],[ 1,-1],[ 1, 1],[-1, 1]].map(([px, py]) => [
      c.x + (px * cos - py * sin * 0.5) * s,
      c.y + (px * sin + py * cos * 0.5) * s,
    ]) as [number, number][];
    ctx.globalAlpha = 0.25 * c.z;
    ctx.strokeStyle = c.col; ctx.lineWidth = 0.8;
    ctx.beginPath();
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
    ctx.closePath(); ctx.stroke();
    // "Back face" offset
    ctx.globalAlpha = 0.12 * c.z;
    ctx.beginPath();
    pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px + s * 0.4, py - s * 0.4) : ctx.lineTo(px + s * 0.4, py - s * 0.4));
    ctx.closePath(); ctx.stroke();
  });
  // Floating bits
  ctx.font = "11px 'Courier New', monospace";
  e.bits.forEach((b: Entities) => {
    ctx.globalAlpha = b.a * (0.6 + 0.4 * Math.sin(t + b.ph));
    ctx.fillStyle = "#60a5fa";
    ctx.fillText(b.char, b.x + Math.sin(t * 0.12) * b.z * 15, b.y + Math.cos(t * 0.09) * b.z * 10);
  });
  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#040810");
}

// ── Chapter 2 — Binary & Number Systems ──────────────────────────────────────
// Matrix-style rain of 0s and 1s.

function initBinary(w: number, h: number): Entities {
  const colW = 18;
  return {
    cols: Array.from({ length: Math.ceil(w / colW) }, (_, i) => ({
      x: i * colW + 9,
      y: rnd(-h * 2, 0),
      spd: rnd(40, 110),
      len: Math.floor(rnd(10, 35)),
      alpha: rnd(0.3, 0.85),
      chars: Array.from({ length: 40 }, () => Math.random() < 0.5 ? "0" : "1"),
      flipAt: 0,
    })),
  };
}

function renderBinary(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#000a00"; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalCompositeOperation = "screen";
  ctx.font = "14px 'Courier New', monospace";
  const dt = 1 / 60;
  e.cols.forEach((col: Entities) => {
    col.y += col.spd * dt;
    if (col.y - col.len * 18 > h) col.y = rnd(-h, 0);
    if (t > col.flipAt) { col.flipAt = t + rnd(0.05, 0.3); col.chars[Math.floor(rnd(0, col.chars.length))] = Math.random() < 0.5 ? "0" : "1"; }
    for (let i = 0; i < col.len; i++) {
      const cy = col.y - i * 18;
      if (cy < -18 || cy > h + 18) continue;
      const frac = 1 - i / col.len;
      const isHead = i === 0;
      ctx.globalAlpha = (isHead ? 1 : frac * col.alpha) * p;
      ctx.fillStyle = isHead ? "#ffffff" : (frac > 0.7 ? "#00d97e" : "#006d3e");
      ctx.fillText(col.chars[i % col.chars.length], col.x, cy);
    }
  });
  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#000a00");
}

// ── Chapter 3 — Logic & Boolean Thinking ─────────────────────────────────────
// Logic gates with traveling signal pulses.

type Gate = { x:number; y:number; type:string; inputs:[number,number][]; output:[number,number]; col:string; signal:number; };

function initLogic(w: number, h: number): Entities {
  const types = ["AND", "OR", "NOT", "XOR", "NAND"];
  const gates: Gate[] = Array.from({ length: 14 }, (_, i) => {
    const col = (i % 2 === 0) ? "#c084fc" : "#fb923c";
    return { x: rnd(w * 0.1, w * 0.9), y: rnd(h * 0.1, h * 0.9), type: types[i % types.length], inputs: [[-30,-12],[- 30,12]] as [number,number][], output: [30, 0] as [number,number], col, signal: 0, };
  });
  const pulses: { gateIdx:number; t:number; }[] = [];
  return { gates, pulses };
}

function renderLogic(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#0a0414"; ctx.fillRect(0, 0, w, h);
  const { gates, pulses } = e;

  // Spawn pulses
  if (pulses.length < 20 && Math.random() < 0.06) {
    pulses.push({ gateIdx: Math.floor(Math.random() * gates.length), t: 0 });
  }

  ctx.save(); ctx.globalCompositeOperation = "screen";

  // Draw gates
  gates.forEach((g: Gate) => {
    ctx.globalAlpha = 0.6 * p;
    ctx.strokeStyle = g.col; ctx.lineWidth = 1.2;
    // Gate body (simplified D-shape)
    ctx.beginPath();
    ctx.arc(g.x, g.y, 22, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(g.x - 22, g.y + 22); ctx.lineTo(g.x - 22, g.y - 22); ctx.closePath();
    ctx.stroke();
    // Label
    ctx.globalAlpha = 0.8 * p;
    ctx.fillStyle = g.col;
    ctx.font = "bold 10px 'Courier New'";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(g.type, g.x, g.y);
    // Input/output lines
    ctx.globalAlpha = 0.25 * p; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(g.x - 22, g.y - 12); ctx.lineTo(g.x - 50, g.y - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.x - 22, g.y + 12); ctx.lineTo(g.x - 50, g.y + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.x + 22, g.y); ctx.lineTo(g.x + 50, g.y); ctx.stroke();
  });
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

  // Animate pulses
  for (let i = pulses.length - 1; i >= 0; i--) {
    const pulse = pulses[i]; pulse.t += 0.02;
    const g = gates[pulse.gateIdx];
    const px = g.x - 50 + pulse.t * 100;
    const py = g.y + (pulse.t < 0.5 ? -12 : 0);
    if (pulse.t > 1) { pulses.splice(i, 1); continue; }
    dot(ctx, px, py, 4, g.col, 0.9);
  }

  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#0a0414");
}

// ── Chapter 4 — Algorithms ───────────────────────────────────────────────────
// Real-time bubble sort visualization.

function initAlgorithms(w: number, h: number): Entities {
  const n = 60;
  const arr = Array.from({ length: n }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  return { arr, n, i: 0, j: 0, swapFrame: 0, sorted: 0 };
}

function renderAlgorithms(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#020a04"; ctx.fillRect(0, 0, w, h);
  const { arr, n } = e;

  // Advance sort every ~3 frames
  e.swapFrame++;
  if (e.swapFrame % 2 === 0 && e.sorted < n) {
    if (e.j < n - e.i - 1) {
      if (arr[e.j] > arr[e.j + 1]) { [arr[e.j], arr[e.j + 1]] = [arr[e.j + 1], arr[e.j]]; }
      e.j++;
    } else { e.i++; e.j = 0; if (e.i >= n - 1) e.sorted = n; }
  }

  const barW = w / n;
  const maxH = h * 0.65;
  const baseY = h * 0.75;

  ctx.save(); ctx.globalCompositeOperation = "screen";
  for (let idx = 0; idx < n; idx++) {
    const bh = (arr[idx] / n) * maxH;
    const x = idx * barW + barW * 0.15;
    const isComparing = idx === e.j || idx === e.j + 1;
    const isSorted = e.i > 0 && idx >= n - e.i;
    const col = isSorted ? "#4ade80" : isComparing ? "#fbbf24" : "#166534";
    const alpha = (isSorted ? 0.9 : isComparing ? 1 : 0.5) * p;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    ctx.fillRect(x, baseY - bh, barW * 0.7, bh);
  }
  // Floating label
  ctx.globalAlpha = 0.35 * p;
  ctx.fillStyle = "#4ade80";
  ctx.font = `bold ${Math.floor(h * 0.06)}px 'Courier New'`;
  ctx.textAlign = "center";
  ctx.fillText("O(n²) → O(n log n)", w / 2, h * 0.88);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#020a04");
}

// ── Chapter 5 — Data Structures ──────────────────────────────────────────────
// Animated binary tree that builds itself.

type TreeNode = { x:number; y:number; val:number; left?:TreeNode; right?:TreeNode; fadeIn:number; };

function buildTree(depth: number, x: number, y: number, spread: number, h: number): TreeNode {
  const node: TreeNode = { x, y, val: Math.floor(Math.random() * 99), fadeIn: 0 };
  if (depth > 0) {
    const childY = y + h * 0.12;
    node.left  = buildTree(depth - 1, x - spread, childY, spread * 0.55, h);
    node.right = buildTree(depth - 1, x + spread, childY, spread * 0.55, h);
  }
  return node;
}

function initDataStructures(w: number, h: number): Entities {
  const root = buildTree(4, w / 2, h * 0.10, w * 0.22, h);
  const allNodes: TreeNode[] = [];
  const traverse = (n: TreeNode | undefined, depth: number) => {
    if (!n) return;
    allNodes.push(n);
    traverse(n.left, depth + 1); traverse(n.right, depth + 1);
  };
  traverse(root, 0);
  return { root, allNodes };
}

function drawTree(ctx: CanvasRenderingContext2D, node: TreeNode | undefined, t: number, p: number) {
  if (!node) return;
  node.fadeIn = Math.min(1, node.fadeIn + 0.008);
  const a = node.fadeIn * p;

  if (node.left) {
    ctx.globalAlpha = a * 0.3; ctx.strokeStyle = "#2dd4bf"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(node.left.x, node.left.y); ctx.stroke();
    drawTree(ctx, node.left, t, p);
  }
  if (node.right) {
    ctx.globalAlpha = a * 0.3; ctx.strokeStyle = "#2dd4bf"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(node.right.x, node.right.y); ctx.stroke();
    drawTree(ctx, node.right, t, p);
  }

  const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + node.val);
  dot(ctx, node.x, node.y, 5, "#2dd4bf", a * pulse);
}

function renderDataStructures(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#040a12"; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalCompositeOperation = "screen";
  drawTree(ctx, e.root, t, p);
  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#040a12");
}

// ── Chapter 6 — Computer Architecture ────────────────────────────────────────
// CPU die: a grid of "cells" with electric traces flowing between them.

function initArchitecture(w: number, h: number): Entities {
  const cols = 20; const rows = 12;
  const cw = w / cols; const ch = h / rows;
  const traces: { x1:number; y1:number; x2:number; y2:number; t:number; speed:number; col:string }[] = [];
  for (let i = 0; i < 30; i++) {
    const r = Math.floor(rnd(0, rows)); const c = Math.floor(rnd(0, cols - 1));
    traces.push({ x1: c * cw, y1: r * ch + ch/2, x2: (c+1)*cw, y2: r*ch+ch/2, t: Math.random(), speed: rnd(0.005, 0.015), col: Math.random()<0.5 ? "#fbbf24":"#94a3b8" });
  }
  for (let i = 0; i < 20; i++) {
    const r = Math.floor(rnd(0, rows - 1)); const c = Math.floor(rnd(0, cols));
    traces.push({ x1: c*cw+cw/2, y1: r*ch, x2: c*cw+cw/2, y2: (r+1)*ch, t: Math.random(), speed: rnd(0.005, 0.015), col: Math.random()<0.5 ? "#fbbf24":"#e2e8f0" });
  }
  return { cols, rows, cw, ch, traces };
}

function renderArchitecture(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#0a0806"; ctx.fillRect(0, 0, w, h);
  const { cols, rows, cw, ch, traces } = e;
  ctx.save(); ctx.globalCompositeOperation = "screen";

  // Grid cells
  ctx.globalAlpha = 0.06 * p; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 0.4;
  for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, h); ctx.stroke(); }
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(w, r * ch); ctx.stroke(); }

  // Highlighted blocks (functional units)
  const blocks = [[2,2,4,3,"ALU"],[7,1,4,3,"Cache"],[12,2,5,3,"FPU"],[2,7,4,3,"Ctrl"],[7,6,4,4,"RAM"],[12,6,5,4,"I/O"]];
  blocks.forEach(([c,r,bw,bh,lbl]) => {
    ctx.globalAlpha = 0.08 * p; ctx.fillStyle = "#fbbf24";
    ctx.fillRect((c as number)*cw, (r as number)*ch, (bw as number)*cw, (bh as number)*ch);
    ctx.globalAlpha = 0.4 * p; ctx.fillStyle = "#fbbf24";
    ctx.font = `bold ${Math.floor(cw * 0.7)}px 'Courier New'`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(lbl as string, ((c as number)+(bw as number)/2)*cw, ((r as number)+(bh as number)/2)*ch);
  });
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

  // Electric traces
  traces.forEach((tr: { x1:number; y1:number; x2:number; y2:number; t:number; speed:number; col:string }) => {
    tr.t = (tr.t + tr.speed) % 1;
    const px = lerp(tr.x1, tr.x2, tr.t); const py = lerp(tr.y1, tr.y2, tr.t);
    ctx.globalAlpha = 0.08 * p; ctx.fillStyle = tr.col;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9 * p;
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#0a0806");
}

// ── Chapter 7 — Operating Systems ───────────────────────────────────────────
// Concentric process rings rotating at different speeds; memory blocks.

function initOperatingSystems(w: number, h: number): Entities {
  const rings = [
    { r: h*0.08, spd: 0.8,  n: 4,  col: "#a78bfa", label: "P1" },
    { r: h*0.16, spd: -0.5, n: 6,  col: "#818cf8", label: "P2" },
    { r: h*0.25, spd: 0.3,  n: 8,  col: "#6366f1", label: "P3" },
    { r: h*0.35, spd: -0.2, n: 12, col: "#4f46e5", label: "P4" },
    { r: h*0.44, spd: 0.15, n: 16, col: "#4338ca", label: "P5" },
  ];
  return { rings, cx: w/2, cy: h/2 };
}

function renderOperatingSystems(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#06041a"; ctx.fillRect(0, 0, w, h);
  const { rings, cx, cy } = e;
  ctx.save(); ctx.globalCompositeOperation = "screen";

  rings.forEach((ring: { r:number; spd:number; n:number; col:string; label:string }) => {
    const angle = t * ring.spd;
    // Ring track
    ctx.globalAlpha = 0.08 * p; ctx.strokeStyle = ring.col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2); ctx.stroke();
    // Nodes on ring
    for (let i = 0; i < ring.n; i++) {
      const a = angle + (i / ring.n) * Math.PI * 2;
      const nx = cx + Math.cos(a) * ring.r; const ny = cy + Math.sin(a) * ring.r;
      const pulse = 0.6 + 0.4 * Math.sin(t * 2 + i);
      dot(ctx, nx, ny, 3.5, ring.col, 0.7 * p * pulse);
    }
    // Leading thread line
    const la = angle; const la2 = angle + 0.4;
    ctx.globalAlpha = 0.3 * p; ctx.strokeStyle = ring.col; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, la2, la); ctx.stroke();
  });

  // Center CPU indicator
  dot(ctx, cx, cy, 18, "#a78bfa", 0.5 * p);
  ctx.globalAlpha = 0.6 * p; ctx.fillStyle = "#a78bfa";
  ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("CPU", cx, cy);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#06041a");
}

// ── Chapter 8 — Networking & The Internet ────────────────────────────────────
// Network graph with animated packet routing.

type NetNode = { x:number; y:number; conns:number[]; col:string; pulse:number; };
type Packet = { fromIdx:number; toIdx:number; t:number; speed:number; };

function initNetworking(w: number, h: number): Entities {
  const nodes: NetNode[] = Array.from({ length: 20 }, () => ({
    x: rnd(w*0.08, w*0.92), y: rnd(h*0.1, h*0.85),
    conns: [], col: Math.random()<0.2 ? "#22d3ee" : "#0891b2",
    pulse: Math.random() * Math.PI * 2,
  }));
  // Connect each node to 2-3 nearest
  nodes.forEach((n, i) => {
    const sorted = nodes.map((m, j) => ({ j, d: Math.hypot(m.x-n.x, m.y-n.y) })).filter(({j}) => j!==i).sort((a,b)=>a.d-b.d);
    n.conns = sorted.slice(0, 2 + Math.floor(Math.random() * 2)).map(({j}) => j);
  });
  const packets: Packet[] = Array.from({ length: 10 }, () => ({
    fromIdx: Math.floor(Math.random() * nodes.length),
    toIdx: Math.floor(Math.random() * nodes.length),
    t: Math.random(), speed: rnd(0.004, 0.010),
  }));
  return { nodes, packets };
}

function renderNetworking(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#021010"; ctx.fillRect(0, 0, w, h);
  const { nodes, packets } = e;
  ctx.save(); ctx.globalCompositeOperation = "screen";

  // Connections
  nodes.forEach((n: NetNode, i: number) => {
    n.conns.forEach((j: number) => {
      if (j <= i) return;
      const m = nodes[j];
      ctx.globalAlpha = 0.12 * p; ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
    });
  });

  // Nodes
  nodes.forEach((n: NetNode) => {
    const pulse = 0.65 + 0.35 * Math.sin(t * 1.5 + n.pulse);
    dot(ctx, n.x, n.y, 5, n.col, 0.8 * p * pulse);
  });

  // Packets
  packets.forEach((pk: Packet) => {
    pk.t += pk.speed;
    if (pk.t > 1) { pk.t = 0; pk.fromIdx = pk.toIdx; pk.toIdx = Math.floor(Math.random() * nodes.length); }
    const from = nodes[pk.fromIdx]; const to = nodes[pk.toIdx];
    if (!from || !to) return;
    const px = lerp(from.x, to.x, pk.t); const py = lerp(from.y, to.y, pk.t);
    dot(ctx, px, py, 3.5, "#22d3ee", 0.95 * p);
  });

  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#021010");
}

// ── Chapter 9 — Databases ────────────────────────────────────────────────────
// Cascading data rows streaming into tables.

function initDatabases(w: number, h: number): Entities {
  const cols = ["id", "name", "email", "score", "active"];
  const rows: { vals:string[]; y:number; speed:number; alpha:number }[] = Array.from({ length: 24 }, () => ({
    vals: cols.map((c) => c === "id" ? String(Math.floor(rnd(1, 999))) : c === "score" ? String(Math.floor(rnd(0, 100))) : c === "active" ? (Math.random()<0.7?"true":"false") : "████"),
    y: rnd(0, h), speed: rnd(12, 35), alpha: rnd(0.3, 0.8),
  }));
  return { cols, rows, colW: w / (cols.length + 1) };
}

function renderDatabases(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#0d0600"; ctx.fillRect(0, 0, w, h);
  const { cols, rows, colW } = e;
  ctx.save(); ctx.globalCompositeOperation = "screen";
  ctx.font = "13px 'Courier New', monospace";

  // Header
  ctx.globalAlpha = 0.5 * p; ctx.fillStyle = "#fb923c";
  cols.forEach((c: string, i: number) => ctx.fillText(c.toUpperCase(), (i + 0.5) * colW, h * 0.08));

  // Header line
  ctx.globalAlpha = 0.25 * p; ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(colW * 0.2, h * 0.1); ctx.lineTo(w - colW * 0.2, h * 0.1); ctx.stroke();

  // Rows
  rows.forEach((row: Entities) => {
    row.y += row.speed * (1/60);
    if (row.y > h + 30) row.y = -30;
    const isActive = Math.sin(t * 0.5 + row.y * 0.01) > 0.7;
    row.vals.forEach((val: string, i: number) => {
      ctx.globalAlpha = row.alpha * p * (isActive ? 1 : 0.4);
      ctx.fillStyle = isActive ? "#fbbf24" : "#f97316";
      ctx.fillText(val, (i + 0.5) * colW, row.y);
    });
  });

  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#0d0600");
}

// ── Chapter 10 — Programming Languages ──────────────────────────────────────
// Colored keyword rain — each language has a distinct hue.

const LANG_KEYWORDS: [string, string][] = [
  ["def","#f7cc2a"],["class","#f7cc2a"],["import","#f7cc2a"],   // Python
  ["const","#61afef"],["async","#61afef"],["=>","#61afef"],     // JS/TS
  ["struct","#ff7c7c"],["fn","#ff7c7c"],["match","#ff7c7c"],    // Rust
  ["func","#00ADD8"],["goroutine","#00ADD8"],["chan","#00ADD8"], // Go
  ["public","#b07219"],["class","#b07219"],["void","#b07219"],  // Java
  ["SELECT","#f59e0b"],["FROM","#f59e0b"],["WHERE","#f59e0b"],  // SQL
  ["if","#a8d8ff"],["else","#a8d8ff"],["return","#a8d8ff"],     // Generic
];

function initProgramming(w: number, h: number): Entities {
  return {
    tokens: Array.from({ length: 80 }, () => {
      const [kw, col] = LANG_KEYWORDS[Math.floor(Math.random() * LANG_KEYWORDS.length)];
      return { x: rnd(0, w), y: rnd(-h, h), spd: rnd(20, 60), col, kw, alpha: rnd(0.25, 0.85), ph: Math.random()*Math.PI*2 };
    }),
  };
}

function renderProgramming(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#050508"; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalCompositeOperation = "screen";
  ctx.font = "16px 'Courier New', monospace";

  e.tokens.forEach((tok: Entities) => {
    tok.y += tok.spd * (1/60);
    if (tok.y > h + 20) { tok.y = -20; tok.x = rnd(0, w); }
    const a = tok.alpha * (0.7 + 0.3 * Math.sin(t * 1.2 + tok.ph)) * p;
    ctx.globalAlpha = a * 0.12; ctx.fillStyle = tok.col;
    ctx.fillText(tok.kw, tok.x - 4, tok.y + 4);
    ctx.globalAlpha = a;
    ctx.fillText(tok.kw, tok.x, tok.y);
  });

  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#050508");
}

// ── Chapter 11 — Artificial Intelligence ────────────────────────────────────
// Neural network with firing synapses.

type ANNode = { x:number; y:number; act:number; ph:number; };
type ANConn = { ax:number; ay:number; bx:number; by:number; w:number; sig:number; };

function initAI(w: number, h: number): Entities {
  const layerSizes = [5, 9, 12, 9, 4];
  const nodes: ANNode[] = [];
  const conns: ANConn[] = [];
  const lw = w / (layerSizes.length + 1);

  layerSizes.forEach((count, li) => {
    const lh = h / (count + 1);
    for (let ni = 0; ni < count; ni++) {
      const x = lw * (li + 1); const y = lh * (ni + 1);
      nodes.push({ x, y, act: Math.random(), ph: Math.random() * Math.PI * 2 });
      if (li < layerSizes.length - 1) {
        for (let nni = 0; nni < layerSizes[li + 1]; nni++) {
          const ny = (h / (layerSizes[li + 1] + 1)) * (nni + 1);
          conns.push({ ax: x, ay: y, bx: lw * (li + 2), by: ny, w: Math.random() - 0.5, sig: Math.random() });
        }
      }
    }
  });
  return { nodes, conns };
}

function renderAI(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#0a0212"; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalCompositeOperation = "screen";

  // Connections
  ctx.lineWidth = 0.5;
  e.conns.forEach((c: ANConn) => {
    c.sig = (c.sig + 0.006) % 1;
    const alpha = Math.abs(c.w) * 0.25 * p;
    ctx.globalAlpha = alpha; ctx.strokeStyle = c.w > 0 ? "#e879f9" : "#a78bfa";
    ctx.beginPath(); ctx.moveTo(c.ax, c.ay); ctx.lineTo(c.bx, c.by); ctx.stroke();
    // Signal dot traveling
    const sx = lerp(c.ax, c.bx, c.sig); const sy = lerp(c.ay, c.by, c.sig);
    dot(ctx, sx, sy, 2.5, c.w > 0 ? "#f0abfc" : "#c4b5fd", 0.7 * p);
  });

  // Nodes
  e.nodes.forEach((n: ANNode) => {
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.5 + n.ph);
    dot(ctx, n.x, n.y, 5.5, "#e879f9", n.act * pulse * p);
  });

  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#0a0212");
}

// ── Chapter 12 — Distributed Systems ─────────────────────────────────────────
// Server cluster with load-balanced traffic.

type SrvNode = { x:number; y:number; load:number; primary:boolean; };
type Traffic = { from:number; to:number; t:number; speed:number; };

function initDistributed(w: number, h: number): Entities {
  const grid = 4; const gw = w / (grid + 1); const gh = h / (grid + 1);
  const servers: SrvNode[] = [];
  for (let r = 0; r < grid; r++) for (let c = 0; c < grid; c++) {
    servers.push({ x: gw * (c + 1), y: gh * (r + 1), load: Math.random(), primary: r === 1 && c === 1 });
  }
  const traffic: Traffic[] = Array.from({ length: 15 }, () => ({
    from: Math.floor(Math.random() * servers.length),
    to:   Math.floor(Math.random() * servers.length),
    t: Math.random(), speed: rnd(0.005, 0.012),
  }));
  return { servers, traffic };
}

function renderDistributed(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#020d06"; ctx.fillRect(0, 0, w, h);
  const { servers, traffic } = e;
  ctx.save(); ctx.globalCompositeOperation = "screen";

  // Mesh connections
  servers.forEach((s: SrvNode, i: number) => {
    servers.forEach((m: SrvNode, j: number) => {
      if (j <= i || Math.random() > 0.3) return;
      ctx.globalAlpha = 0.06 * p; ctx.strokeStyle = "#34d399"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(m.x, m.y); ctx.stroke();
    });
  });

  // Traffic
  traffic.forEach((tr: Traffic) => {
    tr.t += tr.speed; if (tr.t > 1) { tr.t = 0; tr.from = tr.to; tr.to = Math.floor(Math.random() * servers.length); }
    const fs = servers[tr.from]; const ts = servers[tr.to];
    if (!fs || !ts) return;
    const px = lerp(fs.x, ts.x, tr.t); const py = lerp(fs.y, ts.y, tr.t);
    dot(ctx, px, py, 3, "#34d399", 0.9 * p);
  });

  // Server nodes
  servers.forEach((s: SrvNode) => {
    s.load = 0.5 + 0.5 * Math.sin(t * 1.5 + s.x * 0.01);
    const col = s.primary ? "#10b981" : "#34d399";
    dot(ctx, s.x, s.y, s.primary ? 9 : 6, col, 0.8 * p);
    // Load indicator bar
    ctx.globalAlpha = 0.4 * p; ctx.fillStyle = col;
    ctx.fillRect(s.x - 12, s.y + 12, 24 * s.load, 3);
  });

  ctx.globalAlpha = 1; ctx.restore();
  drawVignette(ctx, w, h, "#020d06");
}

// ── Chapter 13 — The Future of Computing ─────────────────────────────────────
// Particle vortex converging to a glowing singularity.

function initFuture(w: number, h: number): Entities {
  const n = 400;
  return {
    pts: Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2 * 12;
      const rad = rnd(50, Math.min(w, h) * 0.45);
      return {
        ox: w/2 + Math.cos(angle) * rad, oy: h/2 + Math.sin(angle) * rad,
        x: rnd(0, w), y: rnd(0, h),
        hue: i * 0.9,
        r: rnd(0.5, 2.5), alpha: rnd(0.4, 1.0),
        speed: rnd(0.005, 0.025),
      };
    }),
  };
}

function renderFuture(ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) {
  ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalCompositeOperation = "screen";

  // Vortex: pts orbit center and slowly converge
  const warp = 0.3 + p * 0.7;
  e.pts.forEach((pt: Entities, i: number) => {
    const orbitA = t * 0.6 + (i / e.pts.length) * Math.PI * 2 * 3;
    const orbitR = lerp(Math.min(w, h) * 0.42, 30, Math.min(1, p * 1.5)) * (0.85 + 0.15 * Math.sin(i));
    pt.x = lerp(pt.x, w/2 + Math.cos(orbitA) * orbitR, pt.speed * warp);
    pt.y = lerp(pt.y, h/2 + Math.sin(orbitA) * orbitR, pt.speed * warp);

    const hue = (pt.hue + t * 30) % 360;
    const col = `hsl(${hue},100%,70%)`;
    ctx.fillStyle = col;
    ctx.globalAlpha = pt.alpha * 0.08;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = pt.alpha * p;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
  });

  // Central glow
  const grd = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 60 + p * 40);
  grd.addColorStop(0, `rgba(255,255,255,${0.4 * p})`);
  grd.addColorStop(0.4, `rgba(255,200,50,${0.15 * p})`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 1; ctx.fillStyle = grd;
  ctx.fillRect(w/2 - 120, h/2 - 120, 240, 240);

  ctx.restore();
  drawVignette(ctx, w, h, "#000000");
}

// ── Dispatch tables ──────────────────────────────────────────────────────────

export const CHAPTERS: ChapterConfig[] = [
  { id: 0,  title: "Welcome",                     subtitle: "The journey begins here",       bg: "#0e0a06", accent: "#f59e0b" },
  { id: 1,  title: "Digital Foundations",         subtitle: "Everything is data",            bg: "#040810", accent: "#60a5fa" },
  { id: 2,  title: "Binary & Number Systems",     subtitle: "The language of machines",      bg: "#000a00", accent: "#00d97e" },
  { id: 3,  title: "Logic & Boolean Thinking",    subtitle: "True or false — nothing else",  bg: "#0a0414", accent: "#c084fc" },
  { id: 4,  title: "Algorithms",                  subtitle: "Order from chaos",              bg: "#020a04", accent: "#4ade80" },
  { id: 5,  title: "Data Structures",             subtitle: "Shape your information",        bg: "#040a12", accent: "#2dd4bf" },
  { id: 6,  title: "Computer Architecture",       subtitle: "The machine awakens",           bg: "#0a0806", accent: "#fbbf24" },
  { id: 7,  title: "Operating Systems",           subtitle: "Orchestrating the orchestra",   bg: "#06041a", accent: "#a78bfa" },
  { id: 8,  title: "Networking & The Internet",   subtitle: "We are all connected",          bg: "#021010", accent: "#22d3ee" },
  { id: 9,  title: "Databases",                   subtitle: "Remember everything",           bg: "#0d0600", accent: "#fb923c" },
  { id: 10, title: "Programming Languages",       subtitle: "Speak to machines",             bg: "#050508", accent: "#f472b6" },
  { id: 11, title: "Artificial Intelligence",     subtitle: "Teaching machines to think",    bg: "#0a0212", accent: "#e879f9" },
  { id: 12, title: "Distributed Systems",         subtitle: "Strength in numbers",           bg: "#020d06", accent: "#34d399" },
  { id: 13, title: "The Future of Computing",     subtitle: "Beyond imagination",            bg: "#000000", accent: "#ffffff" },
];

type InitFn = (w: number, h: number) => Entities;
type RenderFn = (ctx: CanvasRenderingContext2D, p: number, t: number, w: number, h: number, e: Entities) => void;

const INITS: InitFn[]   = [initWelcome, initDigitalFoundations, initBinary, initLogic, initAlgorithms, initDataStructures, initArchitecture, initOperatingSystems, initNetworking, initDatabases, initProgramming, initAI, initDistributed, initFuture];
const RENDERS: RenderFn[] = [renderWelcome, renderDigitalFoundations, renderBinary, renderLogic, renderAlgorithms, renderDataStructures, renderArchitecture, renderOperatingSystems, renderNetworking, renderDatabases, renderProgramming, renderAI, renderDistributed, renderFuture];

export function initChapterEntities(id: number, w: number, h: number): Entities {
  return INITS[id]?.(w, h) ?? {};
}

export function renderChapter(
  ctx: CanvasRenderingContext2D,
  id: number,
  progress: number,
  t: number,
  w: number,
  h: number,
  entities: Entities,
) {
  // Use hex RGB for the chapter bg in the vignette override
  void hexToRgb; // suppress unused warning
  RENDERS[id]?.(ctx, progress, t, w, h, entities);
}
