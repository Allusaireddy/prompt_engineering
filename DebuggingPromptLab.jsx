import { useState, useEffect } from "react";

/* ── Real-world Python error from Stack Overflow ──────────────────────────
   Source: https://stackoverflow.com/questions/tagged/python (common async error)
   Error: RuntimeError: Task attached to a different loop
   This is a very common production async bug in Python.
──────────────────────────────────────────────────────────────────────────── */

const ERROR_CONTEXT = {
  source: "Stack Overflow / GitHub Issues",
  error: `Traceback (most recent call last):
  File "app.py", line 47, in process_batch
    results = await asyncio.gather(*tasks)
  File "/usr/lib/python3.10/asyncio/tasks.py", line 580, in gather
    children.append(ensure_future(arg, loop=loop))
  File "/usr/lib/python3.10/asyncio/tasks.py", line 671, in ensure_future
    task = loop.create_task(coro)
RuntimeError: Task <Task pending coro=<fetch_user_data() running at app.py:23>>
got Future <Future pending> attached to a different loop`,
  code: `import asyncio
import aiohttp

# Global session created at module level
session = aiohttp.ClientSession()

async def fetch_user_data(user_id: int) -> dict:
    url = f"https://api.example.com/users/{user_id}"
    async with session.get(url) as response:
        return await response.json()

async def process_batch(user_ids: list[int]) -> list[dict]:
    tasks = [fetch_user_data(uid) for uid in user_ids]
    results = await asyncio.gather(*tasks)
    return results

# Called from a FastAPI endpoint
@app.post("/batch-users")
async def batch_endpoint(user_ids: list[int]):
    return await process_batch(user_ids)`,
  expected: "Should fetch user data for a list of IDs concurrently and return results without errors.",
};

const BASIC_PROMPT = `I'm getting this error in my Python code:

RuntimeError: Task <Task pending coro=<fetch_user_data()>> got Future attached to a different loop

How do I fix it?`;

const CATE_PROMPT = `**CONTEXT:**
I'm a backend Python developer working on a FastAPI application (Python 3.10, aiohttp 3.9). The app processes batch requests to an external API. This error appears intermittently in production — works fine locally but crashes under load with multiple concurrent requests.

**ERROR MESSAGE (from Stack Overflow / real production log):**
\`\`\`
RuntimeError: Task <Task pending coro=<fetch_user_data() running at app.py:23>>
got Future <Future pending> attached to a different loop
\`\`\`

**PROBLEMATIC CODE:**
\`\`\`python
import asyncio
import aiohttp

# Global session created at module level
session = aiohttp.ClientSession()

async def fetch_user_data(user_id: int) -> dict:
    url = f"https://api.example.com/users/{user_id}"
    async with session.get(url) as response:
        return await response.json()

async def process_batch(user_ids: list[int]) -> list[dict]:
    tasks = [fetch_user_data(uid) for uid in user_ids]
    results = await asyncio.gather(*tasks)
    return results

@app.post("/batch-users")
async def batch_endpoint(user_ids: list[int]):
    return await process_batch(user_ids)
\`\`\`

**EXPECTED BEHAVIOR:**
Concurrently fetch user data for a list of IDs and return all results — no errors under load.

**ACTION:**
1. Diagnose the exact root cause (why does the event loop mismatch happen?)
2. Provide the corrected code with inline comments explaining each fix
3. Explain why the global session pattern is dangerous in async frameworks

**TONE:** Senior Python engineer — precise, no hand-holding, production-ready advice.

**DESIRED OUTPUT FORMAT:**
\`\`\`
## Root Cause
[1 paragraph explanation]

## Fixed Code
[corrected Python code with inline comments]

## Why This Happened
[bullet points — event loop lifecycle explanation]

## Production Best Practice
[1-2 sentences on the right pattern going forward]
\`\`\``;

// ── Scoring rubric ─────────────────────────────────────────────────────────
const RUBRIC = [
  { id: "rootCause", label: "Root Cause Explained", weight: 20, desc: "Does it identify WHY the error occurs?" },
  { id: "fixedCode", label: "Working Fixed Code", weight: 25, desc: "Provides corrected, runnable code?" },
  { id: "inlineComments", label: "Inline Comments", weight: 15, desc: "Code explained line-by-line?" },
  { id: "format", label: "Structured Format", weight: 15, desc: "Clear sections, easy to follow?" },
  { id: "actionable", label: "Immediately Actionable", weight: 15, desc: "Can I apply this fix right now?" },
  { id: "bestPractice", label: "Best Practice Advice", weight: 10, desc: "Prevents future recurrence?" },
];

