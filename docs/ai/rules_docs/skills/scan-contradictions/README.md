# scan-contradictions Skill

Scans for contradictions between a modified file and related documents.

## Usage

```typescript
import { scanContradictions } from './handler';

const result = scanContradictions('docs/features/feature/design.md', ['docs/components/comp.md']);
console.log(result.contradictions);
```

## Parameters

- `filePath`: Path to the file being modified
- `relatedFiles`: Array of related file paths to scan

## Output

- `contradictions`: Array of contradiction reports