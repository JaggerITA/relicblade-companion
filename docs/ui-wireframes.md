# UI Wireframes — Relicblade Companion

> Text wireframes for the four primary screens at **375px** (mobile-first).
> Dark theme default, touch targets ≥44px, card components are TEXT-ONLY (no artwork).
> Conventions: `[ Button ]` tappable · `( )` radio · `▸` expandable · `≡` drag handle.

---

## App shell (all screens)

```
┌─────────────────────────────────────┐
│ ‹ Title                        ⚙     │  Header (44px): back + title + settings
├─────────────────────────────────────┤
│                                       │
│            screen content             │  Scrollable region
│                                       │
├─────────────────────────────────────┤
│  🏠      🗂      📋      🎲      🏕    │  Bottom nav (56px), 5 tabs
│ Home  Cards  Rosters Games Camp.      │  active tab highlighted
└─────────────────────────────────────┘
```

---

## 1. Collection Manager — `/collection`

```
┌─────────────────────────────────────┐
│ Collection                      ⚙     │
├─────────────────────────────────────┤
│ 🔍 Search…                            │  filter bar (sticky under header)
│ [All ▾] [Characters] [Upgrades]       │  type segmented control
│ Faction: [All factions ▾]             │  faction filter (from collectionStore)
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐    │  Card row (≥64px tall)
│ │ Questing Knight        23 inf │ ›  │  name + cost, chevron → detail/edit
│ │ Temple of Justice · Hero       │    │  faction · keyword
│ └───────────────────────────────┘    │
│ ┌───────────────────────────────┐    │
│ │ Shield Pig             16 inf │ ›  │
│ │ Battle Pigs · Pig              │    │
│ └───────────────────────────────┘    │
│             …scrolls…                 │
├─────────────────────────────────────┤
│                          ┌─────────┐  │  FAB
│                          │    +    │  │  → bottom sheet:
│                          └─────────┘  │    [ 📷 Scan card ] [ ✎ Enter manually ]
└─────────────────────────────────────┘
```

**Hierarchy.** Filters pinned top → scrollable card list → FAB bottom-right.
**Interactions.** Tap row → `/collection/[id]` (edit). Swipe row left → quick Delete (confirm). FAB → sheet routing to `/collection/scan` or `/collection/new`.
**Empty state (first run).**
```
        🗂
  Your collection is empty
  Add your cards to start
  building warbands.

  [ 📷 Scan a card ]
  [ ✎ Enter manually ]

  Cards are saved on this device.
```

---

## 2. Roster Builder — `/roster/[id]`

Single-column on mobile (no side-by-side at 375px). Collection picker is a bottom sheet.

```
┌─────────────────────────────────────┐
│ ‹ Vanguard Warband              ⚙     │
├─────────────────────────────────────┤
│ ROSTER (3 models)                     │
│ ┌───────────────────────────────┐    │
│ │ Questing Knight        23 inf │    │
│ │  ▸ weapon: Longsword   +4     │    │  equipped upgrades nested
│ │  ▸ + add upgrade               │    │  empty slot → opens upgrade sheet
│ │                          [ ✕ ] │    │  remove from roster
│ └───────────────────────────────┘    │
│ ┌───────────────────────────────┐    │
│ │ Shield Pig             16 inf │    │
│ │  ▸ + add upgrade (potion,item) │    │
│ │                          [ ✕ ] │    │
│ └───────────────────────────────┘    │
│                                       │
│ [ + Add character ]                   │  → collection picker sheet (faction-filtered)
│             …scrolls…                 │
├─────────────────────────────────────┤
│ Influence   72 / 100                  │  STICKY bottom bar (always visible)
│ ████████████████░░░░░░  ✓ legal       │  green; turns red + "over limit" if exceeded
└─────────────────────────────────────┘
```

**Mode note (ADR-006).** Header shows `Standard 100` or `Threat 75`. In threat mode the bar sums **characters only**; a sub-line shows `+ upgrades 18 (free)`.
**Hierarchy.** Roster list scrolls; influence bar is fixed and never scrolls away.
**Interactions.** "Add character" → sheet listing collection (only matching faction). "Add upgrade" → sheet filtered to the character's allowed slot types + keyword restrictions. Over limit → bar red, save still allowed (app tracks, doesn't enforce — see CLAUDE.md Out of Scope).
**Empty state.**
```
  No models yet.
  [ + Add character ]
  Influence 0 / 100
  ░░░░░░░░░░░░░░░░░░░░░░
```

---

## 3. Game Manager — `/game/[id]`

