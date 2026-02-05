# validate-projections Skill

Validates that game code only emits allowed room-level projections.

## Usage

```typescript
import { validateProjections } from './handler';

const result = validateProjections('src/games/castingShadows/logic.ts');
if (!result.valid) {
  console.log('Projection issues:', result.issues);
}
```

## Parameters

- `filePath`: Path to the game code file

## Output

- `valid`: Boolean indicating if projections are valid
- `issues`: Array of invalid projection issues