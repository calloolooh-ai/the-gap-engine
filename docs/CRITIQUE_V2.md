# Anti-Discovery Engine — Full Critique v2

Graded against the Moonshot rubric: **Originality 35% · Technical Depth 25% · Vision 20% · Feasibility 10% · Demo 10%.**
Single-day sprint, deadline June 30 2026 17:00 IST. This is a *credibility* audit: where a judge who reads the code or clicks three gaps stops believing the thesis.

---

## Verdict

The concept is genuinely zero-to-one and the writing (Moonshot Paper) is strong. But the **demo actively undercuts the thesis**: the headline gaps are things everyone already studies, the "proof" mode is quietly rigged, and one metric is mislabeled. None of these are hard to fix in a day — and each one is the difference between "visionary" and "they faked it."

**The single most damaging issue:** the live demo's top gaps are mundane co-occurrence misses, not undiscovered questions. If a judge clicks the leaderboard first (they will), the product disproves its own pitch before the historical "proof" ever loads.

---

## What's working — KEEP

- **The core idea** — mapping knowledge topology to find high-leverage *absences* is a real new category. This is your 35%.
- **Type-C "Antimatter Query"** (`inversion_detector.py`) — "A→B studied, B→A never tested, 0 papers in N years" is the most original mechanic in the build. Nothing else surfaces this.
- **Real betweenness centrality** in the leverage score (no longer a degree proxy).
- **Real paper evidence** attached to gaps ("N touch A, M touch B, 0 touch both").
- **The graph visual** itself reads as a knowledge map — dense core, amber gap edges legible.
- **The Moonshot Paper** — 1511 words, all six required sections, good first-principles framing.
- **OpenAlex ingestion** — no API key, no rate-limit wall on stage.

---

## 🔴 Critical — credibility-killers (fix first)

### C1. The headline demo gaps are not gaps
Top leaderboard entries: *pattern recognition → data science (79.77)*, *data mining → exome*, *genetics → software*, *machine learning → computation*. These are **heavily co-studied** — their "gap" is an artifact of co-occurrence sparsity in a small sample, not an unasked question. This is the thesis disproving itself in the first click.
- **Fix:** Curate the demo around domains where structural gaps are *believable* (the network-epi story, materials×ML, topology×biology). Either ship a hand-validated demo gap set, or bias the demo fields so the surfaced gaps are cross-domain and non-obvious. At minimum, **lead the leaderboard with the cross-domain gaps, not the intra-CS ones.**

### C2. Historical "proof" is hand-guided — and a judge can see it
`historical_mode.py` hardcodes `_NETWORK_TERMS` / `_EPI_TERMS` and a `_construct_target_gap()` fallback that *forces* the network×epi pair if the generic detector doesn't surface it. The narrative says "Proof in hindsight that the gap was computationally visible years before the breakthrough" — but the engine was **told the answer**. Anyone reading `core/historical_mode.py` sees the proof is seeded. This guts the credibility of your highest-weight asset.
- **Fix (best):** Run the **generic** detector on 2005 data and show network×epi appears in the top-N **on its own**, with the term-matcher only used to *label/verify* the match — not to construct it. If it genuinely surfaces, that's a real result. If it doesn't, say so honestly.
- **Fix (minimum):** Relabel the mode as a **"seeded validation case"** in the UI and paper — frame it as "given the known 2001 discovery, the engine reconstructs the gap from pre-2001 data." Honest framing beats a proof a judge can debunk.

### C3. The leverage metric is mislabeled
`leverage_scorer.py` reports `betweenness_delta`, but it computes the **mean betweenness of the endpoint nodes**, not a *delta* (the change in centrality from adding the edge). The actual delta logic lives in `cascade.py` and isn't wired into the score. A sharp judge reads "delta," checks the code, and catches it.
- **Fix:** Either compute the real delta (recompute betweenness with the candidate edge added — affordable at ~300 nodes) or **rename the field to `betweenness_centrality`** everywhere (model, UI, paper).

### C4. Field labels are visibly wrong
The historical engine gap renders **field_b = "Political science"** for *epidemiology*, and demo nodes carry contradictory field arrays (`["Mathematics","Computer science","Physical Sciences"]`). OpenAlex topic→field mapping is noisy and it shows in the UI.
- **Fix:** Map OpenAlex fields through a small canonical lookup; pick the modal field, drop obvious mismatches. "Epidemiology → Political science" on screen is an instant credibility hit.

