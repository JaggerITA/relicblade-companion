# Technical Design — Relicblade Companion

> Self-contained technical reference: routing, store architecture, IndexedDB schema, OCR pipeline.
> Decisions and their rationale live in [architecture.md](architecture.md); this file is the *how*.

---

## 1. Routing (SvelteKit, SPA mode)

`adapter-static`, `export const ssr = false`, `export const prerender = false` in root `+layout.ts`. SPA fallback `200.html`.

```
src/routes/
├── +layout.svelte              # App shell: bottom nav, toast host, theme
├── +layout.ts                  # ssr=false; triggers store hydration (client)
├── +page.svelte                # / — Dashboard (counts, quick actions, backup status)
│
├── collection/
│   ├── +page.svelte            # /collection — grid/list of cards, faction & type filters
│   ├── new/+page.svelte        # /collection/new — manual entry (CardReviewForm, empty)
│   ├── scan/+page.svelte       # /collection/scan — OCR pipeline → CardReviewForm (v0.3)
│   └── [id]/+page.svelte       # /collection/[id] — edit existing card (CardReviewForm)
│
├── roster/
│   ├── +page.svelte            # /roster — list of saved rosters
│   ├── new/+page.svelte        # /roster/new — name, faction, limit mode + value
│   └── [id]/+page.svelte       # /roster/[id] — RosterBuilder + sticky InfluenceBar
│
├── game/
│   ├── new/+page.svelte        # /game/new — pick roster 1 & 2, start
│   └── [id]/+page.svelte       # /game/[id] — GameManager (rounds, activation, health)
│
├── campaign/
│   ├── +page.svelte            # /campaign — list of campaigns
│   ├── new/+page.svelte        # /campaign/new — create from a starting roster
│   └── [id]/+page.svelte       # /campaign/[id] — CampaignTracker (history, post-game)
│
└── settings/+page.svelte       # /settings — export/import JSON, backup reminder, theme
```

Bottom nav (5 items): Dashboard · Collection · Rosters · Games · Campaigns. Settings via gear icon in header.

---

## 2. IndexedDB schema (`src/lib/utils/db.ts`)

```ts
// DB_NAME = 'relicblade', DB_VERSION = 1
// One openDB owner. Migrations are idempotent, switch on oldVersion.

interface RelicbladeDB extends DBSchema {
  characters: {
    key: string;            // id (uuid)
    value: Character;
    indexes: { 'by-faction': string; 'by-updated': string };
  };
  upgrades: {
    key: string;
    value: Upgrade;
    indexes: { 'by-type': string; 'by-faction': string };
  };
  rosters: {
    key: string;
    value: Roster;
    indexes: { 'by-campaign': string; 'by-updated': string };
  };
  games: {
    key: string;
    value: GameState;
    indexes: { 'by-campaign': string; 'by-started': string };
  };
  campaigns: {
    key: string;
    value: Campaign;
    indexes: { 'by-updated': string };
  };
  settings: { key: string; value: unknown };  // k/v: 'theme', 'lastBackupAt', etc.
}
```

Migration skeleton:
```ts
openDB<RelicbladeDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const c = db.createObjectStore('characters', { keyPath: 'id' });
      c.createIndex('by-faction', 'faction');
      c.createIndex('by-updated', 'updatedAt');
      const u = db.createObjectStore('upgrades', { keyPath: 'id' });
      u.createIndex('by-type', 'type');
      u.createIndex('by-faction', 'faction');
      const r = db.createObjectStore('rosters', { keyPath: 'id' });
      r.createIndex('by-campaign', 'campaignId');
      r.createIndex('by-updated', 'updatedAt');
      const g = db.createObjectStore('games', { keyPath: 'id' });
      g.createIndex('by-campaign', 'campaignId');
      g.createIndex('by-started', 'startedAt');
      const ca = db.createObjectStore('campaigns', { keyPath: 'id' });
      ca.createIndex('by-updated', 'updatedAt');
      db.createObjectStore('settings');
    }
    // if (oldVersion < 2) { ... }  ← future migrations append here
  }
});
```

