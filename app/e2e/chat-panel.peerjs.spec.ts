import { chromium, expect, firefox, test, webkit } from "@playwright/test";

const nodeEnv =
  ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env as
    | Record<string, string | undefined>
    | undefined) ?? {};

const APP_ORIGIN = nodeEnv.E2E_APP_ORIGIN ?? "http://127.0.0.1:5173";

const isPeerJsEnabledForThisRun = () => {
  const raw = (nodeEnv.VITE_E2E_DISABLE_PEERJS ?? "").toLowerCase();
  return raw === "0" || raw === "false";
};

type BrowserType = "chromium" | "firefox" | "msedge" | "webkit";

type LayoutName = "desktop" | "tablet" | "mobile";

const layoutOptions: Record<LayoutName, { width: number; height: number }> = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 900, height: 720 },
  mobile: { width: 390, height: 844 }
};

const launchByType = async (type: BrowserType) => {
  if (type === "chromium") return await chromium.launch();
  if (type === "firefox") return await firefox.launch();
  if (type === "webkit") return await webkit.launch();
  return await chromium.launch({ channel: "msedge" });
};

type BrowserHandle = {
  browser: import("@playwright/test").Browser;
  owned: boolean;
};

const initContext = async (browser: import("@playwright/test").Browser, layout: LayoutName) => {
  const layoutOpt = layoutOptions[layout];
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width: layoutOpt.width, height: layoutOpt.height }
  });

  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("boardgamehub.language", "en");
  });

  return context;
};

const attachPeerServiceLogs = (page: import("@playwright/test").Page, label: string) => {
  const lines: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    const isPeerService = text.includes("[PeerService]");
    const isBehaviorMarker = /\[(chat-e2e|E2E)\]\[behavior\]/i.test(text);
    const isInterestingError =
      type === "error" ||
      type === "warning" ||
      /Failed to (join|create) room|Timed out waiting for host snapshot/i.test(text);

    if (!isPeerService && !isBehaviorMarker && !isInterestingError) return;
    lines.push(`[${label}] [${type}] ${text}`);
    if (lines.length > 250) lines.shift();
  });

  page.on("pageerror", (err) => {
    lines.push(`[${label}] [pageerror] ${String(err)}`);
    if (lines.length > 250) lines.shift();
  });

  return lines;
};

