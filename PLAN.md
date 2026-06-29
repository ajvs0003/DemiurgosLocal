# PLAN — Migrate `temp/` to Next.js + TypeScript + Vercel

## Goal

Build a new production-ready application at the root of `Z:\DemiurgosLocal`, based on the latest stable version of Next.js, deployable to Vercel, using:

- Next.js with App Router
- TypeScript
- React
- pnpm
- Tailwind CSS
- Sass
- good architecture and maintainability practices

The new app must reuse the design language, test pages, components, and data currently available in `temp/`, while replacing the current Design Canvas-style runtime with a modern, typed, maintainable codebase.

---

## Mandatory engineering conventions

All engineering assets must use English:

- file names in English
- folder names in English
- code in English
- code comments in English
- component names in English
- function names in English
- variable names in English
- type names in English
- constant names in English
- test names in English

Product UI copy may remain in Spanish if desired, but the implementation itself must be in English.

---

## Current source of truth

Primary source folder:

`Z:\DemiurgosLocal\temp`

### Reusable assets identified

#### Shell and navigation

- `temp/Header.jsx`
- `temp/Sidebar.jsx`
- `temp/nae-app.jsx`

#### Feature views

- `temp/BestiaryView.jsx`
- `temp/SearchView.jsx`
- `temp/CharactersView.jsx`
- `temp/LugaresView.jsx`
- `temp/Sanctum.jsx`

#### Sanctum modules

- `temp/sanctum/atoms.jsx`
- `temp/sanctum/constants.js`
- `temp/sanctum/ArcanumForm.jsx`
- `temp/sanctum/ArchiveForm.jsx`
- `temp/sanctum/CampanaForm.jsx`
- `temp/sanctum/PersonajeForm.jsx`
- `temp/sanctum/LugarForm.jsx`

#### Data

- `temp/data/spells.js`
- `temp/data/monsters.js`
- `temp/data/chronicles.js`
- `temp/data/timeline.js`

#### Visual assets

- `temp/assets/nae-bg.png`
- `temp/assets/astral-bg.png`
- `temp/assets/astral-city.png`
- `temp/uploads/*`

#### Visual/runtime references

- `temp/tokens.js`
- `temp/image-slot.js`
- `temp/pages/*.dc.html`
- `temp/Prototipo Nae.dc.html`
- `temp/PLAN.md`

---

## Current technical diagnosis

The current prototype is not a Next.js project.

It currently uses:

- browser-side React globals
- `window.NaeComponents`
- `window.NaeData`
- `window.NaeTokens`
- `window.NaeSanctum`
- Design Canvas-style assembly via `x-import`
- inline styles across many components
- custom browser-only behaviors
- a custom element implementation in `image-slot.js`

There is currently no root application scaffold:

- no root `package.json`
- no root Next.js app
- no root pnpm project

---

## Main migration risks

### 1. Global runtime coupling

The prototype depends heavily on browser globals and side effects. This must be replaced with standard module imports and typed local state.

### 2. SSR and RSC incompatibility

The current code uses browser-only APIs such as:

- `window`
- `document`
- `localStorage`
- `MutationObserver`

These behaviors must be isolated in client components and hooks.

### 3. `image-slot.js`

The current `image-slot` implementation is tightly coupled to the old runtime and local sidecar persistence. It should not be ported directly into the first Next.js version.

### 4. Duplicated and inconsistent data models

Some data is centralized in `temp/data/*`, but other data remains embedded inside feature views such as characters, places, and grimoire-related logic.

### 5. Heavy inline styling

The current UI works as a prototype, but its styling approach is not maintainable at scale. It must be migrated to design tokens, Tailwind utilities, and selective Sass modules.

---

## Recommended target architecture

## Stack

- Next.js latest
- React
- TypeScript with strict mode
- pnpm
- Tailwind CSS
- Sass
- ESLint
- Prettier
- Vercel deployment target

