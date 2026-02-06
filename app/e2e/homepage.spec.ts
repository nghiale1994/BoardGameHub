import { expect, test } from "@playwright/test";

const nodeEnv =
  ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env as
    | Record<string, string | undefined>
    | undefined) ?? {};

const APP_ORIGIN = nodeEnv.E2E_APP_ORIGIN ?? "http://127.0.0.1:5173";

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

// Tests: homepage renders core sections.
// Steps:
// 1) goto /
// 2) assert Welcome/Join room/All available games visible
test("homepage renders core sections", async ({ page }) => {
  const label = "homepage";

  // Step 1) goto /
  await markBehavior(page, label, "goto /");
  await page.goto("/");

  // Step 2) assert Welcome/Join room/All available games visible
  await markBehavior(page, label, "assert core sections visible");
  await expect(page.getByText("Welcome to BoardGame Hub")).toBeVisible();
  await expect(page.getByText("Join room")).toBeVisible();
  await expect(page.getByText("All available games")).toBeVisible();
});

// Tests: invite route pre-fills JoinRoom input and focuses it.
// Steps:
// 1) goto /i/:id
// 2) assert JoinRoom input value ends with /i/:id
// 3) assert JoinRoom input is focused
test("invite route pre-fills JoinRoom input and focuses it", async ({ page }) => {
  const label = "invite-prefill";

  // Step 1) goto /i/:id
  await markBehavior(page, label, "goto /i/ABC123");
  await page.goto("/i/ABC123");

  const input = page.getByPlaceholder("Paste room URL");

  // Step 2) assert JoinRoom input value ends with /i/:id
  await markBehavior(page, label, "assert input prefilled + focused");
  await expect(input).toHaveValue(/\/i\/ABC123$/);

  // Step 3) assert JoinRoom input is focused
  await expect(input).toBeFocused();
});

// Tests: redirected invite route (GitHub Pages SPA) pre-fills JoinRoom input and focuses it.
// Steps:
// 1) goto /?/i/:id (redirected URL)
// 2) assert URL normalizes to /i/:id
// 3) assert JoinRoom input value ends with /i/:id
// 4) assert JoinRoom input is focused
test("redirected invite route pre-fills JoinRoom input and focuses it", async ({ page }) => {
  const label = "redirected-invite-prefill";

  // Step 1) goto /?/i/:id (redirected URL)
  await markBehavior(page, label, "goto /?/i/DEF456");
  await page.goto("/?/i/DEF456");
  await page.waitForLoadState('networkidle');

  // Step 2) assert URL normalizes to /i/:id
  await markBehavior(page, label, "assert URL normalized");
  const pathname = await page.evaluate(() => window.location.pathname);
  console.log('pathname:', pathname);
  await expect(page).toHaveURL(/\/i\/DEF456$/);

  const input = page.getByPlaceholder("Paste room URL");

  // Wait for component to update
  await page.waitForTimeout(1000);

  // Debug
  const value = await page.evaluate(() => (document.querySelector('input[placeholder="Paste room URL"]') as HTMLInputElement)?.value);
  console.log('Input value:', value);

  // Step 3) assert JoinRoom input value ends with /i/:id
  await markBehavior(page, label, "assert input prefilled + focused");
  await expect(input).toHaveValue(/\/i\/DEF456$/);

  // Step 4) assert JoinRoom input is focused
  await expect(input).toBeFocused();
});

// Tests: name gate blocks join when display name is empty.
// Steps:
// 1) goto /
// 2) fill roomId
// 3) click Join
// 4) assert name gate message visible
test("name gate blocks join when display name is empty", async ({ page }) => {
  const label = "name-gate";

  // Step 1) goto /
  await markBehavior(page, label, "goto /");
  await page.goto("/");

  // Step 2) fill roomId
  await markBehavior(page, label, "fill JoinRoom input with ROOMID");
  await page.getByPlaceholder("Paste room URL").fill("ROOMID");

  // Step 3) click Join
  await markBehavior(page, label, "click Join");
  await page.getByRole("button", { name: "Join" }).click();

  // Step 4) assert name gate message visible
  await markBehavior(page, label, "assert name-gate error");
  await expect(page.getByText("Please enter and save your name before continuing.")).toBeVisible();
});