A thin generic repo wraps idb: `getAll(store)`, `get(store, id)`, `put(store, value)`, `del(store, id)`, `getAllFromIndex(store, index, key)`.

---

## 3. Store architecture (`src/lib/stores/*.svelte.ts`)

Pattern (ADR-005): singleton object, `$state` fields, `$derived` getters, action methods, explicit debounced `persist()`. Data normalized by id.

### collectionStore
- **State:** `characters: Character[]`, `upgrades: Upgrade[]`, `loaded: boolean`.
- **Derived:** `factions` (unique faction strings, for filters), `byId` maps.
- **Actions:** `hydrate()`, `addCharacter(c)`, `updateCharacter(c)`, `deleteCharacter(id)`, same for upgrades, `importCollection(data, mode)`, `exportCollection()`.
- **Persist:** per-record `put`/`del` to `characters`/`upgrades` stores (no debounce needed — discrete edits).
- **Resolvers (plain fns):** `getCharacter(id)`, `getUpgrade(id)` used by roster/game stores.

### rosterStore
- **State:** `rosters: Roster[]`, `current: Roster | null`.
- **Derived (for current):** `charactersInfluence`, `upgradesInfluence`, `usedInfluence` (mode-aware, ADR-006), `isOverLimit`, `remaining`.
- **Actions:** `hydrate()`, `create(name, faction, limitMode, maxInfluence)`, `addEntry(characterId)`, `removeEntry(characterId)`, `equipUpgrade(characterId, upgradeId)`, `unequipUpgrade(...)`, `save()`, `delete(id)`.
- **Persist:** `save()` → `put('rosters', current)`, debounced 500ms during editing.
- Stores **id references only**; denormalized view built in RosterBuilder via collection resolvers.

### gameStore
- **State:** `game: GameState | null`.
- **Derived:** `currentPlayerModels`, `activatableModels` (not activated, not disabled), `disabledModels` (for recovery), `allActivated`.
- **Actions:** `start(roster1, roster2)`, `rollInitiative()`, `giveInitiative()` (Respite), `activateModel(modelId)`, `endActivation()`, `applyDamage(modelId, n)`, `heal(modelId, n)`, `toggleCondition(modelId, cond)`, `nextPhase()`, `rollRecovery()`, `nextRound()`, `pause()`.
- **Persist:** debounced after every mutation (auto-save mid-game is essential).
- Uses `computeEffectiveStats` (ADR-007) for AD pools, fuel-cell constructs, mount/rider.

### campaignStore
- **State:** `campaigns: Campaign[]`, `current: Campaign | null`.
- **Derived:** `totalGold`, `winLossRecord`, `characterProgression` (per-character aggregated traits/wounds).
- **Actions:** `hydrate()`, `create(name, rosterId)`, `recordMatch(matchRecord)`, `applyPostGame(states)` (heroic/wound traits, critical wounds, recovery rolls, gold), `delete(id)`.
- **Persist:** `put('campaigns', current)` after each match record.

**Cross-store rule:** rosters/games/campaigns never embed Character objects — only ids. Joins happen at render via collection resolvers, so editing a card propagates everywhere.

---

## 4. Core utilities (`src/lib/utils/`)

| Util | Responsibility |
|------|----------------|
| `db.ts` | Single openDB owner + generic repo helpers + migrations |
| `validation.ts` | Roster validation: influence math (mode-aware), upgrade-slot compatibility, keyword restrictions |
| `dice.ts` | `rollD6()`, `rollD3()` (D6/2 round up), `rollInitiative()`, `rollRecovery()` — pure, seedable for tests |
| `computeEffectiveStats.ts` | Base − criticalWounds − modifiers; construct fuel cells; mount/rider shared fate |
| `cardParser.ts` | OCR raw text → partial `Character` via positional/regex patterns (v0.3) |
| `imagePreprocess.ts` | `preprocess(bitmap): ImageData` — Canvas impl now, OpenCV later (ADR-003) |
| `ocr.ts` | Tesseract.js worker wrapper: `recognize(image): { text, confidence, words }` |
| `exportImport.ts` | Full backup ↔ JSON; merge vs replace import |
| `id.ts` | `newId() = crypto.randomUUID()` |

