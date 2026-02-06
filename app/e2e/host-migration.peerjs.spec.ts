import { expect, test } from "@playwright/test";

const isPeerJsEnabledForThisRun = () => {
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const raw = (env.VITE_E2E_DISABLE_PEERJS ?? "").toLowerCase();
  return raw === "0" || raw === "false";
};

test.describe("host migration (PeerJS, multi-context)", () => {
  test.skip(!isPeerJsEnabledForThisRun(), "Requires PeerJS-enabled E2E run. Use: npm run test:e2e:peerjs");

  test.setTimeout(180_000);

  // Tests: room survives host tab close with 4 users.
  // Steps:
  // 1) Host opens HomePage and creates a room (PeerJS path)
  // 2) Capture share invite URL and extract roomId
  // 3) Host enters room and asserts Host badge
  // 4) 3 peers join via invite URL and are admitted
  // 5) Close host context to trigger takeover
  // 6) Wait until exactly one peer becomes Host
  // 7) Assert all peers show Connected
  // 8) Cleanup peer contexts
  test("4 users (1 host, 3 peers) - room survives host tab close", async ({ browser }) => {
    const attachPeerServiceLogs = (page: import("@playwright/test").Page, label: string) => {
      const lines: string[] = [];
      page.on("console", (msg) => {
        const text = msg.text();
        const type = msg.type();
        const isPeerService = text.includes("[PeerService]");
        const isBehaviorMarker = /\[(matrix|E2E)\]\[behavior\]/i.test(text);
        const isInterestingError =
          type === "error" || type === "warning" || /Failed to (join|create) room|Timed out waiting for host snapshot/i.test(text);
        if (!isPeerService && !isBehaviorMarker && !isInterestingError) return;
        lines.push(`[${label}] [${type}] ${text}`);
        if (lines.length > 200) lines.shift();
      });
      return lines;
    };

    const markBehavior = async (page: import("@playwright/test").Page, label: string, step: string) => {
      const ts = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(`[host-migration][behavior] ${ts} ${label}: ${step}`);
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

    const makeContext = async () => {
      const context = await browser.newContext({ locale: "en-US" });
      await context.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem("boardgamehub.language", "en");
      });
      return context;
    };

    const saveName = async (page: import("@playwright/test").Page, name: string) => {
      // `useRoomContext` hydrates displayName from persistence asynchronously on mount.
      // If we click Save before that hydration completes, the late hydration can overwrite
      // the just-saved name and break the name gate.
      await page.waitForFunction(
        () => localStorage.getItem("boardgamehub.displayName") !== null,
        undefined,
        { timeout: 10_000 }
      );

      await page.getByLabel("Enter your name").fill(name);
      await page.getByRole("button", { name: /^(Save|Edit)$/ }).click();

      // The Join gate uses `room.displayName` state. Wait for the UI to reflect the saved name
      // (avoids a Firefox race where Join is clicked before the state updates).
      await expect(page.getByRole("heading", { level: 4 })).toContainText(name, { timeout: 10_000 });

      // `handleJoinRoom` enforces a name gate using the persisted displayName.
      // Wait for storage to reflect the save to avoid flakiness (notably on Firefox).
      await page.waitForFunction(
        () => {
          const raw = localStorage.getItem("boardgamehub.displayName");
          if (!raw) return false;
          try {
            const parsed = JSON.parse(raw);
            return typeof parsed === "string" && parsed.trim().length > 0;
          } catch {
            return raw.trim().length > 0;
          }
        },
        { timeout: 10_000 }
      );
    };

    const hostContext = await makeContext();
    const peer1Context = await makeContext();
    const peer2Context = await makeContext();
    const peer3Context = await makeContext();

    const hostPage = await hostContext.newPage();
    const hostLogs = attachPeerServiceLogs(hostPage, "host");

    // Step 1) Host opens HomePage and creates a room (PeerJS path)
    await markBehavior(hostPage, "host", "open HomePage");
    await hostPage.goto("/");
    await saveName(hostPage, "Host");

    await markBehavior(hostPage, "host", "create room: choose game=Catan");
    await hostPage.getByText("Catan").click();
    await expect(hostPage.getByRole("dialog", { name: "Create new room" })).toBeVisible();

    await hostPage.getByRole("button", { name: "Create Room" }).click();
    await expect(hostPage.getByRole("dialog", { name: "Room created" })).toBeVisible();

    // Step 2) Capture share invite URL and extract roomId
    const shareUrlBox = hostPage.getByRole("dialog", { name: "Room created" }).getByRole("textbox");
    const shareUrl = (await shareUrlBox.inputValue()).trim();
    const match = shareUrl.match(/\/i\/([A-Z0-9]+)$/);
    expect(match, `Expected share url to end with /i/<ROOMID>, got: ${shareUrl}`).toBeTruthy();
    const roomId = match![1]!;

    // Step 3) Host enters room and asserts Host badge
    await markBehavior(hostPage, "host", `enter room: ${roomId}`);
    await hostPage.getByRole("button", { name: "Enter room" }).click();
    const hostBaseUrl = hostPage.url().split('/room/')[0];
    await expect(hostPage).toHaveURL(`${hostBaseUrl}/room/${roomId}`);
    await expect(hostPage.getByText(/^Room: Catan$/)).toBeVisible({ timeout: 15_000 });
    await expect(hostPage.getByTestId("room-host-badge")).toHaveText(/Host/i);

    const joinAsPeer = async (context: import("@playwright/test").BrowserContext, name: string) => {
      const page = await context.newPage();
      const logs = attachPeerServiceLogs(page, name);
      await page.goto(`/i/${roomId}`);

      // Ensure invite URL is hydrated into the JoinRoom form.
      await expect(page.getByPlaceholder("Paste room URL")).toHaveValue(`${APP_ORIGIN}/i/${roomId}`);

      await saveName(page, name);

      await expect(page.getByRole("button", { name: "Join" })).toBeEnabled();
      await page.getByRole("button", { name: "Join" }).click();
      const peerBaseUrl = page.url().split('/room/')[0];
      await expect(page).toHaveURL(`${peerBaseUrl}/room/${roomId}`, { timeout: 15_000 });
      await expect(page.getByText(/^Room: Catan$/)).toBeVisible({ timeout: 15_000 });
      return { page, logs };
    };

    // Step 4) 3 peers join via invite URL and are admitted
    await markBehavior(hostPage, "host", "peers joining (Alice/Bob/Carol)");
    const peer1Joined = await joinAsPeer(peer1Context, "Alice");
    const peer2Joined = await joinAsPeer(peer2Context, "Bob");
    const peer3Joined = await joinAsPeer(peer3Context, "Carol");

    const peer1 = peer1Joined.page;
    const peer2 = peer2Joined.page;
    const peer3 = peer3Joined.page;

    // Sanity: one of the peers should see all 4 players eventually.
    await peer1.getByRole("tab", { name: /Participants/ }).click();
    await expect(peer1.getByText("Players (4)")).toBeVisible({ timeout: 30_000 });

    // Step 5) Close host context to trigger takeover
    await markBehavior(peer1, "peer1", "simulate host crash: close host context");
    await hostContext.close();

    // Step 6) Wait until exactly one peer becomes Host
    const peers = [peer1, peer2, peer3];
    const findHost = async () => {
      const results = await Promise.all(
        peers.map(async (page) => {
          const text = await page.getByTestId("room-host-badge").innerText().catch(() => "");
          return /host/i.test(text);
        })
      );
      const hostIndexes = results.map((isHost, idx) => (isHost ? idx : -1)).filter((idx) => idx >= 0);
      return hostIndexes;
    };

    let hostIndexes: number[] = [];
    const startedAt = Date.now();
    while (Date.now() - startedAt < 120_000) {
      hostIndexes = await findHost();
      if (hostIndexes.length === 1) break;
      await peers[0].waitForTimeout(1000);
    }

    if (hostIndexes.length !== 1) {
      const peersWithLogs = [peer1Joined, peer2Joined, peer3Joined];
      // eslint-disable-next-line no-console
      console.log("[host-migration] No host elected within timeout");
      for (const entry of peersWithLogs) {
        const status = await entry.page.getByTestId("room-connection-status").innerText().catch(() => "");
        const badge = await entry.page.getByTestId("room-host-badge").innerText().catch(() => "");

        const persisted = await entry.page
          .evaluate(() => {
            const get = (k: string) => localStorage.getItem(k);
            const snapshotRaw = get("boardgamehub.roomSnapshot");
            const metadataRaw = get("boardgamehub.roomMetadata");
            return {
              activePeerId: get("boardgamehub.activePeerId"),
              currentRoomId: get("boardgamehub.currentRoomId"),
              hasSnapshot: Boolean(snapshotRaw),
              snapshotBytes: snapshotRaw?.length ?? 0,
              hasMetadata: Boolean(metadataRaw),
              metadataBytes: metadataRaw?.length ?? 0
            };
          })
          .catch(() => null);

        // eslint-disable-next-line no-console
        console.log(`[host-migration] peer=${badge} status=${status} persisted=${JSON.stringify(persisted)}`);
        // eslint-disable-next-line no-console
        console.log(entry.logs.slice(-200).join("\n"));
      }
      // eslint-disable-next-line no-console
      console.log(hostLogs.slice(-200).join("\n"));
    }

    expect(hostIndexes.length).toBe(1);

    const newHost = peers[hostIndexes[0]!];
    await expect(newHost.getByTestId("room-connection-status")).toHaveText(/Connected/i, { timeout: 30_000 });

    // Step 7) Assert all peers show Connected
    // Everyone should eventually reconnect to the new host (Connected).
    for (const p of peers) {
      await expect(p.getByTestId("room-connection-status")).toHaveText(/Connected/i, { timeout: 45_000 });
    }

    // Step 8) Cleanup peer contexts
    await peer1Context.close();
    await peer2Context.close();
    await peer3Context.close();
  });
});
