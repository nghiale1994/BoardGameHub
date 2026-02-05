import { chromium, expect, firefox, test, webkit } from "@playwright/test";

const nodeEnv =
  ((globalThis as unknown as { process?: { env?: Record<string, string | undefined>; platform?: string } }).process?.env as
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

const logPeerIds = async (page: import("@playwright/test").Page, label: string) => {
  const snapshot = await page
    .evaluate(() => {
      const readJson = (key: string) => {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return raw;
        }
      };

      return {
        url: location.href,
        currentRoomId: readJson("boardgamehub.currentRoomId"),
        devicePeerId: readJson("boardgamehub.devicePeerId"),
        activePeerId: readJson("boardgamehub.activePeerId")
      };
    })
    .catch(() => null);

  // eslint-disable-next-line no-console
  console.log(`[matrix][peerIds] ${label}: ` + JSON.stringify(snapshot));
};

const attachPeerServiceLogs = (page: import("@playwright/test").Page, label: string) => {
  const lines: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    const isPeerService = text.includes("[PeerService]");
    const isBehaviorMarker = /\[(matrix|E2E)\]\[behavior\]/i.test(text);
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

const markBehavior = async (
  page: import("@playwright/test").Page,
  label: string,
  step: string
) => {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[matrix][behavior] ${ts} ${label}: ${step}`);

  await page
    .evaluate(
      ({ ts, label, step }) => {
        // This goes into the page console so it gets captured alongside PeerService logs.
        // eslint-disable-next-line no-console
        console.log(`[E2E][behavior] ${ts} ${label}: ${step}`);
      },
      { ts, label, step }
    )
    .catch(() => {
      // page may be closing
    });
};

const saveName = async (page: import("@playwright/test").Page, name: string) => {
  const input = page.getByLabel("Enter your name");
  const saveOrEditButton = page.getByRole("button", { name: /^(Save|Edit)$/ });
  const heading = page.getByRole("heading", { level: 4 });

  await expect(input).toBeVisible({ timeout: 15_000 });

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    await input.fill(name);
    await expect.poll(async () => await input.inputValue().catch(() => ""), { timeout: 2_000 }).toBe(name);
    await saveOrEditButton.scrollIntoViewIfNeeded().catch(() => {});
    await saveOrEditButton.click();

    const headingText = await heading.innerText().catch(() => "");
    const hasName = headingText.includes(name);
    const hasEdit = await page.getByRole("button", { name: "Edit" }).isVisible().catch(() => false);
    if (hasName || hasEdit) return;

    await page.waitForTimeout(250);
  }

  await expect(heading).toContainText(name, { timeout: 5_000 });
};

const joinViaInvite = async (page: import("@playwright/test").Page, roomId: string, name: string) => {
  await page.goto(`${APP_ORIGIN}/i/${roomId}`);
  await expect(page.getByPlaceholder("Paste room URL")).toHaveValue(new RegExp(`/i/${roomId}$`));

  await saveName(page, name);
  await expect(page.getByRole("button", { name: "Join" })).toBeEnabled();
  await page.getByRole("button", { name: "Join" }).click();

  await expect(page).toHaveURL(new RegExp(`/room/${roomId}$`), { timeout: 45_000 });

  const roomStatus = page.getByTestId("room-connection-status");
  const homeJoinUrl = page.getByPlaceholder("Paste room URL");

  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    const inRoomUrl = page.url().includes(`/room/${roomId}`);
    const statusVisible = await roomStatus.isVisible().catch(() => false);
    if (statusVisible) break;

    const homeVisible = await homeJoinUrl.isVisible().catch(() => false);
    if (homeVisible && !inRoomUrl) {
      throw new Error(`Join redirected home before room UI became ready (url=${page.url()})`);
    }

    await page.waitForTimeout(250);
  }

  await expect(roomStatus).toBeVisible({ timeout: 5_000 });

  await expect(roomStatus).toHaveText(/Connected/i, { timeout: 90_000 });
  await expect(page.getByTestId("room-host-badge")).toBeVisible({ timeout: 90_000 });
};

const openParticipantsAndExpectPlayers = async (page: import("@playwright/test").Page, expectedPlayersText: RegExp) => {
  const width = (await page.viewportSize())?.width ?? 1280;
  if (width <= 767) {
    await page.getByRole("button", { name: "Open participants" }).click();
    await expect(page.getByText(expectedPlayersText)).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "Close" }).click();
  } else {
    await page.getByRole("tab", { name: /Participants/ }).click();
    await expect(page.getByText(expectedPlayersText)).toBeVisible({ timeout: 45_000 });
  }
};

const ensureAllConnected = async (pages: Array<import("@playwright/test").Page>) => {
  for (const page of pages) {
    await expect(page.getByTestId("room-connection-status")).toHaveText(/Connected/i, { timeout: 60_000 });
  }
};

const findHostIndex = async (pages: Array<import("@playwright/test").Page>) => {
  const flags = await Promise.all(
    pages.map(async (p) => {
      const text = await p.getByTestId("room-host-badge").innerText().catch(() => "");
      return /host/i.test(text);
    })
  );
  const idxs = flags.map((isHost, idx) => (isHost ? idx : -1)).filter((idx) => idx >= 0);
  return idxs;
};

const waitForExactlyOneHost = async (pages: Array<import("@playwright/test").Page>, timeoutMs = 120_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const idxs = await findHostIndex(pages);
    if (idxs.length === 1) return idxs[0]!;
    await pages[0]!.waitForTimeout(1000);
  }
  return null;
};

type User = {
  label: string;
  browserType: BrowserType;
  layout: LayoutName;
  browser: import("@playwright/test").Browser;
  context: import("@playwright/test").BrowserContext;
  page: import("@playwright/test").Page;
  logs: string[];
};

type BrowserHandle = {
  browser: import("@playwright/test").Browser;
  owned: boolean;
};

type BrowserCase = {
  name: string;
  types: [BrowserType, BrowserType, BrowserType, BrowserType];
  skip?: { reason: string };
};

// NOTE: PeerJS E2E currently cannot be validated in WebKit here.
// - Playwright WebKit on Windows does not support WebRTC.
// - Even outside Windows, PeerJS/WebRTC E2E behavior in WebKit is not currently supported by this suite.
// Therefore, any "webkit" slot is mapped to "chromium" for now (annotated as "was webkit").
// We keep 1 host + 3 peers in all cases.
const browserCases: BrowserCase[] = [
  { name: "same:chromium", types: ["chromium", "chromium", "chromium", "chromium"] },
  { name: "same:firefox", types: ["firefox", "firefox", "firefox", "firefox"] },
  { name: "same:msedge", types: ["msedge", "msedge", "msedge", "msedge"] },
  {
    name: "same:chromium (was webkit)",
    types: ["chromium", "chromium", "chromium", "chromium" /* was webkit */],
    skip: { reason: "Duplicate after WebKit→Chromium mapping (same as same:chromium)" }
  },
  // cross-browser: 4 users, host rotates (webkit slot replaced with chromium)
  { name: "cross:host=chromium", types: ["chromium", "firefox", "msedge", "chromium" /* was webkit */] },
  { name: "cross:host=firefox", types: ["firefox", "chromium", "msedge", "chromium" /* was webkit */] },
  { name: "cross:host=msedge", types: ["msedge", "chromium", "firefox", "chromium" /* was webkit */] },
  {
    name: "cross:host=chromium (was webkit)",
    types: ["chromium" /* was webkit */, "chromium", "firefox", "msedge"],
    skip: { reason: "Duplicate-ish after WebKit→Chromium mapping (covered by cross:host=chromium)" }
  }
];

const layoutCases: Array<{ name: string; layouts: [LayoutName, LayoutName, LayoutName, LayoutName] }> = [
  { name: "same:desktop", layouts: ["desktop", "desktop", "desktop", "desktop"] },
  { name: "same:tablet", layouts: ["tablet", "tablet", "tablet", "tablet"] },
  { name: "same:mobile", layouts: ["mobile", "mobile", "mobile", "mobile"] },
  // mixed: host layout fixed, peers cover remaining; one duplicate because 4 users / 3 layouts
  { name: "mixed:host=desktop", layouts: ["desktop", "tablet", "mobile", "mobile"] },
  { name: "mixed:host=tablet", layouts: ["tablet", "desktop", "mobile", "desktop"] },
  { name: "mixed:host=mobile", layouts: ["mobile", "desktop", "tablet", "tablet"] }
];

test.describe("host migration (PeerJS, matrix)", () => {
  test.skip(!isPeerJsEnabledForThisRun(), "Requires PeerJS-enabled E2E run. Use: npm run test:e2e:peerjs");

  test.setTimeout(360_000);

  for (const bCase of browserCases) {
    for (const lCase of layoutCases) {
      // Tests: bundled host-migration behaviors across browser/layout matrix.
      // Steps:
      // 1) Launch the required browsers (dedupe by type)
      // 2) Create contexts/pages per user
      // 3) Host creates room and enters
      // 4) Peers join via invite and all users become Connected
      // 5) Execute 5 host-migration behaviors (leave/close/rejoin timing)
      // 6) Assert room survives and membership converges (Players (4))
      test(`matrix: ${bCase.name} × ${lCase.name} (5 behaviors bundled)`, async ({ browser }) => {
        test.skip(!!bCase.skip, bCase.skip?.reason);

        // Safety guard: this suite currently does not run WebKit (see NOTE above).
        test.skip(
          bCase.types.includes("webkit"),
          "PeerJS/WebRTC E2E is not supported in WebKit for this suite; map webkit slots to chromium instead."
        );

        const names = ["Host", "PeerA", "PeerB", "PeerC"] as const;

        const browsersByType = new Map<BrowserType, BrowserHandle>();
        const contexts: import("@playwright/test").BrowserContext[] = [];

        const users: User[] = [];

        const closeAll = async () => {
          for (const u of users) {
            await u.page.close().catch(() => {});
          }
          for (const c of contexts) {
            await c.close().catch(() => {});
          }
          for (const handle of browsersByType.values()) {
            if (!handle.owned) continue;
            await handle.browser.close().catch(() => {});
          }
        };

        try {
          const projectName = test.info().project.name as BrowserType;
          if (bCase.types.includes(projectName)) {
            // The `browser` fixture is owned by Playwright; do not close it manually.
            browsersByType.set(projectName, { browser, owned: false });
          }

          // Step 1) Launch the required browsers (dedupe by type)
          for (const type of bCase.types) {
            if (browsersByType.has(type)) continue;
            browsersByType.set(type, { browser: await launchByType(type), owned: true });
          }

          // Step 2) Create contexts/pages per user
          for (let i = 0; i < 4; i += 1) {
            const browserType = bCase.types[i]!;
            const layout = lCase.layouts[i]!;
            const browser = browsersByType.get(browserType)!.browser;

            const context = await initContext(browser, layout);
            contexts.push(context);

            const page = await context.newPage();
            const logs = attachPeerServiceLogs(page, `${names[i]}:${browserType}:${layout}`);

            users.push({
              label: names[i]!,
              browserType,
              layout,
              browser,
              context,
              page,
              logs
            });
          }

          const host = users[0]!;

          // Step 3) Host creates room and enters
          await markBehavior(host.page, host.label, "open HomePage");
          await host.page.goto(`${APP_ORIGIN}/`);
          await saveName(host.page, host.label);

          await markBehavior(host.page, host.label, "create room: choose game=Catan");
          await host.page.getByText("Catan").click();
          await expect(host.page.getByRole("dialog", { name: "Create new room" })).toBeVisible({ timeout: 15_000 });
          await host.page.getByRole("button", { name: "Create Room" }).click();
          await expect(host.page.getByRole("dialog", { name: "Room created" })).toBeVisible({ timeout: 15_000 });

          const shareUrlBox = host.page.getByRole("dialog", { name: "Room created" }).getByRole("textbox");
          const shareUrl = (await shareUrlBox.inputValue()).trim();
          const match = shareUrl.match(/\/i\/([A-Z0-9]+)$/);
          expect(match, `Expected share url to end with /i/<ROOMID>, got: ${shareUrl}`).toBeTruthy();
          const roomId = match![1]!;

          await markBehavior(host.page, host.label, `enter room: ${roomId}`);
          await host.page.getByRole("button", { name: "Enter room" }).click();
          await expect(host.page).toHaveURL(new RegExp(`/room/${roomId}$`));
          await expect(host.page.getByTestId("room-host-badge")).toHaveText(/Host/i, { timeout: 60_000 });
          await expect(host.page.getByTestId("room-connection-status")).toHaveText(/Connected/i, { timeout: 60_000 });
          await logPeerIds(host.page, `Host:${bCase.types[0]}:${lCase.layouts[0]}`);

          // Give the host runtime a moment to fully wire up room event handlers before peers join.
          await openParticipantsAndExpectPlayers(host.page, /Players \(1\)/);
          await host.page.waitForTimeout(750);

          // Step 4) Peers join via invite and all users become Connected
          for (const peer of users.slice(1)) {
            await markBehavior(peer.page, peer.label, `join via invite: ${roomId}`);
            await joinViaInvite(peer.page, roomId, peer.label);
            await logPeerIds(peer.page, `${peer.label}:${peer.browserType}:${peer.layout}`);
          }

          await openParticipantsAndExpectPlayers(users[1]!.page, /Players \(4\)/);
          await Promise.all(users.map((u) => logPeerIds(u.page, `${u.label}:post-join`)));
          await ensureAllConnected(users.map((u) => u.page));

          // Step 5) Execute 5 host-migration behaviors (leave/close/rejoin timing)
          // --- Behaviors bundled (5) ---

          // Behavior 1: host leaves room then rejoins immediately
          {
            const idx = await waitForExactlyOneHost(users.map((u) => u.page));
            expect(idx, "Expected exactly one host before behavior 1").not.toBeNull();
            if (idx === null) throw new Error("Expected exactly one host before behavior 1");
            const hostUser = users[idx]!;

            await markBehavior(hostUser.page, hostUser.label, "behavior1: host clicks Leave");
            await hostUser.page.getByRole("button", { name: "Leave" }).click();
            await expect(hostUser.page).toHaveURL(new RegExp(`${APP_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`));

            await markBehavior(hostUser.page, hostUser.label, "behavior1: host rejoins via invite");
            await joinViaInvite(hostUser.page, roomId, hostUser.label);
            await ensureAllConnected(users.map((u) => u.page));
          }

          // Behavior 2: host closes tab then rejoins immediately
          {
            const hostIdx = await waitForExactlyOneHost(users.map((u) => u.page));
            expect(hostIdx, "Expected exactly one host before behavior 2").not.toBeNull();
            if (hostIdx === null) throw new Error("Expected exactly one host before behavior 2");
            const hostUser = users[hostIdx]!;

            await markBehavior(hostUser.page, hostUser.label, "behavior2: host closes tab");
            await hostUser.page.close();
            hostUser.page = await hostUser.context.newPage();
            hostUser.logs = attachPeerServiceLogs(hostUser.page, `${hostUser.label}:reopen-immediate`);

            await markBehavior(hostUser.page, hostUser.label, "behavior2: host rejoins via invite (immediate)");
            await joinViaInvite(hostUser.page, roomId, hostUser.label);
            await ensureAllConnected(users.map((u) => u.page));
          }

          // Behavior 3: host closes tab, takeover occurs, then old host rejoins
          {
            const hostIdx = await waitForExactlyOneHost(users.map((u) => u.page));
            expect(hostIdx, "Expected exactly one host before behavior 3").not.toBeNull();
            if (hostIdx === null) throw new Error("Expected exactly one host before behavior 3");
            const oldHost = users[hostIdx]!;

            await markBehavior(oldHost.page, oldHost.label, "behavior3: old host closes tab (trigger takeover)");
            await oldHost.page.close();

            const remainingPages = users.filter((u) => u !== oldHost).map((u) => u.page);
            const newHostIndexInRemaining = await waitForExactlyOneHost(remainingPages);
            expect(newHostIndexInRemaining, "Expected a new host to be elected after host tab close").not.toBeNull();

            oldHost.page = await oldHost.context.newPage();
            oldHost.logs = attachPeerServiceLogs(oldHost.page, `${oldHost.label}:reopen-after-takeover`);

            await markBehavior(oldHost.page, oldHost.label, "behavior3: old host rejoins after takeover");
            await joinViaInvite(oldHost.page, roomId, oldHost.label);
            await ensureAllConnected(users.map((u) => u.page));
          }

          // Pick a non-host peer (any) at this point
          const hostIdxNow = await waitForExactlyOneHost(users.map((u) => u.page));
          expect(hostIdxNow, "Expected exactly one host before behaviors 4/5").not.toBeNull();
          if (hostIdxNow === null) throw new Error("Expected exactly one host before behaviors 4/5");
          const pickPeer = () => users.find((_, idx) => idx !== hostIdxNow) ?? users[1]!;

          // Behavior 4: peer leaves room then rejoins after 10s
          {
            const peerUser = pickPeer();

            await markBehavior(peerUser.page, peerUser.label, "behavior4: peer clicks Leave");
            await peerUser.page.getByRole("button", { name: "Leave" }).click();
            await expect(peerUser.page).toHaveURL(new RegExp(`${APP_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`));

            await markBehavior(users[hostIdxNow]!.page, users[hostIdxNow]!.label, "behavior4: wait 10s before peer rejoins");
            await users[hostIdxNow]!.page.waitForTimeout(10_000);

            await markBehavior(peerUser.page, peerUser.label, "behavior4: peer rejoins via invite after 10s");
            await joinViaInvite(peerUser.page, roomId, peerUser.label);
            await ensureAllConnected(users.map((u) => u.page));
          }

          // Behavior 5: peer closes tab then rejoins after 10s
          {
            const peerUser = pickPeer();

            await markBehavior(peerUser.page, peerUser.label, "behavior5: peer closes tab");
            await peerUser.page.close();
            await markBehavior(users[hostIdxNow]!.page, users[hostIdxNow]!.label, "behavior5: wait 10s before peer rejoins");
            await users[hostIdxNow]!.page.waitForTimeout(10_000);

            peerUser.page = await peerUser.context.newPage();
            peerUser.logs = attachPeerServiceLogs(peerUser.page, `${peerUser.label}:reopen-after-10s`);

            await markBehavior(peerUser.page, peerUser.label, "behavior5: peer rejoins via invite after 10s");
            await joinViaInvite(peerUser.page, roomId, peerUser.label);
            await ensureAllConnected(users.map((u) => u.page));
          }

          // Step 6) Assert room survives and membership converges (Players (4))
          // Final sanity: still 4 players listed
          await openParticipantsAndExpectPlayers(users[1]!.page, /Players \(4\)/);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log(`[matrix] failure bCase=${bCase.name} lCase=${lCase.name}`);
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
