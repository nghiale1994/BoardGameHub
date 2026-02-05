import { describe, test, expect } from "vitest";
import { handle } from "./handler";

describe("propose-ambiguity-resolution handler", () => {
  test("produces options and a question", async () => {
    const res = await handle({ context: "Should tests be retried 1 or 3 times before changing logic?" });
    expect(res.options.length).toBeGreaterThan(0);
    expect(typeof res.question).toBe("string");
  });
});