## Target repository structure

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css

    index/page.tsx
    scriptorium/page.tsx
    chronicles/page.tsx
    chronicles/[id]/page.tsx
    characters/page.tsx
    characters/[id]/page.tsx
    atlas/page.tsx
    places/page.tsx
    places/[id]/page.tsx
    grimoire/page.tsx
    grimoire/[id]/page.tsx
    bestiary/page.tsx
    bestiary/[id]/page.tsx
    codex/[collection]/page.tsx
    rules/page.tsx

    @sanctum/
      default.tsx
      (.)sanctum/
        [tab]/page.tsx

    api/
      entries/route.ts

  components/
    ui/
    chrome/
    features/
    icons/

  lib/
    data/
    search.ts
    utils.ts
    constants.ts

  types/
  hooks/
  styles/
  config/

public/
  maps/
  portraits/
  fonts/
Core architecture decisions
1. Persistent shell in app/layout.tsx
The root layout must render:
- Header
- Sidebar
- {children}
This mirrors the prototype shell behavior while using the App Router correctly.
2. Domain separation
Code should be organized by layer:
- components/ui: design-system primitives
- components/chrome: application shell
- components/features: domain feature blocks
- lib/data: typed seed data
- types: domain contracts
- hooks: client-only behavior
- config: navigation and site config
3. Strong domain typing from the start
Define shared domain contracts early, then derive feature-specific types.
Example direction:
export type Origin = 'nae' | 'dnd';

