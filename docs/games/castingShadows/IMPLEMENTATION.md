# Casting Shadows - Implementation Guide

**Version:** 2026-02-03

## Overview

This guide explains how to code **Casting Shadows** board game within the BoardGameHub architecture. Casting Shadows is a 2-4 player turn-based competitive strategy game where players collect resources, cast spells, and battle opponents.

For game rules and design decisions, see [design.md](./design.md).

---

## Part 1: Architecture & Core Concepts

### 1.1 Game Structure

Follow the **event-driven architecture** defined in `docs/foundation/architecture.md`:

```
Game Logic Layer (Events & Projections)
        ↓
   Networking Layer (PeerJS)
        ↓
  Presentation Layer (React Components)
```

### 1.2 Key Principles

From `docs/ai/rules_code_game/README.md`:

- **Game emits data, not UI** - Game logic produces events/projections; UI consumes them
- **Two projection channels:**
  - Room-level: chat, status, turn highlight, toasts
  - Game-level: board state, hand state, card details, animations
- **Host is authoritative** - Host validates events and broadcasts state to peers

---

## Part 2: Domain Events (Game Logic)

### 2.1 Event Namespace

All events must be namespaced as `castingShadows.<eventName>`:

```typescript
// Example: Domain Event
interface CastingShadowsGameStarted {
  type: 'castingShadows.gameStarted';
  schemaVersion: 1;
  data: {
    gameId: string;
    roomId: string;
    playerId: string;
    characterId: string; // 'frill' | 'kit' | 'nuzzle' | 'haze'
    players: PlayerInfo[];
    hexMap: HexTile[];
    timestamp: number;
  };
}
```

### 2.2 Core Event Types

Based on Casting Shadows rules, define these domain events:

#### A) Turn & Phase Events

```typescript
interface CastingShadowsTurnStarted {
  type: 'castingShadows.turnStarted';
  schemaVersion: 1;
  data: {
    turnNumber: number;
    playerId: string;
    resourceDice: ResourceDie[]; // Roll result
    currentPhase: 'phase1' | 'phase2' | 'phase3';
    timestamp: number;
  };
}

interface CastingShadowsPhaseChanged {
  type: 'castingShadows.phaseChanged';
  schemaVersion: 1;
  data: {
    fromPhase: 'phase1' | 'phase2' | 'phase3';
    toPhase: 'phase1' | 'phase2' | 'phase3';
    playerId: string;
    timestamp: number;
  };
}

interface CastingShadowsTurnEnded {
  type: 'castingShadows.turnEnded';
  schemaVersion: 1;
  data: {
    playerId: string;
    spentActionPoints: number;
    curseSpentPenalty: number; // HP damage
    timestamp: number;
  };
}
```

#### B) Action Events

```typescript
interface CastingShadowsActionPerformed {
  type: 'castingShadows.actionPerformed';
  schemaVersion: 1;
  data: {
    playerId: string;
    actionType: 'travel' | 'cast' | 'reroll' | 'protect' | 'refresh' | 'collect';
    actionDetails: {
      // Varies by actionType
      travel?: { targetHexId: string };
      cast?: { spellCardId: string; resourcesSpent: Resource[] };
      reroll?: { diceIndices: number[] };
      protect?: { curseRemoved: 1 };
      refresh?: { hexId: string; newCardId: string };
      collect?: { cardId: string; cardType: 'spell' | 'counterspell' | 'resource' };
    };
    resourcesRemaining: Resource[];
    actionPointsRemaining: number;
    timestamp: number;
  };
}
```

#### C) Combat Events

```typescript
interface CastingShadowsSpellCast {
  type: 'castingShadows.spellCast';
  schemaVersion: 1;
  data: {
    casterPlayerId: string;
    spellCardId: string;
    targetPlayerId?: string; // For single-target spells
    targetHexId?: string;    // For hex-targeting spells
    damageDealt: number;
    range: 'self' | 'adjacent' | 'range2' | 'range3' | 'all';
    timestamp: number;
  };
}

interface CastingShadowsDamageTaken {
  type: 'castingShadows.damageTaken';
  schemaVersion: 1;
  data: {
    targetPlayerId: string;
    damageAmount: number;
    source: 'spell' | 'cursed-crystal' | 'ability';
    sourceDetails: {
      casterPlayerId?: string;
      spellId?: string;
    };
    hpAfter: number;
    eliminated: boolean;
    timestamp: number;
  };
}
```

