# Architecture Decision Records — Relicblade Companion

> Self-contained record of the architectural decisions taken before development.
> Each entry: **Context → Options → Decision → Why → Consequences**.
> Read this before changing structural choices (build mode, storage, OCR strategy).

Status legend: ✅ Accepted · 🔄 Revisit later · ⛔ Rejected

---

## ADR-001 — Build mode: Static SPA, not SSR ✅

**Context.** The app is offline-first with all data in IndexedDB (browser-only). It has no backend and no per-request data. SvelteKit defaults to SSR.

**Options.**
- A. SSR (adapter-vercel/node) — server renders pages.
- B. Static SPA (`adapter-static`, `ssr = false`, SPA fallback).
- C. Prerender static + client hydration.

**Decision.** **B — `@sveltejs/adapter-static` with `fallback: '200.html'` and `export const ssr = false` in the root `+layout.ts`.**

**Why.**
- IndexedDB is undefined on the server; any store access during SSR crashes the render. Disabling SSR removes a whole class of bugs.
- Offline-first means the app shell must run with zero network. A static bundle + service worker is exactly that.
- adapter-static deploys identically on Vercel **and** GitHub Pages (the documented fallback host). No vendor lock-in.

**Consequences.**
- No server load functions; all data loading is client-side from stores.
- First paint shows an app shell skeleton, then hydrates. Acceptable for a tool (not content SEO).
- Route params (`[id]`) resolve client-side; ensure `fallback` is set so deep links work.

---

## ADR-002 — Manual entry is canonical; OCR is progressive enhancement ✅

**Context.** OCR (Tesseract.js + OpenCV.js) is the highest-risk feature: ~20MB+ WASM/data, multi-second latency on mid-range mobile, uncertain accuracy on stylized fonts and icons. The data-entry flow is hard to change once the UI is built around it.

**Options.**
- A. OCR-primary: scan → auto-fill is the main path; manual is fallback.
- B. Manual-primary: typed entry is canonical; OCR pre-fills the **same** review form.
- C. OCR-only (rejected immediately — fragile, blocks users offline/low-end).

**Decision.** **B.** A single `CardReviewForm` is the one place a card is created/edited. Manual entry opens it empty; OCR opens it pre-filled with `source: 'ocr'` and per-field confidence. The save path is identical.

**Why.**
- Makes OCR strictly additive and **removable** — if it underperforms, the app still works end-to-end.
- Users at a gaming table on a low-end phone are never blocked.
- One review/validation/save code path → less surface area, easier tests.

**Consequences.**
- OCR ships in v0.3, after the manual flow is solid in v0.2.
- The card data model carries `source: 'manual' | 'ocr' | 'import'` and optional `ocrConfidence`.
- OCR is loaded via dynamic `import()` only on `/collection/scan`, never in the main bundle.

---

## ADR-003 — Defer OpenCV.js; start with Canvas preprocessing 🔄

**Context.** OpenCV.js adds ~8MB WASM for crop/deskew/binarize. Tesseract has internal thresholding; many cards photographed reasonably well OCR acceptably after simple grayscale + adaptive threshold done on a `<canvas>`.

**Decision.** **v0.3 ships with Canvas-based preprocessing only** (grayscale, contrast stretch, simple threshold, downscale to ~1500px). OpenCV.js is added **only if** field-level accuracy targets (see CLAUDE.md OCR section) are missed in real testing.

**Why.** Saves 8MB on the first OCR load; removes a heavy dependency until proven necessary. Preprocessing quality is tunable later without changing the pipeline contract.

**Consequences.** The preprocessing step is an interface (`preprocess(imageBitmap): ImageData`) with a Canvas implementation now and a possible OpenCV implementation later. Pipeline code doesn't change when swapped.

**Revisit when.** Real-device accuracy testing in v0.3 shows numeric-stat accuracy < 90%.

---

## ADR-004 — Storage: idb, 6 object stores, UUID keys, versioned migrations ✅

**Context.** Need efficient local queries: characters by faction, rosters by campaign, games by campaign. Schema will evolve.

**Decision.**
- Library: **`idb`**. One module (`src/lib/utils/db.ts`) owns the single `openDB` call and all migrations.
- **6 stores:** `characters`, `upgrades`, `rosters`, `games`, `campaigns`, `settings`.
- Keys: `keyPath: 'id'`, value `crypto.randomUUID()`.
- Indexes:
  - `characters`: `by-faction` (faction), `by-updated` (updatedAt)
  - `upgrades`: `by-type` (type), `by-faction` (faction)
  - `rosters`: `by-campaign` (campaignId), `by-updated` (updatedAt)
  - `games`: `by-campaign` (campaignId), `by-started` (startedAt)
  - `campaigns`: `by-updated` (updatedAt)
  - `settings`: key-value, no indexes
- Migrations are **idempotent**, keyed on `oldVersion` inside the `upgrade()` callback. DB version constant lives in `db.ts`.

