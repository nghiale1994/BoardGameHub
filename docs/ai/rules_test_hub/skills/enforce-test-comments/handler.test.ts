import { describe, test, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { handle } from "./handler";

describe("enforce-test-comments handler (integration)", () => {
  test("dry-run detects missing headers and previews changes", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enforce-test-"));
    const file = path.join(tmp, "sample.test.ts");
    const content = `test("my flow", () => {
  console.log("[test] do something");
  render(<Foo />);
  fireEvent.click(screen.getByText("OK"));
  expect(screen.getByText("Done")).toBeTruthy();
});`;
    fs.writeFileSync(file, content, "utf8");

    const res = await handle({ paths: [file], dryRun: true });
    expect(res.modifiedFiles).toContain(path.resolve(file));
    const detail = res.details.find((d) => d.file === path.resolve(file));
    expect(detail).toBeDefined();
    expect(detail?.preview).toContain("// Tests:");
    expect(detail?.preview).toContain("// Steps:");
  });

  test("apply changes when dryRun=false writes file with headers and inline step comments", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "enforce-test-"));
    const file = path.join(tmp, "sample2.test.ts");
    const content = `test("interaction", async () => {
  render(<Bar />);
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByText("ok")).toBeDefined();
});`;
    fs.writeFileSync(file, content, "utf8");

    const res = await handle({ paths: [file], dryRun: false });
    expect(res.modifiedFiles).toContain(path.resolve(file));

    const updated = fs.readFileSync(file, "utf8");
    expect(updated).toContain("// Tests:");
    expect(updated).toContain("// Steps:");
    expect(updated).toMatch(/Step 1\)/);
    expect(updated).toMatch(/Step 2\)/);
  });
});