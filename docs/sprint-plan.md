# Sprint Plan — Relicblade Companion

> ~1-week sprints. Each sprint ends with something **testable** and (from S1) **deployed**.
> Solo developer. OCR deferred to S4 (v0.3). Tasks are atomic; dependencies noted as `→`.
> DoD = Definition of Done.

Maps to CLAUDE.md roadmap: S1=v0.1, S2–S3=v0.2, S4=v0.3, S5=v0.4, S6=v0.5, S7=v0.6, S8=v0.7.

---

## Sprint 1 — Scaffolding & deploy (v0.1)

**Goal:** an empty but real app, navigable, installed as PWA, live on Vercel.

| # | Task | Depends |
|---|------|---------|
| 1.1 | `pnpm create svelte` (Svelte 5, TS strict), add Tailwind, ESLint, Prettier, Vitest | — |
| 1.2 | Configure `adapter-static`, `ssr=false`, `prerender=false`, SPA fallback (ADR-001) | 1.1 |
| 1.3 | App shell: `+layout.svelte` with header + bottom nav (5 tabs), dark theme tokens | 1.2 |
| 1.4 | Empty route pages for all paths in technical-design §1 (placeholder content) | 1.3 |
| 1.5 | Define TS interfaces in `src/lib/models/` (Character, Upgrade, Roster, GameState, Campaign) per CLAUDE.md + ADR deltas | 1.1 |
| 1.6 | `db.ts`: openDB, 6 stores, indexes, v1 migration, generic repo helpers (ADR-004) | 1.5 |
| 1.7 | `id.ts`, `dice.ts` (+ unit tests) | 1.1 |
| 1.8 | PWA: manifest, icons (192/512/maskable), `@vite-pwa/sveltekit`, autoUpdate | 1.2 |
| 1.9 | CI: GitHub Actions lint+test; Vercel auto-deploy from main | 1.1 |

**DoD.** App loads on phone, installable to home screen, all tabs navigate, dice tests green, deployed URL works offline (shell). No data features yet.

---

## Sprint 2 — Manual card entry & collection (v0.2 part 1)

**Goal:** create, view, edit, delete cards; persisted locally.

| # | Task | Depends |
|---|------|---------|
| 2.1 | `collectionStore.svelte.ts`: state, hydrate(), CRUD actions, resolvers (ADR-005) | 1.6 |
| 2.2 | `CardReviewForm` component — all Character fields, actions repeater, upgrade slots (the shared form, ADR-002) | 1.5 |
| 2.3 | `/collection/new` → empty CardReviewForm → save | 2.1, 2.2 |
| 2.4 | `/collection/[id]` → edit existing → update/delete | 2.1, 2.2 |
| 2.5 | `/collection` list: rows, search, type + faction filters (use indexes) | 2.1 |
| 2.6 | Manual Upgrade entry form + upgrade CRUD | 2.1 |
| 2.7 | Empty states (collection, per ui-wireframes §1) | 2.5 |
| 2.8 | Tests: collectionStore actions, validation of required fields | 2.1 |

**DoD.** User adds a character manually, sees it in the list, edits and deletes it; survives reload (IndexedDB).

---

## Sprint 3 — Backup & polish collection (v0.2 part 2)

**Goal:** data safety; collection feels complete.

| # | Task | Depends |
|---|------|---------|
| 3.1 | `exportImport.ts`: export all → JSON download; import (merge / replace) | 2.1 |
| 3.2 | `/settings`: export button, import picker, "last backup X days ago" | 3.1 |
| 3.3 | First-card backup prompt; 7-day reminder logic (settings store) | 3.1 |
| 3.4 | Dashboard `/`: counts, quick actions, backup status | 2.1 |
| 3.5 | Toast + confirm dialog (shared) wired to delete/import | 2.4 |
| 3.6 | Tests: export↔import round-trip, merge vs replace | 3.1 |

**DoD.** A full collection exports to JSON and re-imports identically on a fresh browser profile.

---

## Sprint 4 — OCR scanner (v0.3)

**Goal:** scanning pre-fills the shared review form. Strictly additive (ADR-002).

| # | Task | Depends |
|---|------|---------|
| 4.1 | `/collection/scan`: camera capture + file fallback + alignment overlay | 2.2 |
| 4.2 | `imagePreprocess.ts` Canvas impl: downscale, grayscale, threshold (ADR-003) | 4.1 |
| 4.3 | `ocr.ts`: Tesseract.js in Web Worker, dynamic import, progress $state | 4.1 |
| 4.4 | SW runtime cache for WASM + traineddata (CacheFirst) | 1.8, 4.3 |
| 4.5 | `cardParser.ts`: raw text → Partial<Character> + fieldConfidence (regex/positional, no game data) | 4.3 |
| 4.6 | Wire pipeline → CardReviewForm pre-filled, low-confidence fields highlighted, image diff | 4.5, 2.2 |
| 4.7 | Error paths: no-permission, OCR fail, low confidence → manual fallback (never dead-end) | 4.6 |
| 4.8 | Batch mode: queue + "n/total"; terminate worker per card (iOS memory) | 4.6 |
| 4.9 | Tests: cardParser against fixture OCR strings | 4.5 |
| 4.10 | **Real-device accuracy check** vs CLAUDE.md targets → decide OpenCV (ADR-003 revisit) | 4.6 |

