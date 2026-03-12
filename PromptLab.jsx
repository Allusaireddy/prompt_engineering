import { useState, useRef, useEffect } from "react";

const PROMPTS = [
  {
    id: 1,
    category: "📚 Learning",
    categoryKey: "learning",
    title: "Learning a Concept",
    prompt: `I'm a junior developer new to distributed systems. Explain "eventual consistency" vs strong consistency — when each applies and their trade-offs. Use an ATM network analogy and numbered steps to make it concrete. Keep the tone like a senior engineer patiently mentoring a junior.`,
    cate: {
      context: "Junior software developer, 1 year experience, new to distributed systems.",
      action: "Explain eventual consistency vs strong consistency, trade-offs, and when each applies.",
      tone: "Clear, patient, educational — senior engineer mentoring a junior.",
      example: "ATM network analogy + numbered steps.",
    },
  },
  {
    id: 2,
    category: "📚 Learning",
    categoryKey: "learning",
    title: "Comparing Technologies",
    prompt: `I'm a backend dev choosing a DB for a SaaS app with 10K concurrent users and complex relational queries. Compare PostgreSQL vs MongoDB across performance, scalability, query flexibility, and ops complexity. Use a comparison table (Criteria | PostgreSQL | MongoDB | Winner) then give a 2-paragraph recommendation. Be technical and objective.`,
    cate: {
      context: "Backend developer evaluating DBs for SaaS with 10K concurrent users.",
      action: "Compare PostgreSQL vs MongoDB across 4 dimensions.",
      tone: "Technical and objective — senior architect giving unbiased recommendation.",
      example: "Comparison table + 2-paragraph recommendation summary.",
    },
  },
  {
    id: 3,
    category: "💻 Coding",
    categoryKey: "coding",
    title: "Debugging Code",
    prompt: `I have a FastAPI endpoint that intermittently 500s in production but works locally — happens in async DB calls. Give me a step-by-step debugging strategy with actual code changes for logging and isolating the issue. Be direct and practical. Format as: # Before (problematic) vs # After (fixed) with notes on what each change reveals.`,
    cate: {
      context: "Python developer with intermittent 500 errors in FastAPI async DB calls.",
      action: "Diagnose causes and provide step-by-step debugging strategy with code changes.",
      tone: "Practical and direct — skip theory, focus on actionable fixes.",
      example: "Code snippets: # Before (problematic) / # After (fixed).",
    },
  },
  {
    id: 4,
    category: "💻 Coding",
    categoryKey: "coding",
    title: "Generating Test Cases",
    prompt: `I wrote a Python checkout() function handling cart validation, discount codes, payment processing, and confirmation emails. Generate comprehensive pytest unit tests covering happy paths, edge cases, and failures. Group by: # Happy Path / # Edge Cases / # Failure Scenarios. Use descriptive names like test_checkout_applies_discount_code_correctly. Be thorough — include cases developers commonly miss.`,
    cate: {
      context: "Developer who wrote a checkout() function with 4 responsibilities.",
      action: "Generate comprehensive pytest unit tests covering all scenarios.",
      tone: "Thorough and structured — cover commonly missed scenarios.",
      example: "Grouped by scenario type with descriptive test function names.",
    },
  },
  {
    id: 5,
    category: "🚀 Career",
    categoryKey: "career",
    title: "Getting Career Advice",
    prompt: `I'm a 5-yr mid-level SWE at a startup with an offer from FAANG at 40% higher pay. I love my work and have equity vesting in 18 months. Help me think through this decision: key factors to weigh, questions to ask myself, and what each choice optimizes for. Be a thoughtful mentor, not prescriptive. End with one clarifying question that would make this decision clearer.`,
    cate: {
      context: "Mid-level SWE, 5 years, startup with FAANG offer at 40% more pay, equity in 18mo.",
      action: "Help think through career decision systematically.",
      tone: "Thoughtful and balanced — trusted mentor who helps think, not dictates.",
      example: "Key factors → self-questions → what each optimizes for → 1 clarifying question.",
    },
  },
  {
    id: 6,
    category: "🚀 Career",
    categoryKey: "career",
    title: "Creating Documentation",
    prompt: `I need API documentation for GET /users/{id} — returns user profile, requires auth token, 404 if not found. Write it in Stripe/Twilio style with: Overview, Authentication, Request Parameters, Response Schema, Error Codes, and a curl example. Use code blocks for all technical content. I'll use this as a template for my other 20 endpoints.`,
    cate: {
      context: "Developer with undocumented REST API; onboarding takes 2-3 days.",
      action: "Write API doc template and fill it for GET /users/{id}.",
      tone: "Clear and professional — Stripe/Twilio documentation style.",
      example: "Sections: Overview, Auth, Params, Response Schema, Error Codes, curl example.",
    },
  },
  {
    id: 7,
    category: "✍️ Communication",
    categoryKey: "communication",
    title: "Writing a Summary",
    prompt: `Write an executive summary of our sprint retrospective (8 engineers, 90 min). Key themes: deployment bottlenecks, testing gaps, morale around crunch time. Make it leadership-ready, 200–250 words, positive framing that doesn't hide problems. Format: opening sentence, Issues Identified (3 bullets), Action Items (3 bullets with owners), Team Sentiment (1 paragraph).`,
    cate: {
      context: "PM after 90-min sprint retro with 8 engineers; themes: bottlenecks, testing, morale.",
      action: "Write executive summary to share with leadership.",
      tone: "Professional and concise — 200-250 words, positive framing without hiding issues.",
      example: "Opening → Issues (3 bullets) → Action Items (3 bullets + owners) → Sentiment.",
    },
  },
  {
    id: 8,
    category: "✍️ Communication",
    categoryKey: "communication",
    title: "Explaining to a Beginner",
    prompt: `Help me explain technical debt to my non-technical manager to justify refactoring our legacy auth system. Use a car maintenance analogy. Cover: what technical debt is, why our auth system is a business risk, and how fixing it reduces security risk, speeds up features, and cuts long-term costs. Zero jargon. End with a 3-point business case (Risk, Velocity, Cost). Under 300 words.`,
    cate: {
      context: "Developer explaining technical debt to non-technical manager for refactor approval.",
      action: "Make the business case for refactoring legacy auth system.",
      tone: "Accessible and persuasive — zero jargon, business language, real without alarmism.",
      example: "Car maintenance analogy + 3-point business case: Risk, Velocity, Cost. Under 300 words.",
    },
  },
];