// Tests: create flow (game → create → enter room).
// Steps:
// 1) goto /
// 2) saveName Alice
// 3) click game Catan
// 4) assert Create new room dialog
// 5) click Create Room
// 6) assert Room created dialog
// 7) assert shareUrl ends with /i/<ROOMID>
// 8) click Enter room
// 9) assert room header visible
test("create flow: pick game -> create -> enter room", async ({ page }) => {
  const label = "create-flow";

  // Step 1) goto /
  await markBehavior(page, label, "goto /");
  await page.goto("/");

  // Step 2) saveName Alice
  await markBehavior(page, label, "saveName Alice");
  await saveName(page, label, "Alice");

  // Step 3) click game Catan
  await markBehavior(page, label, "choose game Catan");
  await page.getByText("Catan").click();

  // Step 4) assert Create new room dialog
  await markBehavior(page, label, "assert Create new room dialog");
  await expect(page.getByRole("dialog", { name: "Create new room" })).toBeVisible();

  // Step 5) click Create Room
  await markBehavior(page, label, "click Create Room");
  await page.getByRole("button", { name: "Create Room" }).click();

  // Step 6) assert Room created dialog
  await markBehavior(page, label, "assert Room created dialog");
  await expect(page.getByRole("dialog", { name: "Room created" })).toBeVisible();

  const shareUrl = page.getByRole("dialog", { name: "Room created" }).getByRole("textbox");

  // Step 7) assert shareUrl ends with /i/<ROOMID>
  await markBehavior(page, label, "assert shareUrl ends with /i/<ROOMID>");
  await expect(shareUrl).toHaveValue(/\/i\/[A-Z0-9]+$/);

  // Step 8) click Enter room
  await markBehavior(page, label, "click Enter room");
  await page.getByRole("button", { name: "Enter room" }).click();

  // Step 9) assert room header visible
  await markBehavior(page, label, "assert Room: Catan visible");
  await expect(page.getByText(/^Room: Catan$/)).toBeVisible();
});

// Tests: join flow navigates to /room/:id and shows room header.
// Steps:
// 1) goto /
// 2) saveName Alice
// 3) fill roomId JOIN123
// 4) click Join
// 5) assert URL ends with /room/JOIN123
// 6) assert room header visible
test("join flow: paste room id -> join -> room screen", async ({ page }) => {
  const label = "join-flow";

  // Step 1) goto /
  await markBehavior(page, label, "goto /");
  await page.goto("/");

  // Step 2) saveName Alice
  await markBehavior(page, label, "saveName Alice");
  await saveName(page, label, "Alice");

  // Step 3) fill roomId JOIN123
  await markBehavior(page, label, "fill JoinRoom input with JOIN123");
  await page.getByPlaceholder("Paste room URL").fill("JOIN123");

  // Step 4) click Join
  await markBehavior(page, label, "click Join");
  await page.getByRole("button", { name: "Join" }).click();

  // Step 5) assert URL ends with /room/JOIN123
  // Step 6) assert room header visible
  await markBehavior(page, label, "assert URL + Room header");
  await expect(page).toHaveURL(/\/room\/JOIN123$/);
  await expect(page.getByText(/^Room: Catan$/)).toBeVisible();
});

