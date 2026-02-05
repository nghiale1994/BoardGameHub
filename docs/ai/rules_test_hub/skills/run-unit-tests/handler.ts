/* Handler: run-unit-tests
 * - Run Vitest unit tests for requested files or the entire suite
 * - Capture output and return result object
 */

import { spawn } from "child_process";
import path from "path";

export async function handle(payload: { files?: string[]; bailOnFailure?: boolean }) {
  const files = payload.files ?? [];
  const appDir = path.join(process.cwd(), "app");
  const args = ["run", "test:unit", "--", ...files];

  return new Promise((resolve) => {
    const proc = spawn("npm", args, { cwd: appDir, shell: true });
    let out = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (out += d.toString()));
    proc.on("close", (code) => resolve({ code, output: out }));
  });
}
