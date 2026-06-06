# CLAUDE.md — Relicblade Companion

## 🎯 Project Overview

Relicblade Companion is an open-source **list builder**, **game manager**, and
**campaign tracker** web app for the tabletop adventure battle game **Relicblade**
by Metal King Studio.

The app is a **digital companion tool** — it helps players build warbands, manage
games, and track campaign progression. It is NOT a database of game content.

## ⚠️ CRITICAL RULE: Zero Game Data Policy

**The app MUST ship with ZERO game data.** This is non-negotiable.

- ❌ NO preloaded character stats, upgrade cards, faction lists, or rules text
- ❌ NO bundled JSON databases of game content
- ❌ NO hardcoded names, point costs, or abilities from Relicblade
- ❌ NO images or artwork from the game
- ✅ The app provides ONLY empty structures/schemas/templates
- ✅ Each player uploads/inputs their own card data (via OCR scan or manual entry)
- ✅ Player data is stored locally on their device (IndexedDB)
- ✅ Players can export/import their personal collection as JSON files

This policy exists to fully respect Metal King Studio's intellectual property.
Any PR or code change that embeds game-specific data MUST be rejected.

## 🛠️ Tech Stack

| Layer          | Technology                        | Why                                          |
|----------------|-----------------------------------|----------------------------------------------|
| Framework      | **Svelte 5** (SvelteKit)          | Smallest bundle (~3-5KB), mobile-first, built-in reactivity, PWA-ready |
| Build Tool     | **Vite** (via SvelteKit)          | Fast dev server, optimized builds            |
| Package Mgr    | **pnpm**                          | Faster than npm, disk-efficient              |
| Styling        | **Tailwind CSS**                  | Utility-first, mobile-first by design        |
| State Mgmt     | **Svelte stores** (built-in)      | No external library needed                   |
| Storage        | **IndexedDB** (via idb library)   | More capacity than localStorage (~50MB+)     |
| OCR            | **Tesseract.js** + **OpenCV.js**  | Browser-based card scanning with preprocessing |
| Testing        | **Vitest** + Svelte Testing Library | Compatible with SvelteKit                  |
| Deployment     | **Vercel** (primary) / GitHub Pages (fallback) | Auto-deploy from push          |
| License        | **MIT**                           | Permissive, community-friendly               |

### Why Svelte over React?
- **3-5KB** bundle vs React's 42-45KB — critical for mobile at the gaming table
- **~800ms** first paint vs ~1200ms — app must open instantly
- **Built-in reactivity** — no need for external state management (Zustand, Redux)
- **PWA/Offline** support is excellent — essential for gaming venues without wifi
- **Less code** = less bugs, faster development for a solo/small team
- **Most loved framework** on Stack Overflow for 5 consecutive years
- Used in production by Apple Music, Spotify, NYT, IKEA, Stack Overflow

### Why pnpm over npm?
- **3x faster** installs than npm
- **Disk-efficient** — shared dependency store, no duplicate packages
- Drop-in replacement: same commands (`pnpm install`, `pnpm run dev`)

## 📂 Project Structure

