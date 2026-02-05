# Casting Shadows - Game Documentation

**Version:** 2026-02-03

## Overview

This folder contains all documentation and implementation guides for the **Casting Shadows** board game.

---

## File Structure

| File | Purpose |
|------|---------|
| **design.md** | Game design document with mechanics, components, and rules |
| **IMPLEMENTATION.md** | Step-by-step implementation guide with code examples |
| **README.md** | This file - navigation and overview |

---

## Quick Start

### For Understanding the Game
Start with [design.md](./design.md) to understand:
- Game overview and victory conditions
- All game components (map, characters, resources, decks)
- Mechanics (actions, spells, combat, shadow forms)
- Game flow and phases

### For Coding the Game
Follow [IMPLEMENTATION.md](./IMPLEMENTATION.md) for:
1. Architecture & core concepts
2. Domain event definitions (Part 2)
3. Projection types (Part 3)
4. Adapter pattern implementation (Part 4)
5. Game state machine / host logic (Part 5)
6. React components (Part 6)
7. Testing patterns (Part 7)
8. Implementation checklist (Part 8)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         React Components (UI Layer)             │
│  - CastingShadowsBoard, HexTile, PlayerBoard    │
└──────────────────┬──────────────────────────────┘
                   │ consumes
                   ↓
┌─────────────────────────────────────────────────┐
│     Projections (Game State for UI)             │
│  - CastingShadowsProjection, PlayerProjection   │
└──────────────────┬──────────────────────────────┘
                   │ adapted from
                   ↓
┌─────────────────────────────────────────────────┐
│      Domain Events (Host validates/emits)       │
│  - gameStarted, turnStarted, actionPerformed    │
│  - spellCast, damageTaken, playerEliminated     │
└──────────────────┬──────────────────────────────┘
                   │ broadcast via
                   ↓
         ┌─────────────────┐
         │   PeerJS/WebRTC │
         │   Networking    │
         └─────────────────┘
```

### Key Principles

1. **Host is authoritative** - Validates all player actions
2. **Events are immutable** - Recorded for replay/audit
3. **Projections are derived** - Computed from events via adapter
4. **UI is stateless** - Renders from projections only
5. **Two channels:**
   - Room-level: chat, status, turn highlight, toasts
   - Game-level: board state, hand state, card effects

---

## Game Flow

```
Setup Phase
  ├─ Players join room
  ├─ Select character (Frill, Kit, Nuzzle, or Haze)
  └─ Host begins game → gameStarted event

Main Game Loop (per turn)
  ├─ Phase 1: Roll 5 Resource Dice
  │   └─ Add resource bonus if on special Hex
  ├─ Phase 2: Spend 4 Action Points on:
  │   ├─ Travel (move to adjacent Hex)
  │   ├─ Cast (use Spell with Resources)
  │   ├─ Reroll (re-roll dice)
  │   ├─ Protect (remove 1 Cursed Crystal)
  │   ├─ Refresh (swap card at Hex)
  │   └─ Collect (add card to Spell Book)
  └─ Phase 3: End Turn
      ├─ Optionally absorb Shadow Fragments → Shadow Energy
      ├─ Transform to Shadow Form if charged (3+ Shadow Energy)
      │   └─ Summon 1 Companion
      ├─ Take damage from remaining Cursed Crystals
      └─ Next player's turn

Victory Condition
  └─ Last player with HP > 0 wins
```

---

## Event Types

| Category | Events |
|----------|--------|
| **Turn & Phase** | `turnStarted`, `phaseChanged`, `turnEnded` |
| **Actions** | `actionPerformed` (travel, cast, reroll, protect, refresh, collect) |
| **Combat** | `spellCast`, `damageTaken` |
| **Cards** | `resourceCollected`, `shadowEnergyAbsorbed` |
| **Form** | `transformationOccurred` |
| **Game State** | `playerEliminated`, `gameEnded` |

All events are namespaced: `castingShadows.<eventName>` with `schemaVersion: 1`.

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Define TypeScript types for all events and projections
- [ ] Set up file structure
- [ ] Create mock data fixtures

### Phase 2: Game Logic (Week 1-2)
- [ ] Implement `CastingShadowsGameEngine` with validation
- [ ] Implement event handlers and state transitions
- [ ] Write comprehensive tests

### Phase 3: UI Components (Week 2)
- [ ] Implement React components for board, players, actions
- [ ] Add CSS styling
- [ ] Integrate with game engine

### Phase 4: Integration (Week 2-3)
- [ ] Connect to hosting logic
- [ ] Add Casting Shadows to game list
- [ ] Test networking and multiplayer

### Phase 5: Polish (Week 3+)
- [ ] Animations and visual feedback
- [ ] Sound effects
- [ ] Tutorial system
- [ ] Performance optimization

---

## Testing Strategy

### Unit Tests
- **Adapter tests**: Event → Projection mapping
- **Game engine tests**: Action validation, state transitions
- **Component tests**: UI rendering and interactions

### Integration Tests
- **Multiplayer flow**: 2-4 players taking turns
- **Combat scenarios**: Spells, damage, elimination
- **Resource management**: Collecting cards, spending resources
- **Transformation**: Shadow form mechanics

### Edge Cases
- Player eliminated mid-game
- Full spell book (max 5 cards)
- No valid actions remaining
- Counterspell conflicts
- Network disconnection recovery

---

## Definitions & Terminology

| Term | Definition |
|------|-----------|
| **Hex Tile** | Hexagonal map space where players move |
| **Meeple** | Player token/marker on the map |
| **Spell Book** | Player's hand of collected cards (max 5 + Companion) |
| **Resource Pool** | Current turn's available Resources from dice |
| **Shadow Energy** | Meter that triggers transformation to Shadow Form |
| **Companion** | Unique card summoned on transformation (permanent) |
| **Counterspell** | Secret card that responds to specific triggers |
| **Spell Card** | Attack or Conversion card with effects |
| **Resource Card** | Card that adds Resources to pool |
| **Action Point (AP)** | Currency to perform actions (4 per turn) |

---

## Related Documentation

- **Full rules**: [docs/foundation/casting_shadows_rules.md](../../foundation/casting_shadows_rules.md)
- **Architecture**: [docs/foundation/architecture.md](../../foundation/architecture.md)
- **AI rules**: [docs/ai/rules_code_game/README.md](../../ai/rules_code_game/README.md)
- **Foundation**: [docs/foundation/README.md](../../foundation/README.md)

---

## Support & Questions

For questions about:
- **Game rules**: See [design.md](./design.md)
- **Implementation details**: See [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **Broader architecture**: See [docs/foundation](../../foundation/)
- **AI governance**: See [docs/ai](../../ai/)
