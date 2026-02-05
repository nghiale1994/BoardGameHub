import { describe, test, expect } from "vitest";
import { handle } from "./handler";

describe("sweep-tests handler", () => {
  test("scan returns a report object", async () => {
    const res = await handle({ root: process.cwd(), fix: false });
    expect(res.report).toBeDefined();
  });
});