```
┌─────────────────────────────────────┐
│ ‹ Game · Round 2                ⚙     │
├─────────────────────────────────────┤
│ Phase: ● Activation                   │  phase pill: Initiative/Activation/Recovery
│ Initiative: P1 ⚔                      │  who acts first this round
│ [ P1 ]  [ P2 ]                        │  player toggle (whose models shown)
├─────────────────────────────────────┤
│ P1 — Vanguard Warband                 │
│ ┌───────────────────────────────┐    │
│ │ Questing Knight      AD 4      │    │  effective AD (base − crit wounds − mods)
│ │ HP ▣▣▣▤☐☐  [ − ] [ + ]        │    │  health boxes tappable; ▤=crit ☐=skull
│ │ ☐ activated   + condition      │    │  activation checkbox; conditions chip add
│ └───────────────────────────────┘    │
│ ┌───────────────────────────────┐    │
│ │ Shield Pig (disabled 💀)  AD 3 │    │  disabled styling
│ │ HP ☐☐☐☐☐☐                     │    │
│ └───────────────────────────────┘    │
│             …scrolls…                 │
├─────────────────────────────────────┤
│ [ Roll Initiative 🎲 ]                │  contextual action = current phase
│   (Activation) [ Next: Recovery ▸ ]   │
│   (Recovery)   [ Roll Recovery 🎲 ]   │
│                [ End Round ▸ ]         │
└─────────────────────────────────────┘
```

**Hierarchy.** Phase/initiative status band → player toggle → model cards → phase action button pinned bottom.
**Interactions.** `+/−` on HP fills/clears boxes left-to-right; crossing a crit box updates effective AD live; crossing the skull marks disabled. Activation check greys the card. Recovery phase: a dialog rolls 1D6 per disabled model, 6 = +1 box. Initiative phase: D6 vs D6 with reroll-tie, plus a "Give initiative (Respite)" option. Auto-saves after every tap.
**Special types.** Constructs render `Fuel ▣▣☐` instead of HP. Mount+Rider render as one grouped card with two AD pools. Companion shows a link badge to its host.
**Empty/new.** `/game/new` first: `Player 1 [pick roster ▾]`, `Player 2 [pick roster ▾]`, `[ Start game ]`.

---

## 4. Campaign Tracker — `/campaign/[id]`

```
┌─────────────────────────────────────┐
│ ‹ The Volgelands               ⚙     │
├─────────────────────────────────────┤
│ Gold 12 🪙     Record 3W–1L           │  summary band
│ [ History ]  [ Warband ]  [ +Game ]   │  tabs
├─────────────────────────────────────┤
│ WARBAND (progression)                 │
│ ┌───────────────────────────────┐    │
│ │ Questing Knight                │    │
│ │ Heroic: Inspiring, Tough       │    │  heroicTraits chips
│ │ Wounds: Limp                   │    │  woundTraits chips
│ │ Crit wounds: 💀 (−1 AD)        │    │  criticalWounds count
│ └───────────────────────────────┘    │
│             …scrolls…                 │
└─────────────────────────────────────┘
```

**Post-game flow** (`+Game` → guided multi-step sheet, one section per wizard step):
```
Step 1 Result      ( ) Win  ( ) Loss  ( ) Draw   Scenario […]
Step 2 Injuries    per destroyed model: roll injury → trait/death
Step 3 Recovery    per disabled model: [ Roll 🎲 ]  6 = +1 HP
Step 4 Rewards     Gold earned [  ]  Influence [  ]
Step 5 Heroic      per leveled model: + add heroic trait
Step 6 Wounds      per injured model: + add wound trait
Step 7 Review      summary → [ Save match ]
```

**Hierarchy.** Summary band → tabs → content. Post-game is a focused full-screen wizard, not inline (reduces error at the table).
**Interactions.** Each step writes to `characterCampaignState`; `criticalWounds` feeds `computeEffectiveStats` so future games show reduced AD automatically. Recovery/injury rolls use `dice.ts`.
**Empty state.** `/campaign/new`: name + pick starting roster → creates campaign with `gold` seed and an empty match history; warband tab lists roster characters with no traits yet.

---

## Shared components inventory

| Component | Used by |
|-----------|---------|
| `CardReviewForm` | manual entry, OCR review, edit (one form, ADR-002) |
| `InfluenceBar` | roster builder (sticky) |
| `HealthTracker` | game manager (HP/fuel boxes) |
| `DiceRoller` | initiative, recovery, injury rolls |
| `CollectionPickerSheet` | add character/upgrade to roster |
| `Modal` / `BottomSheet` / `Toast` / `Button` | global (shared/) |

*See also: [technical-design.md](technical-design.md) · [architecture.md](architecture.md) · [sprint-plan.md](sprint-plan.md)*
