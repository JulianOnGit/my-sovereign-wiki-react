import { useEffect, useMemo, useRef, useState } from "react";
import { buildContentGraph, graphStats } from "../lib/contentGraph.js";
import { DEMO_ITEMS } from "../lib/demoData.js";

// Content Connections — the wiki as a living, interactive graph.
//
// Modelled on nlp-graph's knowledge graph, but over the Pod's own data: every
// observation is a content object, every tag / lens / person a topic, every
// attachment a file node (see contentGraph.js). Rendered here with a small,
// dependency-free force simulation on a <canvas> — consistent with the app's
// no-external-library stance (Explore's graph is hand-rolled too).
//
// The interaction is the point, and it mirrors nlp-graph: click any content
// object and it animates to the centre of the view while its direct connections
// light up and everything else dims. Drag to pan, scroll to zoom, drag a node to
// pull it around. A detail panel shows the object and its connections, each
// clickable to walk the graph.

const FILE_COLORS = { image: "#10b981", pdf: "#ef4444", doc: "#f59e0b", file: "#64748b" };
const REST = { related: 118, topic: 74, file: 48 }; // edge spring rest length by kind

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Rough luminance of a hex/rgb colour, to decide light vs dark theme for palettes.
function isDark(color) {
  const m = color.match(/\d+/g);
  if (!m) return color === "#0c0b12";
  const [r, g, b] = m.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function readColors() {
  const bg = cssVar("--bg", "#f4f3f9");
  return {
    accent: cssVar("--accent", "#6750a4"),
    accentStrong: cssVar("--accent-strong", "#58459a"),
    text: cssVar("--text", "#1a1a22"),
    muted: cssVar("--muted", "#6b6b7b"),
    border: cssVar("--border", "#e5e3f0"),
    card: cssVar("--card", "#ffffff"),
    bg,
    dark: isDark(bg),
  };
}

function nodeColor(n, colors) {
  if (n.type === "item") return colors.accent;
  if (n.type === "file") return FILE_COLORS[n.kind] || FILE_COLORS.file;
  return `hsl(${n.hue} 62% ${colors.dark ? 62 : 46}%)`;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function ContentGraph({ items, embedded = false, onOpenItem }) {
  // Standalone mode keeps its own example toggle (derived, so the async Pod load
  // can't lock it); embedded mode (inside Explore) trusts the items it is given —
  // the host view owns the demo/real switch.
  const [demoChoice, setDemoChoice] = useState(null);
  const demo = !embedded && (demoChoice ?? items.length === 0);
  const setDemo = setDemoChoice;
  const data = demo ? DEMO_ITEMS : items;

  const [showTopics, setShowTopics] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  // Default is adaptive (nlp-graph style): dense graphs hide single-use topics;
  // this forces the complete topic set on.
  const [allTopics, setAllTopics] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [fs, setFs] = useState(false);

  const graph = useMemo(
    () =>
      buildContentGraph(data, {
        showTopics,
        showFiles,
        minTopicDegree: allTopics ? 1 : "auto",
      }),
    [data, showTopics, showFiles, allTopics],
  );
  const stats = useMemo(() => graphStats(graph), [graph]);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  // Latest setSelectedId, so the imperative engine can push selection to React.
  const selectRef = useRef(setSelectedId);
  selectRef.current = setSelectedId;

  // Drop a stale selection if a filter change removed that node from the graph.
  useEffect(() => {
    if (selectedId && !graph.byId.has(selectedId)) setSelectedId(null);
  }, [graph, selectedId]);

  // ── The simulation + render engine ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");

    let colors = readColors();
    const rng = mulberry32(graph.nodes.length * 2654435761 + 7);

    // Seed positions in a loose disc so the layout has room to unfold.
    const spread = 40 + Math.sqrt(graph.nodes.length) * 26;
    const sim = graph.nodes.map((n) => {
      const a = rng() * Math.PI * 2;
      const rad = rng() * spread;
      return {
        id: n.id,
        node: n,
        x: Math.cos(a) * rad,
        y: Math.sin(a) * rad,
        vx: 0,
        vy: 0,
        r: n.radius,
        color: nodeColor(n, colors),
        fixed: false,
      };
    });
    const idToSim = new Map(sim.map((s) => [s.id, s]));
    const edges = graph.edges
      .map((e) => ({ a: idToSim.get(e.source), b: idToSim.get(e.target), kind: e.kind }))
      .filter((e) => e.a && e.b);

    let W = wrap.clientWidth || 800;
    let H = wrap.clientHeight || 560;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cam = { x: W / 2, y: H / 2, k: 1 };
    const camT = { ...cam };
    let alpha = 1;
    let hover = null;
    let sel = null; // { id, neighbors:Set }
    let drag = null;
    let raf = 0;
    let queued = false;
    let orderCache = null; // node draw order, invalidated on selection change

    // Demand-driven render loop: the graph draws only while something moves
    // (physics, camera, drag). Once settled it costs zero CPU — every event
    // that changes what's on screen calls wake().
    function wake() {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(frame);
      }
    }

    function resize() {
      W = wrap.clientWidth || 800;
      H = wrap.clientHeight || 560;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      wake();
    }
    resize();

    // Centre the whole cloud in the viewport at a sensible zoom.
    function fitView(animate = true) {
      if (!sim.length) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of sim) {
        minX = Math.min(minX, s.x - s.r);
        minY = Math.min(minY, s.y - s.r);
        maxX = Math.max(maxX, s.x + s.r);
        maxY = Math.max(maxY, s.y + s.r);
      }
      const pad = 60;
      const k = Math.max(
        0.3,
        Math.min(2, Math.min((W - pad) / (maxX - minX || 1), (H - pad) / (maxY - minY || 1))),
      );
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      camT.k = k;
      camT.x = W / 2 - cx * k;
      camT.y = H / 2 - cy * k;
      if (!animate) Object.assign(cam, camT);
      wake();
    }

    function centerOn(id, scale) {
      const s = idToSim.get(id);
      if (!s) return;
      camT.k = scale ?? Math.max(1.15, cam.k);
      camT.x = W / 2 - s.x * camT.k;
      camT.y = H / 2 - s.y * camT.k;
      wake();
    }

    function select(id) {
      orderCache = null; // highlight set changed — recompute draw order lazily
      if (!id) {
        sel = null;
        selectRef.current(null);
        wake();
        return;
      }
      sel = { id, neighbors: graph.neighbors.get(id) || new Set() };
      selectRef.current(id);
      centerOn(id, Math.max(1.25, cam.k));
    }

    // Expose a handful of actions to the React shell (search, panel, buttons).
    engineRef.current = {
      focus: select,
      fitView,
      focusMatch(q) {
        const query = q.trim().toLowerCase();
        if (!query) return;
        const hit = sim.find((s) => (s.node.label || "").toLowerCase().includes(query));
        if (hit) select(hit.id);
      },
      retheme() {
        colors = readColors();
        for (const s of sim) s.color = nodeColor(s.node, colors);
        wake();
      },
    };

    // ── Physics ──────────────────────────────────────────────────────────────
    function step() {
      const a = alpha;
      for (let i = 0; i < sim.length; i++) {
        const p = sim[i];
        for (let j = i + 1; j < sim.length; j++) {
          const q = sim[j];
          let dx = p.x - q.x;
          let dy = p.y - q.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = (rng() - 0.5) * 0.1;
            dy = (rng() - 0.5) * 0.1;
            d2 = 0.01;
          }
          const d = Math.sqrt(d2);
          const f = (1500 * a) / d2;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          p.vx += fx;
          p.vy += fy;
          q.vx -= fx;
          q.vy -= fy;
        }
      }
      for (const e of edges) {
        const rest = REST[e.kind] || 80;
        let dx = e.b.x - e.a.x;
        let dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - rest) * 0.045 * a;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        e.a.vx += fx;
        e.a.vy += fy;
        e.b.vx -= fx;
        e.b.vy -= fy;
      }
      for (const p of sim) {
        if (p.fixed) {
          p.vx = 0;
          p.vy = 0;
          continue;
        }
        p.vx += -p.x * 0.028 * a;
        p.vy += -p.y * 0.028 * a;
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += p.vx;
        p.y += p.vy;
      }
      alpha = Math.max(0.02, alpha * 0.985);
    }

    const toScreen = (s) => ({ x: s.x * cam.k + cam.x, y: s.y * cam.k + cam.y });

    // Every node carries its name permanently — the graph must read without
    // hovering. Only on very dense graphs do leaf topics wait for zoom, so the
    // canvas stays legible; objects and files are always named.
    const many = sim.length > 140;
    function wantsLabel(s) {
      if (sel && (s.id === sel.id || sel.neighbors.has(s.id))) return true;
      if (s.id === hover) return true;
      if (!many) return true;
      if (s.node.type !== "topic" || s.node.degree >= 2) return true;
      return cam.k >= 1.05;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    // Draw order (dimmed first, highlighted on top) depends only on the
    // selection — cache it instead of allocating and sorting every frame.
    function drawOrder() {
      if (!orderCache) {
        if (!sel) {
          orderCache = sim;
        } else {
          const dim = [];
          const lit = [];
          for (const s of sim) {
            (s.id === sel.id || sel.neighbors.has(s.id) ? lit : dim).push(s);
          }
          orderCache = dim.concat(lit);
        }
      }
      return orderCache;
    }

    const PAD = 60; // viewport culling margin, px

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const k = cam.k;
      const ox = cam.x;
      const oy = cam.y;
      const zw = Math.max(0.6, k);

      // Edges — one path + one stroke() per style bucket instead of a full
      // style change and stroke per edge; offscreen edges are culled.
      const buckets = new Map(); // style key -> edges
      for (const e of edges) {
        const key = sel && (e.a.id === sel.id || e.b.id === sel.id) ? "hi" : e.kind;
        let list = buckets.get(key);
        if (!list) buckets.set(key, (list = []));
        list.push(e);
      }
      const dimA = sel ? 0.04 : 0.2;
      const styleOf = {
        hi: { alpha: 0.9, color: colors.accent, width: 2 * zw },
        related: { alpha: dimA, color: colors.accent, width: 1.4 * zw },
        file: { alpha: dimA, color: "#f59e0b", width: 1 * zw },
        topic: { alpha: dimA, color: colors.border, width: 1 * zw },
      };
      ctx.lineCap = "round";
      // Highlighted bucket strokes last, so it paints on top.
      const keys = [...buckets.keys()].sort((a, b) => (a === "hi") - (b === "hi"));
      for (const key of keys) {
        const st = styleOf[key] || styleOf.topic;
        ctx.globalAlpha = st.alpha;
        ctx.strokeStyle = st.color;
        ctx.lineWidth = st.width;
        ctx.beginPath();
        for (const e of buckets.get(key)) {
          const ax = e.a.x * k + ox;
          const ay = e.a.y * k + oy;
          const bx = e.b.x * k + ox;
          const by = e.b.y * k + oy;
          if (
            (ax < -PAD && bx < -PAD) || (ax > W + PAD && bx > W + PAD) ||
            (ay < -PAD && by < -PAD) || (ay > H + PAD && by > H + PAD)
          ) continue;
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Nodes (offscreen ones culled)
      const order = drawOrder();
      for (const s of order) {
        const px = s.x * k + ox;
        const py = s.y * k + oy;
        if (px < -PAD || px > W + PAD || py < -PAD || py > H + PAD) continue;
        const R = Math.max(2.4, s.r * k);
        const on = !sel || s.id === sel.id || sel.neighbors.has(s.id);
        ctx.globalAlpha = on ? 1 : 0.12;
        ctx.fillStyle = s.color;
        ctx.strokeStyle = s.id === sel?.id ? colors.accentStrong : s.id === hover ? colors.text : colors.card;
        ctx.lineWidth = s.id === sel?.id ? 3 : 1.5;
        if (s.node.type === "file") {
          const w = R * 1.7;
          roundRect(ctx, px - w / 2, py - w / 2, w, w, Math.max(2, R * 0.35));
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(px, py, R, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Labels (offscreen ones culled)
      ctx.font =
        "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (const s of order) {
        if (!wantsLabel(s)) continue;
        const px = s.x * k + ox;
        const py = s.y * k + oy;
        if (px < -PAD || px > W + PAD || py < -PAD || py > H + PAD) continue;
        const R = Math.max(2.4, s.r * k);
        const on = !sel || s.id === sel.id || sel.neighbors.has(s.id);
        const raw = s.node.label || "";
        const label = raw.length > 26 ? raw.slice(0, 25) + "…" : raw;
        const y = py - R - 4;
        ctx.globalAlpha = on ? 1 : 0.25;
        ctx.lineWidth = 3;
        ctx.strokeStyle = colors.card;
        ctx.strokeText(label, px, y);
        ctx.fillStyle = colors.text;
        ctx.fillText(label, px, y);
      }
      ctx.globalAlpha = 1;
    }

    function frame() {
      queued = false;
      // Ease the camera toward its target, snapping once close enough so the
      // loop can actually reach quiescence.
      cam.x += (camT.x - cam.x) * 0.16;
      cam.y += (camT.y - cam.y) * 0.16;
      cam.k += (camT.k - cam.k) * 0.16;
      const camMoving =
        Math.abs(camT.x - cam.x) > 0.3 ||
        Math.abs(camT.y - cam.y) > 0.3 ||
        Math.abs(camT.k - cam.k) > 0.0015;
      if (!camMoving) {
        cam.x = camT.x;
        cam.y = camT.y;
        cam.k = camT.k;
      }
      const simActive = alpha > 0.03 || Boolean(drag);
      if (simActive) step();
      draw();
      // Re-queue only while something is in motion; otherwise the loop parks
      // and the next interaction wakes it.
      if (simActive || camMoving) wake();
    }

    // ── Interaction ────────────────────────────────────────────────────────────
    function pointerAt(evt) {
      const rect = canvas.getBoundingClientRect();
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }
    function pick(sx, sy) {
      let best = null;
      let bestD = Infinity;
      for (const s of sim) {
        const p = toScreen(s);
        const R = Math.max(2.4, s.r * cam.k) + 5;
        const d = (p.x - sx) ** 2 + (p.y - sy) ** 2;
        if (d <= R * R && d < bestD) {
          bestD = d;
          best = s;
        }
      }
      return best;
    }
    function reheat() {
      alpha = Math.max(alpha, 0.55);
    }

    function onDown(evt) {
      canvas.setPointerCapture?.(evt.pointerId);
      const { x, y } = pointerAt(evt);
      const hit = pick(x, y);
      if (hit) {
        drag = { mode: "node", target: hit, moved: false, downX: x, downY: y };
        hit.fixed = true;
      } else {
        drag = { mode: "pan", lastX: x, lastY: y, moved: false, downX: x, downY: y };
      }
      wake();
    }
    function onMove(evt) {
      const { x, y } = pointerAt(evt);
      if (!drag) {
        const hit = pick(x, y);
        const next = hit ? hit.id : null;
        if (next !== hover) {
          hover = next;
          canvas.style.cursor = hit ? "pointer" : "grab";
          wake(); // repaint the hover ring even when the loop is parked
        }
        return;
      }
      if (Math.abs(x - drag.downX) + Math.abs(y - drag.downY) > 4) drag.moved = true;
      if (drag.mode === "node") {
        drag.target.x = (x - cam.x) / cam.k;
        drag.target.y = (y - cam.y) / cam.k;
        drag.target.vx = 0;
        drag.target.vy = 0;
        reheat();
      } else {
        const dx = x - drag.lastX;
        const dy = y - drag.lastY;
        cam.x += dx;
        cam.y += dy;
        camT.x += dx;
        camT.y += dy;
        drag.lastX = x;
        drag.lastY = y;
      }
    }
    function onUp(evt) {
      if (!drag) return;
      const wasClick = !drag.moved;
      if (drag.mode === "node") {
        drag.target.fixed = false;
        if (wasClick) select(drag.target.id);
      } else if (wasClick) {
        select(null);
      }
      canvas.releasePointerCapture?.(evt.pointerId);
      drag = null;
      wake();
    }
    function onWheel(evt) {
      evt.preventDefault();
      const { x, y } = pointerAt(evt);
      const wx = (x - cam.x) / cam.k;
      const wy = (y - cam.y) / cam.k;
      const k = Math.min(3, Math.max(0.3, cam.k * Math.exp(-evt.deltaY * 0.0015)));
      cam.k = k;
      cam.x = x - wx * k;
      cam.y = y - wy * k;
      camT.k = k;
      camT.x = cam.x;
      camT.y = cam.y;
      wake();
    }

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // Re-read palette when the theme flips (main themes via both media + attr).
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onTheme = () => engineRef.current?.retheme();
    mq.addEventListener?.("change", onTheme);
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // fitView() already queued the first frame via wake(); the loop then runs
    // until the layout settles and parks itself.
    fitView(false);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener?.("change", onTheme);
      engineRef.current = null;
    };
  }, [graph]);

  // Search follows the graph: focus the first label match as you type.
  useEffect(() => {
    if (!search.trim()) return;
    const t = setTimeout(() => engineRef.current?.focusMatch(search), 120);
    return () => clearTimeout(t);
  }, [search]);

  function toggleFullscreen() {
    const el = wrapRef.current?.parentElement; // the graph frame
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  useEffect(() => {
    const onFsChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const focusNode = (id) => engineRef.current?.focus(id);
  const selected = selectedId ? graph.byId.get(selectedId) : null;

  const statsRow = (
    <div className="cg-stats">
      <span className="cg-stat"><b>{stats.objects}</b> objects</span>
      <span className="cg-stat"><b>{stats.topics}</b> topics</span>
      <span className="cg-stat"><b>{stats.files}</b> files</span>
      <span className="cg-stat"><b>{stats.links}</b> links</span>
    </div>
  );

  return (
    <div className="cg">
      {!embedded && (
        <div className="cg-head">
          <div>
            <h1 className="explore-home-title">Content Connections</h1>
            <p className="muted explore-home-sub">
              Your wiki as a graph — every observation, topic and file, and how they
              link. Click a node to bring it to the centre and light up its connections.
            </p>
          </div>
          {statsRow}
        </div>
      )}

      {!embedded &&
        (demo ? (
          <div className="demo-banner">
            <span>
              ✨ <strong>Example graph.</strong> Sample observations, to show how the
              connections graph reads.
              {items.length > 0 && " Your own graph is hidden while this is on."}
            </span>
            {items.length > 0 && (
              <button className="demo-toggle" onClick={() => setDemo(false)}>
                Show my graph
              </button>
            )}
          </div>
        ) : (
          <div className="demo-banner demo-banner-plain">
            <span>A live view over your own Pod — nothing leaves your device.</span>
            <button className="demo-toggle" onClick={() => setDemo(true)}>
              ✨ See an example
            </button>
          </div>
        ))}

      <div className="cg-controls">
        {embedded && statsRow}
        <input
          type="search"
          className="cg-search"
          placeholder="Find a node…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="cg-toggle">
          <input type="checkbox" checked={showTopics} onChange={(e) => setShowTopics(e.target.checked)} />
          Topics
        </label>
        <label className="cg-toggle">
          <input type="checkbox" checked={showFiles} onChange={(e) => setShowFiles(e.target.checked)} />
          Files
        </label>
        <label
          className="cg-toggle"
          title="Dense graphs hide topics only one object references; this shows every topic"
        >
          <input type="checkbox" checked={allTopics} onChange={(e) => setAllTopics(e.target.checked)} />
          All topics
        </label>
        <span className="cg-controls-spacer" />
        <button type="button" className="cg-btn" onClick={() => engineRef.current?.fitView()}>
          Fit
        </button>
        <button type="button" className="cg-btn" onClick={toggleFullscreen}>
          {fs ? "⤡ Exit" : "⤢ Full screen"}
        </button>
      </div>

      <div className="cg-frame">
        <div className="cg-canvas-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} className="cg-canvas" style={{ touchAction: "none" }} />
          {graph.nodes.length === 0 && (
            <div className="cg-empty">Nothing to graph yet — capture a few observations first.</div>
          )}
          <div className="cg-legend" aria-hidden="true">
            <span><i className="cg-dot cg-dot-item" /> Observation</span>
            <span><i className="cg-dot cg-dot-topic" /> Topic</span>
            <span><i className="cg-dot cg-dot-file" /> File</span>
          </div>
          {!selected && graph.nodes.length > 0 && (
            <div className="cg-hint">Click a node · drag to pan · scroll to zoom</div>
          )}
        </div>

        {selected && (
          <NodePanel
            graph={graph}
            node={selected}
            onClose={() => focusNode(null)}
            onFocus={focusNode}
            onOpenItem={onOpenItem}
          />
        )}
      </div>
    </div>
  );
}

// The detail panel for the selected node — the object and its direct connections,
// each of which is clickable to re-centre the graph on it.
function NodePanel({ graph, node, onClose, onFocus, onOpenItem }) {
  const neighbors = [...(graph.neighbors.get(node.id) || [])]
    .map((id) => graph.byId.get(id))
    .filter(Boolean);
  const relatedItems = neighbors.filter((n) => n.type === "item");
  const topics = neighbors.filter((n) => n.type === "topic");
  const files = neighbors.filter((n) => n.type === "file");

  const typeLabel =
    node.type === "item" ? "observation" : node.type === "file" ? node.kind : node.subtype || "topic";

  return (
    <aside className="cg-panel">
      <button type="button" className="cg-panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <span className={`cg-badge cg-badge-${node.type}`}>{typeLabel}</span>
      <h3 className="cg-panel-title">{node.label}</h3>

      {node.type === "item" && node.body && (
        <p className="cg-panel-body">{node.body.slice(0, 240)}{node.body.length > 240 ? "…" : ""}</p>
      )}
      {node.type === "item" && node.efflorescence && (
        <p className="cg-panel-effl">✨ {node.efflorescenceType}: {node.efflorescence}</p>
      )}
      {node.type === "item" && onOpenItem && (
        <button type="button" className="cg-btn cg-open" onClick={() => onOpenItem(node.itemId)}>
          Open this observation →
        </button>
      )}
      {node.type === "file" && (
        <p className="cg-panel-body">
          Attachment on{" "}
          <button className="cg-link" onClick={() => onFocus(node.parent)}>
            {graph.byId.get(node.parent)?.label || "its observation"}
          </button>
          .
        </p>
      )}

      <Connections label="Related objects" nodes={relatedItems} onFocus={onFocus} />
      <Connections label="Topics" nodes={topics} onFocus={onFocus} chips />
      <Connections label="Files" nodes={files} onFocus={onFocus} />

      {neighbors.length === 0 && <p className="muted cg-panel-empty">No connections yet.</p>}
    </aside>
  );
}

function Connections({ label, nodes, onFocus, chips }) {
  if (!nodes.length) return null;
  return (
    <div className="cg-conn">
      <div className="cg-conn-label">{label} · {nodes.length}</div>
      <div className={chips ? "cg-chip-row" : "cg-conn-list"}>
        {nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            className={chips ? "cg-chip" : "cg-conn-row"}
            onClick={() => onFocus(n.id)}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