function callClaude(prompt, onChunk, onDone, onError) {
  fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  })
    .then(r => r.json())
    .then(data => {
      const text = data.content?.map(b => b.text || "").join("") || "";
      onChunk(text);
      onDone();
    })
    .catch(onError);
}

const SCORES_KEY = "dbg_scores";

export default function App() {
  const [phase, setPhase] = useState("intro"); // intro | testing | results
  const [basicResp, setBasicResp] = useState("");
  const [cateResp, setCateResp] = useState("");
  const [basicLoading, setBasicLoading] = useState(false);
  const [cateLoading, setCateLoading] = useState(false);
  const [basicDone, setBasicDone] = useState(false);
  const [cateDone, setCateDone] = useState(false);
  const [scores, setScores] = useState({ basic: {}, cate: {} });
  const [activeView, setActiveView] = useState("split"); // split | basic | cate | compare
  const [showPrompts, setShowPrompts] = useState(false);
  const [runStep, setRunStep] = useState(0); // 0=idle,1=basic,2=cate,3=done

  function runAll() {
    setPhase("testing");
    setRunStep(1);
    setBasicLoading(true);
    callClaude(
      BASIC_PROMPT,
      t => setBasicResp(t),
      () => { setBasicLoading(false); setBasicDone(true); setRunStep(2); runCate(); },
      () => { setBasicLoading(false); setBasicResp("⚠️ Error fetching response."); setRunStep(2); runCate(); }
    );
  }

  function runCate() {
    setCateLoading(true);
    callClaude(
      CATE_PROMPT,
      t => setCateResp(t),
      () => { setCateLoading(false); setCateDone(true); setRunStep(3); setPhase("results"); },
      () => { setCateLoading(false); setCateResp("⚠️ Error fetching response."); setRunStep(3); setPhase("results"); }
    );
  }

  function setScore(type, criterion, val) {
    setScores(prev => ({ ...prev, [type]: { ...prev[type], [criterion]: val } }));
  }

  function totalScore(type) {
    return RUBRIC.reduce((sum, r) => {
      const v = scores[type][r.id];
      return sum + (v ? (v / 5) * r.weight : 0);
    }, 0);
  }

  const basicScore = totalScore("basic");
  const cateScore = totalScore("cate");
  const improvement = cateScore - basicScore;

  // ── INTRO PHASE ────────────────────────────────────────────────────────
  if (phase === "intro") return (
    <div style={styles.root}>
      <style>{css}</style>
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={styles.headerIcon}>🐛</div>
          <div>
            <div style={styles.headerTitle}>Debugging Prompt Showdown</div>
            <div style={styles.headerSub}>Basic vs CATE-Engineered · Task 3</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        {/* Error card */}
        <div style={styles.card} className="fade-in">
          <div style={styles.cardLabel}>🔍 Real Python Error (Source: Stack Overflow)</div>
          <div style={styles.errorBlock}>
            <pre style={styles.pre}>{ERROR_CONTEXT.error}</pre>
          </div>
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={styles.miniLabel}>Problematic Code</div>
              <pre style={{ ...styles.pre, background: "#1a1a2e", color: "#a8d8a8", fontSize: 11, maxHeight: 160, overflowY: "auto" }}>
                {ERROR_CONTEXT.code}
              </pre>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#fff8e8", border: "1px solid #f5e0a0", borderRadius: 8, padding: "12px 14px" }}>
                <div style={styles.miniLabel}>Expected Behaviour</div>
                <div style={{ fontSize: 13, color: "#6b4c00", lineHeight: 1.5 }}>{ERROR_CONTEXT.expected}</div>
              </div>
              <div style={{ background: "#f0fff4", border: "1px solid #b8e8ca", borderRadius: 8, padding: "12px 14px" }}>
                <div style={styles.miniLabel}>Found On</div>
                <div style={{ fontSize: 13, color: "#1a4a2a" }}>{ERROR_CONTEXT.source}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two prompts preview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }} className="fade-in-2">
          <div style={{ ...styles.card, borderTop: "3px solid #e05252" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>😐</span>
              <div style={{ fontWeight: "bold", fontSize: 14, color: "#c0392b" }}>Basic Prompt</div>
            </div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, fontStyle: "italic" }}>
              "{BASIC_PROMPT.slice(0, 120)}…"
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#e05252", fontWeight: "bold" }}>
              ❌ No context · No code · No format
            </div>
          </div>
          <div style={{ ...styles.card, borderTop: "3px solid #27ae60" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <div style={{ fontWeight: "bold", fontSize: 14, color: "#1a7a40" }}>CATE-Engineered Prompt</div>
            </div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, fontStyle: "italic" }}>
              "Context: FastAPI app, Python 3.10, aiohttp 3.9. Error in production under load…"
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#27ae60", fontWeight: "bold" }}>
              ✅ Context · Code · Expected · Action · Tone · Format
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button onClick={runAll} style={styles.bigBtn} className="pulse-btn">
            ⚡ Run Both Prompts & Compare
          </button>
          <div style={{ marginTop: 10, fontSize: 12, color: "#999" }}>
            Sends both prompts to Claude simultaneously — responses appear in real time
          </div>
        </div>
      </div>
    </div>
  );

  // ── TESTING / RESULTS PHASE ─────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={styles.headerIcon}>🐛</div>
          <div>
            <div style={styles.headerTitle}>Debugging Prompt Showdown</div>
            <div style={styles.headerSub}>
              {phase === "testing" ? (runStep === 1 ? "⏳ Running basic prompt…" : "⏳ Running CATE prompt…") : "✅ Both responses ready"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["split", "basic", "cate", "compare"].map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              style={{ ...styles.tabBtn, background: activeView === v ? "#f5a623" : "rgba(255,255,255,0.1)",
                color: activeView === v ? "#1a1a1a" : "#fff" }}>
              {v === "split" ? "⬛ Split" : v === "basic" ? "😐 Basic" : v === "cate" ? "🎯 CATE" : "📊 Score"}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {phase === "testing" && (
        <div style={{ height: 3, background: "#2a2a2a" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,#f5a623,#e74c3c)",
            width: runStep === 1 ? "40%" : runStep === 2 ? "80%" : "100%",
            transition: "width 1s ease" }} />
        </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── SPLIT VIEW ── */}
        {activeView === "split" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, overflow: "hidden" }}>
            {/* Basic */}
            <div style={{ borderRight: "2px solid #2a2a2a", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 18px", background: "#2a1a1a", borderBottom: "1px solid #3a2a2a",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 16 }}>😐</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "#ff8a80" }}>Basic Prompt</div>
                    <div style={{ fontSize: 10, color: "#888" }}>"How do I fix this error?"</div>
                  </div>
                </div>
                {basicLoading && <LoadingDots color="#ff8a80" />}
                {basicDone && <span style={{ fontSize: 11, color: "#4caf50" }}>✓ Done</span>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                {basicResp
                  ? <div style={styles.respText} className="fade-in">{basicResp}</div>
                  : basicLoading && <LoadingDots color="#ff8a80" large />}
              </div>
            </div>

            {/* CATE */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 18px", background: "#1a2a1a", borderBottom: "1px solid #2a3a2a",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "#69f0ae" }}>CATE-Engineered Prompt</div>
                    <div style={{ fontSize: 10, color: "#888" }}>Context · Action · Tone · Example</div>
                  </div>
                </div>
                {cateLoading && <LoadingDots color="#69f0ae" />}
                {cateDone && <span style={{ fontSize: 11, color: "#4caf50" }}>✓ Done</span>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                {cateResp
                  ? <div style={styles.respText} className="fade-in">{cateResp}</div>
                  : cateLoading && <LoadingDots color="#69f0ae" large />}
              </div>
            </div>
          </div>
        )}

        {/* ── SINGLE RESPONSE VIEW ── */}
        {(activeView === "basic" || activeView === "cate") && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 24px", background: activeView === "basic" ? "#2a1a1a" : "#1a2a1a",
              borderBottom: "1px solid #333" }}>
              <div style={{ fontSize: 13, fontWeight: "bold",
                color: activeView === "basic" ? "#ff8a80" : "#69f0ae" }}>
                {activeView === "basic" ? "😐 Basic Prompt" : "🎯 CATE-Engineered Prompt"}
              </div>
              <pre style={{ marginTop: 8, fontSize: 11, color: "#aaa", lineHeight: 1.5,
                whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 100, overflowY: "auto" }}>
                {activeView === "basic" ? BASIC_PROMPT : CATE_PROMPT}
              </pre>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              <div style={styles.respText}>
                {(activeView === "basic" ? basicResp : cateResp) || "Waiting for response…"}
              </div>
            </div>
          </div>
        )}

        {/* ── SCORE / COMPARE VIEW ── */}
        {activeView === "compare" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div style={{ maxWidth: 820, margin: "0 auto" }}>

              {/* Score totals */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16,
                alignItems: "center", marginBottom: 28 }}>
                <ScoreCard type="basic" label="😐 Basic Prompt" score={basicScore} color="#ff8a80" />
                <div style={{ textAlign: "center", fontSize: 24, color: "#666" }}>vs</div>
                <ScoreCard type="cate" label="🎯 CATE Prompt" score={cateScore} color="#69f0ae" />
              </div>

              {improvement > 0 && (
                <div style={{ textAlign: "center", padding: "12px 24px", background: "#1a2a1a",
                  border: "1px solid #27ae60", borderRadius: 10, marginBottom: 24, fontSize: 15, color: "#69f0ae" }}>
                  🚀 CATE prompt scored <strong>+{improvement.toFixed(0)} points</strong> higher
                  ({((improvement / 100) * 100).toFixed(0)}% improvement)
                </div>
              )}

              {/* Rubric scoring */}
              <div style={{ fontSize: 13, fontWeight: "bold", color: "#aaa",
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Rate Each Criterion (1–5 stars)
              </div>
              {RUBRIC.map(r => (
                <div key={r.id} style={{ background: "#1e1e1e", border: "1px solid #2a2a2a",
                  borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: "bold", color: "#fff" }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{r.desc} · Weight: {r.weight}pts</div>
                    </div>
                    <div style={{ display: "flex", gap: 24 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#ff8a80", marginBottom: 4 }}>BASIC</div>
                        <StarRow val={scores.basic[r.id] || 0} onChange={v => setScore("basic", r.id, v)} color="#ff8a80" />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#69f0ae", marginBottom: 4 }}>CATE</div>
                        <StarRow val={scores.cate[r.id] || 0} onChange={v => setScore("cate", r.id, v)} color="#69f0ae" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Comparison table */}
              <div style={{ marginTop: 28, fontSize: 13, fontWeight: "bold", color: "#aaa",
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Side-by-Side Analysis
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Dimension</th>
                    <th style={{ ...styles.th, color: "#ff8a80" }}>😐 Basic</th>
                    <th style={{ ...styles.th, color: "#69f0ae" }}>🎯 CATE</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Context Provided", "Error string only", "Framework, version, environment, load pattern"],
                    ["Code Included", "No", "Full problematic snippet with structure"],
                    ["Expected Behavior", "Implicit", "Explicitly stated"],
                    ["Output Format", "None specified", "Structured sections with headers"],
                    ["Tone Guidance", "None", "Senior engineer, production-ready"],
                    ["Actionability", "Generic fix", "Corrected code + inline comments + best practice"],
                  ].map(([dim, b, c], i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#1a1a1a" : "#1e1e1e" }}>
                      <td style={styles.td}>{dim}</td>
                      <td style={{ ...styles.td, color: "#ff8a80" }}>{b}</td>
                      <td style={{ ...styles.td, color: "#69f0ae" }}>{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* What makes CATE better */}
              <div style={{ marginTop: 24, background: "#1a2a1a", border: "1px solid #2a4a2a",
                borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ fontSize: 14, fontWeight: "bold", color: "#69f0ae", marginBottom: 12 }}>
                  📋 Why CATE Produces a Better Response
                </div>
                {[
                  ["🎯 Context", "Specifying FastAPI + aiohttp + Python 3.10 lets Claude target the exact framework's event loop lifecycle — not a generic async answer."],
                  ["⚡ Action", "Breaking into 3 numbered sub-tasks (diagnose → fix → explain) forces structured, complete output instead of a vague suggestion."],
                  ["🎨 Tone", "'Senior engineer, production-ready' eliminates over-explanation and produces code you can deploy, not tutorial-style pseudocode."],
                  ["📝 Format", "Requesting specific sections (Root Cause / Fixed Code / Why / Best Practice) produces scannable output you can act on immediately."],
                ].map(([label, text]) => (
                  <div key={label} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    <div style={{ fontWeight: "bold", color: "#f5a623", minWidth: 90, fontSize: 13 }}>{label}</div>
                    <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>{text}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingDots({ color, large }) {
  return (
    <div style={{ display: "flex", gap: large ? 8 : 4, padding: large ? "20px 0" : 0 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: large ? 10 : 6, height: large ? 10 : 6,
          borderRadius: "50%", background: color,
          animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
    </div>
  );
}

function StarRow({ val, onChange, color }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} onClick={() => onChange(s)}
          style={{ cursor: "pointer", fontSize: 16, color: s <= val ? color : "#444",
            transition: "transform 0.1s" }}
          onMouseEnter={e => e.target.style.transform = "scale(1.3)"}
          onMouseLeave={e => e.target.style.transform = "scale(1)"}>★</span>
      ))}
    </div>
  );
}

function ScoreCard({ label, score, color }) {
  return (
    <div style={{ background: "#1e1e1e", border: `1px solid ${color}33`, borderRadius: 12,
      padding: "20px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 48, fontWeight: "bold", color, fontVariantNumeric: "tabular-nums" }}>
        {score.toFixed(0)}
      </div>
      <div style={{ fontSize: 12, color: "#666" }}>/ 100 pts</div>
      <div style={{ marginTop: 8, height: 6, background: "#2a2a2a", borderRadius: 3 }}>
        <div style={{ height: "100%", background: color, borderRadius: 3,
          width: `${score}%`, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

const styles = {
  root: {
    fontFamily: "'Courier New', monospace",
    background: "#111",
    color: "#e0e0e0",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#1a1a1a",
    borderBottom: "2px solid #f5a623",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  headerIcon: {
    width: 40, height: 40, background: "#f5a623", borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", letterSpacing: "-0.5px" },
  headerSub: { fontSize: 11, color: "#888", marginTop: 1 },
  tabBtn: {
    padding: "6px 14px", border: "none", borderRadius: 6, cursor: "pointer",
    fontSize: 12, fontWeight: "bold", transition: "all 0.15s",
  },
  card: {
    background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 12, padding: "18px 20px",
  },
  cardLabel: { fontSize: 11, fontWeight: "bold", color: "#f5a623", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  errorBlock: { background: "#0d0d0d", border: "1px solid #3a2a2a", borderRadius: 8, padding: "12px 14px" },
  pre: { margin: 0, fontSize: 11, lineHeight: 1.5, color: "#ff8a80", whiteSpace: "pre-wrap", wordBreak: "break-word" },
  miniLabel: { fontSize: 10, fontWeight: "bold", color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  bigBtn: {
    padding: "14px 40px", background: "#f5a623", color: "#1a1a1a", border: "none",
    borderRadius: 10, fontSize: 16, fontWeight: "bold", cursor: "pointer",
    boxShadow: "0 0 20px #f5a62355", transition: "all 0.2s",
  },
  respText: { fontSize: 13, lineHeight: 1.8, color: "#d0d0d0", whiteSpace: "pre-wrap", wordBreak: "break-word" },
  th: { padding: "10px 14px", background: "#1a1a1a", borderBottom: "1px solid #2a2a2a",
    textAlign: "left", fontSize: 12, fontWeight: "bold", color: "#888" },
  td: { padding: "10px 14px", borderBottom: "1px solid #222", fontSize: 13, verticalAlign: "top" },
};

const css = `
  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 0.5s ease forwards; }
  .fade-in-2 { animation: fadeIn 0.5s ease 0.2s forwards; opacity: 0; }
  .pulse-btn:hover { transform: scale(1.04); box-shadow: 0 0 30px #f5a62388 !important; }
  ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
`;