for (const { name, viewport } of breakpointViewports) {
  test.describe(`breakpoint:${name}`, () => {
    test.use({ viewport });

    // Tests: invite route prefill at this breakpoint.
    // Steps:
    // 1) goto /i/:id
    // 2) assert JoinRoom input value ends with /i/:id
    // 3) assert JoinRoom input is focused
    test("invite route pre-fills JoinRoom input and focuses it", async ({ page }) => {
      const label = `bp:${name}:invite-prefill`;

      // Step 1) goto /i/:id
      await markBehavior(page, label, "goto /i/ABC123");
      await page.goto("/i/ABC123");

      const input = page.getByPlaceholder("Paste room URL");

      // Step 2) assert JoinRoom input value ends with /i/:id
      await markBehavior(page, label, "assert input prefilled + focused");
      await expect(input).toHaveValue(/\/i\/ABC123$/);

      // Step 3) assert JoinRoom input is focused
      await expect(input).toBeFocused();
    });

    // Tests: create flow at this breakpoint.
    // Steps:
    // 1) goto /
    // 2) saveName Alice
    // 3) scroll to Catan card
    // 4) click Catan card
    // 5) assert Create new room dialog
    // 6) click Create Room
    // 7) assert Room created dialog
    // 8) assert shareUrl ends with /i/<ROOMID>
    // 9) click Enter room
    // 10) assert room header visible
    test("create flow: pick game -> create -> enter room", async ({ page }) => {
      const label = `bp:${name}:create-flow`;

      // Step 1) goto /
      await markBehavior(page, label, "goto /");
      await page.goto("/");

      // Step 2) saveName Alice
      await markBehavior(page, label, "saveName Alice");
      await saveName(page, label, "Alice");

      const catanCard = page.getByText("Catan").first();

      // Step 3) scroll to Catan card
      await markBehavior(page, label, "scroll to Catan card");
      await catanCard.scrollIntoViewIfNeeded();

      // Step 4) click Catan card
      await markBehavior(page, label, "click Catan card");
      await catanCard.click();

      // Step 5) assert Create new room dialog
      await markBehavior(page, label, "assert Create new room dialog");
      await expect(page.getByRole("dialog", { name: "Create new room" })).toBeVisible();

      // Step 6) click Create Room
      await markBehavior(page, label, "click Create Room");
      await page.getByRole("button", { name: "Create Room" }).click();

      // Step 7) assert Room created dialog
      await markBehavior(page, label, "assert Room created dialog");
      await expect(page.getByRole("dialog", { name: "Room created" })).toBeVisible();

      const shareUrl = page.getByRole("dialog", { name: "Room created" }).getByRole("textbox");

      // Step 8) assert shareUrl ends with /i/<ROOMID>
      await markBehavior(page, label, "assert shareUrl ends with /i/<ROOMID>");
      await expect(shareUrl).toHaveValue(/\/i\/[A-Z0-9]+$/);

      // Step 9) click Enter room
      await markBehavior(page, label, "click Enter room");
      await page.getByRole("button", { name: "Enter room" }).click();

      // Step 10) assert room header visible
      await markBehavior(page, label, "assert Room: Catan visible");
      await expect(page.getByText(/^Room: Catan$/)).toBeVisible();
    });

    // Tests: join flow at this breakpoint.
    // Steps:
    // 1) goto /
    // 2) saveName Alice
    // 3) scroll to JoinRoom input
    // 4) fill roomId JOIN123
    // 5) click Join
    // 6) assert URL ends with /room/JOIN123
    // 7) assert room header visible
    test("join flow: paste room id -> join -> room screen", async ({ page }) => {
      const label = `bp:${name}:join-flow`;

      // Step 1) goto /
      await markBehavior(page, label, "goto /");
      await page.goto("/");

      // Step 2) saveName Alice
      await markBehavior(page, label, "saveName Alice");
      await saveName(page, label, "Alice");

      const joinInput = page.getByPlaceholder("Paste room URL");

      // Step 3) scroll to JoinRoom input
      await markBehavior(page, label, "scroll to JoinRoom input");
      await joinInput.scrollIntoViewIfNeeded();

      // Step 4) fill roomId JOIN123
      await markBehavior(page, label, "fill JoinRoom input with JOIN123");
      await joinInput.fill("JOIN123");

      // Step 5) click Join
      await markBehavior(page, label, "click Join");
      await page.getByRole("button", { name: "Join" }).click();

      // Step 6) assert URL ends with /room/JOIN123
      // Step 7) assert room header visible
      await markBehavior(page, label, "assert URL + Room header");
      await expect(page).toHaveURL(/\/room\/JOIN123$/);
      await expect(page.getByText(/^Room: Catan$/)).toBeVisible();
    });
  });
}