```
relicblade-companion/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── cardimport/              # Card input & collection management
│   │   │   │   ├── CardScanner.svelte       # Camera capture + OCR pipeline
│   │   │   │   ├── ImagePreprocessor.svelte # OpenCV.js crop, perspective, binarize
│   │   │   │   ├── OcrReviewForm.svelte     # Review & correct OCR results
│   │   │   │   ├── ManualEntryForm.svelte   # Manual stat entry form
│   │   │   │   ├── CollectionManager.svelte # Browse/edit/delete user's cards
│   │   │   │   └── JsonImportExport.svelte  # Export/import collection as JSON
│   │   │   ├── listbuilder/             # Warband roster building
│   │   │   │   ├── CollectionBrowser.svelte # Browse user's uploaded cards
│   │   │   │   ├── CharacterCard.svelte     # Card-style display (NO images)
│   │   │   │   ├── CharacterDetail.svelte   # Full stat sheet on tap
│   │   │   │   ├── RosterBuilder.svelte     # Add/remove from roster
│   │   │   │   ├── UpgradeSlot.svelte       # Assign upgrades to characters
│   │   │   │   └── InfluenceTracker.svelte  # Real-time point counter (always visible)
│   │   │   ├── gamemanager/             # In-game tracking
│   │   │   │   ├── InitiativeRoller.svelte  # D6 initiative roll
│   │   │   │   ├── ActivationTracker.svelte # Track activated models
│   │   │   │   ├── HealthTracker.svelte     # Damage & status conditions
│   │   │   │   ├── ActionDicePool.svelte    # Action dice per activation
│   │   │   │   └── RoundManager.svelte      # Round counter & phase flow
│   │   │   ├── campaign/               # Campaign (Wonders & Horrors) tracking
│   │   │   │   ├── CampaignManager.svelte   # Campaign overview & history
│   │   │   │   ├── CharacterProgression.svelte # Heroic/Wound traits, level up
│   │   │   │   ├── GoldTracker.svelte       # Gold earned/spent
│   │   │   │   ├── RelicInventory.svelte    # Relics & treasures found
│   │   │   │   ├── RecoveryRoller.svelte    # Between-game recovery rolls
│   │   │   │   └── MatchHistory.svelte      # Win/loss record per campaign
│   │   │   └── shared/                  # Reusable UI components
│   │   │       ├── Button.svelte
│   │   │       ├── Modal.svelte
│   │   │       ├── Navigation.svelte
│   │   │       └── Toast.svelte
│   │   ├── models/                      # TypeScript interfaces (empty schemas)
│   │   │   ├── Character.ts
│   │   │   ├── Upgrade.ts
│   │   │   ├── Collection.ts
│   │   │   ├── Roster.ts
│   │   │   ├── GameState.ts
│   │   │   └── Campaign.ts
│   │   ├── stores/                      # Svelte stores (built-in state management)
│   │   │   ├── collectionStore.ts       # User's personal card collection
│   │   │   ├── rosterStore.ts           # Current roster being built
│   │   │   ├── gameStore.ts             # Active game state
│   │   │   └── campaignStore.ts         # Campaign progression data
│   │   ├── utils/
│   │   │   ├── ocr.ts                   # Tesseract.js OCR wrapper
│   │   │   ├── imagePreprocess.ts       # OpenCV.js preprocessing pipeline
│   │   │   ├── cardParser.ts            # Parse OCR text → structured card data
│   │   │   ├── validation.ts            # Roster validation logic
│   │   │   ├── dice.ts                  # Dice rolling utilities
│   │   │   ├── storage.ts              # IndexedDB read/write helpers (via idb)
│   │   │   └── exportImport.ts         # JSON export/import utilities
│   │   └── constants/
│   │       └── ui.ts                    # UI strings (i18n-ready)
│   ├── routes/
│   │   ├── +layout.svelte              # App shell with navigation
│   │   ├── +page.svelte                # Home / dashboard
│   │   ├── collection/
│   │   │   ├── +page.svelte            # Collection manager
│   │   │   └── scan/+page.svelte       # OCR scanner page
│   │   ├── roster/
│   │   │   ├── +page.svelte            # Roster list
│   │   │   └── [id]/+page.svelte       # Roster builder
│   │   ├── game/
│   │   │   └── [id]/+page.svelte       # Game manager
│   │   └── campaign/
│   │       ├── +page.svelte            # Campaign list
│   │       └── [id]/+page.svelte       # Campaign tracker
│   └── app.html
├── static/
│   ├── favicon.svg
│   └── manifest.json                   # PWA manifest
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── data_update.md
│   └── workflows/
│       ├── ci.yml                      # Lint + test on PR
│       └── deploy.yml                  # Auto-deploy to Vercel
├── CLAUDE.md              ← this file
├── CONTRIBUTING.md
├── LICENSE                ← MIT
├── README.md
├── package.json
├── pnpm-lock.yaml
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## 📸 OCR Pipeline (CRITICAL FEATURE)

The OCR system is a core differentiator of this app. It must be implemented with care.

### Pipeline Architecture

```
📸 Camera/Upload → 🔧 Preprocessing → 🔍 OCR → 📋 Parsing → ✏️ Review → 💾 Save
```

### Step 1: Image Capture
- Use `navigator.mediaDevices.getUserMedia()` for camera access
- Support file upload as fallback (gallery pick on mobile)
- Guide overlay showing card alignment frame

### Step 2: Preprocessing (OpenCV.js)
- **Auto-crop**: Detect card edges using contour detection
- **Perspective correction**: Dewarp tilted/angled photos
- **Binarization**: Convert to high-contrast B&W (adaptive threshold)
- **Noise removal**: Gaussian blur + morphological operations
- **Resolution normalization**: Scale to optimal OCR input size

### Step 3: OCR (Tesseract.js)
- Use Tesseract.js v5+ with English language pack
- Configure for single-block text mode where appropriate
- Extract raw text from preprocessed image

### Step 4: Card Parsing (cardParser.ts)
- Parse raw OCR text into structured fields using regex patterns
- Relicblade cards have a CONSISTENT layout:
  - Name (top, large font)
  - Stats block: AD, Speed, Armor, Health (fixed positions)
  - Actions with activation values (e.g., "4+" or "3+")
  - Keywords line
  - Point cost
- The parser uses POSITION and PATTERN recognition, not hardcoded game data

### Step 5: Review Form
- Pre-filled form with OCR results
- User corrects any misread values
- Visual diff: show original image alongside parsed fields
- "Looks good" → save to collection

### Step 6: Batch Scanning
- Allow scanning multiple cards in sequence
- Queue system: scan → quick review → next card
- Progress indicator: "12/30 cards scanned"

### OCR Accuracy Targets
- **Character name**: >95% (large, clear text)
- **Numeric stats** (AD, Speed, Armor, Health, Cost): >90%
- **Action names**: >85% (may need manual correction)
- **Keywords**: >85%
- Overall: user should need to correct ≤2-3 fields per card

## 🧩 Core Data Models

These are EMPTY schemas — no default values from the game.

### Character
```typescript
interface Character {
  id: string;                    // UUID auto-generated
  name: string;
  faction: string;               // user-defined string
  cost: number;                  // point cost (influence)
  stats: {
    actionDice: number;          // AD
    speed: number;               // SPD
    armor: number;               // ARM
    health: number;              // HP (total health boxes)
  };
  keywords: string[];            // e.g., "Hero", "Pig", "Construct"
  actions: Action[];             // character abilities
  upgradeSlots: UpgradeSlotType[]; // types of allowed upgrade slots
  notes: string;                 // free-text notes
  imageUri?: string;             // local ref to scanned card image (optional)
  source: 'manual' | 'ocr' | 'import';
  ocrConfidence?: number;        // 0-100, how confident the OCR was
  createdAt: string;             // ISO date
  updatedAt: string;
}

