import { expect, test } from "vitest";
import { generateRoomId, parseShareUrl, buildShareUrl } from "../services/roomHelpers";

// Tests: generateRoomId creates a non-empty uppercase alphanumeric id.
// Steps:
// 1) Call generateRoomId.
// 2) Assert it is non-empty and matches /^[A-Z0-9]+$/.
test("generateRoomId creates valid ID", () => {
  console.log("[test] roomHelpers generateRoomId creates valid ID");

  // Step 1) Call generateRoomId.
  const id = generateRoomId();

  // Step 2) Assert it is non-empty and matches /^[A-Z0-9]+$/.
  expect(id.length).toBeGreaterThan(0);
  expect(/^[A-Z0-9]+$/.test(id)).toBe(true);
});

// Tests: parseShareUrl extracts roomId from /i/:roomId.
// Steps:
// 1) Build a /i/:roomId invite URL.
// 2) Call parseShareUrl(url).
// 3) Assert returned roomId matches.
test("parseShareUrl extracts room ID", () => {
  console.log("[test] roomHelpers parseShareUrl extracts room ID from /i");

  // Step 1) Build a /i/:roomId invite URL.
  const url = "http://localhost:5173/i/ABC123DEF";

  // Step 2) Call parseShareUrl(url).
  const roomId = parseShareUrl(url);

  // Step 3) Assert returned roomId matches.
  expect(roomId).toBe("ABC123DEF");
});

// Tests: parseShareUrl supports legacy /r invite links.
// Steps:
// 1) Build a legacy /r/:roomId invite URL.
// 2) Call parseShareUrl(url).
// 3) Assert returned roomId matches.
test("parseShareUrl supports legacy /r invite links", () => {
  console.log("[test] roomHelpers parseShareUrl supports legacy /r");

  // Step 1) Build a legacy /r/:roomId invite URL.
  const url = "http://localhost:5173/r/LEGACY123";

  // Step 2) Call parseShareUrl(url).
  const roomId = parseShareUrl(url);

  // Step 3) Assert returned roomId matches.
  expect(roomId).toBe("LEGACY123");
});

// Tests: parseShareUrl extracts roomId from redirected /?/i/:roomId paths.
// Steps:
// 1) Build a redirected /?/i/:roomId invite URL.
// 2) Call parseShareUrl(url).
// 3) Assert returned roomId matches.
test("parseShareUrl extracts room ID from redirected /?/i paths", () => {
  console.log("[test] roomHelpers parseShareUrl extracts room ID from redirected /?/i");

  // Step 1) Build a redirected /?/i/:roomId invite URL.
  const url = "/?/i/REDIRECT123";

  // Step 2) Call parseShareUrl(url).
  const roomId = parseShareUrl(url);

  // Step 3) Assert returned roomId matches.
  expect(roomId).toBe("REDIRECT123");
});

// Tests: parseShareUrl extracts roomId from redirected absolute URLs.
// Steps:
// 1) Build a redirected absolute URL with /?/i/:roomId.
// 2) Call parseShareUrl(url).
// 3) Assert returned roomId matches.
test("parseShareUrl extracts room ID from redirected absolute URLs", () => {
  console.log("[test] roomHelpers parseShareUrl extracts room ID from redirected absolute URLs");

  // Step 1) Build a redirected absolute URL with /?/i/:roomId.
  const url = "https://nghiale1994.github.io/BoardGameHub/?/i/ABSOLUTE123";

  // Step 2) Call parseShareUrl(url).
  const roomId = parseShareUrl(url);

  // Step 3) Assert returned roomId matches.
  expect(roomId).toBe("ABSOLUTE123");
});

// Tests: parseShareUrl returns null for an invalid URL string.
// Steps:
// 1) Call parseShareUrl with a non-URL string.
// 2) Assert it returns null.
test("parseShareUrl returns null for invalid URL", () => {
  console.log("[test] roomHelpers parseShareUrl returns null for invalid URL");

  // Step 1) Call parseShareUrl with a non-URL string.
  const roomId = parseShareUrl("not a url");

  // Step 2) Assert it returns null.
  expect(roomId).toBeNull();
});

// Tests: buildShareUrl creates an invite URL containing /i/:roomId.
// Steps:
// 1) Call buildShareUrl(roomId).
// 2) Assert result contains /i/:roomId.
test("buildShareUrl creates correct URL", () => {
  console.log("[test] roomHelpers buildShareUrl creates correct URL");

  // Step 1) Call buildShareUrl(roomId).
  const url = buildShareUrl("TEST123");

  // Step 2) Assert result contains /i/:roomId.
  expect(url.includes("/i/TEST123")).toBe(true);
});
