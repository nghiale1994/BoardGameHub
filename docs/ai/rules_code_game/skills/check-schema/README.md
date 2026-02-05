# check-schema Skill

Validates domain event schemas for required fields and namespacing.

## Usage

```typescript
import { checkSchema } from './handler';

const result = checkSchema('src/games/castingShadows/events.ts');
if (!result.valid) {
  console.log('Schema issues:', result.issues);
}
```

## Parameters

- `filePath`: Path to the game code file

## Output

- `valid`: Boolean indicating if schema is valid
- `issues`: Array of schema validation issues