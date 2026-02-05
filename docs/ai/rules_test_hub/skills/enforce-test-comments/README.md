# Skill: enforce-test-comments ✅

Purpose: make test files comply with the repo policy for test intent comments: a multi-line header with `Tests:` and `Steps:`, numbered steps (one per line), and inline `// Step N)` markers near the associated actions.

Inputs:
- `paths` (string[]): file paths or globs to process
- `dryRun` (boolean): only report changes when true

Outputs:
- `modifiedFiles` (string[]): list of file paths modified

Success Criteria:
- All targeted files have the `Tests:` header followed by `// Steps:` with numbered lines
- Inline `// Step N)` comments are present next to corresponding actions/assertions where reasonable

Notes & Safety:
- Use dry-run first, then request explicit permission to modify files.
- Do not change test logic; only adjust comments and non-functional whitespace.
- If a file fails tests after modification, rerun up to 3 times before altering logic.