export interface BaseEntry {
  id: string;
  origin: Origin;
  collection: string;
  summary?: string;
}
Then derive:
- Spell
- Monster
- Chronicle
- Event
- Character
- Place
- CollectionEntry
4. Design tokens as CSS variables plus Tailwind theme
temp/tokens.js should be migrated into:
- src/styles/tokens.css
- tailwind.config.ts
This should expose semantic theme values such as:
- wine
- wine-deep
- gold
- ink-dark
- ink-soft
- parchment
- parchment-light
- mystic-purple
- bg
5. Tailwind plus Sass split of responsibilities
Use:
- Tailwind for layout, spacing, typography, state, and composition
- Sass for decorative parchment effects, ornaments, complex map styling, and feature-specific presentation that would be awkward in utility classes
6. Client components only when necessary
Use server components by default.
Mark as client components only where required, such as:
- header shortcut handling
- collapsible sidebar
- interactive search
- Sanctum forms
- image-slot replacement wrapper
- keyboard listeners
Naming strategy
All implementation naming must be in English.
Required English route and code naming
- index
- scriptorium
- chronicles
- characters
- atlas
- places
- grimoire
- bestiary
- codex
- rules
- sanctum
Form naming
- ArcanumForm
- ArchiveForm
- CampaignForm
- CharacterForm
- PlaceForm
Feature/component naming examples
- search-view.tsx
- search-result.tsx
- monster-list.tsx
- monster-detail.tsx
- timeline.tsx
- sanctum-shell.tsx
- portrait-uploader.tsx
Source-to-target mapping
Shell
- temp/Header.jsx → src/components/chrome/header.tsx
- temp/Sidebar.jsx → src/components/chrome/sidebar.tsx
- local nav config → src/components/chrome/sidebar-nav-config.ts or src/config/nav.ts
Home
- landing logic from temp/nae-app.jsx → src/app/page.tsx
Global index
- temp/SearchView.jsx →
- src/app/index/page.tsx
- src/components/features/search/search-view.tsx
- src/components/features/search/search-result.tsx
- src/lib/search.ts
Bestiary
- temp/BestiaryView.jsx →
- src/app/bestiary/page.tsx
- src/app/bestiary/[id]/page.tsx
- src/components/features/bestiary/monster-list.tsx
- src/components/features/bestiary/monster-detail.tsx
Characters
- temp/CharactersView.jsx →
- src/app/characters/page.tsx
- src/app/characters/[id]/page.tsx
- src/components/features/characters/*
Places
- temp/LugaresView.jsx →
- src/app/places/page.tsx
- src/app/places/[id]/page.tsx
- src/components/features/places/*
Atlas
Source assets:
- temp/assets/nae-bg.png
- temp/assets/astral-bg.png
Destination:
- src/app/atlas/page.tsx
- src/components/features/atlas/nae-map.tsx
- src/components/features/atlas/astral-map.tsx
- src/components/features/atlas/city-pin.tsx
Scriptorium and chronicles
- temp/data/chronicles.js
- temp/data/timeline.js
Destination:
- src/app/scriptorium/page.tsx
- src/app/chronicles/page.tsx
- src/app/chronicles/[id]/page.tsx
- src/components/features/chronicles/timeline.tsx
Grimoire and codex
- temp/data/spells.js
- grimoire-related logic in temp/nae-app.jsx
Destination:
- src/app/grimoire/page.tsx
- src/app/grimoire/[id]/page.tsx
- src/app/codex/[collection]/page.tsx
Sanctum
- temp/Sanctum.jsx
- temp/sanctum/*
Destination:
- src/app/@sanctum/default.tsx
- src/app/@sanctum/(.)sanctum/[tab]/page.tsx
- src/components/features/sanctum/*
Migration phases
Phase 0 — Bootstrap the new app
Objective
Create the modern technical foundation at the repository root.
Tasks
- initialize a new Next.js app with pnpm
- enable TypeScript strict mode
- configure Tailwind CSS
- add Sass support
- configure import alias @/*
- prepare ESLint and formatting
- prepare Vercel deployment compatibility
Deliverables
- working Next.js app
- pnpm dev works
- pnpm build works
- deployment baseline is valid
Exit criteria
The root project builds and runs cleanly.
Phase 1 — Visual foundation
Objective
Make the new application visually align with the Nae/Octaladrio identity before migrating features.
Tasks
- convert temp/tokens.js into src/styles/tokens.css
- map tokens into tailwind.config.ts
- define fonts and typography usage
- create globals.css
- create primitive UI components:
- button.tsx
- input.tsx
- badge.tsx
- divider.tsx
- icon.tsx
- image-slot.tsx
- dotted-line.tsx
- parchment-card.tsx
Deliverables
- centralized tokens
- reusable primitives
- stable visual baseline
Exit criteria
A representative page can be built with acceptable visual fidelity.
Phase 2 — Application shell
Objective
Build the persistent shell on top of the App Router.
Tasks
- implement src/app/layout.tsx
- implement Header
- implement Sidebar
- create src/config/site.ts
- create src/config/nav.ts
- add use-sidebar-collapsed.ts
- add use-cmd-k.ts
Deliverables
- persistent shell
- primary navigation
- placeholder pages for all main sections
Exit criteria
Navigation works between routes without breaking layout state.
Phase 3 — Data model normalization
Objective
Replace window.NaeData with typed local modules.
Tasks
- create domain types in src/types/*
- migrate temp/data/spells.js → src/lib/data/spells.ts
- migrate temp/data/monsters.js → src/lib/data/monsters.ts
- migrate temp/data/chronicles.js → src/lib/data/chronicles.ts
- migrate temp/data/timeline.js → src/lib/data/timeline.ts
- extract character data from CharactersView.jsx
- extract place data from LugaresView.jsx
- unify exports in src/lib/data/index.ts
- implement getAllEntries()
Deliverables
- unified typed catalog
- no dependency on browser globals
- stable data access layer
Exit criteria
All feature data is imported from TypeScript modules only.
Phase 4 — Global index
Objective
Migrate a high-value cross-domain feature early.
Tasks
- design src/lib/search.ts
- create src/hooks/use-search.ts
- port the logic from SearchView.jsx
- split results into reusable components
- support matching across:
- name
- title
- summary
- collection
- school
- meta
- subtitle
Deliverables
- /index
- grouped results by collection
- search behavior comparable to the prototype
Exit criteria
The index page can search across all typed seed collections.
Phase 5 — Bestiary
Objective
Migrate a relatively straightforward vertical slice first.
Tasks
- define the Monster type
- build list view
- build detail view
- connect /bestiary
- connect /bestiary/[id]
Deliverables
- browseable list
- detail page
- origin badges and relevant metadata
Exit criteria
The bestiary is usable end to end.
Phase 6 — Characters and places
Objective
Migrate two richer domains already represented in the prototype.
Tasks
- port character catalog
- port character detail
- define portrait handling in public/portraits
- port places catalog
- port place detail
- connect places with atlas references
Deliverables
- /characters
- /characters/[id]
- /places
- /places/[id]
Exit criteria
Both sections are navigable and visually consistent.
Phase 7 — Atlas
Objective
Migrate the most visually sensitive feature.
Tasks
- move map assets into public/maps
- implement nae-map.tsx
- implement astral-map.tsx
- implement city-pin.tsx
- connect pins to places
- choose final strategy for overlays and positioning
Risks
- responsive positioning
- visual fidelity
- interaction design
Deliverables
- /atlas
- material world map
- astral map
- clickable pin interactions
Exit criteria
Map pins align correctly and the page remains stable across viewport sizes.
Phase 8 — Grimoire, codex, and rules
Objective
Complete the core system content sections.
Tasks
- build grimoire list and detail
- implement codex collection routes
- implement rules page
- refine collection typing and shared rendering
Deliverables
- /grimoire
- /grimoire/[id]
- /codex/[collection]
- /rules
Exit criteria
Collection-based sections render correctly and share common primitives.
Phase 9 — Sanctum
Objective
Migrate the creation workflow as a modal-capable route system.
Tasks
- define SANCTUM_TABS in TypeScript
- port sanctum/atoms.jsx
- port all Sanctum forms
- build sanctum-shell.tsx
- implement the @sanctum parallel route
- implement the (.)sanctum/[tab] intercepting route
V1 scope
- client-side forms
- no real persistence yet
- local state or mock save flow
V2 scope
- persistence
- validation and storage
- database-backed create flows
Deliverables
- modal-capable Sanctum
- shareable route-based tab state
- functional tab navigation
Exit criteria
Sanctum opens without breaking the shell or losing the background page context.
Phase 10 — Persistence
Objective
Add real storage for entries created in Sanctum.
Recommended option
- Drizzle ORM
- SQLite or libSQL/Turso
- Server Actions
Tasks
- define database schema
- mirror domain entities in tables
- build create actions
- validate submitted data
- optionally seed starter content
Deliverables
- real persistence
- create and read flows integrated with the app
- deployment-compatible data layer
Exit criteria
New entries survive refreshes and deployments.
Recommended implementation order
 1. Bootstrap the app
 2. Tokens and visual foundations
 3. Shell and navigation
 4. Typed data normalization
 5. Global index
 6. Bestiary
 7. Characters
 8. Places
 9. Atlas
10. Grimoire, codex, and rules
11. Sanctum
12. Persistence
Critical path
The true blockers are:
1. create the Next.js root project
2. define the token system
3. normalize and type the data
4. build the App Router shell
5. define the image-slot replacement strategy
6. define the Sanctum route strategy
Until these are resolved, other work risks duplication or rework.
Technical recommendations
Recommended
- create a new project at the repository root
- treat temp/ as a migration source, not the runtime base
- use App Router from the beginning
- use server components by default
- use client components only for interactive behavior
- type data before migrating feature pages
- defer Sanctum until the rest of the app structure is stable
- simplify image-slot for V1
Not recommended
- copying window.* patterns into the new app
- preserving support.js, x-import, or x-dc
- migrating everything in one pass
- starting with atlas or Sanctum
- adding persistence before the domain model is stable
Assumptions
This plan assumes that:
- temp/ is the current working prototype
- temp/ should remain intact as a reference source
- Vercel is the deployment target
- the first iteration can rely on local seed data
- visual fidelity matters, but maintainability takes priority
- route names and implementation names should be in English
Final note
This plan is intentionally structured so the new application can be built incrementally without depending on the old runtime model.
The correct strategy is to preserve temp/ as a source reference, while creating a clean, typed, deployable application at the root of the repository.
```