---

## 5. OCR pipeline (v0.3) — detailed

All OCR code is dynamically imported only on `/collection/scan`; never in the main bundle.

```
┌─ /collection/scan ──────────────────────────────────────────────┐
│ 1. CAPTURE                                                        │
│    getUserMedia({ video: { facingMode: 'environment' } })         │
│    + file <input accept="image/*" capture> fallback (gallery).    │
│    Overlay frame guides card alignment.                           │
│                                                                   │
│ 2. PREPROCESS  (imagePreprocess.ts — Canvas)                      │
│    ImageBitmap → downscale ≤1500px → grayscale → contrast stretch │
│    → adaptive threshold → ImageData.                              │
│    Interface stable; OpenCV impl can replace later (ADR-003).     │
│                                                                   │
│ 3. OCR  (ocr.ts — Tesseract.js in a Web Worker)                   │
│    Lazy import('tesseract.js'); createWorker('eng').              │
│    WASM + eng.traineddata fetched once, runtime-cached by SW      │
│    (CacheFirst). Emit progress 0–1 to a $state for the UI bar.    │
│    Returns text + per-word confidence.                            │
│                                                                   │
│ 4. PARSE  (cardParser.ts)                                         │
│    Positional + regex extraction → Partial<Character> with        │
│    per-field confidence. Relicblade layout is consistent:         │
│    name (top), stat block (AD/SPD/ARM/HP fixed), actions (e.g.    │
│    "4+"), keywords line, point cost. NO hardcoded game data —     │
│    pattern/position only.                                         │
│                                                                   │
│ 5. REVIEW  (CardReviewForm — SHARED with manual entry, ADR-002)   │
│    Pre-filled fields, low-confidence fields highlighted.          │
│    Original image shown beside fields for visual diff.            │
│    User corrects → Save.                                          │
│                                                                   │
│ 6. SAVE → collectionStore.addCharacter({ ...source:'ocr',         │
│           ocrConfidence }) → IndexedDB.                            │
│    Batch mode: queue next card, progress "n/total".               │
└───────────────────────────────────────────────────────────────────┘
```

**Error handling.**
- No camera permission → fall back to file upload automatically.
- OCR worker error / timeout → open the review form empty with a toast ("Scan failed — enter manually"). Never a dead end.
- Low overall confidence (<50%) → form opens but shows a banner advising careful review.
- iOS WASM memory pressure → cap image size at 1500px before OCR; terminate worker after each recognize to free memory in batch mode.

**Progress/confidence to UI.** `ocr.ts` exposes a `progress` `$state` (0–1) bound to a determinate progress bar; `cardParser` attaches `fieldConfidence: Record<string, number>` so the form can color fields (green ≥85, amber 60–84, red <60).

---

## 6. PWA configuration

`@vite-pwa/sveltekit` (Workbox):
- `registerType: 'autoUpdate'`.
- Precache: app shell (JS/CSS/HTML, icons, manifest). **Not** Tesseract assets.
- Runtime cache: Tesseract WASM + `*.traineddata` → `CacheFirst`, long expiration.
- `manifest`: name, short_name, `display: 'standalone'`, `theme_color` dark, `background_color`, icons 192/512 + maskable.
- No external network calls anywhere else (offline-first by construction).

---

## 7. Data model deltas vs CLAUDE.md

Apply these refinements (rationale in ADRs):
- `Roster` gains `limitMode: 'standard' | 'threat'` (ADR-006).
- `ModelState` for constructs: reuse `currentHealth`/`maxHealth` as fuel cells; add `isConstruct`/derive from keywords; `actionDiceModifier` already covers −1 AD effects (ADR-007).
- `CharacterCampaignState.criticalWounds: number` feeds `computeEffectiveStats` (already in model).

*See also: [architecture.md](architecture.md) · [ui-wireframes.md](ui-wireframes.md) · [sprint-plan.md](sprint-plan.md) · wiki/rules/Game-Rules.md*
