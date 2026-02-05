# validate-coverage Skill

Validates that design docs have proper Coverage Checklists without ❌ items.

## Usage

```typescript
import { validateCoverage } from './handler';

const result = validateCoverage('docs/features/feature/design.md');
if (!result.valid) {
  console.log('Issues:', result.issues);
}
```

## Parameters

- `filePath`: Path to the design.md file

## Output

- `valid`: Boolean indicating if coverage is complete
- `issues`: Array of validation issues