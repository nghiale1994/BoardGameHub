NOTE: AI must read docs/ai/README.md before modifying this file.
Version: 2026-02-03
Changelog:
- 2026-02-03: Created components test index (Unit/Integration/E2E tables).
- 2026-02-03: Implemented SettingsModal unit + App entrypoint integration tests.
- 2026-02-04: Renamed Testing column to "Test Steps" and rewrote steps as short procedures.

# Components Tests (Index)

This file aggregates proposed tests for shared components under `docs/components/`.

## Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| SettingsModal | Open/close + toggles | Run `app/src/components/SettingsModal.test.tsx` → open modal → toggle flags → close → assert callbacks invoked and UI updates | Modal opens/closes reliably; toggles call callbacks |

## Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| SettingsModal + HomePage/GameRoom | Shared settings entry points across surfaces | Run `app/src/App.settingsmodal.test.tsx` → open Settings from HomePage → assert modal; navigate to GameRoom → open Settings → assert modal | Modal opens from HomePage sidebar and GameRoom header |
| SettingsModal + GameRoom Chat | Chat settings flags affect chat rendering | Run `app/src/App.gameroom.test.tsx` → open Settings → toggle chat flags → close → assert GameRoom chat rendering updates | conversation/move hidden per toggles; system always visible |

## E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Shared settings | Persistence across reload and navigation | Proposed: run Playwright → change settings → reload/navigate → assert settings persist and apply | Settings persist and apply correctly |