**Why.** Separating `characters`/`upgrades` keeps queries and indexes clean (different shapes, different filters). Indexes back the exact UI filters (faction filter, campaign roster list). idb's `upgrade` callback is the simplest reliable migration story.

**Consequences.** Adding a field never needs a migration (IndexedDB is schemaless per record); only adding/removing **indexes or stores** bumps the version. Keep a changelog comment in `db.ts`.

---

## ADR-005 — State: class-based runes in `.svelte.ts`, explicit debounced persistence ✅

**Context.** Svelte 5 runes. Four domains (collection, roster, game, campaign). Need auto-save without flaky reactivity.

**Decision.**
- Each domain is a singleton store object built with `$state` in a `.svelte.ts` module, exposing: state, `$derived` getters, and **action methods**.
- Data is **normalized by id**. Components derive denormalized views (e.g. resolve `characterId` → `Character` against the collection store).
- Persistence is **explicit**: action methods call a `persist()` helper debounced 500ms. **No `$effect` is used for saving** — it's harder to test and reason about.
- Loading: each store has an `async hydrate()` called once on app start (client only).

**Why.** Explicit persistence is predictable and unit-testable (call action → assert db write). Normalization prevents stale duplicated character data inside rosters/games. `$derived` is cheap, so no separate selector layer is needed — cross-store joins are plain functions reading store state.

**Consequences.** Rosters/games store **id references**, never embedded character copies. A `resolveEntry(roster)` style function joins at render time. If a character is edited, every roster view updates because it re-derives from the single source.

---

## ADR-006 — Influence model supports both standard limit and campaign threat level ✅

**Context.** Discrepancy found between CLAUDE.md and the rules wiki:
- **Standard play:** the point limit (default 100) includes characters **and** upgrades.
- **Campaign threat level:** the limit counts **characters only**; upgrades do **not** count toward it (wiki `Campaign-Rules.md`).

**Decision.** The `Roster` carries:
- `limitMode: 'standard' | 'threat'`
- `maxInfluence: number` (the cap)
- Computed `charactersInfluence` (sum of character costs) and `upgradesInfluence` (sum of upgrade costs).
- Validation uses `charactersInfluence + upgradesInfluence` in `standard` mode, and `charactersInfluence` only in `threat` mode.

**Why.** Both modes are first-class in the real game; hardcoding "limit includes everything" would make campaign rosters validate incorrectly.

**Consequences.** The sticky influence bar shows the relevant total per mode. The `RosterEntry.entryInfluence` still stores the full per-entry cost; the validator decides what to sum.

---

## ADR-007 — Effective stats are computed, never stored mutated ✅

**Context.** Critical wounds give permanent −1 AD each; poison/critical wounds give temporary −1 AD; constructs use fuel cells instead of health; mount+rider share fate.

**Decision.** Base stats on `Character` are **immutable reference data**. Effective in-game stats are computed: `effectiveAD = baseAD − criticalWounds − activeModifiers`. `ModelState` in a game carries only deltas (`actionDiceModifier`, `currentHealth`, `conditions[]`), never a rewritten stat block.

**Why.** Keeps the collection card as the single source of truth; campaign and game layers are overlays. Prevents corruption of the player's card data during a game.

**Consequences.** A small `computeEffectiveStats(character, campaignState?, modelState?)` utility is the one place stat math lives — used by Game Manager and Campaign tracker. Construct fuel-cell and mount/rider special handling lives here too, behind keyword checks.

---

## ADR-008 — Testing: Vitest, colocated, focus on utils/stores/parser ✅

**Decision.** Vitest + Svelte Testing Library. Unit tests colocated (`*.test.ts`). Priority coverage (>80%): `utils/validation`, `utils/dice`, `utils/cardParser`, `utils/computeEffectiveStats`, `utils/exportImport`, and each store's actions. Component tests for the review form and roster builder interactions. No E2E until v1.0 (Playwright).

**Why.** The game logic (influence validation, stat math, parser) is where bugs hide and where regressions hurt; it's also pure and fast to test. UI is comparatively cheap to verify manually during early versions.

---

## Decisions you must lock before the first line of code

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Build mode | **Static SPA** — adapter-static, `ssr=false` (ADR-001) |
| 2 | Data-entry flow | **Manual-first**, OCR pre-fills shared form (ADR-002) |
| 3 | OpenCV now or later | **Defer** — Canvas preprocessing first (ADR-003) |
| 4 | Storage shape | **idb, 6 stores, UUID, versioned migrations** (ADR-004) |
| 5 | Store pattern | **Class-runes `.svelte.ts`, explicit persist** (ADR-005) |
| 6 | Influence model | **Dual mode** standard/threat (ADR-006) |
| 7 | Stat handling | **Computed effective stats**, immutable base (ADR-007) |

*See also: [technical-design.md](technical-design.md) · [sprint-plan.md](sprint-plan.md) · [ui-wireframes.md](ui-wireframes.md)*
