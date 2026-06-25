# Anti-Discovery Engine — Fix List (Priority Order)

Derived from CRITIQUE_V2.md against the Moonshot rubric (Originality 35% · Tech Depth 25% · Vision 20% · Feasibility 10% · Demo 10%).
Deadline: **June 30, 2026, 5:00pm IST**.

---

## 🔴 P0 — Credibility-killers

- [x] **C1. Demo gaps aren't gaps** — top leaderboard shows mundane intra-CS pairs (pattern recognition→data science, data mining→exome). Regenerate demo graph with fields biased toward believable cross-domain voids (e.g. network science × epidemiology, materials science × ML, topology × biology). Lead leaderboard with cross-domain gaps.
- [x] **C4. Wrong field labels** — epidemiology node renders as "Political science"; nodes carry contradictory multi-field arrays. Add a canonical field lookup/normaliser in ingestion + graph builder to pick the single most-relevant field per node.
- [x] **C2. Historical proof is hand-guided** — `_construct_target_gap()` forces the network×epi answer. Run the generic detector first; use term-matcher only to *identify/label* the match, not construct it. If it surfaces organically, label it as genuinely detected. If it doesn't, say so and use the fallback but label it "seeded validation case" in the UI.
- [x] **C3. Mislabeled metric** — `betweenness_delta` in `leverage_scorer.py` is actually mean endpoint betweenness, not a delta. Rename to `betweenness_centrality` everywhere: model, scorer, QuestionCard bars, Moonshot Paper.

## 🟠 P1 — Depth / Originality (35% + 25%)

- [x] **Remove dead ChatBot code** — `frontend/src/components/ChatBot.tsx`, `frontend/src/api/chat.ts`, `backend/core/chat.py`, `backend/api/routes_chat.py`, and `chat_router` mount in `backend/main.py`. Dead code in a judged public repo reads as unfinished.
- [x] **H1. Promote Antimatter Query** — move it from a corner button to a first-class sidebar section or second tab, with a curated demo example that works even without a live build.
- [x] **H2. Fix inversion phrasing** — `inverse_question` is hardcoded `"Does {b} also affect {a}?"` ignoring the mined verb. Make it verb-aware ("X *inhibits* Y → does Y inhibit X?"). Require `forward_count ≥ 2` to cut noise. Filter concept spans to real multi-word scientific terms (no "simple (philosophy)").
- [x] **Prune orphan nodes** — degree-0/1 isolated nodes in the demo graph create visual noise (thin dangling lines). Prune before export in `generate_demo_graph.py`.

## 🟡 P2 — Nice-to-have

- [ ] **H3. Cross-domain detector quality** — replace bag-of-words token overlap with real OpenAlex concept-score vectors; raise cosine threshold; make bridging concepts actual concept names not word fragments.
- [ ] **H4. Precompute cascade for demo** — cascade only fires on live builds; precompute one cascade entry for a demo gap so "unlocks N downstream discoveries" is visible without a live build.
- [ ] **MongoDB live + share link** — wire real `MONGODB_URI` and add a "Share this map" button in the UI that returns a permalink (sponsor prize 2×$150).

## 📌 Parked (do after submission or if time)

- [ ] **README.md** — public repo has no landing page. Add pitch + proof screenshot + run steps.
- [ ] **Record 90s demo video** — required submission component; script around 2005 proof.

---

*Last updated: 2026-06-26*