#### D) Resource & Card Events

```typescript
interface CastingShadowsResourceCollected {
  type: 'castingShadows.resourceCollected';
  schemaVersion: 1;
  data: {
    playerId: string;
    cardId: string;
    cardType: 'spell' | 'counterspell' | 'resource' | 'companion';
    hexId: string;
    spellBookSize: number;
    timestamp: number;
  };
}

interface CastingShadowsShadowEnergyAbsorbed {
  type: 'castingShadows.shadowEnergyAbsorbed';
  schemaVersion: 1;
  data: {
    playerId: string;
    shadowFragmentsAbsorbed: number;
    shadowEnergyTotal: number;
    maxShadowEnergy: number;
    timestamp: number;
  };
}

interface CastingShadowsTransformationOccurred {
  type: 'castingShadows.transformationOccurred';
  schemaVersion: 1;
  data: {
    playerId: string;
    fromForm: 'base' | 'shadow';
    toForm: 'base' | 'shadow';
    companionId?: string; // Only if transforming to Shadow
    shadowEnergyAfter: number;
    hpAfter: number;
    timestamp: number;
  };
}
```

#### E) Player & Game State Events

```typescript
interface CastingShadowsPlayerEliminated {
  type: 'castingShadows.playerEliminated';
  schemaVersion: 1;
  data: {
    eliminatedPlayerId: string;
    reason: 'hp-zero' | 'disconnected';
    timestamp: number;
  };
}

interface CastingShadowsGameEnded {
  type: 'castingShadows.gameEnded';
  schemaVersion: 1;
  data: {
    winnerId: string;
    reason: 'last-player-standing' | 'host-quit';
    finalScores: Record<string, { hp: number; shadowEnergy: number }>;
    timestamp: number;
  };
}
```

---

## Part 3: Projections (Game State for UI)

### 3.1 Game-Level Projections

These contain game-specific state that the UI renderer consumes:

```typescript
// Main game projection
interface CastingShadowsProjection {
  gameId: string;
  roomId: string;
  currentPlayerId: string;
  currentTurn: number;
  currentPhase: 'phase1' | 'phase2' | 'phase3';
  gameStatus: 'setup' | 'playing' | 'paused' | 'ended';
  
  // Map state
  hexMap: HexTileProjection[];
  
  // Player states
  players: PlayerProjection[];
  
  // Deck & discard state
  mainDeckRemaining: number;
  counterspellDeckRemaining: number;
  discardPile: Card[];
  companionPortal: CompanionCard[]; // Top 3 face-up
  
  // Resource tracking
  resourceTokensAvailable: number;
  
  // Game-specific UI hints
  turnOrder: string[];
  winner?: string;
  endReason?: string;
}

// Player projection (what others see)
interface PlayerProjection {
  playerId: string;
  characterId: string;
  characterName: string;
  currentForm: 'base' | 'shadow';
  hexId: string;
  hp: number;
  maxHp: number;
  shadowEnergy: number;
  maxShadowEnergy: number;
  
  // Public spell book
  spellBook: {
    spellCards: SpellCard[];
    resourceCards: ResourceCard[];
    companionCard?: CompanionCard;
    counterspellCount: number; // Players don't see contents
  };
  
  // Current resources (visible only to that player)
  resourcePool?: {
    gems: { red: number; blue: number; purple: number };
    orbs: { red: number; blue: number; purple: number };
    shadowFragments: number;
    curseCount: number;
  };
  
  actionPointsRemaining?: number;
  
  eliminated: boolean;
}

// Hex tile projection
interface HexTileProjection {
  hexId: string;
  hexType: 'home' | 'ancient-rune' | 'dusty-desert' | 'underground-volcano';
  resourceGranted?: ResourceType;
  currentCard: Card | null;
  playerMeeples: Array<{ playerId: string; characterId: string }>;
}
```

### 3.2 Room-Level Projections

Casting Shadows may emit these room-level projections (as defined in `docs/ai/rules_code_game/README.md`):

```typescript
interface RoomChatAppend {
  type: 'RoomChatAppend';
  data: {
    entry: ChatLogEntry; // Includes move log lines
  };
}

interface RoomTurnHighlight {
  type: 'RoomTurnHighlight';
  data: {
    currentPlayerId: string;
    playerName: string;
  };
}

interface RoomGameStatus {
  type: 'RoomGameStatus';
  data: {
    status: 'playing' | 'paused' | 'ended';
  };
}

interface RoomToast {
  type: 'RoomToast';
  data: {
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    duration: number;
  };
}
```

