# run-checklist

Validates checklists by running through each item and reporting compliance status.

## Usage

```typescript
import { runChecklist } from './handler';

const result = runChecklist('path/to/checklist.json', 'markdown');
console.log('All passed:', result.passed);
result.results.forEach(r => {
  console.log(`${r.item.id}: ${r.status}`);
});
```

## Parameters

- `checklistPath`: Path to the checklist JSON file
- `outputFormat`: Output format ('json' or 'markdown', default: 'markdown')

## Output

Returns an object with:
- `passed`: Boolean indicating if all required items passed
- `results`: Array of validation results for each checklist item