import React from "react";

export interface JourneyChapter {
  id: number;
  num: string;
  title: string;
  sub: string;
  desc: string;
  tags: string[];
  g1: string; g2: string; g3: string; // gradient stops
  accent: string;                      // text accent
  art: React.ReactNode;
}

// ── SVG art helpers ────────────────────────────────────────────────────────
// All shapes are white at varying opacity — they sit on top of the gradient.
const W = (a: number) => `rgba(255,255,255,${a})`;
const SVG = (children: React.ReactNode) => (
  <svg viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {children}
  </svg>
);

// Concentric rings from a centre point
function Rings({ cx=200, cy=130, n=5, rStep=32 }: { cx?:number; cy?:number; n?:number; rStep?:number }) {
  return <>{Array.from({length:n},(_,i)=><circle key={i} cx={cx} cy={cy} r={(i+1)*rStep} stroke={W(0.13-i*0.02)} strokeWidth={1.2}/>)}</>;
}
// Dot grid
function DotGrid({ cols=7, rows=5, gap=48, ox=16, oy=10 }: { cols?:number; rows?:number; gap?:number; ox?:number; oy?:number }) {
  const dots: React.ReactNode[] = [];
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) dots.push(
    <circle key={`${r}-${c}`} cx={ox+c*gap} cy={oy+r*gap} r={2.2} fill={W(0.25)}/>
  );
  return <>{dots}</>;
}
// Straight connection lines between two dots
function Edge({ x1,y1,x2,y2,a=0.1 }:{x1:number;y1:number;x2:number;y2:number;a?:number}) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={W(a)} strokeWidth={1}/>;
}
// Node circle
function Node({ cx,cy,r=6,a=0.9 }:{cx:number;cy:number;r?:number;a?:number}) {
  return <><circle cx={cx} cy={cy} r={r*2.4} fill={W(0.08)}/><circle cx={cx} cy={cy} r={r} fill={W(a)}/></>;
}

// ── Per-chapter SVG art ────────────────────────────────────────────────────

