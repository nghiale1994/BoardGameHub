NOTE: AI must read docs/ai/README.md before modifying this file.

# HTML Mockup Collection - 2026-01-31

Changelog:
- 2026-01-31: Fixed outdated GameListGrid column note (5/3/1-2) and aligned JoinRoom/GameListGrid feature bullets to canonical HomePage design.
- 2026-01-31: Updated GameRoom mockup description to include move log messages rendered as plain text lines.

## Overview
Created comprehensive HTML mockups for all major UI components of BoardGame Hub. All mockups are **responsive** and **interactive**.

## Files Created/Updated

### Main Index
- **[MOCKUP_INDEX.html](./HomePage/MOCKUP_INDEX.html)** - Central hub linking all mockups with descriptions

### Component Mockups

#### 1. GameRoom
- **Location:** `docs/features/GameRoom/GAMEROOM_MOCKUP.html`
- **Features:**
  - Desktop layout (3-column: Participants | Board | Chat)
  - Tablet layout (Board + tabbed side panel)
  - Mobile layout (Full board + bottom sheet + floating chat)
  - Participants panel with Players & Spectators sections
  - Role toggle button ("Làm khán giả" / "Tham gia")
  - Color dots for players (no avatars)
  - Connection status indicators (🟢🔴🟡)
  - Turn indicator for current player
  - Chat with unread badge
  - Move log messages in chat (plain single-line text, no bubble)
  - Phase badge (Setup/Playing/Finished)
- **Interactive Elements:**
  - Switch between Desktop / Tablet / Mobile views
  - Bottom sheet slide-up animation (mobile)
  - Floating chat button with unread count
  - Tab switching (tablet participants/chat)

#### 2. GameListGrid
- **Location:** `docs/features/HomePage/GameList/GAMELIST_MOCKUP.html`
- **Features:**
  - Search input with debounce (300ms)
  - Filter button with active filter count
  - Active filter chips with individual ❌ buttons
  - "Clear all" button for removing all filters
  - Game grid (5/3/1-2 columns responsive)
  - Game cards with image, name, player count, playtime, complexity
  - Pagination (Previous / Page numbers / Next)
  - Filter panel (desktop side panel, tablet drawer, mobile bottom sheet)
  - Tier 1 filters: Player count (multi-select), Playtime (radio)
  - Tier 2 filters: Complexity (radio), Category (multi-select)
- **Interactive Elements:**
  - Click filter button to open/close panel
  - Select/deselect checkboxes and radio buttons
  - Click game card to simulate opening CreateRoomModal
  - "Apply Filters" button (mobile)

#### 3. JoinRoom
- **Location:** `docs/features/HomePage/JoinRoom/JOINROOM_MOCKUP.html`
- **Features:**
  - Spectator mode checkbox with description
  - Real-time URL validation + error message
  - Join button (disabled if URL invalid)
  - Invite URL auto-paste on `/i/:roomId`
- **Interactive Elements:**
  - Type URL and see real-time validation
  - Toggle spectator checkbox
  - Submit form (shows alert with player/spectator mode)

#### 4. HomePage
- **Location:** `docs/features/HomePage/HOMEPAGE_MOCKUP.html`
- **Features:**
  - Sidebar navigation
  - Welcome banner
  - Game selector
  - Game grid with pagination
  - CreateRoomModal (responsive)
  - RoomCreated confirmation modal
  - Full responsive design
- **Status:** Already existed, maintained

#### 5. Components Library
- **Location:** `docs/features/HomePage/COMPONENTS_MOCKUP.html`
- **Features:**
  - Sidebar component
  - Modal dialogs
  - Form inputs
  - Buttons with various states
  - Toast notifications
  - Loading states
- **Status:** Already existed, maintained

#### 6. Theme Palette
- **Location:** `docs/features/HomePage/palette_preview.html`
- **Features:**
  - Bright palette preview
  - Dark palette preview
  - Color contrast reference
  - Token documentation
- **Status:** Already existed, maintained

## Design System Implementation

### Colors
- **Primary:** #ff3b81 (Vivid Pink)
- **Secondary:** #ffd200 (Bright Yellow)
- **Accent:** #00d1ff (Cyan)
- **Accent 2:** #8b5cf6 (Purple)
- **Success:** #10b981 (Green)
- **Error:** #ef4444 (Red)

### Responsive Breakpoints
- **Desktop:** >1024px
- **Tablet:** 768-1024px
- **Mobile:** <768px

### Animations
- Smooth transitions (0.2-0.3s)
- Slide-in effects for filter chips
- Elevation changes on hover
- Bottom sheet slide-up animation

## How to Use

1. **Open Main Index:**
  - Navigate to `docs/features/HomePage/MOCKUP_INDEX.html`
   - Click on any component card to view its mockup

2. **Interactive Features:**
   - All mockups are fully interactive
   - Test search, filters, validation, modals, etc.
   - Switch device views to test responsiveness

3. **Design References:**
   - Use mockups as HTML/CSS reference for implementation
   - Copy color tokens and spacing values
   - Reference animation timings and responsive breakpoints

## Key Design Decisions

### GameRoom
✅ Spectators supported in dedicated section  
✅ Chat hidden behind floating button on mobile  
✅ Color dots only (no avatars)  
✅ Bottom sheet pattern for mobile participants  
✅ Role toggle button (disabled after game starts)  
✅ Icon-only buttons on mobile header  

### GameListGrid
✅ Search + filters in homepage (not in GameRoom)  
✅ Option B UI: filter button + collapsible panel  
✅ Tier 1+2 filters only  
✅ Active filter chips with individual remove  
✅ 5/3/1-2 column responsive grid  
✅ No "Create Room" button (click game card instead)  

### JoinRoom
✅ Spectator checkbox (default unchecked)  
✅ URL auto-paste from invite links  
✅ Real-time validation  
✅ Copy button for URL  
✅ Demo scenarios for testing  

## Accessibility Features
- All inputs have proper labels
- Error/success messages with text + color
- Keyboard accessible form controls
- Color + icon indicators (not color alone)
- Sufficient contrast ratios
- Responsive text sizing (clamp)

## Future Enhancements
- Dark mode toggle in mockups
- Accessibility audit
- Performance metrics
- Browser compatibility testing
- Mobile gesture demonstrations

---

**Last Updated:** 2026-01-31  
**Status:** Complete and ready for developer review