// Tests: end-to-end invite flow with direct URL.
// Steps:
// 1) Host: goto /, saveName Alice, create room, get shareUrl, enter room, check room URL
// 2) Player: goto shareUrl, check input prefilled + focused, saveName Bob, join, check room URL
test("end-to-end invite flow with direct URL", async ({ browser }) => {
  const hostPage = await browser.newPage();
  await hostPage.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("boardgamehub.language", "en");
  });
  const playerPage = await browser.newPage();
  await playerPage.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("boardgamehub.language", "en");
  });

  const hostLabel = "host";
  const playerLabel = "player";

  // Step 1) Host: goto /, saveName Alice, create room
  await markBehavior(hostPage, hostLabel, "goto /");
  await hostPage.goto("/");
  await saveName(hostPage, hostLabel, "Alice");
  await markBehavior(hostPage, hostLabel, "choose game Catan");
  await hostPage.getByText("Catan").click();
  await markBehavior(hostPage, hostLabel, "click Create Room");
  await hostPage.getByRole("button", { name: "Create Room" }).click();

  // Get shareUrl and roomId
  const shareUrlElement = hostPage.getByRole("dialog", { name: "Room created" }).getByRole("textbox");
  const shareUrl = await shareUrlElement.inputValue();
  const roomIdMatch = shareUrl.match(/\/i\/([A-Z0-9]+)$/);
  expect(roomIdMatch).toBeTruthy();
  const roomId = roomIdMatch![1];

  // Host: enter room
  await markBehavior(hostPage, hostLabel, "click Enter room");
  await hostPage.getByRole("button", { name: "Enter room" }).click();

  // Check host room URL
  await markBehavior(hostPage, hostLabel, "assert host room URL");
  const hostBaseUrl = hostPage.url().split('/room/')[0];
  await expect(hostPage).toHaveURL(`${hostBaseUrl}/room/${roomId}`);

  // Step 2) Player: goto shareUrl
  await markBehavior(playerPage, playerLabel, `goto ${shareUrl}`);
  await playerPage.goto(shareUrl);

  // Check input prefilled + focused
  const input = playerPage.getByPlaceholder("Paste room URL");
  await markBehavior(playerPage, playerLabel, "assert input prefilled + focused");
  await expect(input).toHaveValue(shareUrl);
  await expect(input).toBeFocused();

  // Player: saveName Bob, join
  await saveName(playerPage, playerLabel, "Bob");
  await markBehavior(playerPage, playerLabel, "click Join");
  await playerPage.getByRole("button", { name: "Join" }).click();

  // Check player room URL
  await markBehavior(playerPage, playerLabel, "assert player room URL");
  const playerBaseUrl = playerPage.url().split('/room/')[0];
  await expect(playerPage).toHaveURL(`${playerBaseUrl}/room/${roomId}`);

  await hostPage.close();
  await playerPage.close();
});

