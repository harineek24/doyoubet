import React from "react";

export interface JourneyChapter {
  id: number;
  num: string;
  title: string;
  sub: string;
  desc: string;
  tags: string[];
  g1: string; g2: string; g3: string;
  accent: string;
  art: React.ReactNode;
}

const W = (a: number) => `rgba(255,255,255,${a})`;
const SVG = (children: React.ReactNode) => (
  <svg viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {children}
  </svg>
);

// ── Part 1 — Python Fundamentals: code editor with variable assignments ───────
const ART0 = SVG(<>
  <rect x={40} y={14} width={320} height={232} rx={8} stroke={W(0.18)} strokeWidth={1.5} fill={W(0.04)}/>
  <rect x={40} y={14} width={320} height={30} rx={8} fill={W(0.09)}/>
  <rect x={40} y={34} width={320} height={10} fill={W(0.09)}/>
  {[62,82,102].map((x,i)=><circle key={i} cx={x} cy={29} r={5.5} fill={W([0.65,0.48,0.35][i])}/>)}
  {/* Line numbers */}
  {[70,100,130,160,190,218].map((y,i)=>(
    <text key={i} x={56} y={y} fontFamily="monospace" fontSize={11} fill={W(0.22)}>{i+1}</text>
  ))}
  {/* Code */}
  <text x={76} y={70} fontFamily="monospace" fontSize={12.5} fill={W(0.55)}>x</text>
  <text x={86} y={70} fontFamily="monospace" fontSize={12.5} fill={W(0.38)}> = </text>
  <text x={105} y={70} fontFamily="monospace" fontSize={12.5} fill={W(0.72)}>42</text>

  <text x={76} y={100} fontFamily="monospace" fontSize={12.5} fill={W(0.55)}>name</text>
  <text x={116} y={100} fontFamily="monospace" fontSize={12.5} fill={W(0.38)}> = </text>
  <text x={135} y={100} fontFamily="monospace" fontSize={12.5} fill={W(0.72)}>&quot;Alice&quot;</text>

  <text x={76} y={130} fontFamily="monospace" fontSize={12.5} fill={W(0.55)}>score</text>
  <text x={121} y={130} fontFamily="monospace" fontSize={12.5} fill={W(0.38)}> = </text>
  <text x={140} y={130} fontFamily="monospace" fontSize={12.5} fill={W(0.72)}>98.6</text>

  <text x={76} y={160} fontFamily="monospace" fontSize={12.5} fill={W(0.45)}>print</text>
  <text x={116} y={160} fontFamily="monospace" fontSize={12.5} fill={W(0.38)}>(name, score)</text>

  <line x1={68} y1={174} x2={340} y2={174} stroke={W(0.1)} strokeWidth={0.8}/>
  <text x={76} y={193} fontFamily="monospace" fontSize={11.5} fill={W(0.32)}>▶  Alice  98.6</text>
  <rect x={76} y={206} width={7} height={13} rx={1} fill={W(0.55)}/>
</>);

