# Skill: sweep-tests 🧹

Purpose: Sweep the repository for test files and normalize test headers according to repo policy. Generates a report of files fixed and files requiring manual attention.

Inputs:
- `root`: repository root to scan (default: CWD)
- `fix`: boolean; if true, apply fixes (requires permission `repo:modify-tests`)

Outputs:
- `report`: { fixed: string[], todo: string[] }

Safety:
- Run `fix=false` (dry-run) first to review the plan.
- If applying fixes, run test suite after fixes and follow the 3-retry rule before changing logic.