interface Action {
  name: string;
  type: 'attack' | 'ability' | 'spell' | 'defense' | 'other';
  activationValue?: string;      // e.g., "4+", "3+"
  effect: string;                // free-text description
  bonus?: string;                // e.g., "+2 damage"
}

type UpgradeSlotType = 'weapon' | 'potion' | 'tactic' | 'spell' | 'item' | 'other';
```

### Upgrade
```typescript
interface Upgrade {
  id: string;
  name: string;
  type: UpgradeSlotType;
  cost: number;
  effect: string;
  restrictions: string[];        // keyword restrictions, user-defined
  source: 'manual' | 'ocr' | 'import';
  createdAt: string;
}
```

### Roster
```typescript
interface Roster {
  id: string;
  name: string;
  faction: string;
  maxInfluence: number;          // configurable, default 100
  entries: RosterEntry[];
  totalInfluence: number;        // computed: sum of all character costs + upgrade costs
  createdAt: string;
  updatedAt: string;
  campaignId?: string;           // if part of a campaign
}

interface RosterEntry {
  characterId: string;           // ref to Character in collection
  equippedUpgradeIds: string[];  // refs to Upgrades in collection
  entryInfluence: number;        // computed: character cost + upgrades cost
}
```

### Campaign
```typescript
interface Campaign {
  id: string;
  name: string;
  rosterId: string;              // starting roster
  gold: number;                  // campaign currency
  matches: MatchRecord[];
  createdAt: string;
  updatedAt: string;
}

interface MatchRecord {
  id: string;
  date: string;
  result: 'win' | 'loss' | 'draw';
  scenario?: string;
  notes: string;
  characterStates: CharacterCampaignState[];
}

interface CharacterCampaignState {
  characterId: string;
  heroicTraits: string[];        // earned on level up
  woundTraits: string[];         // persistent injuries
  criticalWounds: number;        // 💀 marks = -1 AD each
  currentHealth: number;         // may carry between games
  relics: string[];              // relics/treasures found
  gold: number;                  // gold earned this match
  recoveryRoll?: number;         // post-match recovery (6 = +1 HP)
}
```

### GameState
```typescript
interface GameState {
  id: string;
  roster1: Roster;
  roster2: Roster;
  currentRound: number;
  phase: 'initiative' | 'activation' | 'recovery';
  initiative: 1 | 2 | null;
  models: ModelState[];
  startedAt: string;
  isCampaignGame: boolean;
  campaignId?: string;
}