// ── Part 2 — Control Flow: if/else flowchart diamond ─────────────────────────
const ART1 = SVG(<>
  {/* Start oval */}
  <ellipse cx={200} cy={28} rx={45} ry={16} stroke={W(0.5)} strokeWidth={1.2} fill={W(0.07)}/>
  <text x={200} y={33} fontFamily="monospace" fontSize={10} fill={W(0.6)} textAnchor="middle">START</text>
  {/* Arrow down */}
  <line x1={200} y1={44} x2={200} y2={68} stroke={W(0.3)} strokeWidth={1.2}/>
  <polygon points="196,66 204,66 200,74" fill={W(0.35)}/>
  {/* Diamond */}
  <polygon points="200,78 270,118 200,158 130,118" stroke={W(0.65)} strokeWidth={1.5} fill={W(0.07)}/>
  <text x={200} y={114} fontFamily="monospace" fontSize={10} fill={W(0.55)} textAnchor="middle">x &gt; 0</text>
  <text x={200} y={128} fontFamily="monospace" fontSize={10} fill={W(0.55)} textAnchor="middle">?</text>
  {/* True branch → right */}
  <line x1={270} y1={118} x2={330} y2={118} stroke={W(0.28)} strokeWidth={1.2}/>
  <polygon points="328,114 328,122 336,118" fill={W(0.32)}/>
  <rect x={336} y={102} width={44} height={32} rx={5} stroke={W(0.45)} strokeWidth={1} fill={W(0.08)}/>
  <text x={358} y={121} fontFamily="monospace" fontSize={9} fill={W(0.55)} textAnchor="middle">True</text>
  <text x={282} y={112} fontFamily="monospace" fontSize={9} fill={W(0.38)}>Yes</text>
  {/* False branch → left */}
  <line x1={130} y1={118} x2={70} y2={118} stroke={W(0.28)} strokeWidth={1.2}/>
  <polygon points="72,114 72,122 64,118" fill={W(0.32)}/>
  <rect x={22} y={102} width={42} height={32} rx={5} stroke={W(0.38)} strokeWidth={1} fill={W(0.06)}/>
  <text x={43} y={121} fontFamily="monospace" fontSize={9} fill={W(0.45)} textAnchor="middle">False</text>
  <text x={110} y={112} fontFamily="monospace" fontSize={9} fill={W(0.38)}>No</text>
  {/* Both branches merge down */}
  <line x1={358} y1={134} x2={358} y2={195} stroke={W(0.2)} strokeWidth={1}/>
  <line x1={43} y1={134} x2={43} y2={195} stroke={W(0.2)} strokeWidth={1}/>
  <line x1={43} y1={195} x2={358} y2={195} stroke={W(0.2)} strokeWidth={1}/>
  <line x1={200} y1={195} x2={200} y2={218} stroke={W(0.28)} strokeWidth={1.2}/>
  <polygon points="196,216 204,216 200,224" fill={W(0.32)}/>
  {/* End oval */}
  <ellipse cx={200} cy={236} rx={42} ry={15} stroke={W(0.4)} strokeWidth={1.2} fill={W(0.06)}/>
  <text x={200} y={241} fontFamily="monospace" fontSize={10} fill={W(0.5)} textAnchor="middle">END</text>
</>);

// ── Part 3 — Loops: circular arrow with counter ───────────────────────────────
const ART2 = SVG(<>
  {/* Orbit ring */}
  {[0,1,2].map(i=>(
    <ellipse key={i} cx={200} cy={130} rx={140-i*30} ry={50-i*10}
      stroke={W(0.10+i*0.03)} strokeWidth={1.2} strokeDasharray={i===0?"6 4":"none"}/>
  ))}
  {/* Code label at center */}
  <rect x={148} y={112} width={104} height={36} rx={6} stroke={W(0.3)} strokeWidth={1} fill={W(0.07)}/>
  <text x={200} y={127} fontFamily="monospace" fontSize={10} fill={W(0.4)} textAnchor="middle">for i in</text>
  <text x={200} y={141} fontFamily="monospace" fontSize={10} fill={W(0.55)} textAnchor="middle">range(n)</text>
  {/* Iteration dots on the orbit */}
  {Array.from({length:8},(_,i)=>{
    const a = (i/8)*Math.PI*2 - Math.PI/2;
    const rx=140, ry=50;
    return <circle key={i} cx={200+Math.cos(a)*rx} cy={130+Math.sin(a)*ry}
      r={i===0?7:4} fill={W(i===0?0.85:0.28+i*0.04)}/>;
  })}
  {/* Arrow head on orbit */}
  <path d="M 200 80 L 212 74 L 206 86 Z" fill={W(0.55)}/>
  {/* Counter display */}
  <rect x={20} y={200} width={80} height={40} rx={6} stroke={W(0.25)} strokeWidth={1} fill={W(0.05)}/>
  <text x={60} y={216} fontFamily="monospace" fontSize={9} fill={W(0.35)} textAnchor="middle">i =</text>
  <text x={60} y={232} fontFamily="monospace" fontSize={14} fill={W(0.7)} textAnchor="middle">0..n</text>
  {/* while loop label */}
  <rect x={300} y={200} width={80} height={40} rx={6} stroke={W(0.22)} strokeWidth={1} fill={W(0.05)}/>
  <text x={340} y={216} fontFamily="monospace" fontSize={9} fill={W(0.3)} textAnchor="middle">while</text>
  <text x={340} y={232} fontFamily="monospace" fontSize={11} fill={W(0.55)} textAnchor="middle">True:</text>
</>);