---

## Part 4: Adapter Pattern (Events → Projections)

### 4.1 Adapter Structure

```typescript
// File: src/games/castingShadows/adapter.ts

export function adaptCastingShadowsEvent(
  event: CastingShadowsEvent,
  currentProjection: CastingShadowsProjection
): {
  gameProjection: CastingShadowsProjection;
  roomProjections: RoomProjection[];
  moveLog?: string;
} {
  switch (event.type) {
    case 'castingShadows.gameStarted':
      return handleGameStarted(event, currentProjection);
    case 'castingShadows.turnStarted':
      return handleTurnStarted(event, currentProjection);
    case 'castingShadows.actionPerformed':
      return handleActionPerformed(event, currentProjection);
    case 'castingShadows.damageTaken':
      return handleDamageTaken(event, currentProjection);
    // ... etc
    default:
      return { gameProjection: currentProjection, roomProjections: [] };
  }
}

// Example adapter function
function handleTurnStarted(
  event: CastingShadowsTurnStarted,
  currentProjection: CastingShadowsProjection
): ReturnType<typeof adaptCastingShadowsEvent> {
  const updatedProjection: CastingShadowsProjection = {
    ...currentProjection,
    currentPlayerId: event.data.playerId,
    currentPhase: 'phase1',
    currentTurn: event.data.turnNumber,
  };

  const roomProjections: RoomProjection[] = [
    {
      type: 'RoomTurnHighlight',
      data: {
        currentPlayerId: event.data.playerId,
        playerName: currentProjection.players.find(p => p.playerId === event.data.playerId)?.characterName || 'Unknown',
      },
    },
    {
      type: 'RoomChatAppend',
      data: {
        entry: {
          id: `move-${event.data.turnNumber}`,
          speaker: 'system',
          message: `Turn ${event.data.turnNumber} started - ${event.data.playerId}'s turn`,
          timestamp: event.data.timestamp,
          type: 'move',
        },
      },
    },
  ];

  return {
    gameProjection: updatedProjection,
    roomProjections,
    moveLog: `Turn ${event.data.turnNumber}: ${event.data.playerId} rolled resources`,
  };
}
```

---

## Part 5: Game State Machine (Host Logic)

### 5.1 Host Validation & Event Emission

```typescript
// File: src/games/castingShadows/gameEngine.ts

export class CastingShadowsGameEngine {
  private projection: CastingShadowsProjection;
  private eventHistory: CastingShadowsEvent[] = [];

  constructor(initialProjection: CastingShadowsProjection) {
    this.projection = initialProjection;
  }

  /**
   * Validate & apply an action from a player
   * Host calls this; returns events or validation error
   */
  validateAndApplyAction(
    playerId: string,
    action: PlayerAction
  ): { success: boolean; events: CastingShadowsEvent[]; error?: string } {
    // Validate: Is it the player's turn?
    if (this.projection.currentPlayerId !== playerId) {
      return { success: false, events: [], error: 'Not your turn' };
    }

    // Validate: Are they in phase 2 (action phase)?
    if (this.projection.currentPhase !== 'phase2') {
      return { success: false, events: [], error: 'Invalid phase for action' };
    }

    // Find player
    const player = this.projection.players.find(p => p.playerId === playerId);
    if (!player || player.eliminated) {
      return { success: false, events: [], error: 'Player not found or eliminated' };
    }

    // Dispatch to action-specific validator
    switch (action.type) {
      case 'travel':
        return this.validateTravel(playerId, action);
      case 'cast':
        return this.validateCast(playerId, action);
      case 'collect':
        return this.validateCollect(playerId, action);
      // ... etc
      default:
        return { success: false, events: [], error: 'Unknown action' };
    }
  }

