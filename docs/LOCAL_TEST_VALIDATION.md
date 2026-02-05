# Local Test Validation System

## Overview

This project implements a local test validation system that ensures test results are the most recently modified file before pushing code to the main branch. The system uses Git hooks to automatically validate that test results are current before allowing pushes to `main`.

## How It Works

### Pre-Push Hook
- **Location**: `.git/hooks/pre-push`
- **Trigger**: Runs automatically when pushing to `main` branch
- **Validation**:
  - Checks if test results exist (`app/test-results/test-summary.json`)
  - Finds the most recently modified file in the project (excluding build artifacts, dependencies, etc.)
  - Ensures test results are the most recent file
  - Shows validation status

### Test Results Freshness

The hook checks that `test-summary.json` is the most recently modified file by:
1. **Scanning project files** (excluding `.git/`, `node_modules/`, build outputs, logs)
2. **Comparing modification times** of all files
3. **Blocking push** if any source file is newer than test results

## Usage

### Creating Test Results

You create test results manually in the expected format:

```bash
# Create/update test results file
echo '{
  "timestamp": "'$(date -Iseconds)'",
  "commit": "local",
  "runId": "local",
  "unit": {"passed": 70, "failed": 1, "total": 71},
  "e2e": {"passed": 96, "failed": 0, "skipped": 344, "total": 96}
}' > app/test-results/test-summary.json
```

### What Happens During Push

When you run `git push origin main`:

1. **Pre-push hook activates** (only for main branch)
2. **Scans all project files** for modification times
3. **Compares test results** with most recent file
4. **Blocks push** if test results are outdated
5. **Shows helpful error messages** with file information

### Example Output

**✅ Success:**
```
🔍 Checking test results before push...
📋 Pushing to main branch - validating test results...
🔍 Finding most recently modified file...
📄 Most recent file: ./app/src/App.tsx
📊 Test results file: app/test-results/test-summary.json
✅ Test results are up to date!
🚀 Push approved - test results are current!
```

**❌ Failure (outdated results):**
```
🔍 Checking test results before push...
📋 Pushing to main branch - validating test results...
🔍 Finding most recently modified file...
📄 Most recent file: ./app/src/NewFeature.tsx (timestamp: 1770282656)
📊 Test results file: app/test-results/test-summary.json (timestamp: 1770282577)
❌ Test results are outdated!
Test results are 79 seconds older than the most recent file.
Most recent file: ./app/src/NewFeature.tsx
Please update test results before pushing.
```

## Configuration

### Excluded Files
The hook automatically excludes these file types from freshness comparison:
- `.git/*` - Git internal files
- `*/node_modules/*` - Dependencies
- `./app/test-results/*` - Test result files
- `./app/build/*`, `./app/dist/*` - Build outputs
- `./app/.next/*`, `./app/.nuxt/*` - Framework cache
- `*.log` - Log files
- `.DS_Store`, `Thumbs.db` - System files

### Bypass (Not Recommended)
To skip validation (for emergencies only):
```bash
git push --no-verify origin main
```

**⚠️ Only use `--no-verify` in exceptional cases!**

## Troubleshooting

### "No test results found"
Create the test results file:
```bash
touch app/test-results/test-summary.json
# Add your test results in JSON format
```

### "Test results are outdated"
Update your test results file so it becomes the most recently modified file:
```bash
touch app/test-results/test-summary.json
# Or update the content and save
```

### Hook not working
- Ensure `.git/hooks/pre-push` is executable
- Check if you're pushing to `main` branch
- Verify test results file exists at `app/test-results/test-summary.json`

## Files

- `.git/hooks/pre-push` - Pre-push validation hook
- `app/test-results/test-summary.json` - Test results file (you create this)
- `docs/LOCAL_TEST_VALIDATION.md` - This documentation

## Best Practices

1. **Update test results** after making code changes
2. **Keep test results current** with your latest changes
3. **Review validation output** before pushing
4. **Use meaningful test result data** for your records
5. **Commit test results** if you want to track them in git

This system ensures code changes are accompanied by updated test results! 🚀