const ART: React.ReactNode[] = [
  // 0 Welcome — sun burst
  SVG(<>
    <Rings cx={200} cy={130} n={5} rStep={30}/>
    {Array.from({length:16},(_,i)=>{const a=(i/16)*Math.PI*2;return<line key={i} x1={200+Math.cos(a)*38} y1={130+Math.sin(a)*38} x2={200+Math.cos(a)*180} y2={130+Math.sin(a)*180} stroke={W(0.08)} strokeWidth={0.8}/>;})}
    <circle cx={200} cy={130} r={22} fill={W(0.85)}/>
    <circle cx={200} cy={130} r={42} fill={W(0.12)}/>
  </>),

  // 1 Digital Foundations — circuit dots
  SVG(<>
    <DotGrid cols={8} rows={5} gap={46} ox={20} oy={18}/>
    <Edge x1={66} y1={18} x2={66} y2={110} a={0.2}/><Edge x1={66} y1={110} x2={158} y2={110} a={0.2}/>
    <Edge x1={158} y1={18} x2={250} y2={110} a={0.15}/><Edge x1={250} y1={110} x2={250} y2={202} a={0.2}/>
    <Edge x1={20} y1={64} x2={342} y2={64} a={0.12}/>
    <Node cx={66} cy={110}/><Node cx={250} cy={110}/><Node cx={158} cy={64}/>
    <circle cx={200} cy={130} r={18} stroke={W(0.35)} strokeWidth={1.5} strokeDasharray="4 4"/>
  </>),

  // 2 Binary — grid of 0 & 1
  SVG(<>
    {["1","0","1","1","0","1","0","0","1","0","1","1","0","1","0","0","1","0","1","1","0","1","0","0","1","0","1","1","0","0"].map((d,i)=>(
      <text key={i} x={20+(i%10)*38} y={40+Math.floor(i/10)*55} fontFamily="monospace" fontSize={22} fill={W(d==="1"?0.55:0.15)}>{d}</text>
    ))}
    <rect x={132} y={18} width={140} height={225} rx={4} stroke={W(0.3)} strokeWidth={1.5} fill={W(0.04)}/>
  </>),

  // 3 Logic Gates — AND + OR + NOT symbols
  SVG(<>
    {/* AND gate (D-shape) */}
    <path d="M70 80 L70 140 L100 140 Q130 140 130 110 Q130 80 100 80 Z" stroke={W(0.7)} strokeWidth={2} fill={W(0.08)}/>
    <line x1={50} y1={95} x2={70} y2={95} stroke={W(0.5)} strokeWidth={1.5}/>
    <line x1={50} y1={125} x2={70} y2={125} stroke={W(0.5)} strokeWidth={1.5}/>
    <line x1={130} y1={110} x2={155} y2={110} stroke={W(0.5)} strokeWidth={1.5}/>
    <text x={90} y={116} fontFamily="monospace" fontSize={11} fill={W(0.6)} textAnchor="middle">AND</text>
    {/* OR gate */}
    <path d="M200 80 Q210 110 200 140 Q230 130 250 110 Q230 90 200 80 Z" stroke={W(0.7)} strokeWidth={2} fill={W(0.08)}/>
    <text x={224} y={116} fontFamily="monospace" fontSize={11} fill={W(0.6)} textAnchor="middle">OR</text>
    {/* NOT gate (triangle + bubble) */}
    <path d="M300 85 L300 135 L340 110 Z" stroke={W(0.7)} strokeWidth={2} fill={W(0.08)}/>
    <circle cx={347} cy={110} r={6} stroke={W(0.7)} strokeWidth={2}/>
    <text x={315} y={116} fontFamily="monospace" fontSize={11} fill={W(0.6)} textAnchor="middle">NOT</text>
    {/* Connecting signals */}
    <line x1={155} y1={110} x2={200} y2={95} stroke={W(0.2)} strokeWidth={1}/>
    <line x1={250} y1={110} x2={300} y2={110} stroke={W(0.2)} strokeWidth={1}/>
    <circle cx={250} cy={110} r={4} fill={W(0.8)}/>
    <circle cx={155} cy={110} r={4} fill={W(0.8)}/>
  </>),

  // 4 Algorithms — sorting bars
  SVG(<>
    {[55,95,35,130,75,115,45,85,125,65].map((h,i)=>(
      <rect key={i} x={18+i*37} y={230-h} width={28} height={h} rx={3}
        fill={W(0.12+(i/10)*0.35)} stroke={W(0.4)} strokeWidth={0.8}/>
    ))}
    <line x1={10} y1={230} x2={390} y2={230} stroke={W(0.2)} strokeWidth={1}/>
    <text x={200} y={38} fontFamily="monospace" fontSize={12} fill={W(0.35)} textAnchor="middle">O(n log n)</text>
  </>),

  // 5 Data Structures — binary tree
  SVG(<>
    {/* Edges */}
    <line x1={200} y1={42} x2={110} y2={95} stroke={W(0.25)} strokeWidth={1.5}/>
    <line x1={200} y1={42} x2={290} y2={95} stroke={W(0.25)} strokeWidth={1.5}/>
    <line x1={110} y1={95} x2={65} y2={152} stroke={W(0.2)} strokeWidth={1.2}/>
    <line x1={110} y1={95} x2={155} y2={152} stroke={W(0.2)} strokeWidth={1.2}/>
    <line x1={290} y1={95} x2={245} y2={152} stroke={W(0.2)} strokeWidth={1.2}/>
    <line x1={290} y1={95} x2={335} y2={152} stroke={W(0.2)} strokeWidth={1.2}/>
    <line x1={65} y1={152} x2={42} y2={210} stroke={W(0.15)} strokeWidth={1}/>
    <line x1={65} y1={152} x2={88} y2={210} stroke={W(0.15)} strokeWidth={1}/>
    <line x1={155} y1={152} x2={132} y2={210} stroke={W(0.15)} strokeWidth={1}/>
    {/* Nodes */}
    {[[200,42],[110,95],[290,95],[65,152],[155,152],[245,152],[335,152],[42,210],[88,210],[132,210]].map(([x,y],i)=>(
      <Node key={i} cx={x} cy={y} r={i===0?9:6} a={i===0?0.9:0.65}/>
    ))}
  </>),

  // 6 Computer Architecture — CPU die
  SVG(<>
    <rect x={80} y={30} width={240} height={200} rx={6} stroke={W(0.3)} strokeWidth={1.5} fill={W(0.04)}/>
    {[["ALU",100,50,80,60],["Cache",200,50,80,60],["FPU",100,130,80,60],["Ctrl",200,130,80,60]].map(([l,x,y,w,h])=>(
      <g key={l as string}>
        <rect x={x as number} y={y as number} width={w as number} height={h as number} rx={3} stroke={W(0.4)} strokeWidth={1} fill={W(0.08)}/>
        <text x={(x as number)+(w as number)/2} y={(y as number)+(h as number)/2+4} fontFamily="monospace" fontSize={11} fill={W(0.6)} textAnchor="middle">{l}</text>
      </g>
    ))}
    {/* Traces */}
    <line x1={180} y1={80} x2={200} y2={80} stroke={W(0.5)} strokeWidth={1.5}/>
    <line x1={180} y1={160} x2={200} y2={160} stroke={W(0.5)} strokeWidth={1.5}/>
    <line x1={140} y1={110} x2={140} y2={130} stroke={W(0.5)} strokeWidth={1.5}/>
    <line x1={240} y1={110} x2={240} y2={130} stroke={W(0.5)} strokeWidth={1.5}/>
    {[[180,80],[180,160],[140,110],[140,130],[240,110],[240,130]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={3.5} fill={W(0.85)}/>)}
  </>),

  // 7 Operating Systems — concentric ellipses (orbital rings)
  SVG(<>
    {[160,120,85,52,24].map((rx,i)=>(
      <ellipse key={i} cx={200} cy={130} rx={rx} ry={rx*0.45} stroke={W(0.12+i*0.04)} strokeWidth={1.2}
        transform={`rotate(${i*15} 200 130)`}/>
    ))}
    {[[200-160,130],[200+85*Math.cos(0.8),130-38*Math.sin(0.8)],[200-52,130]].map(([x,y],i)=>(
      <Node key={i} cx={x} cy={y} r={4} a={0.7}/>
    ))}
    <Node cx={200} cy={130} r={10} a={0.9}/>
    <text x={200} y={134} fontFamily="monospace" fontSize={9} fill={W(0.5)} textAnchor="middle">CPU</text>
  </>),

  // 8 Networking — constellation of nodes
  SVG(<>
    {[[200,130],[80,60],[320,60],[60,190],[340,190],[150,220],[250,220],[200,30],[120,140],[280,140]].map(([x,y],i)=>(
      <Node key={i} cx={x} cy={y} r={i===0?8:5} a={i===0?0.9:0.6}/>
    ))}
    {[[200,130,80,60],[200,130,320,60],[200,130,60,190],[200,130,340,190],[200,130,150,220],[200,130,250,220],
      [80,60,200,30],[320,60,200,30],[80,60,120,140],[320,60,280,140]].map(([x1,y1,x2,y2],i)=>(
      <Edge key={i} x1={x1} y1={y1} x2={x2} y2={y2} a={0.12}/>
    ))}
    <circle cx={200} cy={130} r={45} stroke={W(0.08)} strokeWidth={1} strokeDasharray="3 6"/>
  </>),

  // 9 Databases — stacked cylinders
  SVG(<>
    {[40,90,140].map((y,i)=>(
      <g key={i}>
        <ellipse cx={200} cy={y} rx={90} ry={18} stroke={W(0.4)} strokeWidth={1.2} fill={W(i===0?0.12:0.06)}/>
        <rect x={110} y={y} width={180} height={50} fill={W(0.05)} stroke={W(0.2)} strokeWidth={0.8}/>
        <ellipse cx={200} cy={y+50} rx={90} ry={18} stroke={W(0.25)} strokeWidth={1} fill={W(0.04)}/>
        <text x={200} y={y+30} fontFamily="monospace" fontSize={10} fill={W(0.4)} textAnchor="middle">
          {["TABLE A","TABLE B","TABLE C"][i]}
        </text>
      </g>
    ))}
  </>),

  // 10 Programming Languages — code symbols
  SVG(<>
    {[["Python","#","def class"],[" JS/TS","//","=>  const"],[" Rust","//","fn  match"],[" SQL","--","SELECT"]].map(([lang,com,kw],i)=>(
      <g key={String(i)}>
        <text x={24} y={52+i*48} fontFamily="monospace" fontSize={11} fill={W(0.22)}>{com as string} {lang as string}</text>
        <text x={24} y={68+i*48} fontFamily="monospace" fontSize={14} fill={W(0.55+i*0.08)}>{kw as string}</text>
      </g>
    ))}
    <rect x={14} y={30} width={5} height={210} rx={2} fill={W(0.25)}/>
    <text x={320} y={130} fontFamily="monospace" fontSize={60} fill={W(0.06)} textAnchor="middle">{"{ }"}</text>
  </>),

  // 11 Artificial Intelligence — neural network
  SVG(<>
    {[[60,[70,100,130,160,190]],[160,[85,110,130,150,175]],[260,[100,130,160]],[350,[115,145]]].map(([x,ys],li)=>
      (ys as number[]).map((y,ni)=>{
        const nextLayer = [[60,[70,100,130,160,190]],[160,[85,110,130,150,175]],[260,[100,130,160]],[350,[115,145]]][li+1];
        return <g key={`${li}-${ni}`}>
          {nextLayer && (nextLayer[1] as number[]).map((ny,nni)=>(
            <Edge key={nni} x1={x as number} y1={y} x2={nextLayer[0] as number} y2={ny} a={0.06}/>
          ))}
          <Node cx={x as number} cy={y} r={ni===2&&li===1?8:5} a={0.7}/>
        </g>;
      })
    )}
  </>),

  // 12 Distributed Systems — server grid
  SVG(<>
    {Array.from({length:4},(_,r)=>Array.from({length:5},(_,c)=>(
      <g key={`${r}-${c}`}>
        <rect x={40+c*64} y={38+r*48} width={46} height={34} rx={4} stroke={W(0.35)} strokeWidth={1} fill={W(0.08)}/>
        <rect x={46} y={44+r*48} width={34} height={5} rx={1} fill={W(0.2)}/>
        <rect x={46} y={52+r*48} width={22} height={3} rx={1} fill={W(0.12)}/>
        {r<3&&<line x1={63+c*64} y1={72+r*48} x2={63+c*64} y2={86+r*48} stroke={W(0.15)} strokeWidth={1}/>}
        {c<4&&<line x1={86+c*64} y1={55+r*48} x2={104+c*64} y2={55+r*48} stroke={W(0.15)} strokeWidth={1}/>}
      </g>
    )))}
    <circle cx={200} cy={130} r={6} fill={W(0.9)}/>
  </>),

  // 13 Future — spiral
  SVG(<>
    {Array.from({length:120},(_,i)=>{
      const t=i/120; const angle=t*Math.PI*6; const r=10+t*110;
      const x=200+Math.cos(angle)*r; const y=130+Math.sin(angle)*r*0.7;
      return <circle key={i} cx={x} cy={y} r={1.5+t*2} fill={W(0.08+t*0.45)}/>;
    })}
    <circle cx={200} cy={130} r={10} fill={W(0.85)}/>
    <circle cx={200} cy={130} r={22} fill={W(0.1)}/>
  </>),
];

