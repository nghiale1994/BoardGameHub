import { describe, test, expect } from "vitest";
import { handle } from "./handler";

describe("run-unit-tests handler (template)", () => {
  test("returns a process result object", async () => {
    const res = await handle({ files: ["src/services/roomHelpers.test.ts"], bailOnFailure: true });
    expect(res).toHaveProperty("code");
    expect(res).toHaveProperty("output");
  });
});