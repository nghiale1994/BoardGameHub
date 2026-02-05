/* Handler: sweep-tests
 * - Scan repository for test files
 * - Call enforce-test-comments in dry-run mode to produce report
 * - If fix=true, call enforce-test-comments(dryRun=false) in batches and return report
 */

import glob from "glob";
import path from "path";
import { handle as enforce } from "../enforce-test-comments/handler";

export async function handle(payload: { root?: string; fix?: boolean }) {
  const root = payload.root ?? process.cwd();
  const fix = payload.fix ?? false;
  const patterns = [`${root}/**/*.{test,spec}.{ts,tsx,js,jsx}`];
  const files: string[] = [];
  for (const p of patterns) files.push(...glob.sync(p, { nodir: true }));

  const report: { fixed: string[]; todo: string[] } = { fixed: [], todo: [] };

  // Run enforce in dry-run to collect changes
  const res = await enforce({ paths: files, dryRun: true });
  for (const d of res.details) {
    if (d.changed) report.todo.push(d.file);
  }

  if (fix && report.todo.length > 0) {
    // batch apply fixes
    const applyRes = await enforce({ paths: report.todo, dryRun: false });
    report.fixed.push(...applyRes.modifiedFiles);
  }

  return { report };
}