const CATEGORY_COLORS = {
  learning: { bg: "bg-emerald-950", badge: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-700", light: "bg-emerald-900/40" },
  coding: { bg: "bg-blue-950", badge: "bg-blue-500", text: "text-blue-400", border: "border-blue-700", light: "bg-blue-900/40" },
  career: { bg: "bg-violet-950", badge: "bg-violet-500", text: "text-violet-400", border: "border-violet-700", light: "bg-violet-900/40" },
  communication: { bg: "bg-amber-950", badge: "bg-amber-500", text: "text-amber-400", border: "border-amber-700", light: "bg-amber-900/40" },
};

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl transition-transform hover:scale-110"
          style={{ color: s <= (hover || value) ? "#f59e0b" : "#374151" }}
        >
          ★
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-sm text-gray-400 self-center">{value}/5</span>}
    </div>
  );
}

function CATEBadge({ label, value, color }) {
  const icons = { Context: "🎯", Action: "⚡", Tone: "🎨", Example: "📝" };
  return (
    <div className="mb-2">
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${color} text-white mr-2`}>
        {icons[label]} {label}
      </span>
      <span className="text-sm text-gray-300">{value}</span>
    </div>
  );
}

async function callClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "No response received.";
}

export default function App() {
  const [selected, setSelected] = useState(0);
  const [promptTexts, setPromptTexts] = useState(PROMPTS.map((p) => p.prompt));
  const [responses, setResponses] = useState(Array(8).fill(null));
  const [loading, setLoading] = useState(Array(8).fill(false));
  const [ratings, setRatings] = useState(Array(8).fill(0));
  const [notes, setNotes] = useState(Array(8).fill(""));
  const [revised, setRevised] = useState(Array(8).fill(false));
  const [originals, setOriginals] = useState(Array(8).fill(null));
  const [revisionNotes, setRevisionNotes] = useState(Array(8).fill(""));
  const [view, setView] = useState("test"); // "test" | "report"
  const [editingPrompt, setEditingPrompt] = useState(false);

  const p = PROMPTS[selected];
  const col = CATEGORY_COLORS[p.categoryKey];

  async function runPrompt(idx) {
    setLoading((l) => { const n = [...l]; n[idx] = true; return n; });
    try {
      const res = await callClaude(promptTexts[idx]);
      setResponses((r) => { const n = [...r]; n[idx] = res; return n; });
    } catch (e) {
      setResponses((r) => { const n = [...r]; n[idx] = "Error: " + e.message; return n; });
    }
    setLoading((l) => { const n = [...l]; n[idx] = false; return n; });
  }

  function saveRevision(idx) {
    if (!originals[idx]) {
      setOriginals((o) => { const n = [...o]; n[n.length > idx ? idx : idx] = PROMPTS[idx].prompt; return n; });
    }
    setRevised((r) => { const n = [...r]; n[idx] = true; return n; });
    setEditingPrompt(false);
  }

  function resetPrompt(idx) {
    setPromptTexts((t) => { const n = [...t]; n[idx] = PROMPTS[idx].prompt; return n; });
    setOriginals((o) => { const n = [...o]; n[idx] = null; return n; });
    setRevised((r) => { const n = [...r]; n[idx] = false; return n; });
    setRevisionNotes((rn) => { const n = [...rn]; n[idx] = ""; return n; });
    setResponses((r) => { const n = [...r]; n[idx] = null; return n; });
    setRatings((r) => { const n = [...r]; n[idx] = 0; return n; });
    setNotes((nn) => { const n = [...nn]; n[idx] = ""; return n; });
  }

  const testedCount = responses.filter(Boolean).length;
  const ratedCount = ratings.filter((r) => r > 0).length;
  const revisedCount = revised.filter(Boolean).length;
  const avgRating = ratings.filter((r) => r > 0).length
    ? (ratings.filter((r) => r > 0).reduce((a, b) => a + b, 0) / ratings.filter((r) => r > 0).length).toFixed(1)
    : "—";

  return (
    <div style={{ fontFamily: "'Georgia', serif", minHeight: "100vh", background: "#0a0a0f", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a1025 50%, #0f0f1a 100%)", borderBottom: "1px solid #1e1e30", padding: "20px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 26, fontWeight: 700, color: "#c084fc", margin: 0, letterSpacing: "-0.5px" }}>
              ⚗️ Prompt Testing Lab
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Test · Rate · Revise · Document — CATE Framework</p>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { label: "Tested", val: `${testedCount}/8`, color: "#22d3ee" },
              { label: "Rated", val: `${ratedCount}/8`, color: "#a78bfa" },
              { label: "Revised", val: `${revisedCount}/4+`, color: "#34d399" },
              { label: "Avg Rating", val: avgRating, color: "#f59e0b" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "8px 16px", minWidth: 70 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["test", "report"].map((v) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: view === v ? "#7c3aed" : "#1f2937", color: view === v ? "#fff" : "#9ca3af",
                transition: "all 0.2s"
              }}>
                {v === "test" ? "🧪 Testing" : "📋 Report"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "test" ? (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
          {/* Sidebar */}
          <div>
            <div style={{ background: "#111827", borderRadius: 12, border: "1px solid #1f2937", overflow: "hidden" }}>
              {PROMPTS.map((pr, i) => {
                const c = CATEGORY_COLORS[pr.categoryKey];
                const isActive = selected === i;
                const isDone = responses[i] && ratings[i] > 0;
                return (
                  <button key={i} onClick={() => { setSelected(i); setEditingPrompt(false); }} style={{
                    width: "100%", textAlign: "left", padding: "12px 14px", border: "none", cursor: "pointer",
                    borderBottom: "1px solid #1f2937", transition: "all 0.15s",
                    background: isActive ? "#1f2937" : "transparent",
                    borderLeft: isActive ? "3px solid #7c3aed" : "3px solid transparent",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{pr.category.split(" ")[0]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? "#e2e8f0" : "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {pr.title}
                        </div>
                        <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>Prompt {i + 1}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
                        {responses[i] && <span style={{ fontSize: 9, background: "#065f46", color: "#34d399", padding: "1px 5px", borderRadius: 4 }}>TESTED</span>}
                        {revised[i] && <span style={{ fontSize: 9, background: "#581c87", color: "#c084fc", padding: "1px 5px", borderRadius: 4 }}>REVISED</span>}
                        {ratings[i] > 0 && <span style={{ fontSize: 10, color: "#f59e0b" }}>{"★".repeat(ratings[i])}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Prompt Header */}
            <div style={{ background: "#111827", borderRadius: 12, border: "1px solid #1f2937", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                  PROMPT {selected + 1}
                </span>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>{p.category}</span>
                <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{p.title}</span>
              </div>

              {/* CATE breakdown */}
              <div style={{ background: "#0f172a", borderRadius: 8, padding: "12px 14px", marginBottom: 14, border: "1px solid #1e293b" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 10, letterSpacing: 1 }}>CATE FRAMEWORK</div>
                {Object.entries(p.cate).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, minWidth: 65, color: { Context: "#22d3ee", Action: "#f59e0b", Tone: "#a78bfa", Example: "#34d399" }[k] }}>
                      {{ Context: "🎯 CTX", Action: "⚡ ACT", Tone: "🎨 TONE", Example: "📝 EX" }[k]}
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Prompt Text */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{revised[selected] ? "✏️ REVISED PROMPT" : "📤 PROMPT TEXT"}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {revised[selected] && (
                      <button onClick={() => resetPrompt(selected)} style={{ fontSize: 11, color: "#ef4444", background: "transparent", border: "1px solid #ef4444", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
                        ↺ Reset
                      </button>
                    )}
                    <button onClick={() => setEditingPrompt(!editingPrompt)} style={{ fontSize: 11, color: "#c084fc", background: "transparent", border: "1px solid #7c3aed", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
                      {editingPrompt ? "Cancel" : "✏️ Edit"}
                    </button>
                  </div>
                </div>
                {editingPrompt ? (
                  <div>
                    <textarea
                      value={promptTexts[selected]}
                      onChange={(e) => setPromptTexts((t) => { const n = [...t]; n[selected] = e.target.value; return n; })}
                      rows={5}
                      style={{ width: "100%", background: "#1f2937", border: "1px solid #7c3aed", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: "Georgia, serif", boxSizing: "border-box" }}
                    />
                    <div style={{ marginTop: 8 }}>
                      <input
                        placeholder="Why did you revise this prompt? (what changed and why it's better)"
                        value={revisionNotes[selected]}
                        onChange={(e) => setRevisionNotes((rn) => { const n = [...rn]; n[selected] = e.target.value; return n; })}
                        style={{ width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "Georgia, serif", boxSizing: "border-box" }}
                      />
                    </div>
                    <button onClick={() => saveRevision(selected)} style={{ marginTop: 8, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      ✅ Save Revision
                    </button>
                  </div>
                ) : (
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, fontStyle: "italic", border: revised[selected] ? "1px solid #7c3aed" : "1px solid #1e293b" }}>
                    "{promptTexts[selected]}"
                  </div>
                )}
              </div>

              {revised[selected] && revisionNotes[selected] && (
                <div style={{ background: "#1e1433", border: "1px solid #581c87", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#c084fc" }}>📝 REVISION NOTE: </span>
                  <span style={{ fontSize: 12, color: "#a78bfa" }}>{revisionNotes[selected]}</span>
                </div>
              )}

              <button
                onClick={() => runPrompt(selected)}
                disabled={loading[selected]}
                style={{
                  background: loading[selected] ? "#374151" : "linear-gradient(135deg, #7c3aed, #2563eb)",
                  color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px",
                  fontSize: 14, fontWeight: 700, cursor: loading[selected] ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s"
                }}
              >
                {loading[selected] ? (
                  <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Running...</>
                ) : (
                  <>▶ Run Prompt {responses[selected] ? "(Re-test)" : ""}</>
                )}
              </button>
            </div>

            {/* Response */}
            {(responses[selected] || loading[selected]) && (
              <div style={{ background: "#111827", borderRadius: 12, border: "1px solid #1f2937", padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 12 }}>🤖 CLAUDE'S RESPONSE</div>
                {loading[selected] ? (
                  <div style={{ color: "#6b7280", fontSize: 14, fontStyle: "italic" }}>Generating response...</div>
                ) : (
                  <div style={{ background: "#0f172a", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, maxHeight: 360, overflowY: "auto", whiteSpace: "pre-wrap", border: "1px solid #1e293b" }}>
                    {responses[selected]}
                  </div>
                )}
              </div>
            )}

            {/* Rating & Notes */}
            {responses[selected] && !loading[selected] && (
              <div style={{ background: "#111827", borderRadius: 12, border: "1px solid #1f2937", padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 14 }}>📊 RATE THIS RESPONSE</div>
                <div style={{ marginBottom: 14 }}>
                  <StarRating value={ratings[selected]} onChange={(v) => setRatings((r) => { const n = [...r]; n[selected] = v; return n; })} />
                </div>
                <div style={{ marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>What could be improved? (Notes for revision)</label>
                  <textarea
                    value={notes[selected]}
                    onChange={(e) => setNotes((n) => { const arr = [...n]; arr[selected] = e.target.value; return arr; })}
                    placeholder="e.g. Too generic, needs more concrete examples. Missing the comparison table I asked for. Tone was too formal..."
                    rows={3}
                    style={{ width: "100%", background: "#0f172a", border: "1px solid #1f2937", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, resize: "vertical", fontFamily: "Georgia, serif", boxSizing: "border-box" }}
                  />
                </div>
                {ratings[selected] < 4 && ratings[selected] > 0 && (
                  <div style={{ marginTop: 10, background: "#1c1008", border: "1px solid #92400e", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#fbbf24" }}>
                    💡 Rating below 4 — consider revising this prompt. Click "✏️ Edit" above to improve it.
                  </div>
                )}
                {ratings[selected] >= 4 && (
                  <div style={{ marginTop: 10, background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#4ade80" }}>
                    ✅ Great response! Document this as a high-quality prompt.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        // REPORT VIEW
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#c084fc", margin: "0 0 8px" }}>📋 Prompt Testing Report</h2>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Before/After documentation of all tested and revised prompts</p>
          </div>

          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
            {[
              { label: "Prompts Tested", val: testedCount, total: 8, color: "#22d3ee" },
              { label: "Prompts Rated", val: ratedCount, total: 8, color: "#a78bfa" },
              { label: "Prompts Revised", val: revisedCount, total: 8, color: "#34d399" },
              { label: "Average Rating", val: avgRating, total: null, color: "#f59e0b" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}{s.total ? `/${s.total}` : ""}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Per-prompt report cards */}
          {PROMPTS.map((pr, i) => {
            const hasData = responses[i] || ratings[i] > 0;
            if (!hasData) return null;
            const isRevised = revised[i];
            return (
              <div key={i} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 22, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ background: "#7c3aed", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>#{i + 1}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{pr.title}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{pr.category}</span>
                  {isRevised && <span style={{ marginLeft: "auto", background: "#581c87", color: "#c084fc", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>REVISED</span>}
                </div>

                {ratings[i] > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "10px 14px", background: "#0f172a", borderRadius: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>RATING: </span>
                      <span style={{ color: "#f59e0b", fontSize: 18 }}>{"★".repeat(ratings[i])}{"☆".repeat(5 - ratings[i])}</span>
                      <span style={{ color: "#f59e0b", marginLeft: 6, fontWeight: 700 }}>{ratings[i]}/5</span>
                    </div>
                    {notes[i] && (
                      <div style={{ flex: 1, borderLeft: "1px solid #1f2937", paddingLeft: 12 }}>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>IMPROVEMENT NOTES: </span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{notes[i]}</span>
                      </div>
                    )}
                  </div>
                )}

                {isRevised && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", marginBottom: 6 }}>BEFORE (Original)</div>
                      <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#fca5a5", lineHeight: 1.6, fontStyle: "italic" }}>
                        "{PROMPTS[i].prompt}"
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", marginBottom: 6 }}>AFTER (Revised)</div>
                      <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#86efac", lineHeight: 1.6, fontStyle: "italic" }}>
                        "{promptTexts[i]}"
                      </div>
                    </div>
                  </div>
                )}

                {isRevised && revisionNotes[i] && (
                  <div style={{ background: "#1e1433", border: "1px solid #581c87", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#c084fc" }}>WHY IT'S BETTER: </span>
                    <span style={{ fontSize: 12, color: "#a78bfa" }}>{revisionNotes[i]}</span>
                  </div>
                )}

                {responses[i] && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>RESPONSE PREVIEW</div>
                    <div style={{ background: "#0f172a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#94a3b8", lineHeight: 1.7, maxHeight: 120, overflow: "hidden", position: "relative" }}>
                      {responses[i].slice(0, 400)}...
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(transparent, #0f172a)" }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {testedCount === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#4b5563" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧪</div>
              <div style={{ fontSize: 16 }}>No prompts tested yet.</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Switch to Testing view and run some prompts to see your report here.</div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111827; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        textarea:focus, input:focus { outline: none; border-color: #7c3aed !important; }
      `}</style>
    </div>
  );
}