// ── Part 4 — Functions & Data Collections ────────────────────────────────────
const ART3 = SVG(<>
  {/* Function block */}
  <rect x={120} y={60} width={160} height={80} rx={8} stroke={W(0.5)} strokeWidth={1.5} fill={W(0.08)}/>
  <rect x={120} y={60} width={160} height={26} rx={8} fill={W(0.1)}/>
  <rect x={120} y={76} width={160} height={10} fill={W(0.1)}/>
  <text x={200} y={79} fontFamily="monospace" fontSize={11} fill={W(0.6)} textAnchor="middle">def greet(name):</text>
  <text x={136} y={105} fontFamily="monospace" fontSize={10.5} fill={W(0.4)}>  return</text>
  <text x={196} y={105} fontFamily="monospace" fontSize={10.5} fill={W(0.65)}> f&quot;Hi {"{name}"}&quot;</text>
  {/* Input arrow */}
  <line x1={55} y1={100} x2={116} y2={100} stroke={W(0.35)} strokeWidth={1.5}/>
  <polygon points="114,96 114,104 122,100" fill={W(0.4)}/>
  <rect x={10} y={84} width={45} height={32} rx={5} stroke={W(0.3)} strokeWidth={1} fill={W(0.06)}/>
  <text x={32} y={103} fontFamily="monospace" fontSize={10} fill={W(0.45)} textAnchor="middle">name</text>
  {/* Output arrow */}
  <line x1={284} y1={100} x2={340} y2={100} stroke={W(0.35)} strokeWidth={1.5}/>
  <polygon points="338,96 338,104 346,100" fill={W(0.4)}/>
  <rect x={346} y={84} width={44} height={32} rx={5} stroke={W(0.3)} strokeWidth={1} fill={W(0.06)}/>
  <text x={368} y={103} fontFamily="monospace" fontSize={9.5} fill={W(0.5)} textAnchor="middle">&quot;Hi …&quot;</text>
  {/* List visualization below */}
  <text x={200} y={178} fontFamily="monospace" fontSize={11} fill={W(0.28)} textAnchor="middle">[ </text>
  {["A","B","C","D","E"].map((c,i)=>(
    <g key={i}>
      <rect x={60+i*52} y={185} width={38} height={34} rx={4} stroke={W(0.3)} strokeWidth={1} fill={W(0.07)}/>
      <text x={79+i*52} y={207} fontFamily="monospace" fontSize={13} fill={W(0.55)} textAnchor="middle">{c}</text>
      <text x={67+i*52} y={230} fontFamily="monospace" fontSize={9} fill={W(0.25)} textAnchor="middle">[{i}]</text>
    </g>
  ))}
  <text x={334} y={207} fontFamily="monospace" fontSize={11} fill={W(0.28)}> ]</text>
</>);

// ── Part 5 — Advanced Data Handling: dict key-value pairs ────────────────────
const ART4 = SVG(<>
  {/* Dict brace decoration */}
  <text x={22} y={175} fontFamily="monospace" fontSize={90} fill={W(0.06)}>{"{"}</text>
  <text x={340} y={175} fontFamily="monospace" fontSize={90} fill={W(0.06)}>{"}"}</text>
  {/* Key-value rows */}
  {[
    ['"name"',   '"Alice"'],
    ['"age"',    '30'],
    ['"score"',  '98.6'],
    ['"active"', 'True'],
  ].map(([k,v],i)=>(
    <g key={i}>
      {/* Key cell */}
      <rect x={70} y={32+i*52} width={108} height={36} rx={5} stroke={W(0.35)} strokeWidth={1} fill={W(0.07)}/>
      <text x={124} y={55+i*52} fontFamily="monospace" fontSize={11} fill={W(0.65)} textAnchor="middle">{k}</text>
      {/* Colon */}
      <text x={188} y={55+i*52} fontFamily="monospace" fontSize={13} fill={W(0.3)} textAnchor="middle">:</text>
      {/* Value cell */}
      <rect x={202} y={32+i*52} width={108} height={36} rx={5} stroke={W(0.28)} strokeWidth={1} fill={W(0.05)}/>
      <text x={256} y={55+i*52} fontFamily="monospace" fontSize={11} fill={W(0.5)} textAnchor="middle">{v}</text>
    </g>
  ))}
  {/* File handle visual */}
  <rect x={316} y={18} width={58} height={72} rx={4} stroke={W(0.3)} strokeWidth={1} fill={W(0.05)}/>
  <path d="M 348 18 L 374 18 L 374 44 L 348 44 Z" fill={W(0.1)}/>
  <text x={345} y={64} fontFamily="monospace" fontSize={8.5} fill={W(0.3)}>.txt</text>
  <text x={345} y={77} fontFamily="monospace" fontSize={8} fill={W(0.22)}>open()</text>
</>);

