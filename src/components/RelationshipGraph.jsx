import { useState, useRef, useEffect, useMemo } from "react";
import G from "../constants/theme";
import { CLAUDE_URL, claudeHeaders } from "../lib/api";

const NODE_COLORS = {
  book:            G.gold,
  genre:           "#4a9eff",
  author:          "#4ecb71",
  series:          "#b06fff",
  country:         "#ff8c4a",
  era:             "#9aaacc",
  theme:           "#4ae8ff",
  narrative_style: "#ff9f4a",
  mood:            "#ff4aaa",
};

const GRAPH_H = 460;
const BOOK_R  = 30;
const NODE_R  = 22;

// fixed: { [nodeId]: { x, y } } — those nodes are pinned and don't move
function forceLayout(nodes, edges, w, h, fixed = {}) {
  if (!nodes.length) return {};
  const pos = {};
  nodes.forEach((n, i) => {
    if (fixed[n.id]) {
      pos[n.id] = { x: fixed[n.id].x, y: fixed[n.id].y, vx: 0, vy: 0 };
    } else {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(w, h) * 0.28;
      pos[n.id] = {
        x: w / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 15,
        y: h / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 15,
        vx: 0, vy: 0,
      };
    }
  });

  const ITERS = 320, REPULSE = 5000, TARGET = 130;
  for (let t = 0; t < ITERS; t++) {
    const alpha = 1 - t / ITERS;

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = pos[nodes[i].id], b = pos[nodes[j].id];
        let dx = a.x - b.x || 0.1, dy = a.y - b.y || 0.1;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const f = Math.min(REPULSE / (d * d), 80) * alpha;
        a.vx += dx / d * f; a.vy += dy / d * f;
        b.vx -= dx / d * f; b.vy -= dy / d * f;
      }
    }

    // Attraction along edges
    edges.forEach(e => {
      const a = pos[e.source], b = pos[e.target];
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - TARGET) * 0.07 * alpha;
      a.vx += dx / d * f; a.vy += dy / d * f;
      b.vx -= dx / d * f; b.vy -= dy / d * f;
    });

    // Weak center gravity
    nodes.forEach(n => {
      pos[n.id].vx += (w / 2 - pos[n.id].x) * 0.015 * alpha;
      pos[n.id].vy += (h / 2 - pos[n.id].y) * 0.015 * alpha;
    });

    // Integrate + dampen + clamp (skip fixed nodes)
    nodes.forEach(n => {
      if (fixed[n.id]) return;
      const p = pos[n.id];
      p.vx *= 0.75; p.vy *= 0.75;
      p.x = Math.max(60, Math.min(w - 60, p.x + p.vx));
      p.y = Math.max(45, Math.min(h - 45, p.y + p.vy));
    });
  }
  return pos;
}