---

## 🟠 High-value — depth & originality (25% + 35%)

### H1. Surface the Antimatter Query — it's buried
The most original feature is a tiny "⇄ Antimatter" button in the bottom-left corner that only works on a live build. For 35%-originality weight, it should be a **first-class panel or a second proof tab**, with a curated example that lands even on the demo graph.

### H2. Inversion phrasing is verb-blind and noisy
`inverse_question` is hardcoded `"Does {b} also affect {a}?"` regardless of the mined verb, and the nearest-concept-to-verb heuristic yields junk pairs (e.g. "simple (philosophy)" as a concept). 
- **Fix:** Make the question verb-aware ("X *inhibits* Y — does Y inhibit X?"), filter concept spans to real multi-word scientific concepts, and require `forward_count ≥ 2` to cut noise.

### H3. Cross-domain detector is crude
"Community embedding" = bag-of-words token counts over node labels, cosine > 0.05, and "bridging concepts" are shared *tokens* (often "data", "analysis"). This is the weakest part of the depth story.
- **Fix:** Use the OpenAlex concept vectors you already fetch (real scored concepts) instead of label tokens; raise the similarity threshold; make bridges actual shared *concepts*, not word fragments.

### H4. Cascade map exists but isn't proven on the demo
`cascade.py` (betweenness-delta + reachability ripple) only fires on live jobs. Precompute one cascade for a demo gap so the "unlocks N downstream discoveries" claim is visible without a live build.

---

## 🟡 Cleanup — REMOVE

- **Delete dead ChatBot code entirely.** `ChatBot.tsx`, `api/chat.ts`, `core/chat.py`, `routes_chat.py` still exist and `chat_router` is still mounted in `main.py`. It was only unmounted from the UI. In a public judged repo, dead code reads as unfinished.
- **Drop floating disconnected nodes** from the demo graph (the thin lines shooting to isolated nodes top-left/right are visual noise) — prune degree-0/1 orphans before export.
- **Onboarding overclaim** — "Most breakthroughs began as one of these" is unsupported; soften to "Many breakthroughs were latent connections like these."

## 🟢 ADD

- **README.md** — the public repo (github.com/calloolooh-ai/anti-discovery-engine) has **no landing page**. A judge opening the repo sees nothing. Add: one-line pitch, the 2005 proof GIF/screenshot, architecture diagram, run instructions, link to the Moonshot Paper. This is free points on Demo (10%) and overall impression.
- **MongoDB Atlas, actually live** — persistence currently runs on the in-memory fallback only. The MongoDB sponsor prize (2×$150) wants a real Atlas connection *and* a visible "shareable permalink" in the UI. Right now `persistence.py` saves but nothing in the flow surfaces a share link. Wire `MONGODB_URI` + a "Share this map" button.
- **A 60–90s demo video / Vision Presentation** — it's a required submission component and you have no recording yet. Script it around the 2005 proof, not a live build (live API calls can stall on stage).

## 🔵 REDO / reframe

- **Lead with the proof, not the sandbox.** First screen should be the 2005→2024 split-screen ("the engine saw network-epidemiology coming"), with the interactive field-builder as the *second* act. Vision (20%) lives in the proof narrative, not in an empty graph waiting for input.
- **Rename "Anti-Discovery"** in user-facing copy if it confuses — the name reads as "against discovery." The paper frames it well ("the questions science hasn't thought to ask"); make the landing headline carry that, not the bare product name.

---

## Suggested order for the remaining day

1. **C1 + C4** — curate/clean demo gaps and fix field labels (1–2h). Biggest believability win.
2. **C2** — make historical proof honest (run generic detector, or relabel as seeded) (1h).
3. **ADD README + screenshots** (45m). Free impression points.
4. **C3** — rename or compute real betweenness delta (30m).
5. **H1** — promote the Antimatter panel + curated example (1h). Defends the 35%.
6. **REMOVE chat dead code + orphan nodes** (30m).
7. **MongoDB live + share link** if time (sponsor prize).
8. **Record the 90s video** last, around the proof.

The idea is a winner. The work left is making the demo *stop contradicting it* and making the proof one a judge can't debunk by opening a file.