interface ModelState {
  characterId: string;
  rosterOwner: 1 | 2;
  currentHealth: number;
  maxHealth: number;
  activated: boolean;
  conditions: string[];          // user-defined status effects
  actionDiceModifier: number;    // e.g., -1 from critical wounds
}
```

## 🔄 User Flows

### Flow 1: First Time Setup
1. User opens app → sees empty collection with welcome message
2. User taps "Add Cards" → chooses OCR Scan or Manual Entry
3. **OCR path**: Camera opens → alignment guide shown → snap photo →
   preprocessing → OCR extracts text → review form pre-filled → correct & save
4. **Manual path**: Empty form → user types all fields → save
5. Cards saved to IndexedDB as personal collection
6. Prompt: "Export your collection as backup?" → downloads JSON file

### Flow 2: List Building
1. User taps "New Roster" → enters name + influence limit (default 100)
2. Faction filter shows only factions from user's collection
3. Character list displays card-style views (NO images, text only)
4. Tap card → full detail view with all stats, actions, keywords
5. "Add to Roster" → character added, influence counter updates
6. **Influence bar ALWAYS visible** at bottom: "72 / 100 ████████░░"
7. If over limit → bar turns red, warning shown
8. Equip upgrades → filtered by compatible slot type + keywords
9. Save roster → ready for game or campaign

### Flow 3: Game Management
1. User selects saved roster for Player 1
2. Player 2 loads their roster (on same device or separate)
3. Game Manager initializes with both rosters
4. Each round:
   - **Initiative**: D6 roll for each player
   - **Activation**: Tap model to activate, track actions used
   - **Recovery**: End-of-round recovery checks
5. Health tracked per model with tap +/- buttons
6. Game can be paused/resumed (auto-save to IndexedDB)

### Flow 4: Campaign Mode
1. User creates campaign with starting roster
2. After each game:
   - Record win/loss
   - Assign Heroic Traits earned
   - Record Wound Traits suffered
   - Mark Critical Wounds (💀 = permanent -1 AD)
   - Roll for Recovery (6 on D6 = heal 1 HP)
   - Track gold earned/spent
   - Record relics/treasures found
3. Character progression carries over to next game
4. Full campaign history viewable

## 🎨 UI/UX Guidelines

- **Mobile-first** design — primary use case is at the gaming table with a phone
- Clean, minimal UI with **dark theme** as default (table-friendly, saves battery)
- **Card-style components** that represent game cards in TEXT ONLY format (no images)
- **Large touch targets** for in-game tracking (44px minimum per Apple HIG)
- **Influence bar always visible** during roster building (sticky bottom bar)
- Responsive: works on tablet and desktop too
- **Offline-first**: full functionality without internet (PWA with service worker)
- **Haptic feedback** on dice rolls and important actions (where supported)

## 📏 Code Conventions

- TypeScript **strict mode** — no `any` types
- Svelte 5 **Runes** syntax: `$state`, `$derived`, `$effect` (not legacy `$:`)
- SvelteKit file-based routing with `+page.svelte` / `+layout.svelte`
- Svelte stores for shared state (no external state library)
- Tailwind CSS only — no inline styles, no CSS modules
- File naming: PascalCase for `.svelte` components, camelCase for `.ts` utilities
- One component per file
- All user-facing strings in `constants/ui.ts` for future i18n
- Comprehensive JSDoc comments on interfaces and utility functions
- Use `$lib/` alias for imports from `src/lib/`

## 🧪 Testing Strategy

- Unit tests for: validation logic, dice utilities, store actions, export/import,
  card parser, OCR text parsing
- Component tests for: forms, roster builder interactions, OCR review flow
- No E2E tests in v0.x — add with Playwright in v1.0
- Target: >80% coverage on utils/ and stores/

## 💾 Data Persistence

### Storage Architecture
- **Primary**: IndexedDB via `idb` library
  - `collection` store: all user's cards (characters + upgrades)
  - `rosters` store: saved rosters
  - `games` store: active/paused games
  - `campaigns` store: campaign data
  - `settings` store: user preferences
- **Backup**: JSON export/import
  - Single "Export All" button → downloads complete backup as `.json`
  - "Import" → loads backup, merges or replaces collection
  - Periodic reminder to export (every 7 days if no backup)
- **NO server-side storage** — everything is local to the device

### Data Safety
- Auto-save on every state change (debounced 500ms)
- Prompt user to export backup on first card added
- Show "Last backup: X days ago" in settings
- Clear warning on browser data clear: "Your collection will be lost!"

## 📚 Wiki Reference (Game Rules)

The `wiki/` folder is **not committed to this repo** (Zero Game Data Policy + IP respect).
Each contributor generates it locally from their own Relicblade PDFs using the extraction
scripts in `utility/build_wiki.py` (requires PyMuPDF) or `utility/build_wiki_ocr.py`
(adds Tesseract OCR for image-based pages). The `utility/` folder is local-only and not
committed to this repo.

Once generated, the wiki provides a structured reference for implementing game mechanics:

| Expected path | Contents |
|--------------|----------|
| `wiki/rules/Game-Rules.md` | Core rules: setup, phases, actions, attack sequence, special rules, character types |
| `wiki/rules/Card-Anatomy.md` | Card fields (AD, SPD, ARM, HP, actions, upgrades, cost) and their app mappings |
| `wiki/factions/Factions-Overview.md` | All factions, alignments (Advocate/Adversary) |
| `wiki/campaigns/Campaign-Rules.md` | Wonders & Horrors: post-game sequence, heroic/wound traits, gold, recovery |

If you don't have the PDFs, refer to the official Relicblade rulebooks by Metal King Studio.

> ⚠️ Zero Game Data Policy still applies: wiki content is for developer reference only.
> Never copy stats, point costs, or card text into the app source code.

## 📐 Design Documents

The `docs/` folder contains the architectural design produced before development.
**Read these before implementing a feature** — they hold the decisions and the *why*,
so you don't re-derive (or contradict) settled choices.

| File | Contents |
|------|----------|
| `docs/architecture.md` | Architecture Decision Records (ADRs): static SPA, manual-first OCR, defer OpenCV, idb 6-store schema, runes store pattern, dual influence model, computed effective stats. Each with context + rationale. |
| `docs/technical-design.md` | Routing tree, store architecture, IndexedDB schema + migrations, core utils, detailed OCR pipeline, PWA config, data-model deltas vs this file. |
| `docs/ui-wireframes.md` | Text wireframes (375px) for the 4 primary screens + shared components inventory + empty states. |
| `docs/sprint-plan.md` | 8 sprints (v0.1→v1.0) with atomic tasks, dependencies, and Definition of Done. Critical path noted. |

**Key locked decisions** (see ADRs for full reasoning):
- Build: **static SPA** — `adapter-static`, `ssr=false` (IndexedDB is client-only).
- Data entry: **manual-first**; OCR pre-fills the *same* review form and is removable.
- OCR: **defer OpenCV.js**; start with Canvas preprocessing. Lazy-loaded, Web Worker.
- Storage: **idb**, 6 stores (`characters`, `upgrades`, `rosters`, `games`, `campaigns`, `settings`), UUID keys, versioned migrations.
- State: **class-runes `.svelte.ts`** stores, normalized by id, **explicit debounced persist** (no `$effect` for saving).
- Influence: **dual mode** — `standard` (limit includes upgrades) vs `threat` (characters only).

## 🚀 Development Commands

```bash
pnpm install          # Install dependencies
pnpm run dev          # Start dev server (SvelteKit + Vite)
pnpm run build        # Production build
pnpm run preview      # Preview production build
pnpm run test         # Run Vitest
pnpm run lint         # ESLint check
pnpm run format       # Prettier format
pnpm run check        # Svelte type checking
```

## 🗺️ Roadmap / Milestones

1. **v0.1 — Scaffolding**: SvelteKit project setup, models, empty UI shell,
   navigation, Tailwind config, PWA manifest
2. **v0.2 — Card Import**: Manual entry form, collection manager, IndexedDB
   storage, JSON export/import
3. **v0.3 — OCR Scanner**: Camera capture, OpenCV.js preprocessing, Tesseract.js
   OCR, card parser, review form, batch scanning
4. **v0.4 — List Builder**: Roster building from collection, faction filter,
   influence tracking (sticky bar), upgrade equipping, validation
5. **v0.5 — Game Manager**: Initiative roller, activation tracking, health
   tracking, round/phase management, auto-save
6. **v0.6 — Campaign Mode**: Campaign creation, character progression,
   heroic/wound traits, gold, relics, recovery rolls, match history
7. **v0.7 — Polish**: Dark theme, responsive refinements, haptic feedback,
   onboarding flow, backup reminders
8. **v1.0 — Release**: PWA offline mode, Vercel deploy, performance optimization,
   i18n (IT/EN/DE/FR), documentation

## 🚫 Out of Scope

- Online multiplayer or server-side features
- Any form of game data distribution or card database
- Rules engine or rules enforcement (the app tracks, it doesn't enforce)
- Integration with third-party APIs (except OCR libraries)
- User accounts or authentication
- Image storage of card artwork (copyright concern)
- Sharing collections between users (each player manages their own)
