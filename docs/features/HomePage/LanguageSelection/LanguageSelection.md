NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-04
Changelog:
- 2026-01-31: Fixed Mermaid diagram syntax to render reliably in Markdown preview.
- 2026-01-31: Renamed to Language selection and changed UI to dropdown list (EN/VI).
- 2026-02-01: Documented DSL files and i18n key naming to prevent drift.
- 2026-02-03: Standardized Testing section into Unit/Integration/E2E tables.
- 2026-02-04: Renamed Testing tables column to "Test Steps" and rewrote entries as ordered procedures.

# LanguageSelection Component Design

## Purpose
- Select between Vietnamese (VI) and English (EN) with immediate UI update.

## User Stories
- As a user, I want to choose my preferred language.

## UI Components
- Dropdown list (select)
  - Options: Vietnamese (VI), English (EN)

## Behaviour
- Reads/writes preferred language to LocalStorage
- Triggers i18n module to switch locale without reload
- UI control is a **dropdown list**, not a two-button toggle.

## Mermaid

```mermaid
flowchart LR
  U[User] -->|select language| LS[LanguageSelection]
  LS -->|changeLanguage| I18N[i18n.changeLanguage]
  I18N --> UI[UI re-render (new strings)]
```

## DSL
- `docs/config/i18n.yaml` contains language definitions and translation keys
- Translation namespace for this component: `translations.language_selection`

## Label Localization (VN/EN)
- Language selection (label) → Chọn ngôn ngữ / Language selection
- Vietnamese → Tiếng Việt / Vietnamese
- English → Tiếng Anh / English

## Testing

### Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| LanguageSelection | Change language updates i18n immediately | Render; select VI/EN; assert `i18n.changeLanguage` called and labels update (Coverage: `app/src/components/LanguageSelection.test.tsx`) | UI strings re-render in selected locale |
| LanguageSelection | Persists preference | Select language; unmount/remount; assert stored value read and applied (Coverage: `app/src/components/LanguageSelection.test.tsx`) | Stored value read and applied |

### Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| HomePage shell | Language choice affects all HomePage sections | Integration (RTL): change language and assert multiple labels update | Sidebar + Welcome + JoinRoom strings update consistently |

### E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Language selection | Persistence across reload | E2E (Playwright) — proposed; not yet implemented in repo | Reload keeps chosen language; no flicker back to default |

## Notes
- Prefer showing language names; optional small flag/icon is allowed.

## DSL Configuration
- `docs/features/HomePage/LanguageSelection/language_config.yaml` (component-level layout/storage defaults)
- `docs/config/i18n.yaml` (labels and localized strings)