  private validateTravel(
    playerId: string,
    action: PlayerAction
  ): { success: boolean; events: CastingShadowsEvent[]; error?: string } {
    const player = this.projection.players.find(p => p.playerId === playerId)!;
    const currentHex = this.projection.hexMap.find(h => h.hexId === player.hexId)!;
    const targetHex = this.projection.hexMap.find(h => h.hexId === action.targetHexId);

    if (!targetHex) {
      return { success: false, events: [], error: 'Target hex not found' };
    }

    if (!this.isAdjacent(currentHex, targetHex)) {
      return { success: false, events: [], error: 'Target hex not adjacent' };
    }

    const event: CastingShadowsActionPerformed = {
      type: 'castingShadows.actionPerformed',
      schemaVersion: 1,
      data: {
        playerId,
        actionType: 'travel',
        actionDetails: { travel: { targetHexId: action.targetHexId } },
        resourcesRemaining: player.resourcePool?.orbs || [],
        actionPointsRemaining: (player.actionPointsRemaining || 0) - 1,
        timestamp: Date.now(),
      },
    };

    return { success: true, events: [event] };
  }

  // ... more validation methods

  /**
   * End turn: apply damage, reset resources
   */
  endPlayerTurn(playerId: string): CastingShadowsEvent[] {
    const events: CastingShadowsEvent[] = [];
    const player = this.projection.players.find(p => p.playerId === playerId)!;

    // Apply curse damage
    if (player.resourcePool && player.resourcePool.curseCount > 0) {
      const damageEvent: CastingShadowsDamageTaken = {
        type: 'castingShadows.damageTaken',
        schemaVersion: 1,
        data: {
          targetPlayerId: playerId,
          damageAmount: player.resourcePool.curseCount,
          source: 'cursed-crystal',
          sourceDetails: {},
          hpAfter: player.hp - player.resourcePool.curseCount,
          eliminated: player.hp - player.resourcePool.curseCount <= 0,
          timestamp: Date.now(),
        },
      };
      events.push(damageEvent);
    }

    // End turn event
    const turnEndEvent: CastingShadowsTurnEnded = {
      type: 'castingShadows.turnEnded',
      schemaVersion: 1,
      data: {
        playerId,
        spentActionPoints: 4 - (player.actionPointsRemaining || 0),
        curseSpentPenalty: player.resourcePool?.curseCount || 0,
        timestamp: Date.now(),
      },
    };
    events.push(turnEndEvent);

    // Next player's turn
    const nextPlayer = this.getNextPlayer(playerId);
    const nextTurnEvent: CastingShadowsTurnStarted = {
      type: 'castingShadows.turnStarted',
      schemaVersion: 1,
      data: {
        turnNumber: this.projection.currentTurn + 1,
        playerId: nextPlayer.playerId,
        resourceDice: this.rollResourceDice(), // Simulate dice roll
        currentPhase: 'phase1',
        timestamp: Date.now(),
      },
    };
    events.push(nextTurnEvent);

    return events;
  }

  private isAdjacent(hex1: HexTileProjection, hex2: HexTileProjection): boolean {
    // Implement hexagon adjacency logic
    // This is placeholder
    return true;
  }

  private getNextPlayer(currentPlayerId: string): PlayerProjection {
    const index = this.projection.players.findIndex(p => p.playerId === currentPlayerId);
    const nextIndex = (index + 1) % this.projection.players.length;
    return this.projection.players[nextIndex];
  }

  private rollResourceDice(): ResourceDie[] {
    // Return random resource dice faces
    return [];
  }
}
```

---

## Part 6: React Components (UI Layer)

### 6.1 Main Game Board Component

```typescript
// File: src/components/CastingShadowsBoard.tsx

import React, { useEffect, useState } from 'react';
import { CastingShadowsProjection } from '../games/castingShadows/types';

interface CastingShadowsBoardProps {
  projection: CastingShadowsProjection;
  currentPlayerId: string;
  onAction: (action: PlayerAction) => void;
}

export const CastingShadowsBoard: React.FC<CastingShadowsBoardProps> = ({
  projection,
  currentPlayerId,
  onAction,
}) => {
  const currentPlayer = projection.players.find(p => p.playerId === currentPlayerId);
  const isMyTurn = projection.currentPlayerId === currentPlayerId;

  return (
    <div className="casting-shadows-board">
      {/* Hex Map */}
      <div className="hex-map">
        {projection.hexMap.map(hex => (
          <HexTile
            key={hex.hexId}
            hex={hex}
            isClickable={isMyTurn && projection.currentPhase === 'phase2'}
            onClick={() => onAction({ type: 'travel', targetHexId: hex.hexId })}
          />
        ))}
      </div>

      {/* Player Boards */}
      <div className="player-boards">
        {projection.players.map(player => (
          <PlayerBoard
            key={player.playerId}
            player={player}
            isCurrentTurn={projection.currentPlayerId === player.playerId}
            isYou={player.playerId === currentPlayerId}
          />
        ))}
      </div>

      {/* Current Player's Action Panel */}
      {isMyTurn && (
        <ActionPanel
          phase={projection.currentPhase}
          actionPointsRemaining={currentPlayer?.actionPointsRemaining || 0}
          resourcePool={currentPlayer?.resourcePool}
          onCast={() => {}}
          onTravel={() => {}}
          onCollect={() => {}}
          onProtect={() => onAction({ type: 'protect' })}
          onEndTurn={() => onAction({ type: 'endTurn' })}
        />
      )}
    </div>
  );
};
```

---

## Part 7: Testing

### 7.1 Adapter Tests

```typescript
// File: src/games/castingShadows/adapter.test.ts