// ── Chapter dataset ────────────────────────────────────────────────────────
export const JOURNEY: JourneyChapter[] = [
  { id:0,  num:"01", title:"Welcome",                   sub:"Every journey starts here",       desc:"Discover what computer science is and why it shapes every corner of our world.",     tags:["Overview","History","Careers"],         g1:"#fef9c3", g2:"#fde68a", g3:"#f59e0b", accent:"#92400e", art:ART[0]  },
  { id:1,  num:"02", title:"Digital Foundations",        sub:"Everything is data",              desc:"How information is represented, stored, and transformed inside every device.",        tags:["Bits","Bytes","Abstraction"],           g1:"#eff6ff", g2:"#93c5fd", g3:"#3b82f6", accent:"#1e40af", art:ART[1]  },
  { id:2,  num:"03", title:"Binary & Number Systems",    sub:"The language of machines",        desc:"Machines speak in ones and zeros. Master the numeral systems at the heart of it all.",tags:["Binary","Hex","ASCII","Encoding"],      g1:"#f0fdf4", g2:"#86efac", g3:"#16a34a", accent:"#14532d", art:ART[2]  },
  { id:3,  num:"04", title:"Logic & Boolean Algebra",    sub:"True or false — nothing else",    desc:"Every computer decision reduces to simple logical operations. See how circuits think.",tags:["AND/OR/NOT","Truth Tables","Circuits"],  g1:"#fdf4ff", g2:"#d8b4fe", g3:"#9333ea", accent:"#581c87", art:ART[3]  },
  { id:4,  num:"05", title:"Algorithms",                 sub:"Order from chaos",                desc:"The art of problem-solving. Algorithms determine the speed and elegance of every program.",tags:["Sorting","Searching","Complexity"],  g1:"#fefce8", g2:"#fde047", g3:"#ca8a04", accent:"#713f12", art:ART[4]  },
  { id:5,  num:"06", title:"Data Structures",            sub:"Shape your information",          desc:"How you organise data changes everything. Learn the structures that power efficient code.", tags:["Arrays","Trees","Graphs","Heaps"],   g1:"#f0fdfa", g2:"#5eead4", g3:"#0d9488", accent:"#134e4a", art:ART[5]  },
  { id:6,  num:"07", title:"Computer Architecture",      sub:"The machine awakens",             desc:"Peel back the curtain on the hardware. See how electricity becomes computation.",    tags:["CPU","Memory","Cache","Pipelines"],     g1:"#fffbeb", g2:"#fcd34d", g3:"#d97706", accent:"#78350f", art:ART[6]  },
  { id:7,  num:"08", title:"Operating Systems",          sub:"Orchestrating everything",        desc:"The invisible conductor of the digital orchestra — managing every resource.",        tags:["Processes","Threads","Memory Mgmt"],    g1:"#f5f3ff", g2:"#c4b5fd", g3:"#7c3aed", accent:"#4c1d95", art:ART[7]  },
  { id:8,  num:"09", title:"Networking",                 sub:"We are all connected",            desc:"From two computers to billions of devices — the architecture of global connection.",  tags:["TCP/IP","HTTP","DNS","Routing"],        g1:"#ecfeff", g2:"#67e8f9", g3:"#0891b2", accent:"#164e63", art:ART[8]  },
  { id:9,  num:"10", title:"Databases",                  sub:"Remember everything",             desc:"Every app you love stores data. Design systems that recall a record from billions.",  tags:["SQL","Indexing","ACID","NoSQL"],        g1:"#fff7ed", g2:"#fdba74", g3:"#ea580c", accent:"#7c2d12", art:ART[9]  },
  { id:10, num:"11", title:"Programming Languages",      sub:"Speak to machines",               desc:"Languages are tools for thought. Each paradigm changes how you perceive problems.",   tags:["Paradigms","Compilers","Type Systems"], g1:"#fdf4ff", g2:"#f0abfc", g3:"#c026d3", accent:"#701a75", art:ART[10] },
  { id:11, num:"12", title:"Artificial Intelligence",    sub:"Teaching machines to think",      desc:"Machine learning, neural nets, LLMs — the technologies reshaping every industry.",   tags:["ML","Neural Nets","LLMs","Ethics"],     g1:"#fff1f2", g2:"#fda4af", g3:"#e11d48", accent:"#881337", art:ART[11] },
  { id:12, num:"13", title:"Distributed Systems",        sub:"Strength in numbers",             desc:"When one machine isn't enough. Consensus, fault-tolerance, and planet-scale systems.", tags:["CAP Theorem","Consensus","Scaling"],   g1:"#f0fdf4", g2:"#86efac", g3:"#15803d", accent:"#14532d", art:ART[12] },
  { id:13, num:"14", title:"The Future of Computing",    sub:"Beyond imagination",              desc:"Quantum computing, neuromorphic chips, brain-computer interfaces. The next era.",    tags:["Quantum","Edge Computing","BCI"],       g1:"#fdf4ff", g2:"#e879f9", g3:"#7c3aed", accent:"#581c87", art:ART[13] },
];
