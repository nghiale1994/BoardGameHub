# Casting Shadows - Game Design Document

**Version:** 2026-02-03

## Overview

**Casting Shadows** is a 2-4 player turn-based competitive strategy game where players collect resources, cast powerful spells, and battle opponents in a dark, enchanting world. The last player standing wins.

**Source:** Based on [Unstable Games](https://unstablegames.com) card game

---

## Core Gameplay Loop

### Turn Structure (3 Phases)

```
Phase 1: Roll resources (5 Resource Dice)
    ↓
Phase 2: Perform 4 Actions (Travel, Cast, Reroll, Protect, Refresh, Collect)
    ↓
Phase 3: Absorb Shadow Energy + Take curse damage + End turn
```

### Victory Condition

Last player with HP > 0 wins the game.

---

## Game Components

### 1. Map (Hex Tiles)

- **7 Hex Tiles** total:
  - 1 Ancient Rune (center)
  - 1 Dusty Desert
  - 1 Underground Volcano
  - 4 Home Hex tiles (one per player)

- **Hex Resources** (some grant bonuses):
  - Ancient Rune: No resource bonus
  - Dusty Desert: Counterspell only
  - Underground Volcano: No resource bonus
  - Home Hex: Varies by character

### 2. Characters (4 Choices)

| Character | Home Hex | Base Form Ability | Shadow Form Ability | Starting HP |
|-----------|----------|-------------------|-------------------|-------------|
| Frill (Regenerator) | Frill Lilypad | Heal | Extended heal | 18 |
| Kit (Turbulent) | Kit Gale | Wind attack | Stronger wind | 18 |
| Nuzzle (Savage) | Nuzzle Thornwood | Melee | Area damage | 18 |
| Haze (Devastator) | Haze Greentongue | Spellcasting | Enhanced spells | 18 |

### 3. Resources (4 Types)

```
Gems:
  🔴 Red Gem
  🔵 Blue Gem
  🟣 Purple Gem (counts as Red OR Blue)

Orbs:
  🔴 Red Orb
  🔵 Blue Orb
  🟣 Purple Orb (counts as Red OR Blue)

Special:
  ✨ Shadow Fragment (convert to Shadow Energy or spend on spells)
  ⚡ Cursed Crystal (1 Cursed = 1 damage at end of turn)
```

### 4. Decks

| Deck | Cards | Location | Notes |
|------|-------|----------|-------|
| Main | 52 | Face up next to each Hex (except Dusty Desert) | Spell, Counterspell, Resource cards |
| Counterspell | 10 | Next to Dusty Desert | Must be collected from Dusty Desert |
| Companion | 10 | Top 3 face up in Portal | Summoned when player transforms to Shadow Form |

### 5. Spell Book (Player's Hand)

- **Max 5 cards** (excluding Companion)
- Contains: Spell cards, Resource cards, Counterspell cards
- If full, must discard before collecting new

---

## Mechanics

### A. Resources & Resource Pool

**At turn start:**
1. Roll 5 Resource Dice
2. If on a resource-granting Hex, add that resource token

**Resource types by die:**
- 2 Red dice (Red Gems/Orbs)
- 2 Blue dice (Blue Gems/Orbs)
- 1 Purple die (Purple Gems/Orbs, count as any color)

**At turn end:**
- All unspent resources removed
- Cursed Crystals deal damage
- Remaining Shadow Fragments → Shadow Energy (optional)

### B. Actions (Phase 2, 4 Action Points)

| Action | Cost | Effect |
|--------|------|--------|
| **Travel** | 1 AP | Move to adjacent Hex |
| **Cast** | 1 AP + Resources | Use Spell card effect |
| **Reroll** | 1 AP | Reroll any dice (except Cursed) |
| **Protect** | 1 AP | Remove 1 Cursed Crystal (no damage) |
| **Refresh** | 1 AP | Swap card at Hex with Main deck top |
| **Collect** | 1 AP + Resources | Move card to Spell Book |

### C. Spell System

#### Attack Spells
- Deal damage to enemies
- Target types: Single enemy, Hex tile (all on that hex), or ranged variants
- Damage scales with resources spent
- Example: "Spend up to 3 Red Gems: deal 3/5/6 DMG"

#### Conversion Spells
- Transform resources into other resources
- Add resources to pool
- Used during Phase 2 (costs 1 AP + resources)

#### Resource Cards
- Add specific resource tokens to pool
- No AP cost to use
- Must be used by end of turn or lost

### D. Collection System

**To collect a card:**
1. Be on the Hex where card is located
2. Spend 1 AP + required Resources
3. Move card to Spell Book

**Collection costs:**
- Spell/Resource cards: varies by card
- Counterspell cards: 1 AP + 1 Gem (any color) + 1 Orb (any color)
- Some Spell cards require sacrificing lower-level Spell from Spell Book

### E. Shadow Form & Companion System

**Requirements to transform:**
- In Base Form
- Absorbed ≥ 3 Shadow Energy
- Spend 3 Shadow Energy during Phase 3

**Upon transformation:**
1. Flip Player Board to Shadow Form side
2. Shadow Tracker resets to 0
3. HP stays the same
4. **Summon 1 Companion** from Companion Portal (face-up)
5. Companion card takes 1 Spell Book slot (permanent for rest of game)

**Companion effects:**
- Unique per card
- Continuously active (even on opponents' turns)
- Cannot be removed

**Shadow Form abilities:**
- Each character has unique ability (costs Shadow Energy, no AP)
- Use multiple times if recharged

### F. Combat System

**Range types:**
1. Self (current Hex only)
2. Adjacent (current + adjacent Hex)
3. Adjacent only (not current)
4. Range 2 (current + up to 2 away)
5. Range 2+ (up to 2 away, not current)

**Damage resolution:**
- Attacker deals damage
- Target loses HP
- If HP ≤ 0: eliminated immediately
- Eliminated player's Spell Book → discard pile

### G. Counterspell System

**Hidden mechanic:**
- Keep Counterspells face down
- Each has a trigger (e.g., "when opponent casts spell")
- Only 1 Counterspell per trigger per turn
- If multiple players respond: resolve in turn order (next player after active player goes first)
- After use: card goes to bottom of Counterspell deck

---

## Phases In Detail

### Phase 1: Resource Acquisition

```
1. Roll 5 Resource Dice
2. Check current Hex for resource bonus
3. Add that resource token (if any)
4. Resources now available to spend this turn
```

### Phase 2: Actions

```
for i = 0 to 4 do
  if (Action Points remaining > 0) then
    choose: Travel | Cast | Reroll | Protect | Refresh | Collect
    deduct 1 AP + any resource costs
  else
    break
end

Current player can skip, but doesn't regain AP
```

### Phase 3: End Turn

```
1. Optionally absorb Shadow Fragments → Shadow Energy
   (each fragment = +1 Shadow Energy)
   
2. If (Shadow Energy >= max for current form) STOP absorbing
   
3. If (Base Form && Shadow Energy >= 3) then
   Option: Transform to Shadow Form
   - Spend 3 Shadow Energy
   - Flip board
   - Summon Companion
   
4. Take damage = # of Cursed Crystals in pool
   
5. Remove all unspent resources from pool
   
6. Next player's turn starts (Phase 1)
```

---

## Game States

| State | Players Can | Host Action |
|-------|-------------|------------|
| **Setup** | Join room | Waiting for players |
| **Playing** | Take actions (if their turn) | Validate actions, broadcast events |
| **Paused** | View board | (Optional) |
| **Ended** | View final board | Determine winner |

---

## Win Conditions

1. **Last Player Standing** - Only 1 player with HP > 0
2. (Optional) **Host Quit** - If host quits before game starts, room closes; if mid-game, takeover claim occurs

---

## Design Decisions

### Coverage Checklist

- ✅ 2-4 player support (4 characters defined)
- ✅ Turn structure clearly defined
- ✅ All action types specified
- ✅ Resource system complete
- ✅ Spell/Combat mechanics clear
- ✅ Shadow Form transformation logic detailed
- ✅ Companion system defined
- ✅ Counterspell mechanics defined
- ✅ Win condition clear
- ✅ Elimination rules clear

### Known Constraints

- **Frontend-only** - No server backend
- **Host authoritative** - Host validates all actions
- **PeerJS** - WebRTC for networking
- **IndexedDB** - Browser persistence
- **Turn-based** - No simultaneous actions

---

## Testing Scenarios

1. **Basic turn flow** - Roll dice, take 4 actions, end turn
2. **Combat** - Cast attack spell, deal damage, check elimination
3. **Spell collection** - Walk to Hex, collect Spell, use later
4. **Resource management** - Manage limited Resources to cast multiple Spells
5. **Transformation** - Absorb 3 Shadow Energy, transform, summon Companion
6. **Counterspell** - Receive Counterspell trigger, respond correctly
7. **Multi-player** - 3-4 players, verify turn order
8. **Elimination** - Player reaches 0 HP, removed from game
9. **Winner** - Last player standing declared winner

---

## Future Expansions

- Additional Spell cards with new mechanics
- New Companion cards with unique effects
- Player achievements/leaderboard
- Solo mode variants
- Spectator mode

---

## References

- Full rules: [casting_shadows_rules.md](../foundation/casting_shadows_rules.md)
- Architecture: [docs/foundation/architecture.md](../../foundation/architecture.md)
- Implementation guide: [IMPLEMENTATION.md](./IMPLEMENTATION.md)