**DoD.** On a real phone, a clearly-photographed card pre-fills the form; user corrects ≤2–3 fields and saves. Failure modes fall back gracefully.

---

## Sprint 5 — List builder (v0.4)

**Goal:** build legal-ish rosters with live influence.

| # | Task | Depends |
|---|------|---------|
| 5.1 | `rosterStore.svelte.ts`: state, CRUD, entry/upgrade actions, debounced save (ADR-005) | 2.1 |
| 5.2 | `validation.ts`: influence math (standard vs threat, ADR-006), slot/keyword compatibility | 5.1 |
| 5.3 | `/roster` list + `/roster/new` (name, faction, limit mode + value) | 5.1 |
| 5.4 | `/roster/[id]` RosterBuilder: roster list, add character (faction-filtered sheet) | 5.1 |
| 5.5 | Upgrade equipping sheet (slot-type + keyword filtered) | 5.2 |
| 5.6 | `InfluenceBar` sticky, mode-aware, red over limit | 5.2 |
| 5.7 | Tests: validation (both modes), influence totals | 5.2 |

**DoD.** User builds a roster from their collection; influence bar updates live and reflects the correct mode.

---

## Sprint 6 — Game manager (v0.5)

**Goal:** run a game with health & round tracking, auto-saved.

| # | Task | Depends |
|---|------|---------|
| 6.1 | `computeEffectiveStats.ts` (+ tests): crit wounds, modifiers, construct fuel, mount/rider (ADR-007) | 1.5 |
| 6.2 | `gameStore.svelte.ts`: start, phases, activation, damage/heal, conditions, debounced save | 5.1, 6.1 |
| 6.3 | `/game/new`: pick two rosters → start | 6.2 |
| 6.4 | `/game/[id]`: phase band, player toggle, model cards | 6.2 |
| 6.5 | `HealthTracker`: tap boxes L→R, crit/skull handling, live AD update | 6.1 |
| 6.6 | Initiative (D6, reroll tie, Respite) + Recovery (D6 per disabled) flows | 6.2 |
| 6.7 | Special-type rendering: construct fuel, mount/rider grouped, companion badge | 6.1 |
| 6.8 | Tests: gameStore transitions, effective stats edge cases | 6.2 |

**DoD.** A two-roster game runs through multiple rounds; pausing and reloading restores exact state.

---

## Sprint 7 — Campaign mode (v0.6)

**Goal:** persistent warband progression across games.

| # | Task | Depends |
|---|------|---------|
| 7.1 | `campaignStore.svelte.ts`: create, recordMatch, applyPostGame | 6.2 |
| 7.2 | `/campaign` + `/campaign/new` (from starting roster) | 7.1 |
| 7.3 | `/campaign/[id]`: summary band, History / Warband tabs | 7.1 |
| 7.4 | Post-game wizard (7 steps, ui-wireframes §4) | 7.1, 6.1 |
| 7.5 | Critical wounds → feed computeEffectiveStats in subsequent games | 6.1, 7.4 |
| 7.6 | Match history view; win/loss record | 7.1 |
| 7.7 | Tests: applyPostGame mutations, gold/record aggregation | 7.1 |

**DoD.** Complete a game → run post-game → reopen warband and see updated traits, gold, and reduced AD from critical wounds.

---

## Sprint 8 — Polish & release (v0.7 → v1.0)

| # | Task |
|---|------|
| 8.1 | Onboarding flow (first run) |
| 8.2 | Responsive refinements (tablet/desktop), haptics where supported |
| 8.3 | Performance pass: bundle audit, lazy routes, Lighthouse PWA score |
| 8.4 | i18n scaffolding (IT/EN/DE/FR) — strings already in `constants/ui.ts` |
| 8.5 | Offline E2E (Playwright) smoke for the 4 flows |
| 8.6 | Docs: README, CONTRIBUTING, screenshots |

**DoD (v1.0).** Installable PWA, fully offline, all four flows pass E2E, deployed.

---

## Critical path & parallelism

```
S1 ──> S2 ──> S3
        │
        ├──> S4 (OCR, independent of S5)
        └──> S5 ──> S6 ──> S7 ──> S8
```

OCR (S4) can slip or run in parallel without blocking the list-builder→campaign spine. If OCR accuracy fails the S4.10 gate, ship manual-only and revisit OpenCV later — the app is complete without it.

*See also: [architecture.md](architecture.md) · [technical-design.md](technical-design.md) · [ui-wireframes.md](ui-wireframes.md)*
