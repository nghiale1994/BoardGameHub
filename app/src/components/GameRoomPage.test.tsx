import { describe, expect, test, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { GameRoomPage } from "./GameRoomPage";
import type { RoomUIModel } from "../services/roomUiProjection";
import type { ChatMessage } from "../utils/chat";
import { renderWithI18n } from "../test/render";

vi.mock("../services/peerService", () => ({
  peerService: {
    onEvent: vi.fn(() => () => undefined)
  }
}));

const setMatchMedia = (matchesByQuery: Record<string, boolean>) => {
  window.matchMedia = (query: string) =>
    ({
      matches: Boolean(matchesByQuery[query]),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }) as unknown as MediaQueryList;
};

const makeUi = (partial?: Partial<RoomUIModel>): RoomUIModel => ({
  roomId: "ROOM123",
  gameId: "catan",
  phase: "setup",
  canToggleRole: true,
  isHost: false,
  connectionStatus: "connected",
  hostId: "ROOM123",
  hostName: "Host",
  self: {
    peerId: "peer_self",
    clientId: "client_self",
    displayName: "Alice",
    role: "player",
    isSpectator: false
  },
  members: {
    players: [
      {
        peerId: "ROOM123",
        clientId: "client_host",
        displayName: "Host",
        role: "host",
        isSelf: false,
        isHost: true,
        status: "connected"
      },
      {
        peerId: "peer_self",
        clientId: "client_self",
        displayName: "Alice",
        role: "player",
        isSelf: true,
        isHost: false,
        status: "connected"
      }
    ],
    spectators: [
      {
        peerId: "peer_spec",
        clientId: "client_spec",
        displayName: "Bob",
        role: "spectator",
        isSelf: false,
        isHost: false,
        status: "reconnecting"
      }
    ],
    totalCount: 3
  },
  ...partial
});

describe("GameRoomPage", () => {
  beforeEach(() => {
    setMatchMedia({ "(max-width: 767px)": false });
  });

  // Tests: participants list renders split sections and self marker.
  // Steps:
  // 1) render with default UI
  // 2) assert Players/Spectators section counts
  // 3) assert self marker "(me)" is present
  // 4) assert host appears in list
  test("renders participants split and self marker", async () => {
    console.log("[test] GameRoomPage participants split + self marker");
    const ui = makeUi();

    // Step 1) render with default UI
    await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={[]}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) assert Players/Spectators section counts
    expect(screen.getByText("Players (2)")).toBeInTheDocument();
    expect(screen.getByText("Spectators (1)")).toBeInTheDocument();

    // Step 3) assert self marker "(me)" is present
    expect(screen.getByText("Alice (me)")).toBeInTheDocument();

    // Step 4) assert host appears in list
    expect(screen.getAllByText("Host").length).toBeGreaterThan(0);
  });

  // Tests: connection status chip mapping.
  // Steps:
  // 1) render with reconnecting connectionStatus
  // 2) assert the chip label maps correctly
  test("connection status chip maps correctly", async () => {
    console.log("[test] GameRoomPage connection status chip mapping");
    const ui = makeUi({ connectionStatus: "reconnecting" });

    // Step 1) render with reconnecting connectionStatus
    await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={[]}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) assert the chip label maps correctly
    expect(screen.getByText("🟡 Reconnecting")).toBeInTheDocument();
  });

  // Tests: invite link copy flow.
  // Steps:
  // 1) set up clipboard mock
  // 2) render default UI
  // 3) click "Copy invite link"
  // 4) assert clipboard called and toast shown
  test("copy invite link writes to clipboard and shows toast", async () => {
    console.log("[test] GameRoomPage invite link copy + toast");
    const ui = makeUi();

    // Step 1) set up clipboard mock
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    // Step 2) render default UI
    await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={[]}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 3) click "Copy invite link"
    fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }));

    // Step 4) assert clipboard called and toast shown
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/i\/ROOM123$/));
    expect(await screen.findByText("Invite link copied!")).toBeInTheDocument();
  });

  // Tests: chat filter flags hide user/move while system remains visible.
  // Steps:
  // 1) render with mixed system/user/move messages
  // 2) open the Chat tab
  // 3) assert user + move + system are visible
  // 4) rerender with conversation/events flags off
  // 5) assert user + move are hidden while system remains visible
  test("chat filters hide user and move messages, while system stays visible", async () => {
    console.log("[test] GameRoomPage chat filtering flags");
    const ui = makeUi();

    const messages: ChatMessage[] = [
      {
        id: "s1",
        timestamp: 0,
        type: "system",
        kind: "joined",
        actorName: "Alice"
      },
      {
        id: "u1",
        timestamp: 0,
        type: "user",
        senderId: "peer_other",
        senderName: "Carol",
        isSpectator: false,
        text: "hello"
      },
      {
        id: "m1",
        timestamp: 0,
        type: "move",
        actorName: "Carol",
        actionText: "placed a tile"
      }
    ];

    // Step 1) render with mixed system/user/move messages
    const { rerender } = await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={messages}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) open the Chat tab
    fireEvent.click(screen.getByRole("tab", { name: /^Chat/i }));

    // Step 3) assert user + move + system are visible
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText(/Carol.*placed a tile/i)).toBeInTheDocument();
    expect(screen.getByText("Alice joined the room")).toBeInTheDocument();

    // Step 4) rerender with conversation/events flags off
    rerender(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={messages}
        onSendChat={vi.fn()}
        showConversation={false}
        showGameEvents={false}
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    // Step 5) assert user + move are hidden while system remains visible
    expect(screen.queryByText("hello")).toBeNull();
    expect(screen.queryByText(/Carol.*placed a tile/i)).toBeNull();
    expect(screen.getByText("Alice joined the room")).toBeInTheDocument();
  });

  // Tests: spectator user messages are labeled with localized spectator prefix.
  // Steps:
  // 1) render a spectator `type:'user'` message
  // 2) open the Chat tab
  // 3) assert spectator prefix + message text
  test("chat renders spectator prefix for spectator user messages", async () => {
    console.log("[test] GameRoomPage spectator chat label");
    const ui = makeUi();

    const messages: ChatMessage[] = [
      {
        id: "u_spec",
        timestamp: 0,
        type: "user",
        senderId: "peer_other",
        senderName: "Carol",
        isSpectator: true,
        text: "hello from the stands"
      }
    ];

    // Step 1) render a spectator `type:'user'` message
    await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={messages}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) open the Chat tab
    fireEvent.click(screen.getByRole("tab", { name: /^Chat/i }));

    // Step 3) assert spectator prefix + message text
    expect(screen.getByText("[Spectator] Carol")).toBeInTheDocument();
    expect(screen.getByText("hello from the stands")).toBeInTheDocument();
  });

  // Tests: unread badge increments only when chat is hidden and a new user message arrives from someone else; opening chat resets badge.
  // Steps:
  // 1) render with baseline user message (chat hidden)
  // 2) rerender with a new user message from someone else
  // 3) assert badge=1 on Chat tab
  // 4) open Chat tab
  // 5) assert badge resets/hidden
  test("unread badge increments when chat hidden and resets when chat becomes visible (PC/Tablet)", async () => {
    console.log("[test] GameRoomPage unread badge (PC/Tablet)");
    const ui = makeUi();

    const baseline: ChatMessage[] = [
      {
        id: "u_old",
        timestamp: 0,
        type: "user",
        senderId: "peer_other",
        senderName: "Carol",
        isSpectator: false,
        text: "old"
      }
    ];

    // Step 1) render with baseline user message (chat hidden)
    const { rerender } = await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={baseline}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    const updated: ChatMessage[] = [
      ...baseline,
      {
        id: "u_new",
        timestamp: 1,
        type: "user",
        senderId: "peer_other",
        senderName: "Carol",
        isSpectator: false,
        text: "new"
      }
    ];

    // Step 2) rerender with a new user message from someone else
    rerender(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={updated}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    // Step 3) assert badge=1 on Chat tab
    const chatTab = screen.getByRole("tab", { name: /^Chat/i });
    await waitFor(() => {
      const badge = chatTab.querySelector(".MuiBadge-badge");
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe("1");
      expect(badge?.className).not.toMatch(/MuiBadge-invisible/);
    });

    // Step 4) open Chat tab
    fireEvent.click(chatTab);
    await waitFor(() => {
      // Step 5) assert badge resets/hidden
      const badge = chatTab.querySelector(".MuiBadge-badge");
      expect(badge === null || /MuiBadge-invisible/.test(badge.className)).toBe(true);
    });
  });

  // Tests: unread badge increments on mobile chat button when sheet is closed; opening the chat sheet resets/hides the badge.
  // Steps:
  // 1) set mobile breakpoint
  // 2) render with baseline user message
  // 3) rerender with new user message while sheet is closed
  // 4) assert badge=1 on the mobile chat button
  // 5) click "Open chat"
  // 6) assert badge hidden
  test("unread badge increments when chat hidden and resets when chat becomes visible (Mobile)", async () => {
    console.log("[test] GameRoomPage unread badge (Mobile)");

    // Step 1) set mobile breakpoint
    setMatchMedia({ "(max-width: 767px)": true });
    const ui = makeUi();

    const baseline: ChatMessage[] = [
      {
        id: "u_old",
        timestamp: 0,
        type: "user",
        senderId: "peer_other",
        senderName: "Carol",
        isSpectator: false,
        text: "old"
      }
    ];

    // Step 2) render with baseline user message
    const { rerender } = await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={baseline}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    const updated: ChatMessage[] = [
      ...baseline,
      {
        id: "u_new",
        timestamp: 1,
        type: "user",
        senderId: "peer_other",
        senderName: "Carol",
        isSpectator: false,
        text: "new"
      }
    ];

    // Step 3) rerender with new user message while sheet is closed
    rerender(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={updated}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    // Step 4) assert badge=1 on the mobile chat button
    const openChatButton = screen.getByRole("button", { name: "Open chat" });
    await waitFor(() => {
      const badgeRoot = openChatButton.closest(".MuiBadge-root");
      const badge = badgeRoot?.querySelector(".MuiBadge-badge");
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe("1");
      expect(badge?.className).not.toMatch(/MuiBadge-invisible/);
    });

    // Step 5) click "Open chat"
    fireEvent.click(openChatButton);
    await screen.findByPlaceholderText(/Type a message/i);

    // Step 6) assert badge hidden
    await waitFor(() => {
      const badgeRoot = openChatButton.closest(".MuiBadge-root");
      const badge = badgeRoot?.querySelector(".MuiBadge-badge");
      expect(badge === null || /MuiBadge-invisible/.test(badge.className)).toBe(true);
    });
  });

  // Tests: layout invariant - message list scrolls while composer remains separate.
  // Steps:
  // 1) render with many messages
  // 2) open the Chat tab
  // 3) assert message list is scrollable and composer is present
  test("layout invariants: message list scrolls and composer remains separate", async () => {
    console.log("[test] GameRoomPage chat layout invariants");
    const ui = makeUi();

    const messages: ChatMessage[] = Array.from({ length: 30 }).map((_, i) => ({
      id: `u_${i}`,
      timestamp: 0,
      type: "user" as const,
      senderId: "peer_other",
      senderName: "Carol",
      isSpectator: false,
      text: `msg ${i}`
    }));

    // Step 1) render with many messages
    await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={messages}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) open the Chat tab
    fireEvent.click(screen.getByRole("tab", { name: /^Chat/i }));

    // Step 3) assert message list is scrollable and composer is present
    expect(screen.getByTestId("chat-message-list")).toHaveStyle({ overflowY: "auto" });
    expect(screen.getByTestId("chat-composer")).toBeInTheDocument();
  });

  // Tests: role toggle disables when canToggleRole=false.
  // Steps:
  // 1) render with ui.canToggleRole=false
  // 2) assert role toggle button is disabled
  test("role toggle is disabled when ui.canToggleRole is false", async () => {
    console.log("[test] GameRoomPage role toggle disabled when cannot toggle");
    const ui = makeUi({ canToggleRole: false });

    // Step 1) render with ui.canToggleRole=false
    await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={[]}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) assert role toggle button is disabled
    const button = screen.getByRole("button", { name: /spectator|khán giả/i });
    expect(button).toBeDisabled();
  });

  // Tests: phase badge label mapping.
  // Steps:
  // 1) render with finished phase
  // 2) assert phase badge label
  test("phase badge label maps setup/playing/finished", async () => {
    console.log("[test] GameRoomPage phase badge label mapping");
    const ui = makeUi({ phase: "finished" });

    // Step 1) render with finished phase
    await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={[]}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) assert phase badge label
    expect(screen.getByText("Finished")).toBeInTheDocument();
  });

  // Tests: mobile renders floating chat + participants open buttons.
  // Steps:
  // 1) set mobile breakpoint
  // 2) render default UI
  // 3) assert floating buttons are present
  test("mobile renders floating chat button and participants icon button", async () => {
    console.log("[test] GameRoomPage mobile floating buttons");

    // Step 1) set mobile breakpoint
    setMatchMedia({ "(max-width: 767px)": true });
    const ui = makeUi();

    // Step 2) render default UI
    await renderWithI18n(
      <GameRoomPage
        ui={ui}
        onRequestRoleChange={vi.fn()}
        messages={[]}
        onSendChat={vi.fn()}
        showConversation
        showGameEvents
        onOpenSettings={vi.fn()}
        onLeave={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 3) assert floating buttons are present
    expect(screen.getByRole("button", { name: "Open chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open participants" })).toBeInTheDocument();
  });
});
