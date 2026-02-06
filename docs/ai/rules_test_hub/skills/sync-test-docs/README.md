# sync-test-docs Skill

Automatically scans test files and verifies/updates corresponding design documentation to prevent test coverage drift.

## Purpose

This skill ensures that design docs' Testing tables stay synchronized with actual test implementations. It prevents the common issue where tests are added/removed but documentation isn't updated accordingly.

## Usage

### Basic Usage (Dry Run)

```typescript
import { syncTestDocs } from './handler';

const report = await syncTestDocs({
  dryRun: true  // Just report, don't modify docs
});

console.log(report);
```

### Auto-Fix Mode

```typescript
const report = await syncTestDocs({
  dryRun: false,
  autoFix: true  // Automatically update docs
});
```

### Specific Test Files

```typescript
const report = await syncTestDocs({
  testFiles: ['app/e2e/homepage.spec.ts'],
  dryRun: true
});
```

## Parameters

- `testFiles?: string[]` - Specific test files to scan. If empty, auto-discovers all test files.
- `dryRun?: boolean` - If true, only reports drift without modifying docs. Default: true.
- `autoFix?: boolean` - If true, automatically updates docs to fix drift. Default: false.

## Output

Returns a `SyncReport` object:

```typescript
interface SyncReport {
  totalTests: number;        // Total tests found
  syncedTests: number;       // Tests that match docs
  driftedTests: number;      // Tests with drift
  driftDetails: Array<{      // Detailed drift info
    designDoc: string;
    missingInDoc: string[];  // Tests in code but not in docs
    extraInDoc: string[];    // Tests in docs but not in code
  }>;
  updatedDocs: string[];     // Docs that were updated (if autoFix enabled)
}
```

## How It Works

1. **Discover Test Files**: Scans for `.spec.ts`, `.test.ts`, `.test.tsx` files
2. **Parse Test Intent**: Extracts test names and descriptions from comments
3. **Map to Design Docs**: Matches test files to corresponding design documents
4. **Check Sync Status**: Compares tests in code vs docs
5. **Report/Apply Fixes**: Generates report and optionally updates docs

## File Mappings

The skill uses these mappings to connect test files to design docs:

- `homepage.spec.ts` → `docs/features/HomePage/design.md`
- `JoinRoom.test.tsx` → `docs/features/HomePage/JoinRoom/JoinRoom.md`
- `CreateRoomModal.test.tsx` → `docs/features/HomePage/CreateRoomModal/CreateRoomModal.md`
- `RoomCreatedModal.test.tsx` → `docs/features/HomePage/RoomCreated/RoomCreatedModal.md`

## Safety Features

- **Dry Run First**: Always run with `dryRun: true` first to review changes
- **Backup Before Changes**: Creates backup of docs before modification
- **Reversible**: Changes can be reverted if needed
- **Approval Required**: Auto-fix requires explicit `autoFix: true`

## Integration with Rules

This skill enforces the "Change control" rules in `docs/ai/rules_test_hub/README.md`:

- Automatically detects when test additions/removals aren't reflected in docs
- Provides hard enforcement of sync requirements
- Updates version and changelog when applying fixes

## Example Output

```
📊 Test-Docs Sync Report
========================

Total Tests: 8
Synced Tests: 6
Drifted Tests: 2
Sync Status: ❌ Drift detected

🔍 Drift Details:

📄 docs/features/HomePage/design.md:
  ❌ Missing in doc: end-to-end invite flow with direct URL, end-to-end invite flow with redirected URL
```