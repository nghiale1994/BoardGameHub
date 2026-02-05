NOTE: AI must read docs/ai/README.md before modifying this file.
Version: 2026-02-04
Changelog:
- 2026-02-03: Created HomePage test index (Unit/Integration/E2E tables).
- 2026-02-03: Recorded current Playwright E2E coverage (core flows) and kept breakpoint coverage explicitly proposed.
- 2026-02-04: Implemented Playwright breakpoint E2E coverage (desktop/tablet/mobile).
- 2026-02-04: Renamed Testing column to "Test Steps" and rewrote steps as short procedures.

# HomePage Tests (Index)

This file aggregates the proposed test coverage for the HomePage feature.

Canonical design source:
- `docs/features/HomePage/design.md`

## Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| WelcomeSection + DisplayNameInput | Validate displayName rules and persistence | Run `app/src/components/WelcomeSection.test.tsx` → type invalid/valid names → click Save → assert validation + persistence calls | Invalid names blocked; valid save persists and broadcasts |
| JoinRoom | URL validation + spectator default | Run `app/src/components/JoinRoom.test.tsx` → paste invalid/valid invite URLs → toggle spectator checkbox → assert Join enabled only when valid and default unchecked | Join disabled for invalid/empty; spectator unchecked by default |
| Sidebar | Toggle pinned to drawer edge; Settings opens modal | Run `app/src/components/Sidebar.test.tsx` → open/close drawer → assert hamburger stays pinned; click Settings → assert modal opens | Toggle reachable and tracks drawer edge; modal opens |
| LanguageSelection | Locale change and persistence | Run `app/src/components/LanguageSelection.test.tsx` → change language → assert UI strings update + persistence saved | Strings update immediately; preference persists |
| ThemeToggle | Theme change and persistence | Run `app/src/components/ThemeToggle.test.tsx` → toggle theme → assert callback + saved preference | Theme applied immediately; preference persists |
| GameListGrid | Debounced search + AND filters + chips + pagination | Run `app/src/components/GameListGrid.test.tsx` → type search (fake timers) → apply filters/chips → paginate → assert results/counts | Correct result set; chips/count correct; pagination bounds correct |
| CreateRoomModal | Essential settings always visible; settings controls | Run `app/src/components/CreateRoomModal.test.tsx` → open modal → verify essential fields visible → adjust settings → assert state updates | Essential controls always visible; settings state updates |
| RoomCreatedModal | Copy + Enter + Later actions | Run `app/src/components/RoomCreatedModal.test.tsx` → click Copy/Enter/Later → assert clipboard/toast and navigation callbacks | Copy success feedback shown; navigation callbacks invoked |
| RecentGames | Render items/empty + clear all | Run `app/src/components/RecentGames.test.tsx` → render with items/empty → click Clear all → assert list empties | Items render; clear all empties list |

## Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| HomePage (composition) | Name gate blocks Join/Create + scroll-to-Welcome | Run `app/src/App.homepage.test.tsx` → clear displayName → attempt Join/Create → assert scroll + inline error | Attempt without saved name scrolls + shows inline error |
| Invite route `/i/:roomId` | Auto-scroll + auto-fill + focus (no auto-join) | In App test: navigate to `/i/:roomId` → render → assert JoinRoom input prefilled + focused and no join invoked | JoinRoom focused; URL prefilled; join not triggered |
| Game card → Create flow | Card click opens CreateRoomModal and confirms | In App test: click game card → assert Create modal opens → confirm create → assert callbacks fired | Modal opens with correct game; confirmation shown |
| Create flow → RecentGames | New room appears in RecentGames | In App test: create room → update mocked persistence recent rooms → assert RecentGames renders new entry | RecentGames list includes new entry |

## E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| HomePage end-to-end (core flows) | Smoke coverage: render, invite prefill, name gate, join/create flows | Run `npm run test:e2e` → load Home → verify invite prefill → set displayName → join/create flows → assert navigation and UI updates | Core flows pass at default viewport |
| HomePage end-to-end (breakpoints) | Full Join/Create flow across breakpoints | Run `npm run test:e2e` → repeat join/create at desktop/tablet/mobile viewports → assert consistent behavior | Core flows pass across desktop/tablet/mobile viewports |
