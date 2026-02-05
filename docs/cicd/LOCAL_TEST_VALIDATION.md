NOTE: AI must read docs/ai/README.md before modifying this file.

# Local Test Validation System

## Overview

This project implements a local test validation system that ensures test results are included in commits to the main branch. The system uses Git pre-commit hooks to verify that test-results files are staged before allowing commits to main.

## How It Works

### Pre-Commit Hook
- **Location**: `.git/hooks/pre-commit`
- **Trigger**: Runs automatically before each commit
- **Validation**:
  - Only checks when committing to `main` branch
  - Checks if any files in `app/test-results/` are staged for commit
  - **Auto-generates test commands** from `package.json` scripts starting with "test:"
  - **Auto-updates test-summary.json** with missing test types when test results are missing
  - Blocks commit if no test-results files are found
  - Shows helpful error messages with instructions

### Pre-Push Hook
- **Status**: Disabled - validation moved to pre-commit for main branch only
- **Purpose**: Previously validated pushes to main/dev, now bypassed

### Manual Test Execution

**You run tests manually on your local machine:**

```bash
cd app

# Unit tests (React components, utilities)
npm run test:unit

# E2E tests (basic end-to-end)
npm run test:e2e

# E2E tests with PeerJS (networking features)
npm run test:e2e:peerjs

# E2E tests with UI mode (interactive)
npm run test:e2e:ui
```

Test results are saved to `app/test-results/unit-results.json` and summarized in `app/test-results/test-summary.json`.

## Usage

### Normal Development Workflow

1. **Make code changes** as usual
2. **Run tests locally** (only required for main branch commits):
   ```bash
   cd app && npm run test:unit
   cd app && npm run test:e2e
   # Run other tests as needed
   ```
3. **Stage your changes AND test results** (for main branch):
   ```bash
   git add .
   # This includes both your code changes and test-results files
   ```
4. **Commit**:
   ```bash
   git commit -m "Your message"
   ```

**Note**: Test validation only applies to commits on the `main` branch. Commits to other branches (feature branches, dev, etc.) do not require test results.

### What Happens During Commit

When you run `git commit` on main branch:

1. **Pre-commit hook checks current branch**
2. **If not main**: Skips validation, allows commit
3. **If main**: Scans staged files for test-results files
4. **If missing test results**: 
   - Auto-updates `test-summary.json` with any missing test types
   - Shows instructions with auto-generated test commands
   - Blocks commit
5. **If test results present**: Allows commit

### Example Output

**❌ Block (no test-results):**
```
🔍 Checking for test-results files in commit...
❌ No test-results files found in this commit!
Please run your tests locally and commit the results:
📝 Adding missing test types to test-summary.json: e2ePeerjs
  1. Run unit tests: cd app && npm run test:unit
  2. Run E2E tests: cd app && npm run test:e2e
  3. Run E2E with UI: cd app && npm run test:e2e:ui
  4. Run E2E with PeerJS: cd app && npm run test:e2e:peerjs
  5. Add results: git add app/test-results/
  6. Commit again
Commit blocked - test results required for main branch!
```
*Note: Test commands are automatically generated from `package.json` scripts starting with "test:". Missing test types are automatically added to `test-summary.json`.*

**✅ Success (with test-results):**
```
🔍 Checking for test-results files in commit...
✅ Test-results files found in commit
📋 Staged test-results files:
  ✓ app/test-results/test-summary.json
  ✓ app/test-results/unit-results.json
🚀 Commit approved!
```

## Configuration

### Test Results Format
The `test-summary.json` file contains results for all test types defined in `package.json`:
```json
{
  "timestamp": "2026-02-05T10:07:24.724Z",
  "commit": "40075ddc46714ed6141dc8917c341a79c886750a",
  "runId": "local",
  "unit": {
    "passed": 71,
    "failed": 0,
    "total": 71,
    "duration": 1474
  },
  "e2e": {
    "passed": 96,
    "failed": 0,
    "skipped": 344,
    "total": 96,
    "duration": 84225
  },
  "e2eUi": {
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "total": 0,
    "duration": 0
  },
  "e2ePeerjs": {
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "total": 0,
    "duration": 0
  }
}
```

### Bypass (Not Recommended)
To skip validation (for emergencies only):
```bash
git commit --no-verify -m "Your message"
```

**⚠️ Only use `--no-verify` in exceptional cases!**

## Troubleshooting

### "No test-results files found in this commit"
This is the expected behavior - you need to run tests and include results:
```bash
cd app

# Run the tests you need:
npm run test:unit          # Unit tests
npm run test:e2e           # Basic E2E tests
npm run test:e2e:peerjs    # E2E tests with networking
npm run test:e2e:ui        # E2E tests with UI mode

# Add test results to staging
git add app/test-results/

# Commit again
git commit -m "Your message"
```

### Hook not working
- Ensure `.git/hooks/pre-commit` is executable: `chmod +x .git/hooks/pre-commit`
- Check if test-results files are properly staged: `git status`
- Verify the hook is in the right location: `.git/hooks/pre-commit`

### Manual test execution
Available test commands:
```bash
cd app

# Unit tests (components, utilities)
npm run test:unit

# E2E tests (homepage, gameroom)
npm run test:e2e

# E2E tests with PeerJS networking
npm run test:e2e:peerjs

# E2E tests with interactive UI
npm run test:e2e:ui
```

## Files

- `.git/hooks/pre-commit` - Pre-commit validation hook
- `app/test-results/test-summary.json` - Test results summary
- `app/test-results/unit-results.json` - Detailed unit test results
- `docs/cicd/LOCAL_TEST_VALIDATION.md` - This documentation

## Best Practices

1. **Run tests locally** before committing
2. **Include test results** in every commit
3. **Keep test results current** with your code changes
4. **Review what you're committing** with `git status`
5. **Use descriptive commit messages** that reference test status

This system ensures code changes are accompanied by updated test results! 🚀