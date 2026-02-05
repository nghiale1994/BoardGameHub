# check-conventions Skill

Checks TypeScript/React conventions in hub code files.

## Usage

```typescript
import { checkConventions } from './handler';

const result = checkConventions(['src/components/Component.tsx']);
console.log(result.violations);
```

## Parameters

- `filePaths`: Array of TypeScript file paths

## Output

- `violations`: Array of convention violations found