// ── Part 6 — OOP: class hierarchy ────────────────────────────────────────────
const ART5 = SVG(<>
  {/* Base class */}
  <rect x={130} y={18} width={140} height={52} rx={7} stroke={W(0.55)} strokeWidth={1.5} fill={W(0.09)}/>
  <rect x={130} y={18} width={140} height={22} rx={7} fill={W(0.12)}/>
  <rect x={130} y={30} width={140} height={10} fill={W(0.12)}/>
  <text x={200} y={33} fontFamily="monospace" fontSize={10.5} fill={W(0.7)} textAnchor="middle">class Animal:</text>
  <text x={148} y={54} fontFamily="monospace" fontSize={9.5} fill={W(0.38)}>  name, sound()</text>

  {/* Inheritance arrows */}
  <line x1={170} y1={70} x2={120} y2={114} stroke={W(0.3)} strokeWidth={1.2}/>
  <polygon points="116,108 124,112 114,118" fill={W(0.38)}/>
  <line x1={230} y1={70} x2={280} y2={114} stroke={W(0.3)} strokeWidth={1.2}/>
  <polygon points="276,108 284,112 286,106" fill={W(0.38)}/>

  {/* Child class 1 */}
  <rect x={40} y={116} width={130} height={52} rx={7} stroke={W(0.45)} strokeWidth={1.2} fill={W(0.08)}/>
  <rect x={40} y={116} width={130} height={22} rx={7} fill={W(0.10)}/>
  <rect x={40} y={128} width={130} height={10} fill={W(0.10)}/>
  <text x={105} y={131} fontFamily="monospace" fontSize={10} fill={W(0.62)} textAnchor="middle">class Dog:</text>
  <text x={58} y={153} fontFamily="monospace" fontSize={9} fill={W(0.35)}>  fetch(), bark()</text>

  {/* Child class 2 */}
  <rect x={225} y={116} width={135} height={52} rx={7} stroke={W(0.45)} strokeWidth={1.2} fill={W(0.08)}/>
  <rect x={225} y={116} width={135} height={22} rx={7} fill={W(0.10)}/>
  <rect x={225} y={128} width={135} height={10} fill={W(0.10)}/>
  <text x={292} y={131} fontFamily="monospace" fontSize={10} fill={W(0.62)} textAnchor="middle">class Cat:</text>
  <text x={242} y={153} fontFamily="monospace" fontSize={9} fill={W(0.35)}>  purr(), climb()</text>

  {/* Instance objects */}
  <circle cx={105} cy={216} r={22} stroke={W(0.35)} strokeWidth={1} fill={W(0.05)}/>
  <text x={105} y={213} fontFamily="monospace" fontSize={8} fill={W(0.38)} textAnchor="middle">dog1 =</text>
  <text x={105} y={225} fontFamily="monospace" fontSize={8} fill={W(0.5)} textAnchor="middle">Dog()</text>
  <line x1={105} y1={168} x2={105} y2={194} stroke={W(0.2)} strokeWidth={1} strokeDasharray="3 3"/>

  <circle cx={295} cy={216} r={22} stroke={W(0.32)} strokeWidth={1} fill={W(0.05)}/>
  <text x={295} y={213} fontFamily="monospace" fontSize={8} fill={W(0.35)} textAnchor="middle">cat1 =</text>
  <text x={295} y={225} fontFamily="monospace" fontSize={8} fill={W(0.48)} textAnchor="middle">Cat()</text>
  <line x1={295} y1={168} x2={295} y2={194} stroke={W(0.2)} strokeWidth={1} strokeDasharray="3 3"/>

  {/* Self label */}
  <text x={200} y={240} fontFamily="monospace" fontSize={9} fill={W(0.2)} textAnchor="middle">self.name = ...</text>
</>);

