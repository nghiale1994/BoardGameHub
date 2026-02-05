# NOTE: AI must read docs/ai/README.md before modifying this file.
# i18n Keys Reference

This file lists canonical i18n keys to use in code generation and components. Use these exact keys with `i18n.t('...')`.

- `homepage.welcome`:
  - `homepage.welcome` - welcome title
  - `homepage.welcome_back` - welcome back with name
  - `homepage.enter_name` - prompt to enter name
  - `homepage.name_placeholder` - placeholder for name input

- `create_room`:
  - `create_room.title`
  - `create_room.select_game`
  - `create_room.search_games`
  - `create_room.create_button`

- `join_room`:
  - `join_room.title`
  - `join_room.paste_url`
  - `join_room.join_button`

- `recent_games`:
  - `recent_games.title`
  - `recent_games.resume`

- `settings`:
  - `settings.title`
  - `settings.language`
  - `settings.theme`
  - `settings.dark`
  - `settings.light`

- `nav`:
  - `nav.settings`
  - `nav.help`
  - `nav.about`

- `errors`:
  - `errors.connection_failed`
  - `errors.invalid_url`
  - `errors.game_not_found`

Notes:
- The AI/code generator should read `docs/config/i18n.yaml` as source-of-truth and map keys to runtime JSON bundles.
- Runtime use (React example): `const { t } = useTranslation(); t('homepage.welcome')`