import { adaptCastingShadowsEvent } from './adapter';
import { CastingShadowsTurnStarted } from './types';

describe('CastingShadows Adapter', () => {
  it('should handle turnStarted event correctly', () => {
    const mockProjection = createMockProjection();
    const event: CastingShadowsTurnStarted = {
      type: 'castingShadows.turnStarted',
      schemaVersion: 1,
      data: {
        turnNumber: 1,
        playerId: 'player-1',
        resourceDice: [],
        currentPhase: 'phase1',
        timestamp: Date.now(),
      },
    };

    const { gameProjection, roomProjections } = adaptCastingShadowsEvent(event, mockProjection);

    expect(gameProjection.currentPlayerId).toBe('player-1');
    expect(gameProjection.currentPhase).toBe('phase1');
    expect(roomProjections).toHaveLength(2); // RoomTurnHighlight + RoomChatAppend
  });
});
```

---

## Part 8: Implementation Checklist

### Phase 1: Foundation
- [ ] Define all domain events in `src/games/castingShadows/types.ts`
- [ ] Define projection types
- [ ] Create TypeScript interfaces

### Phase 2: Game Logic
- [ ] Implement `CastingShadowsGameEngine` with action validation
- [ ] Implement adapter functions
- [ ] Write tests for game logic

### Phase 3: UI Components
- [ ] Implement `CastingShadowsBoard` component
- [ ] Implement sub-components (HexTile, PlayerBoard, ActionPanel)
- [ ] Add CSS styling

### Phase 4: Integration
- [ ] Connect game engine to hosting logic
- [ ] Add Casting Shadows to game list
- [ ] Wire up networking/PeerJS integration
- [ ] Test with 2-4 players

### Phase 5: Polish
- [ ] Animations & visual feedback
- [ ] Sound effects (optional)
- [ ] Tutorial/help system
- [ ] Performance optimization

---

## Part 9: Key Files To Create

```
src/games/castingShadows/
├── types.ts                 # All TypeScript interfaces
├── gameEngine.ts            # Game logic & validation
├── adapter.ts               # Event → Projection mapping
├── adapter.test.ts          # Adapter tests
├── gameEngine.test.ts       # Game engine tests
├── fixtures.ts              # Sample events for testing
└── index.ts                 # Exports

src/components/
├── CastingShadowsBoard.tsx        # Main board component
├── HexTile.tsx                    # Hex tile sub-component
├── PlayerBoard.tsx                # Player board display
├── ActionPanel.tsx                # Action buttons & resources
├── Card.tsx                       # Card display
└── ResourceDisplay.tsx            # Resource pool display

styles/
└── castingShadows.css             # Game-specific styles
```

---

## References

- **Game rules:** [casting_shadows_rules.md](../../foundation/casting_shadows_rules.md)
- **Game design:** [design.md](./design.md)
- **Architecture:** [docs/foundation/architecture.md](../../foundation/architecture.md)
- **Code rules:** [docs/ai/rules_code_game/README.md](../../ai/rules_code_game/README.md)
- **Foundation:** [docs/foundation/README.md](../../foundation/README.md)

---

## Notes

- Keep game logic **pure and testable** (no UI mutations)
- Host validates **all** player actions before broadcasting
- Use event names consistently: `castingShadows.<eventName>`
- Maintain `schemaVersion` for forward compatibility
- Test edge cases (eliminated players, full spell books, tie-breaking, etc.)
- Follow the event-driven pattern: emit events, adapt to projections, render UI from projections

Good luck implementing Casting Shadows! 🎲✨
