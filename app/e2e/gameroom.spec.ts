import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("boardgamehub.language", "en");
  });
});

const markBehavior = async (page: import("@playwright/test").Page, label: string, step: string) => {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[e2e][behavior] ${ts} ${label}: ${step}`);
  await page
    .evaluate(
      ({ ts, label, step }) => {
        // eslint-disable-next-line no-console
        console.log(`[E2E][behavior] ${ts} ${label}: ${step}`);
      },
      { ts, label, step }
    )
    .catch(() => {
      // page may be closing
    });
};

const breakpointViewports = [
  { name: "desktop", viewport: { width: 1280, height: 720 } },
  { name: "tablet", viewport: { width: 900, height: 720 } },
  { name: "mobile", viewport: { width: 390, height: 844 } },
  { name: "tiny-mobile", viewport: { width: 360, height: 740 } }
] as const;

const saveName = async (page: import("@playwright/test").Page, label: string, name: string) => {
  await markBehavior(page, label, `fill displayName=${JSON.stringify(name)}`);
  await page.getByLabel("Enter your name").fill(name);
  await markBehavior(page, label, "click Save");
  await page.getByRole("button", { name: "Save" }).click();
};

const joinFromHome = async (
  page: import("@playwright/test").Page,
  opts: { roomId: string; asSpectator?: boolean }
) => {
  const label = `joinFromHome:${opts.roomId}${opts.asSpectator ? ":spectator" : ":player"}`;

  await markBehavior(page, label, "goto /");
  await page.goto("/");
  await markBehavior(page, label, "saveName Alice");
  await saveName(page, label, "Alice");

  if (opts.asSpectator) {
    await markBehavior(page, label, "check Join as spectator");
    await page.getByLabel("Join as spectator").check();
  }

  await markBehavior(page, label, `fill JoinRoom input with ${JSON.stringify(opts.roomId)}`);
  await page.getByPlaceholder("Paste room URL").fill(opts.roomId);
  await markBehavior(page, label, "click Join");
  await page.getByRole("button", { name: "Join" }).click();

  await markBehavior(page, label, "assert URL + Room header");
  const baseUrl = page.url().split('/room/')[0];
  await expect(page).toHaveURL(`${baseUrl}/room/${opts.roomId}`);
  await expect(page.getByText(/^Room: Catan$/)).toBeVisible();
};

// Tests: join as player shows Participants list and Copy invite link works.
// Steps:
// 1) joinFromHome as player
// 2) open Participants tab
// 3) assert Players (2) visible
// 4) click Copy invite link
// 5) assert Invite link copied toast visible
test("join as player shows players list and allows copy invite link", async ({ page }) => {
  const label = "gameroom:player";

  // Step 1) joinFromHome as player
  await markBehavior(page, label, "joinFromHome ROOMP as player");
  await joinFromHome(page, { roomId: "ROOMP" });

  // Step 2) open Participants tab
  await markBehavior(page, label, "assert Participants tab visible");
  await expect(page.getByRole("tab", { name: /Participants/ })).toBeVisible();

  await markBehavior(page, label, "open Participants tab");
  await page.getByRole("tab", { name: /Participants/ }).click();

  // Step 3) assert Players (2) visible
  await markBehavior(page, label, "assert Players (2) visible");
  await expect(page.getByText("Players (2)")).toBeVisible();

  // Step 4) click Copy invite link
  await markBehavior(page, label, "click Copy invite link");
  await page.getByRole("button", { name: "Copy invite link" }).click();

  // Step 5) assert Invite link copied toast visible
  await markBehavior(page, label, "assert Invite link copied toast");
  await expect(page.getByText("Invite link copied!")).toBeVisible();
});

// Tests: join as spectator shows spectators list and self marker.
// Steps:
// 1) joinFromHome as spectator
// 2) open Participants tab
// 3) assert Players (1) visible
// 4) assert Spectators (1) visible
// 5) assert Alice (me) visible
test("join as spectator shows spectators list and self marker", async ({ page }) => {
  const label = "gameroom:spectator";

  // Step 1) joinFromHome as spectator
  await markBehavior(page, label, "joinFromHome ROOMS as spectator");
  await joinFromHome(page, { roomId: "ROOMS", asSpectator: true });

  // Step 2) open Participants tab
  await markBehavior(page, label, "open Participants tab");
  await page.getByRole("tab", { name: /Participants/ }).click();

  // Step 3) assert Players (1) visible
  // Step 4) assert Spectators (1) visible
  // Step 5) assert Alice (me) visible
  await markBehavior(page, label, "assert Players/Spectators counts and self marker");
  await expect(page.getByText("Players (1)")).toBeVisible();
  await expect(page.getByText("Spectators (1)")).toBeVisible();
  await expect(page.getByText(/Alice \(me\)/)).toBeVisible();
});

// Tests: chat flags hide conversation messages.
// Steps:
// 1) joinFromHome
// 2) open Chat tab
// 3) send chat message "hello"
// 4) assert message visible
// 5) open Settings
// 6) toggle Show conversation off
// 7) close Settings
// 8) assert message hidden
test("settings chat flags hide conversation messages", async ({ page }) => {
  const label = "gameroom:chat-flags";

  // Step 1) joinFromHome
  await markBehavior(page, label, "joinFromHome ROOMCHAT");
  await joinFromHome(page, { roomId: "ROOMCHAT" });

  // Step 2) open Chat tab
  await markBehavior(page, label, "open Chat tab");
  await page.getByRole("tab", { name: /^Chat/i }).click();

  // Step 3) send chat message "hello"
  await markBehavior(page, label, "send chat message 'hello'");
  await page.getByPlaceholder("Type a message…").fill("hello");
  await page.getByRole("button", { name: "Send" }).click();

  // Step 4) assert message visible
  await markBehavior(page, label, "assert message visible");
  await expect(page.getByText("hello")).toBeVisible();

  // Step 5) open Settings
  await markBehavior(page, label, "open Settings");
  await page.getByRole("button", { name: "Settings" }).click();

  // Step 6) toggle Show conversation off
  await markBehavior(page, label, "toggle Show conversation off");
  await page.getByLabel("Show conversation").click();

  // Step 7) close Settings
  await markBehavior(page, label, "close Settings");
  await page.getByRole("button", { name: "Close" }).click();

  // Step 8) assert message hidden
  await markBehavior(page, label, "assert message hidden");
  await expect(page.getByText("hello")).toHaveCount(0);
});

for (const { name, viewport } of breakpointViewports) {
  test.describe(`breakpoint:${name}`, () => {
    test.use({ viewport });

    // Tests: responsive core UX (join → open participants/chat).
    // Steps:
    // 1) joinFromHome
    // 2) If mobile: open participants → assert Players (2) → close; open chat → assert composer → close
    // 3) Else: open Chat tab → assert composer; open Participants tab → assert Players (2)
    test("core UX: join -> participants/chat open", async ({ page }) => {
      const label = `bp:${name}:core-ux`;
      const roomId = `ROOM${name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;

      // Step 1) joinFromHome
      await markBehavior(page, label, `joinFromHome ${roomId}`);
      await joinFromHome(page, { roomId });

      if (viewport.width <= 767) {
        // Step 2) If mobile: open participants → assert Players (2) → close; open chat → assert composer → close
        await markBehavior(page, label, "open participants (mobile button)");
        await page.getByRole("button", { name: "Open participants" }).click();
        await markBehavior(page, label, "assert Players (2) visible");
        await expect(page.getByText("Players (2)")).toBeVisible();
        await markBehavior(page, label, "close participants");
        await page.getByRole("button", { name: "Close" }).click();

        await markBehavior(page, label, "open chat (mobile button)");
        await page.getByRole("button", { name: "Open chat" }).click();
        await markBehavior(page, label, "assert chat composer visible");
        await expect(page.getByPlaceholder("Type a message…")).toBeVisible();
        await markBehavior(page, label, "close chat");
        await page.getByRole("button", { name: "Close" }).click();
      } else {
        // Step 3) Else: open Chat tab → assert composer; open Participants tab → assert Players (2)
        await markBehavior(page, label, "open Chat tab");
        await page.getByRole("tab", { name: /^Chat/i }).click();
        await markBehavior(page, label, "assert chat composer visible");
        await expect(page.getByPlaceholder("Type a message…")).toBeVisible();

        await markBehavior(page, label, "open Participants tab");
        await page.getByRole("tab", { name: /Participants/ }).click();
        await markBehavior(page, label, "assert Players (2) visible");
        await expect(page.getByText("Players (2)")).toBeVisible();
      }
    });
  });
}