// BFS to find shortest path node IDs between source and dest
function bfsPath(nodes, edges, sourceId, destId) {
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => {
    adj[e.source]?.push(e.target);
    adj[e.target]?.push(e.source);
  });
  const queue = [[sourceId]];
  const visited = new Set([sourceId]);
  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    if (node === destId) return new Set(path);
    for (const neighbor of (adj[node] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

function BookPicker({ books, onChange, placeholder }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return books.slice(0, 8);
    return books.filter(b => b.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }, [books, query]);

  const select = (b) => {
    setQuery(b.title);
    onChange(b.title);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
      <input className="input-dark" value={query} placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); onChange(""); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: "100%" }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: G.card, border: `1px solid ${G.border}`, borderRadius: 8,
          marginTop: 4, maxHeight: 220, overflowY: "auto" }}>
          {filtered.map(b => (
            <div key={b.id} onMouseDown={() => select(b)}
              style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13,
                color: G.text, borderBottom: `1px solid ${G.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = G.card2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontWeight: 500 }}>{b.title}</span>
              <span style={{ color: G.muted, fontSize: 11, marginLeft: 8 }}>{b.author}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RelationshipGraph({ books, session }) {
  const [mode, setMode]           = useState("neighborhood");
  const [book1, setBook1]         = useState("");
  const [book2, setBook2]         = useState("");
  const [graphData, setGraphData] = useState(null);
  const [positions, setPositions] = useState({});
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [hoveredId, setHoveredId] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [pathEndpoints, setPathEndpoints] = useState(null); // { sourceId, destId }
  const containerRef = useRef(null);
  const [graphW, setGraphW] = useState(680);
  const dragRef = useRef(null);

  useEffect(() => {
    const ro = new ResizeObserver(entries => setGraphW(entries[0].contentRect.width || 680));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!graphData?.nodes?.length) return;
    const fixed = {};
    if (mode === "path" && pathEndpoints) {
      fixed[pathEndpoints.sourceId] = { x: BOOK_R + 24, y: GRAPH_H / 2 };
      fixed[pathEndpoints.destId]   = { x: graphW - BOOK_R - 24, y: GRAPH_H / 2 };
    }
    setPositions(forceLayout(graphData.nodes, graphData.edges, graphW, GRAPH_H, fixed));
  }, [graphData, graphW, pathEndpoints, mode]);

  const generate = async () => {
    if (!book1 || (mode === "path" && !book2)) return;
    setLoading(true); setError(""); setGraphData(null); setExplanation(""); setPathEndpoints(null);

    const bookList = books.map(b => {
      let line = `"${b.title}" by ${b.author}`;
      if (b.genre?.length)   line += ` [genre: ${b.genre.join(", ")}]`;
      if (b.theme?.length)   line += ` [theme: ${b.theme.join(", ")}]`;
      if (b.mood)            line += ` [mood: ${b.mood}]`;
      if (b.narrative_style) line += ` [style: ${b.narrative_style}]`;
      if (b.setting_era)     line += ` [era: ${b.setting_era}]`;
      if (b.archetype)       line += ` [archetype: ${b.archetype}]`;
      return line;
    }).join("\n");

    const userPrompt = mode === "path"
      ? `Find the shortest meaningful relationship path between "${book1}" and "${book2}".`
      : `Show the relationship neighborhood of "${book1}" — its neighboring books connected via shared attributes.`;

    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: claudeHeaders(session),
        body: JSON.stringify({
          model: "claude-opus-4-7",
          max_tokens: 1800,
          system: `You are a literary graph expert. Generate a relationship graph between books through meaningful intermediary nodes.

RULES (all modes):
- Books NEVER connect directly to each other — always via an intermediary node
- Every node id must be unique (slugified strings, e.g. "book-dune", "theme-redemption")
- Only include books that exist in the provided library
- PREFERRED intermediary types (use these first): theme, mood, narrative_style, archetype
- FALLBACK intermediary type (only use if no preferred connection exists): setting_era
- FORBIDDEN intermediary types: author, series, country, genre
- Base connections on the structured attributes provided in the library — do not invent attributes not present

PATH MODE rules:
- Find the single shortest meaningful path between the two books
- Include ONLY nodes that lie on this exact path — no branches, no extra books, no dead ends
- Path structure: [source-book] — [intermediary] — … — [dest-book] (1–3 intermediaries max)
- The source book node label must EXACTLY match: "${book1}"
- The destination book node label must EXACTLY match: "${book2}"

NEIGHBORHOOD MODE rules:
- Show 4–8 neighboring books each connected via exactly 1 intermediary
- Use varied preferred intermediary types across the neighborhood
- Max ~20 nodes total

LIBRARY:
${bookList}

Return ONLY valid JSON — no markdown fences, no commentary:
{
  "nodes": [{ "id": string, "type": "book|genre|author|series|country|era|theme|narrative_style|mood", "label": string }],
  "edges": [{ "source": string, "target": string }],
  "explanation": string
}`,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      let parsed = JSON.parse(match[0]);

      if (mode === "path") {
        // Find source and dest nodes by label match
        const sourceNode = parsed.nodes.find(n =>
          n.type === "book" && n.label.toLowerCase().includes(book1.toLowerCase().slice(0, 10))
        );
        const destNode = parsed.nodes.find(n =>
          n.type === "book" && n.label.toLowerCase().includes(book2.toLowerCase().slice(0, 10))
          && n.id !== sourceNode?.id
        );

        if (sourceNode && destNode) {
          // BFS to keep only nodes on the shortest path
          const pathSet = bfsPath(parsed.nodes, parsed.edges, sourceNode.id, destNode.id);
          if (pathSet) {
            parsed = {
              ...parsed,
              nodes: parsed.nodes.filter(n => pathSet.has(n.id)),
              edges: parsed.edges.filter(e => pathSet.has(e.source) && pathSet.has(e.target)),
            };
          }
          setPathEndpoints({ sourceId: sourceNode.id, destId: destNode.id });
        }
      }

      setGraphData(parsed);
      setExplanation(parsed.explanation || "");
    } catch (e) {
      setError("Failed to generate graph — try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Draggable nodes
  const onNodeMouseDown = (e, id) => {
    e.preventDefault();
    dragRef.current = id;
    const onMove = ev => {
      if (!dragRef.current) return;
      setPositions(prev => ({
        ...prev,
        [dragRef.current]: {
          ...prev[dragRef.current],
          x: (prev[dragRef.current]?.x ?? 0) + ev.movementX,
          y: (prev[dragRef.current]?.y ?? 0) + ev.movementY,
        },
      }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const canGenerate = book1 && (mode === "neighborhood" || book2) && !loading;
  const activeTypes = graphData ? [...new Set(graphData.nodes.map(n => n.type))] : [];

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: G.dimmed, marginBottom: 16 }}>
        Relationship Graph
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", border: `1px solid ${G.border}`, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          {[["neighborhood", "Explore"], ["path", "Shortest Path"]].map(([id, label]) => (
            <button key={id} onClick={() => { setMode(id); setBook2(""); setGraphData(null); }}
              style={{ padding: "9px 16px", background: mode === id ? G.gold : "transparent",
                color: mode === id ? "#fff" : G.muted, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: mode === id ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        <BookPicker books={books} onChange={setBook1} placeholder={mode === "path" ? "From book…" : "Pick a book…"} />
        {mode === "path" && <BookPicker books={books} onChange={setBook2} placeholder="To book…" />}

        <button className="btn-gold" onClick={generate} disabled={!canGenerate}
          style={{ whiteSpace: "nowrap", opacity: canGenerate ? 1 : 0.5 }}>
          {loading ? "Thinking…" : mode === "path" ? "Find Path" : "Explore"}
        </button>
      </div>

      {error && <div style={{ color: G.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* Graph area */}
      <div ref={containerRef} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ height: GRAPH_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="pulse" style={{ fontSize: 13, color: G.muted }}>Mapping connections…</div>
          </div>
        ) : graphData ? (
          <>
            <svg width="100%" height={GRAPH_H} style={{ display: "block" }}>
              <defs>
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <radialGradient key={type} id={`rg-${type}`} cx="38%" cy="32%" r="65%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.45" />
                  </radialGradient>
                ))}
              </defs>

              {/* Edges */}
              {graphData.edges.map((e, i) => {
                const s = positions[e.source], t = positions[e.target];
                if (!s || !t) return null;
                return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={G.border} strokeWidth={1.5} strokeOpacity={0.7} />;
              })}

              {/* Nodes */}
              {graphData.nodes.map(n => {
                const p = positions[n.id];
                if (!p) return null;
                const isBook = n.type === "book";
                const r      = isBook ? BOOK_R : NODE_R;
                const color  = NODE_COLORS[n.type] || G.muted;
                const isHov  = hoveredId === n.id;
                const label  = n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label;

                return (
                  <g key={n.id} style={{ cursor: "grab" }}
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onMouseDown={ev => onNodeMouseDown(ev, n.id)}>
                    <circle cx={p.x} cy={p.y} r={isHov ? r + 4 : r}
                      fill={`url(#rg-${n.type})`} stroke={color}
                      strokeWidth={isHov ? 2.5 : 1.5}
                      style={{ transition: "r 0.15s, stroke-width 0.15s" }} />
                    {/* Type label inside non-book nodes */}
                    {!isBook && (
                      <text x={p.x} y={p.y + 4} textAnchor="middle"
                        fill="#fff" fontSize={7} fontWeight={700} letterSpacing="0.8px"
                        fontFamily="'DM Sans', sans-serif"
                        stroke="rgba(0,0,0,0.55)" strokeWidth={2.5} paintOrder="stroke fill"
                        style={{ pointerEvents: "none", userSelect: "none" }}>
                        {n.type.replace("_", " ").toUpperCase()}
                      </text>
                    )}
                    {/* Label below node */}
                    <text x={p.x} y={p.y + r + 14} textAnchor="middle"
                      fill={isBook ? G.text : G.muted}
                      fontSize={isBook ? 11 : 10}
                      fontWeight={isBook ? 600 : 400}
                      fontFamily="'DM Sans', sans-serif"
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend + explanation */}
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${G.border}`,
              display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
                {activeTypes.map(type => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: NODE_COLORS[type] || G.muted, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: G.muted, textTransform: "capitalize" }}>
                      {type.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
              {explanation && (
                <div style={{ fontSize: 12, color: G.muted, maxWidth: 420, lineHeight: 1.5 }}>
                  {explanation}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ height: GRAPH_H * 0.55, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", color: G.muted }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>◎</div>
            <div style={{ fontSize: 13 }}>
              {mode === "path"
                ? "Pick two books to find their connection"
                : "Pick a book to explore its neighborhood"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