const markBehavior = async (page: import("@playwright/test").Page, label: string, step: string) => {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[chat-e2e][behavior] ${ts} ${label}: ${step}`);

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

const saveName = async (page: import("@playwright/test").Page, label: string) => {
  await expect(page.getByLabel("Enter your name")).toBeVisible({ timeout: 15_000 });

  await markBehavior(page, label, `fill displayName=${JSON.stringify(label)}`);
  await page.getByLabel("Enter your name").fill(label);
  await markBehavior(page, label, "click Save");
  await page.getByRole("button", { name: /^(Save|Edit)$/ }).click();

  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 4 })).toContainText(label, { timeout: 20_000 });
};

const waitUntilConnected = async (page: import("@playwright/test").Page) => {
  await expect(page.getByTestId("room-connection-status")).toHaveText(/Connected/i, { timeout: 90_000 });
  await expect(page.getByTestId("room-host-badge")).toBeVisible({ timeout: 90_000 });
};

const createRoomAndEnter = async (page: import("@playwright/test").Page, label: string) => {
  await markBehavior(page, label, "open HomePage");
  await page.goto(`${APP_ORIGIN}/`);
  await saveName(page, label);

  await markBehavior(page, label, "create room: choose game=Catan");
  await page.getByText("Catan").click();
  await expect(page.getByRole("dialog", { name: "Create new room" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Create Room" }).click();
  await expect(page.getByRole("dialog", { name: "Room created" })).toBeVisible({ timeout: 15_000 });

  const shareUrlBox = page.getByRole("dialog", { name: "Room created" }).getByRole("textbox");
  const shareUrl = (await shareUrlBox.inputValue()).trim();
  const match = shareUrl.match(/\/i\/([A-Z0-9]+)$/);
  expect(match, `Expected share url to end with /i/<ROOMID>, got: ${shareUrl}`).toBeTruthy();
  const roomId = match![1]!;

  await markBehavior(page, label, `enter room: ${roomId}`);
  await page.getByRole("button", { name: "Enter room" }).click();
  const baseUrl = page.url().split('/room/')[0];
  await expect(page).toHaveURL(`${baseUrl}/room/${roomId}`);
  await waitUntilConnected(page);

  return roomId;
};

const joinViaInvite = async (page: import("@playwright/test").Page, roomId: string, label: string) => {
  await markBehavior(page, label, `goto invite /i/${roomId}`);
  await page.goto(`${APP_ORIGIN}/i/${roomId}`);
  await expect(page.getByPlaceholder("Paste room URL")).toHaveValue(`${APP_ORIGIN}/i/${roomId}`);

  await saveName(page, label);

  await markBehavior(page, label, "click Join");
  await expect(page.getByRole("button", { name: "Join" })).toBeEnabled();
  await page.getByRole("button", { name: "Join" }).click();
  const baseUrl = page.url().split('/room/')[0];
  await expect(page).toHaveURL(`${baseUrl}/room/${roomId}`, { timeout: 45_000 });
  await waitUntilConnected(page);
};

const isMobileViewport = async (page: import("@playwright/test").Page) => {
  const width = (await page.viewportSize())?.width ?? 1280;
  return width <= 767;
};

const openChat = async (page: import("@playwright/test").Page, label: string) => {
  if (await isMobileViewport(page)) {
    await markBehavior(page, label, "open chat (mobile button)");
    await page.getByRole("button", { name: "Open chat" }).click();
    await expect(page.getByPlaceholder("Type a message…")).toBeVisible({ timeout: 15_000 });
    return;
  }

  await markBehavior(page, label, "open chat (tab)");
  await page.getByRole("tab", { name: /^Chat/i }).click();
  await expect(page.getByPlaceholder("Type a message…")).toBeVisible({ timeout: 15_000 });
};

const closeChat = async (page: import("@playwright/test").Page, label: string) => {
  if (await isMobileViewport(page)) {
    await markBehavior(page, label, "close chat (mobile close)");
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByPlaceholder("Type a message…")).toHaveCount(0);
    return;
  }

  await markBehavior(page, label, "close chat (switch to Participants tab)");
  await page.getByRole("tab", { name: /Participants/ }).click();
  await expect(page.getByPlaceholder("Type a message…")).toHaveCount(0);
};

const expectUnreadBadge = async (page: import("@playwright/test").Page, expected: number) => {
  if (await isMobileViewport(page)) {
    const button = page.getByRole("button", { name: "Open chat" });
    const badgeRoot = button.locator('xpath=ancestor::*[contains(@class,"MuiBadge-root")][1]');
    const badge = badgeRoot.locator('.MuiBadge-badge');

    if (expected === 0) {
      await expect(badge).toHaveCount(0);
      return;
    }

    await expect(badge).toBeVisible({ timeout: 30_000 });
    await expect(badge).toHaveText(String(expected));
    return;
  }

  const chatTab = page.getByRole("tab", { name: /^Chat/i });
  const badge = chatTab.locator('.MuiBadge-badge');

  if (expected === 0) {
    // When `invisible` is true MUI may still render the badge with a hidden class.
    await expect(badge).toHaveCount(1);
    await expect(badge).toBeHidden();
    return;
  }

  await expect(badge).toBeVisible({ timeout: 30_000 });
  await expect(badge).toHaveText(String(expected));
};

const sendChat = async (page: import("@playwright/test").Page, label: string, text: string) => {
  await markBehavior(page, label, `send chat: ${JSON.stringify(text)}`);
  await page.getByPlaceholder("Type a message…").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(text)).toBeVisible({ timeout: 15_000 });
};

type BrowserCase = {
  name: string;
  types: [BrowserType, BrowserType];
  skip?: { reason: string };
};

// NOTE: PeerJS/WebRTC E2E currently cannot be validated in WebKit here.
// Therefore, any "webkit" slot is mapped to "chromium" for now (annotated as "was webkit").
const browserCases: BrowserCase[] = [
  { name: "same:chromium", types: ["chromium", "chromium"] },
  { name: "same:firefox", types: ["firefox", "firefox"] },
  { name: "same:msedge", types: ["msedge", "msedge"] },
  {
    name: "same:chromium (was webkit)",
    types: ["chromium" /* was webkit */, "chromium" /* was webkit */],
    skip: { reason: "Duplicate after WebKit→Chromium mapping (same as same:chromium)" }
  },
  { name: "cross:host=chromium", types: ["chromium", "firefox"] },
  {
    name: "cross:host=chromium (was webkit)",
    types: ["chromium" /* was webkit */, "firefox"],
    skip: { reason: "Duplicate-ish after WebKit→Chromium mapping (covered by cross:host=chromium)" }
  }
];

type LayoutCase = {
  name: string;
  layouts: [LayoutName, LayoutName];
};

const layoutCases: LayoutCase[] = [
  { name: "same:desktop", layouts: ["desktop", "desktop"] },
  { name: "same:tablet", layouts: ["tablet", "tablet"] },
  { name: "same:mobile", layouts: ["mobile", "mobile"] },
  { name: "cross:host=desktop peer=mobile", layouts: ["desktop", "mobile"] },
  { name: "cross:host=tablet peer=mobile", layouts: ["tablet", "mobile"] },
  { name: "cross:host=desktop peer=tablet", layouts: ["desktop", "tablet"] }
];

test.describe("chat panel (PeerJS, host+peer)", () => {
  test.skip(!isPeerJsEnabledForThisRun(), "Requires PeerJS-enabled E2E run. Use: npm run test:e2e:peerjs");

  test.setTimeout(240_000);

  for (const bCase of browserCases) {
    for (const lCase of layoutCases) {
      // Tests: chat sync + unread badges.
      // Steps:
      // 1) Host creates room and enters
      // 2) Peer joins via invite
      // 3) Both open chat and exchange messages (no unread badge)
      // 4) Host closes chat; peer sends; host sees unread badge (1)
      // 5) Host opens chat; asserts message visible; badge clears (0)
      // 6) Peer closes chat; host sends; peer sees unread badge (1)
      // 7) Peer opens chat; asserts message visible; badge clears (0)
      // 8) Both open chat again; send final message; assert no unread badge
      test(`chat: ${bCase.name} × ${lCase.name}`, async ({ browser }) => {
        test.skip(!!bCase.skip, bCase.skip?.reason);
        test.skip(
          bCase.types.includes("webkit"),
          "PeerJS/WebRTC E2E is not supported in WebKit for this suite; map webkit slots to chromium instead."
        );

        const browsersByType = new Map<BrowserType, BrowserHandle>();
        const contexts: import("@playwright/test").BrowserContext[] = [];

        const closeAll = async () => {
          for (const c of contexts) {
            await c.close().catch(() => {});
          }
          for (const handle of browsersByType.values()) {
            if (!handle.owned) continue;
            await handle.browser.close().catch(() => {});
          }
        };

        const users: Array<{
          label: string;
          browserType: BrowserType;
          layout: LayoutName;
          context: import("@playwright/test").BrowserContext;
          page: import("@playwright/test").Page;
          logs: string[];
        }> = [];

        try {
          const projectName = test.info().project.name as BrowserType;
          if (bCase.types.includes(projectName)) {
            browsersByType.set(projectName, { browser, owned: false });
          }

          for (const type of bCase.types) {
            if (browsersByType.has(type)) continue;
            browsersByType.set(type, { browser: await launchByType(type), owned: true });
          }

          const hostBrowserType = bCase.types[0]!;
          const peerBrowserType = bCase.types[1]!;
          const hostLayout = lCase.layouts[0]!;
          const peerLayout = lCase.layouts[1]!;

          const hostContext = await initContext(browsersByType.get(hostBrowserType)!.browser, hostLayout);
          const peerContext = await initContext(browsersByType.get(peerBrowserType)!.browser, peerLayout);
          contexts.push(hostContext, peerContext);

          const hostPage = await hostContext.newPage();
          const peerPage = await peerContext.newPage();

          const hostLogs = attachPeerServiceLogs(hostPage, `Host:${hostBrowserType}:${hostLayout}`);
          const peerLogs = attachPeerServiceLogs(peerPage, `Peer:${peerBrowserType}:${peerLayout}`);

          users.push({
            label: "Host",
            browserType: hostBrowserType,
            layout: hostLayout,
            context: hostContext,
            page: hostPage,
            logs: hostLogs
          });
          users.push({
            label: "Peer",
            browserType: peerBrowserType,
            layout: peerLayout,
            context: peerContext,
            page: peerPage,
            logs: peerLogs
          });

          // Step 1) Host creates room and enters
          const roomId = await createRoomAndEnter(hostPage, "HostUser");

          // Step 2) Peer joins via invite
          await joinViaInvite(peerPage, roomId, "PeerUser");

          // Step 3) Both open chat and exchange messages (no unread badge)
          await openChat(hostPage, "HostUser");
          await openChat(peerPage, "PeerUser");

          await expectUnreadBadge(hostPage, 0);
          await expectUnreadBadge(peerPage, 0);

          await sendChat(hostPage, "HostUser", "hello-from-host");
          await expect(peerPage.getByText("hello-from-host")).toBeVisible({ timeout: 15_000 });
          await expectUnreadBadge(peerPage, 0);

          await sendChat(peerPage, "PeerUser", "hello-from-peer");
          await expect(hostPage.getByText("hello-from-peer")).toBeVisible({ timeout: 15_000 });
          await expectUnreadBadge(hostPage, 0);

          // Step 4) Host closes chat; peer sends; host sees unread badge (1)
          await closeChat(hostPage, "HostUser");
          await sendChat(peerPage, "PeerUser", "ping-when-host-chat-closed");
          await expectUnreadBadge(hostPage, 1);

          // Step 5) Host opens chat; asserts message visible; badge clears (0)
          await openChat(hostPage, "HostUser");
          await expect(hostPage.getByText("ping-when-host-chat-closed")).toBeVisible({ timeout: 15_000 });
          await expectUnreadBadge(hostPage, 0);

          // Step 6) Peer closes chat; host sends; peer sees unread badge (1)
          await closeChat(peerPage, "PeerUser");
          await sendChat(hostPage, "HostUser", "ping-when-peer-chat-closed");
          await expectUnreadBadge(peerPage, 1);

          // Step 7) Peer opens chat; asserts message visible; badge clears (0)
          await openChat(peerPage, "PeerUser");
          await expect(peerPage.getByText("ping-when-peer-chat-closed")).toBeVisible({ timeout: 15_000 });
          await expectUnreadBadge(peerPage, 0);

          // Step 8) Both open chat again; send final message; assert no unread badge
          await openChat(hostPage, "HostUser");
          await openChat(peerPage, "PeerUser");
          await sendChat(hostPage, "HostUser", "final-message");
          await expect(peerPage.getByText("final-message")).toBeVisible({ timeout: 15_000 });
          await expectUnreadBadge(peerPage, 0);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log(`[chat-e2e] failure bCase=${bCase.name} lCase=${lCase.name}`);
          for (const u of users) {
            // eslint-disable-next-line no-console
            console.log(`--- logs: ${u.label} (${u.browserType}, ${u.layout}) ---\n` + u.logs.slice(-250).join("\n"));
          }
          throw err;
        } finally {
          await closeAll();
        }
      });
    }
  }
});
