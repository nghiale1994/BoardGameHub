# validate-types Skill

Validates that public interfaces have explicit TypeScript types.

## Usage

```typescript
import { validateTypes } from './handler';

const result = validateTypes('src/utils/helpers.ts');
if (!result.valid) {
  console.log('Type issues:', result.issues);
}
```

## Parameters

- `filePath`: Path to the TypeScript file

## Output

- `valid`: Boolean indicating if types are valid
- `issues`: Array of type validation issues