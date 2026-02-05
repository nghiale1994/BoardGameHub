# check-preface Skill

Validates that design/mockup/DSL files start with the required preface.

## Usage

```typescript
import { checkPreface } from './handler';

const result = checkPreface(['docs/features/some/design.md']);
console.log(result.missing); // List of files without preface
```

## Parameters

- `filePaths`: Array of file paths to check

## Output

- `missing`: Array of file paths that are missing the preface