NOTE: AI must read docs/ai/README.md before modifying this file.

Version: 2026-02-04
Changelog:
- 2026-01-31: Fixed Mermaid diagram syntax to render reliably in Markdown preview.
- 2026-02-03: Standardized Testing section into Unit/Integration/E2E tables.
- 2026-02-04: Renamed Testing tables column to "Test Steps" and rewrote entries as ordered procedures.

# ThemeToggle Component Design

Purpose
- Switch between light and dark themes; persist preference.

Behaviour
- Toggle updates theme context and stores preference in LocalStorage
- Applies Material Design theme tokens for colors and elevation

Mermaid

```mermaid
flowchart LR
  U[User] -->|click| TT[ThemeToggle]
  TT -->|applyTheme| TM[ThemeManager.applyTheme]
  TM --> UI[UI re-render (new theme)]
```

DSL
- `theme_config.yaml` for default theme, available palettes

DSL
- `docs/theme/theme_palette.yaml` is the canonical palette file. `docs/theme/theme_config.yaml` may be used for feature-level presets that reference the canonical tokens. When generating CSS, map YAML keys to CSS vars using `--{token}` naming.

Label localization (VN/EN)
- Theme (label) → Chế độ giao diện / Theme
- Light mode → Sáng / Light
- Dark mode → Tối / Dark

## Testing

### Unit tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| ThemeToggle | Toggle updates theme immediately | Render; click toggle; assert theme manager called and UI reflects new theme (Coverage: `app/src/components/ThemeToggle.test.tsx`) | Theme applied; UI re-render occurs |
| ThemeToggle | Persists preference across remount | Toggle; unmount/remount; assert stored preference is read and applied (Coverage: `app/src/components/ThemeToggle.test.tsx`) | Stored preference is read and applied |

### Integration tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| HomePage + GameRoom shell | Theme affects multiple surfaces (sidebar + room UI) | Integration (RTL): toggle theme then render representative components | Consistent palette/tokens used across UI |

### E2E tests

| Component | Purpose / Context | Test Steps | Expected Result |
|----------|-------------------|------------|----------------|
| Theme persistence | Real reload persistence (no flicker) | E2E (Playwright) — proposed; not yet implemented in repo | Reload keeps theme; no flash to default theme |

Notes
- Use MUI theming system and CSS variables for tokens