// ── Part 7 — Advanced Python: recursion tree ─────────────────────────────────
const ART6 = SVG(<>
  {/* Root node */}
  <circle cx={200} cy={28} r={18} stroke={W(0.55)} strokeWidth={1.5} fill={W(0.1)}/>
  <text x={200} y={33} fontFamily="monospace" fontSize={11} fill={W(0.65)} textAnchor="middle">f(n)</text>

  {/* Level 1 */}
  <line x1={186} y1={44} x2={130} y2={84} stroke={W(0.28)} strokeWidth={1.2}/>
  <line x1={214} y1={44} x2={270} y2={84} stroke={W(0.28)} strokeWidth={1.2}/>
  <circle cx={130} cy={96} r={15} stroke={W(0.45)} strokeWidth={1.2} fill={W(0.08)}/>
  <text x={130} y={101} fontFamily="monospace" fontSize={10} fill={W(0.55)} textAnchor="middle">f(n-1)</text>
  <circle cx={270} cy={96} r={15} stroke={W(0.45)} strokeWidth={1.2} fill={W(0.08)}/>
  <text x={270} y={101} fontFamily="monospace" fontSize={10} fill={W(0.55)} textAnchor="middle">f(n-2)</text>

  {/* Level 2 */}
  {[[130,96,80,148],[130,96,180,148],[270,96,220,148],[270,96,320,148]].map(([x1,y1,x2,y2],i)=>(
    <g key={i}>
      <line x1={x1} y1={y1+15} x2={x2} y2={y2} stroke={W(0.2)} strokeWidth={1}/>
      <circle cx={x2} cy={y2+13} r={12} stroke={W(0.35)} strokeWidth={1} fill={W(0.06)}/>
      <text x={x2} y={y2+18} fontFamily="monospace" fontSize={8.5} fill={W(0.45)} textAnchor="middle">f(n-{i<2?"2":"3"})</text>
    </g>
  ))}

  {/* Base case label */}
  <rect x={150} y={198} width={100} height={26} rx={5} stroke={W(0.3)} strokeWidth={1} fill={W(0.06)}/>
  <text x={200} y={211} fontFamily="monospace" fontSize={9.5} fill={W(0.4)} textAnchor="middle">if n == 0:</text>
  <text x={200} y={224} fontFamily="monospace" fontSize={9.5} fill={W(0.55)} textAnchor="middle">  return 1</text>

  {/* Module import on the side */}
  <text x={18} y={230} fontFamily="monospace" fontSize={10} fill={W(0.22)}>import random</text>
  <text x={18} y={248} fontFamily="monospace" fontSize={10} fill={W(0.18)}>import math</text>
</>);

// ── Chapter dataset ────────────────────────────────────────────────────────────
export const JOURNEY: JourneyChapter[] = [
  {
    id: 0, num: "01",
    title: "Python Fundamentals",
    sub: "Where every coder begins",
    desc: "Learn how computers store and manipulate information. Master variables, expressions, and the core concepts that underpin every Python program.",
    tags: ["Variables", "Input/Output", "Expressions", "Basics"],
    g1: "#fef9c3", g2: "#fde68a", g3: "#f59e0b", accent: "#92400e", art: ART0,
  },
  {
    id: 1, num: "02",
    title: "Control Flow & Conditions",
    sub: "Teaching code to make decisions",
    desc: "Every meaningful program makes choices. Master if/else logic, comparisons, and Boolean operators to write code that responds to the world.",
    tags: ["if/else", "Comparisons", "Boolean Logic"],
    g1: "#eff6ff", g2: "#93c5fd", g3: "#3b82f6", accent: "#1e40af", art: ART1,
  },
  {
    id: 2, num: "03",
    title: "Loops & Repetition",
    sub: "The engine of automation",
    desc: "Repetition is the heartbeat of programming. From counting to complex iteration, loops let you do in one line what would otherwise take a thousand.",
    tags: ["while", "for", "Iteration", "Nested Loops"],
    g1: "#f0fdfa", g2: "#5eead4", g3: "#0d9488", accent: "#134e4a", art: ART2,
  },
  {
    id: 3, num: "04",
    title: "Functions & Data Collections",
    sub: "Building blocks of real programs",
    desc: "Functions transform chaos into clarity. Pair them with lists and strings to write modular, reusable, elegant code.",
    tags: ["Functions", "Lists", "Strings", "Modularity"],
    g1: "#fdf4ff", g2: "#d8b4fe", g3: "#9333ea", accent: "#581c87", art: ART3,
  },
  {
    id: 4, num: "05",
    title: "Advanced Data Handling",
    sub: "Structures that power applications",
    desc: "Dictionaries, tuples, files — the data structures that make Python powerful. Learn to read, write, and transform information at scale.",
    tags: ["Dictionaries", "Tuples", "File I/O"],
    g1: "#fff7ed", g2: "#fdba74", g3: "#ea580c", accent: "#7c2d12", art: ART4,
  },
  {
    id: 5, num: "06",
    title: "Object-Oriented Programming",
    sub: "Modelling the world in code",
    desc: "Think in objects. Classes let you model real-world concepts in code, bundle data with behaviour, and write programs that scale beautifully.",
    tags: ["Classes", "Objects", "Methods", "Encapsulation"],
    g1: "#fff1f2", g2: "#fda4af", g3: "#e11d48", accent: "#881337", art: ART5,
  },
  {
    id: 6, num: "07",
    title: "Advanced Python & Applications",
    sub: "From scripts to real-world systems",
    desc: "Bring it all together. Modules, recursion, and algorithms take you from a Python user to a Python programmer building real applications.",
    tags: ["Modules", "Recursion", "Algorithms", "Projects"],
    g1: "#f5f3ff", g2: "#c4b5fd", g3: "#7c3aed", accent: "#4c1d95", art: ART6,
  },
];