// Tests: end-to-end invite flow with redirected URL.
// Steps:
// 1) Host: goto /, saveName Alice, create room, get roomId, enter room, check room URL
// 2) Player: goto /?/i/<roomId>, check URL normalizes, input prefilled + focused, saveName Bob, join, check room URL
test("end-to-end invite flow with redirected URL", async ({ browser }) => {
  const hostPage = await browser.newPage();
  await hostPage.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("boardgamehub.language", "en");
  });
  const playerPage = await browser.newPage();
  await playerPage.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("boardgamehub.language", "en");
  });

  const hostLabel = "host";
  const playerLabel = "player";

  // Step 1) Host: goto /, saveName Alice, create room
  await markBehavior(hostPage, hostLabel, "goto /");
  await hostPage.goto("/");
  await saveName(hostPage, hostLabel, "Alice");
  await markBehavior(hostPage, hostLabel, "choose game Catan");
  await hostPage.getByText("Catan").click();
  await markBehavior(hostPage, hostLabel, "click Create Room");
  await hostPage.getByRole("button", { name: "Create Room" }).click();

  // Get roomId
  const shareUrlElement = hostPage.getByRole("dialog", { name: "Room created" }).getByRole("textbox");
  const shareUrl = await shareUrlElement.inputValue();
  const roomIdMatch = shareUrl.match(/\/i\/([A-Z0-9]+)$/);
  expect(roomIdMatch).toBeTruthy();
  const roomId = roomIdMatch![1];

  // Host: enter room
  await markBehavior(hostPage, hostLabel, "click Enter room");
  await hostPage.getByRole("button", { name: "Enter room" }).click();

  // Check host room URL
  await markBehavior(hostPage, hostLabel, "assert host room URL");
  const hostBaseUrl = hostPage.url().split('/room/')[0];
  await expect(hostPage).toHaveURL(`${hostBaseUrl}/room/${roomId}`);

  // Step 2) Player: goto /?/i/<roomId>
  const redirectedUrl = `/?/i/${roomId}`;
  await markBehavior(playerPage, playerLabel, `goto ${redirectedUrl}`);
  await playerPage.goto(redirectedUrl);
  await playerPage.waitForLoadState('networkidle');

  // Check URL normalizes
  await markBehavior(playerPage, playerLabel, "assert URL normalized");
  await expect(playerPage).toHaveURL(`${APP_ORIGIN}/i/${roomId}`);

  // Check input prefilled + focused
  const input = playerPage.getByPlaceholder("Paste room URL");
  await markBehavior(playerPage, playerLabel, "assert input prefilled + focused");
  await expect(input).toHaveValue(`${APP_ORIGIN}/i/${roomId}`);
  await expect(input).toBeFocused();

  // Player: saveName Bob, join
  await saveName(playerPage, playerLabel, "Bob");
  await markBehavior(playerPage, playerLabel, "click Join");
  await playerPage.getByRole("button", { name: "Join" }).click();

  // Check player room URL
  await markBehavior(playerPage, playerLabel, "assert player room URL");
  const playerBaseUrl = playerPage.url().split('/room/')[0];
  await expect(playerPage).toHaveURL(`${playerBaseUrl}/room/${roomId}`);

  await hostPage.close();
  await playerPage.close();
});


// Test: i18n leave room confirmation dialog
// Steps:
// 1) Set language to Vietnamese
// 2) Create a room
// 3) Try to create another room
// 4) Assert confirm dialog shows Vietnamese text
test("i18n leave room confirmation dialog", async ({ page }) => {
  const label = "i18n-confirm";

  // Step 1) Set language to Vietnamese and goto /
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("boardgamehub.language", "vi");
  });
  await markBehavior(page, label, "goto /");
  await page.goto("/");
  await page.waitForLoadState('networkidle');

  // Step 2) Save name and create room
  await saveName(page, label, "Alice");
  await markBehavior(page, label, "choose game Catan");
  await page.getByRole("button", { name: "Catan" }).click();
  await markBehavior(page, label, "click Create Room");
  await page.getByRole("button", { name: "Create Room" }).click();

  // Step 3) Try to create another room (should trigger confirm dialog)
  await markBehavior(page, label, "click Create Room again");
  await page.getByRole("button", { name: "Create Room" }).click();

  // Step 4) Assert confirm dialog shows Vietnamese text
  await markBehavior(page, label, "assert confirm dialog text");
  const dialog = await page.waitForEvent('dialog');
  expect(dialog.message()).toBe("Bạn đang ở trong một phòng. Bạn có muốn rời phòng và tham gia phòng mới không?");
  await dialog.accept();

  await page.close();
});
