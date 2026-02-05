/* Handler: enforce-test-comments (practical implementation)
 * - Scan files/globs, find test blocks and ensure header has multi-line `Tests:` and `Steps:`
 * - Infer a short set of Steps from common action patterns (render, fireEvent, emitPeerEvent, expect)
 * - Insert `// Step N)` inline comments before matched actions (skip if already present)
 * - dryRun=true: report what would change; dryRun=false: apply changes
 * - Safety: only edits comments/whitespace, never modifies expressions or assertions text
 */

import fs from "fs";
import path from "path";
import glob from "glob";

type Result = {
  modifiedFiles: string[];
  details: { file: string; changed: boolean; preview?: string }[];
};

const TEST_START_RE = /(^|\n)\s*(?:test|it)\(\s*(['`"])([\s\S]*?)\2\s*,/g;

function findBlockBounds(source: string, startIndex: number) {
  // Find the opening '{' after the startIndex and locate matching '}' by depth
  const openIndex = source.indexOf("{", startIndex);
  if (openIndex === -1) return null;
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) return { start: startIndex, bodyStart: openIndex, end: i };
  }
  return null;
}

function extractLines(text: string) {
  return text.split(/\r?\n/);
}

function joinLines(lines: string[]) {
  return lines.join("\n");
}

function hasStepHeaderBefore(lines: string[], testLineIdx: number) {
  // look up to 8 lines above for `// Tests:` and `// Steps:` headers
  const start = Math.max(0, testLineIdx - 8);
  let hasTests = false;
  let hasSteps = false;
  for (let i = start; i < testLineIdx; i++) {
    const l = lines[i].trim();
    if (l.startsWith("// Tests:")) hasTests = true;
    if (l.startsWith("// Steps:")) hasSteps = true;
  }
  return hasTests && hasSteps;
}

function buildStepsFromBody(body: string) {
  const candidates: { pattern: RegExp; desc: string }[] = [
    { pattern: /renderWithI18n\(|render\(|mount\(|renderHook\(/, desc: "render the UI" },
    { pattern: /fireEvent\.|userEvent\.|click\(|type\(/, desc: "perform user interactions" },
    { pattern: /emitPeerEvent\(|peerService\.(sendTo|broadcast)|emitPeerEvent\(/, desc: "send/receive peer/network events" },
    { pattern: /expect\(/, desc: "assert expected values/state" }
  ];

  const steps: string[] = [];
  for (const c of candidates) {
    if (c.pattern.test(body)) steps.push(c.desc);
  }

  // If no steps detected, add a default minimal step
  if (steps.length === 0) steps.push("exercise code and assert outcomes");
  return steps;
}

function insertInlineStepComments(fileLines: string[], bodyStartLine: number, bodyLines: string[], steps: string[]) {
  // For each step, find the first occurrence of patterns and insert a comment before that line if not present
  const patterns = [
    /renderWithI18n\(|render\(|renderHook\(/,
    /fireEvent\.|userEvent\.|click\(|type\(/,
    /emitPeerEvent\(|peerService\.(sendTo|broadcast)/,
    /expect\(/
  ];

  const inserted: number[] = [];

  for (let si = 0; si < steps.length; si++) {
    const pat = patterns[si] || patterns[patterns.length - 1];
    for (let li = 0; li < bodyLines.length; li++) {
      if (pat.test(bodyLines[li])) {
        const globalLineIdx = bodyStartLine + li;
        // check previous line not already Step comment
        const prev = fileLines[globalLineIdx - 1] ?? "";
        if (!/^\s*\/\/\s*Step\s+\d+\)/.test(prev)) {
          fileLines.splice(globalLineIdx, 0, `    // Step ${si + 1}) ${steps[si]}`);
          inserted.push(globalLineIdx);
        }
        break; // move to next step
      }
    }
  }

  return inserted.length > 0;
}

export async function handle(payload: { paths: string[]; dryRun?: boolean }): Promise<Result> {
  const { paths: globs, dryRun = true } = payload;
  const modifiedFiles: string[] = [];
  const details: { file: string; changed: boolean; preview?: string }[] = [];

  const files = new Set<string>();
  for (const g of globs) {
    const matches = glob.sync(g, { nodir: true });
    for (const m of matches) files.add(path.resolve(m));
  }

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const lines = extractLines(src);
    let changed = false;

    // Find all tests with regex positions
    let m: RegExpExecArray | null;
    const modifications: { before: number; after: number; newText: string }[] = [];

    while ((m = TEST_START_RE.exec(src))) {
      const matchIndex = m.index + (m[1] ? m[1].length : 0);
      const testName = m[3].trim();

      // compute test start line index
      const prefix = src.slice(0, matchIndex);
      const testLineIdx = prefix.split(/\r?\n/).length - 1;

      // skip if header already present
      if (hasStepHeaderBefore(lines, testLineIdx)) continue;

      const bounds = findBlockBounds(src, matchIndex);
      if (!bounds) continue;

      const bodyText = src.slice(bounds.bodyStart + 1, bounds.end); // contents inside braces
      const bodyLines = extractLines(bodyText);

      // Build header
      const summary = testName || "test";
      const steps = buildStepsFromBody(bodyText);

      const headerLines = [] as string[];
      headerLines.push(`// Tests: ${summary}`);
      headerLines.push(`// Steps:`);
      for (let i = 0; i < steps.length; i++) headerLines.push(`// ${i + 1}) ${steps[i]}`);

      // Insert header above testLineIdx in lines
      lines.splice(testLineIdx, 0, ...headerLines);
      changed = true;

      // Attempt to insert inline step comments into the body
      const bodyStartLine = testLineIdx + headerLines.length + (src.slice(matchIndex, bounds.bodyStart).split(/\n/).length - 1);
      const inserted = insertInlineStepComments(lines, bodyStartLine, bodyLines, steps);

      // prepare preview for details
      const previewStart = Math.max(0, testLineIdx - 2);
      const previewEnd = Math.min(lines.length, bodyStartLine + Math.min(10, bodyLines.length) + 2);
      const preview = lines.slice(previewStart, previewEnd).join("\n");

      modifications.push({ before: testLineIdx, after: previewEnd, newText: preview });
    }

    if (changed) {
      if (!dryRun) fs.writeFileSync(file, joinLines(lines), "utf8");
      modifiedFiles.push(file);
      details.push({ file, changed: true, preview: modifications.map((x) => x.newText).join("\n---\n") });
    } else {
      details.push({ file, changed: false });
    }
  }

  return { modifiedFiles, details };
}
