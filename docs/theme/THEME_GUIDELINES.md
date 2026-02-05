# NOTE: AI must read docs/ai/README.md before modifying this file.

# Theme Guidelines — Bright & Multicolor for Game Hub

Purpose: provide a concise, enforceable set of rules for themes and color usage across the BoardGame Hub UI so that designs remain playful, accessible, and consistent.

Guidelines:

- Tone: Bright, playful, high-saturation colors. Theme should convey energy and fun appropriate for a game hub.
- Palette composition:
  - Primary: one vivid, high-contrast color used for primary CTAs and brand accents (e.g., magenta, bright pink, or vivid red).
  - Secondary: one bright complementary color for secondary actions (e.g., yellow or orange).
  - Accents: 1-2 accent colors (cyan, purple) used for highlights, micro-interactions, and badges.
  - Neutral surfaces: white or off-white surfaces for cards with soft colored surface variants for subtle variety (avoid solid dark neutrals on main surfaces except in dark mode).
  - Thumbnails: game thumbnails should rotate among a curated bright palette to give a playful mosaic effect.

- Accessibility:
  - Ensure minimum contrast ratio of 3:1 for UI components like chips, small text on colored backgrounds, and icons.
  - For primary CTAs use contrast >= 4.5:1 where possible.
  - Provide a dark mode with adjusted contrasts and preserve the colorful accents (saturated accents on darker surfaces).

- Usage rules:
  - Do not use more than 4 saturated accent colors on a single screen to avoid visual noise.
  - Use color only to signal meaning for at most 2 semantic categories (e.g., success/warning), avoid encoding multiple meanings with color alone.
  - Animations and hover states should use accent color fades and subtle elevation changes, not abrupt color swaps.

- Tokens and variables:
  - All colors must be defined as CSS variables. Global tokens live in `docs/theme/theme_palette.yaml` and feature-level overrides live in `docs/features/<Feature>/theme.yaml`.
  - Example token names: `--color-primary`, `--color-secondary`, `--color-accent`, `--surface-strong`, `--surface-muted`.

- Theming workflow rules (integration with AI & docs):
- Any change to theme tokens must trigger the Design Update Rules in `docs/ai/README.md` (conflict detection and synchronized updates).
  - When proposing a new palette, the AI must create a small preview HTML or SVG in `docs/features/<Feature>/` demonstrating the palette applied to the component set.

- Example bright palette (reference):
  - Primary: #FF3B81
  - Secondary: #FFD200
  - Accent: #00D1FF
  - Accent-2: #8B5CF6
  - Surface: #FFFFFF

Notes:
- These guidelines aim to balance playfulness and usability. If a component's visual density becomes cluttered, reduce the number of saturated accents or add neutral breathing space.
