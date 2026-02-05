# BoardGame Hub - Frontend

Fully P2P board game platform. No backend, no login, just share a URL and play.

NOTE: This project is for learning/research purposes only and is not intended for production use.

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
cd app
npm install
```

### Development
```bash
npm run dev
```
Open http://localhost:5173

### Build
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Architecture

### Tech Stack
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **UI:** Material-UI (Material Design 3)
- **i18n:** i18next (Tiếng Việt + English)
- **Storage:** LocalStorage + BroadcastChannel (cross-tab sync)
- **Networking:** PeerJS (WebRTC)
- **Testing:** Vitest

### Key Features
- ✅ Responsive design (mobile-first, full-width on desktop)
- ✅ Light/dark theme toggle with CSS variables
- ✅ Vietnamese + English i18n
- ✅ Room creation with game selection
- ✅ Share URL for room invitation
- ✅ Recent games persistence
- ✅ Cross-tab synchronization
- ✅ P2P networking (host migration, state sync)

### Folder Structure
```
app/
├── public/
├── src/
│   ├── components/        # React components
│   │   ├── Sidebar.tsx
│   │   ├── WelcomeSection.tsx
│   │   ├── CreateRoomModal.tsx
│   │   ├── RoomCreatedModal.tsx
│   │   ├── GameListGrid.tsx
│   │   ├── JoinRoom.tsx
│   │   └── ...
│   ├── data/              # Static data
│   │   └── games.ts
│   ├── hooks/             # Custom hooks
│   │   ├── useLocalStorage.ts
│   │   ├── useCrossTabSync.ts
│   │   └── useRoomContext.ts
│   ├── services/          # Business logic
│   │   ├── roomHelpers.ts
│   │   └── ...
│   ├── theme/             # MUI theme
│   │   └── theme.ts
│   ├── utils/             # Utilities
│   │   ├── storage.ts
│   │   └── types.ts
│   ├── i18n/              # Translations
│   │   ├── index.ts
│   │   └── resources.ts
│   ├── index.css          # Global styles
│   ├── App.tsx            # App root
│   └── main.tsx           # Entry point
├── index.html
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

### Component Hierarchy
```
App
├── Sidebar (hamburger menu)
│   ├── LanguageToggle
│   └── ThemeToggle
├── MainContent
│   ├── WelcomeSection
│   ├── CreateRoomSection + JoinRoom
│   ├── GameListGrid
│   └── RecentGames
├── CreateRoomModal
└── RoomCreatedModal
```

## Room Lifecycle

1. **Create Room**
   - User selects game + max players
   - Room ID generated (uppercase alphanumeric)
   - Creator becomes host
   - Share URL generated: `/r/{roomId}`
   - Recent rooms saved to LocalStorage

2. **Join Room**
   - User pastes share URL
   - Room ID extracted
   - Peer joins room via P2P (TODO)
   - State synced from host

3. **Host Election**
   - If host disconnects, peers elect new host
   - Deterministic: lowest peerId or creator priority
   - New host broadcasts reconciled state

## Persistence

### LocalStorage (Prefixed: `boardgamehub.`)
- `peerId` - Unique peer identifier
- `displayName` - Player's display name
- `theme` - Light/dark mode
- `recentRooms` - Array of recent room history
- `currentRoomId` - Currently active room
- `roomMetadata` - Room player list + host info
- `roomSnapshot` - Game state + version

### Cross-Tab Sync
- BroadcastChannel broadcasts storage changes to other tabs
- All tabs stay in sync for displayName, theme, recent rooms

## P2P Architecture

- **Signaling:** Hosted PeerJS signaling server (configured via `VITE_PEERJS_*` env vars)
- **Data Channels:** WebRTC for peer-to-peer events
- **Host Authority:** Host validates events, broadcasts state
- **Event Format:**
  ```json
  {
    "type": "move",
    "payload": { ... },
    "senderId": "peer_xxx",
    "timestamp": 1234567890,
    "roomId": "ABC123"
  }
  ```
- **State Broadcasting:** Host broadcasts RoomSnapshot after each event
- **Reconnection:** If host is lost, remaining peers race-to-claim `roomId` and perform state transfer

## i18n Structure

All user-facing text stored in `src/i18n/resources.ts`:
- `homepage` - Welcome, greeting
- `welcome_section` - Name input
- `create_room` - Game selector, create button
- `join_room` - URL paste, join button
- `game_list` - Grid pagination
- `sidebar` - Menu items
- `language_toggle` - Language selector
- `theme_toggle` - Theme selector
- `errors` - Error messages

Language detection order:
1. LocalStorage preference
2. Browser locale (navigator.language)
3. Fallback: Vietnamese

## Design Constraints (canonical)

- ✅ Responsive sizing: %, vw, vh, clamp() - NO fixed pixels
- ✅ i18n mandatory: All user-facing text in i18n.yaml
- ✅ Material Design 3: MUI components, color tokens via CSS vars
- ✅ Light/dark mode: Supported via theme toggle
- ✅ P2P only: No backend, no authentication
- ✅ displayName persistence: Saved to LocalStorage
- ✅ Multi-tab support: BroadcastChannel sync

Canonical constraints live in `docs/foundation/constraints.md`.

## Development Notes

### Styling Approach
- CSS custom properties (variables) from `theme/theme_palette.yaml`
- Material-UI sx prop for responsive layouts
- Tailwind CSS utilities via PostCSS
- No fixed pixel values for layout (only clamp/min/max)

### Adding New Features
1. **Add i18n labels:** Update `src/i18n/resources.ts` + `docs/config/i18n.yaml`
2. **Create component:** Add .tsx file + label localization section in design docs
3. **Add hook:** Put in `src/hooks/`, export from hooks index if needed
4. **Add service:** Put in `src/services/`, include unit tests

### Debugging
- Open DevTools → Storage tab to inspect localStorage
- Network tab shows WebRTC connections (when P2P is enabled)
- Console logs include room state transitions

## Next Steps

1. **Game State Management**
   - Define game-specific state schema
   - Implement host reducer + event validation
   - Broadcast state after each event

3. **Room View**
   - Create GameRoom component
   - Render game board based on game type
   - Send/receive peer events

4. **Error Handling & Reconnection**
   - Network error detection
   - Automatic reconnection with backoff
   - Sync state when reconnected

5. **Testing & Deployment**
   - Unit tests for room helpers + hooks
   - E2E tests for room creation/join
   - Deploy to Vercel or similar

## License

MIT
