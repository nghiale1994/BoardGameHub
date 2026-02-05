import { chromium, expect, firefox, test } from "@playwright/test";

const nodeEnv =
  ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env as
    | Record<string, string | undefined>
    | undefined) ?? {};

const APP_ORIGIN = nodeEnv.E2E_APP_ORIGIN ?? "http://127.0.0.1:5173";

const isPeerJsEnabledForThisRun = () => {
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const raw = (env.VITE_E2E_DISABLE_PEERJS ?? "").toLowerCase();
  return raw === "0" || raw === "false";
};

type LayoutName = "desktop" | "tablet" | "mobile";

const layoutOptions: Record<LayoutName, { width: number; height: number; isMobile?: boolean; hasTouch?: boolean }> = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 900, height: 720 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true }
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
    const isBehaviorMarker = /\[(matrix|E2E)\]\[(behavior|membership)\]/i.test(text);
    const isInterestingError =
      type === "error" ||
      type === "warning" ||
      /Failed to (join|create) room|Timed out waiting for host snapshot/i.test(text);
    if (!isPeerService && !isBehaviorMarker && !isInterestingError) return;
    lines.push(`[${label}] [${type}] ${text}`);
    if (lines.length > 250) lines.shift();
  });
  return lines;
};

const markBehavior = async (page: import("@playwright/test").Page, label: string, step: string) => {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[pair][behavior] ${ts} ${label}: ${step}`);
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

const dumpRoomMembership = async (page: import("@playwright/test").Page, label: string, note: string) => {
  const ts = new Date().toISOString();
  const info = await page
    .evaluate(() => {
      const read = (key: string) => localStorage.getItem(`boardgamehub.${key}`);
      const safeParse = (raw: string | null) => {
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      };

      const roomId = safeParse(read("currentRoomId"));
      const meta = safeParse(read("roomMetadata")) as
        | {
            hostId?: string;
            hostClientId?: string;
            players?: Array<{ peerId?: string; clientId?: string; displayName?: string }>;
            spectators?: Array<{ peerId?: string; clientId?: string; displayName?: string }>;
          }
        | null;

      const players = Array.isArray(meta?.players)
        ? meta!.players.map((p) => ({ peerId: p.peerId, clientId: p.clientId, name: p.displayName }))
        : [];
      const spectators = Array.isArray(meta?.spectators)
        ? meta!.spectators.map((s) => ({ peerId: s.peerId, clientId: s.clientId, name: s.displayName }))
        : [];

      const getText = (testId: string) =>
        document.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? null;

      return {
        roomId,
        hostId: meta?.hostId ?? null,
        hostClientId: meta?.hostClientId ?? null,
        playersCount: players.length,
        spectatorsCount: spectators.length,
        players,
        spectators,
        connectionStatus: getText("room-connection-status"),
        hostBadge: getText("room-host-badge")
      };
    })
    .catch((e) => ({ error: String(e) }));

  // eslint-disable-next-line no-console
  console.log(`[pair][membership] ${ts} ${label}: ${note} -> ${JSON.stringify(info)}`);
  await page
    .evaluate(
      ({ ts, label, note, info }) => {
        // eslint-disable-next-line no-console
        console.log(`[E2E][membership] ${ts} ${label}: ${note} -> ${JSON.stringify(info)}`);
      },
      { ts, label, note, info }
    )
    .catch(() => {});
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const openParticipantsAndExpectMembers = async (
  page: import("@playwright/test").Page,
  expected: { minParticipants: number; expectedNames: string[] }
) => {
  const openBtn = page.getByRole("button", { name: "Open participants" });
  const hasMobileParticipantsButton = await openBtn.isVisible().catch(() => false);

  const assertParticipants = async () => {
    const playersLabel = page.getByText(/^Players \(\d+\)$/).first();
    const spectatorsLabel = page.getByText(/^Spectators \(\d+\)$/).first();

    await expect(playersLabel).toBeVisible({ timeout: 30_000 });
    await expect(spectatorsLabel).toBeVisible({ timeout: 30_000 });

    await expect
      .poll(
        async () => {
          const playersRaw = await playersLabel.innerText().catch(() => "");
          const spectatorsRaw = await spectatorsLabel.innerText().catch(() => "");
          const playersMatch = playersRaw.match(/Players \((\d+)\)/);
          const spectatorsMatch = spectatorsRaw.match(/Spectators \((\d+)\)/);
          const players = playersMatch ? Number(playersMatch[1]) : 0;
          const spectators = spectatorsMatch ? Number(spectatorsMatch[1]) : 0;
          return players + spectators;
        },
        { timeout: 60_000 }
      )
      .toBeGreaterThanOrEqual(expected.minParticipants);

    const playersSection = playersLabel.locator("..");
    const spectatorsSection = spectatorsLabel.locator("..");

    for (const name of expected.expectedNames) {
      const namePattern = new RegExp(`^${escapeRegExp(name)}( \\(.+\\))?$`);
      try {
        await expect(playersSection.getByText(namePattern)).toBeVisible({ timeout: 60_000 });
      } catch {
        await expect(spectatorsSection.getByText(namePattern)).toBeVisible({ timeout: 60_000 });
      }
    }
  };

  if (hasMobileParticipantsButton) {
    await openBtn.click();
    await dumpRoomMembership(page, "participants", "after opening mobile participants sheet");
    try {
      await assertParticipants();
    } catch (e) {
      await dumpRoomMembership(page, "participants", "participants assertion failed (mobile)");
      throw e;
    }
    await page.getByRole("button", { name: "Close" }).click();
    return;
  }

  await page.getByRole("tab", { name: /Participants/ }).click();
  await dumpRoomMembership(page, "participants", "after switching to Participants tab");
  try {
    await assertParticipants();
  } catch (e) {
    await dumpRoomMembership(page, "participants", "participants assertion failed (tab)");
    throw e;
  }
};

const joinViaInvite = async (page: import("@playwright/test").Page, roomId: string, name: string) => {
  await page.goto(`${APP_ORIGIN}/i/${roomId}`);
  await expect(page.getByPlaceholder("Paste room URL")).toHaveValue(new RegExp(`/i/${roomId}$`));

  await saveName(page, name);
  await expect(page.getByRole("button", { name: "Join" })).toBeEnabled();
  await dumpRoomMembership(page, name, "before click Join (invite page)");
  await page.getByRole("button", { name: "Join" }).click();
  await dumpRoomMembership(page, name, "after click Join (invite page)");

  await expect(page).toHaveURL(new RegExp(`/room/${roomId}$`), { timeout: 30_000 });
  await expect(page.getByText(/^Room: Catan$/)).toBeVisible({ timeout: 30_000 });

  const status = page.getByTestId("room-connection-status");
  await expect(status).toBeVisible({ timeout: 30_000 });
  await expect(status).toHaveText(/Connected/i, { timeout: 90_000 });
  await expect(page.getByTestId("room-host-badge")).toBeVisible({ timeout: 90_000 });

  await dumpRoomMembership(page, name, "after navigation to room + Connected");
};

test.describe("host migration (PeerJS, pair)", () => {
  test.skip(!isPeerJsEnabledForThisRun(), "Requires PeerJS-enabled E2E run. Use: npm run test:e2e:peerjs");

  test.setTimeout(240_000);

  // Tests: pair takeover then old host rejoins.
  // Steps:
  // 1) Host creates room and enters
  // 2) Peer joins via invite and membership converges
  // 3) Host closes tab to trigger takeover
  // 4) Peer becomes Host and stays Connected
  // 5) Old host rejoins via invite and is admitted
  test("pair: host=chromium(desktop) peer=firefox(mobile) - takeover then old host rejoins", async () => {
    const hostBrowser = await chromium.launch();
    const peerBrowser = await firefox.launch();

    const hostContext = await initContext(hostBrowser, "desktop");
    const peerContext = await initContext(peerBrowser, "mobile");

    const hostPage = await hostContext.newPage();
    const peerPage = await peerContext.newPage();

    const hostLogs = attachPeerServiceLogs(hostPage, "host");
    const peerLogs = attachPeerServiceLogs(peerPage, "peer");
    let hostRejoinLogs: string[] | undefined;

    try {
      // Step 1) Host creates room and enters
      await markBehavior(hostPage, "host", "open HomePage");
      await hostPage.goto(`${APP_ORIGIN}/`);
      await saveName(hostPage, "HostUser");

      await markBehavior(hostPage, "host", "create room: choose game=Catan");
      await hostPage.getByText("Catan").click();
      await expect(hostPage.getByRole("dialog", { name: "Create new room" })).toBeVisible();

      await hostPage.getByRole("button", { name: "Create Room" }).click();
      await expect(hostPage.getByRole("dialog", { name: "Room created" })).toBeVisible();

      const shareUrlBox = hostPage.getByRole("dialog", { name: "Room created" }).getByRole("textbox");
      const shareUrl = (await shareUrlBox.inputValue()).trim();
      const match = shareUrl.match(/\/i\/([A-Z0-9]+)$/);
      expect(match, `Expected share url to end with /i/<ROOMID>, got: ${shareUrl}`).toBeTruthy();
      const roomId = match![1]!;

      await markBehavior(hostPage, "host", `enter room: ${roomId}`);
      await hostPage.getByRole("button", { name: "Enter room" }).click();
      await expect(hostPage).toHaveURL(new RegExp(`/room/${roomId}$`));
      await expect(hostPage.getByText(/^Room: Catan$/)).toBeVisible({ timeout: 15_000 });
      await expect(hostPage.getByTestId("room-host-badge")).toHaveText(/Host/i);
      await dumpRoomMembership(hostPage, "host", "after entering room (host)");

      // Step 2) Peer joins via invite and membership converges
      await markBehavior(peerPage, "peer", `join via invite: ${roomId}`);
      await joinViaInvite(peerPage, roomId, "PeerUser");
      await dumpRoomMembership(hostPage, "host", "after peer join (host view)");
      await openParticipantsAndExpectMembers(peerPage, { minParticipants: 2, expectedNames: ["HostUser", "PeerUser"] });

      // Step 3) Host closes tab to trigger takeover
      await markBehavior(hostPage, "host", "close tab (trigger takeover)");
      await hostPage.close();

      // Step 4) Peer becomes Host and stays Connected
      const startedAt = Date.now();
      while (Date.now() - startedAt < 120_000) {
        const badge = await peerPage.getByTestId("room-host-badge").innerText().catch(() => "");
        if (/host/i.test(badge)) break;
        await peerPage.waitForTimeout(1000);
      }

      await expect(peerPage.getByTestId("room-host-badge")).toHaveText(/Host/i, { timeout: 10_000 });
      await expect(peerPage.getByTestId("room-connection-status")).toHaveText(/Connected/i, { timeout: 45_000 });
      await dumpRoomMembership(peerPage, "peer", "after takeover (peer view)");

      const hostPage2 = await hostContext.newPage();
      hostRejoinLogs = attachPeerServiceLogs(hostPage2, "host-rejoin");

      // Step 5) Old host rejoins via invite and is admitted
      await markBehavior(hostPage2, "host-rejoin", "rejoin via invite after takeover");
      await joinViaInvite(hostPage2, roomId, "HostUser");
      await expect(hostPage2.getByTestId("room-connection-status")).toHaveText(/Connected/i, { timeout: 45_000 });
      await dumpRoomMembership(hostPage2, "host-rejoin", "after rejoin (old host view)");
      await openParticipantsAndExpectMembers(hostPage2, { minParticipants: 2, expectedNames: ["HostUser", "PeerUser"] });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("[pair] host logs:\n" + hostLogs.slice(-250).join("\n"));
      // eslint-disable-next-line no-console
      console.log("[pair] peer logs:\n" + peerLogs.slice(-250).join("\n"));
      // eslint-disable-next-line no-console
      console.log("[pair] host-rejoin logs:\n" + (hostRejoinLogs ?? []).slice(-250).join("\n"));
      throw err;
    } finally {
      await hostContext.close().catch(() => {});
      await peerContext.close().catch(() => {});
      await hostBrowser.close().catch(() => {});
      await peerBrowser.close().catch(() => {});
    }
  });
});
