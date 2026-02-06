import { Box, Button, CircularProgress, CssBaseline, ThemeProvider, Typography, useMediaQuery } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreateRoomModal } from "./components/CreateRoomModal";
import { GameRoomPage } from "./components/GameRoomPage";
import { GameListGrid } from "./components/GameListGrid";
import { JoinRoom } from "./components/JoinRoom";
import { RecentGames } from "./components/RecentGames";
import { RoomCreatedModal } from "./components/RoomCreatedModal";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { WelcomeSection } from "./components/WelcomeSection";
import type { GameInfo } from "./data/games";
import { useRoomContext } from "./hooks/useRoomContext";
import { persistence } from "./services/persistence";
import { buildShareUrl } from "./services/roomHelpers";
import { getMuiTheme } from "./theme/theme";
import { normalizeDisplayName } from "./utils/displayName";
import { storage } from "./utils/storage";

const THEME_STORAGE_KEY = "boardgamehub.theme";

type RoomJoinPrefs = Record<string, { asSpectator: boolean; updatedAt: number }>;

export const App = () => {
  const { i18n } = useTranslation();
  const room = useRoomContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 769px)");
  const [themeMode, setThemeMode] = useState<"light" | "dark">(
    (localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark") || "light"
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showConversation, setShowConversation] = useState(true);
  const [showGameEvents, setShowGameEvents] = useState(true);
  const [joinInitialUrl, setJoinInitialUrl] = useState<string | undefined>(undefined);
  const [joinAutoFocus, setJoinAutoFocus] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdOpen, setCreatedOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [nameGateError, setNameGateError] = useState<"empty" | "invalid" | null>(null);
  const [deferRoomView, setDeferRoomView] = useState(false);
  const [pendingAutoJoin, setPendingAutoJoin] = useState<{ roomId: string; asSpectator: boolean } | null>(null);
  const initialPathHandledRef = useRef(false);
  const autoJoinInFlightRef = useRef(false);

  const isInviteRoute =
    typeof window !== "undefined" && (() => {
      const pathname = window.location.pathname;
      const actualPath = pathname.replace('/?/', '/');
      return actualPath.match(/(?:i|r)\/[a-zA-Z0-9]+$/) !== null;
    })();

  const ensureValidName = useCallback(() => {
    const result = normalizeDisplayName(room.displayName);
    if (result.ok) {
      setNameGateError(null);
      return true;
    }
    setNameGateError(result.reason);
    window.setTimeout(() => {
      document.getElementById("welcome-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return false;
  }, [room.displayName]);

  useEffect(() => {
    // If the user saves a valid name, clear any previous gate error.
    const result = normalizeDisplayName(room.displayName);
    if (result.ok && nameGateError) setNameGateError(null);
  }, [nameGateError, room.displayName]);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", themeMode === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    void persistence.setPreference("theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    // Routing (no router lib):
    // - Invite URL: /i/:roomId => scroll to JoinRoom and prefill invite URL.
    // - GameRoom URL: /room/:roomId => if previously joined, auto-rejoin; else redirect to Home.
    // - Legacy invite URL: /r/:roomId => treated as invite and migrated to /i/:roomId.
    if (typeof window === "undefined") return;
    if (initialPathHandledRef.current) return;

    const pathname = window.location.pathname;
    const search = window.location.search;
    let actualPath = pathname;
    if (search.startsWith('?/')) {
      actualPath = search.slice(1);
    }
    actualPath = actualPath.replace('/?/', '/');

    const legacyInviteMatch = actualPath.match(/\/r\/([a-zA-Z0-9]+)$/);
    if (legacyInviteMatch) {
      const roomIdFromUrl = legacyInviteMatch[1];
      if (room.roomId) {
        const confirmed = window.confirm("You're currently in a room. Do you want to leave and join a new room?");
        if (!confirmed) {
          window.history.replaceState({}, "", "/");
          initialPathHandledRef.current = true;
          return;
        }
        room.leaveRoom();
        setDeferRoomView(false);
      }
      window.history.replaceState({}, "", `/i/${roomIdFromUrl}`);
      setJoinInitialUrl(buildShareUrl(roomIdFromUrl));
      setJoinAutoFocus(true);
      // Delay scroll to ensure component is mounted
      requestAnimationFrame(() => {
        setTimeout(() => {
          const element = document.getElementById("join-room");
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      });
      initialPathHandledRef.current = true;
      return;
    }

    const inviteMatch = actualPath.match(/\/i\/([a-zA-Z0-9]+)$/);
    if (inviteMatch) {
      const roomIdFromUrl = inviteMatch[1];
      if (room.roomId) {
        const confirmed = window.confirm("You're currently in a room. Do you want to leave and join a new room?");
        if (!confirmed) {
          window.history.replaceState({}, "", "/");
          initialPathHandledRef.current = true;
          return;
        }
        room.leaveRoom();
        setDeferRoomView(false);
      }
      window.history.replaceState({}, "", `/i/${roomIdFromUrl}`);
      setJoinInitialUrl(buildShareUrl(roomIdFromUrl));
      setJoinAutoFocus(true);
      // Delay scroll to ensure component is mounted
      requestAnimationFrame(() => {
        setTimeout(() => {
          const element = document.getElementById("join-room");
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      });
      initialPathHandledRef.current = true;
      return;
    }

    const gameRoomMatch = actualPath.match(/^\/room\/([a-zA-Z0-9]+)$/);
    if (gameRoomMatch) {
      const roomIdFromUrl = gameRoomMatch[1];

      // If we restored a different room from storage, leave it first.
      if (room.roomId && room.roomId !== roomIdFromUrl) {
        room.leaveRoom();
        setDeferRoomView(false);
      }

      // If we're already in the requested room, do nothing.
      if (room.roomId === roomIdFromUrl) {
        // After refresh we may restore room state from storage, but PeerJS is not initialized.
        // If we aren't connected, treat this as a reconnect and auto-rejoin using stored prefs.
        if (room.connectionStatus !== "connected" && !room.isHost) {
          const prefs = storage.getItem<RoomJoinPrefs>("roomJoinPrefs", {}) ?? {};
          const pref = prefs[roomIdFromUrl];
          if (pref && typeof pref.asSpectator === "boolean") {
            setPendingAutoJoin({ roomId: roomIdFromUrl, asSpectator: pref.asSpectator });
          }
        }
        initialPathHandledRef.current = true;
        return;
      }

      const prefs = storage.getItem<RoomJoinPrefs>("roomJoinPrefs", {}) ?? {};
      const pref = prefs[roomIdFromUrl];

      if (pref && typeof pref.asSpectator === "boolean") {
        setPendingAutoJoin({ roomId: roomIdFromUrl, asSpectator: pref.asSpectator });
      } else {
        window.history.replaceState({}, "", "/");
      }
      initialPathHandledRef.current = true;
      return;
    }

    initialPathHandledRef.current = true;
  }, [room, room.connectionStatus, room.roomId]);

  useEffect(() => {
    if (!pendingAutoJoin) return;
    if (autoJoinInFlightRef.current) return;

    // On refresh, displayName may still be loading from persistence.
    // Avoid failing the name gate prematurely.
    if (!room.displayNameReady) return;

    // Enforce the same name gate as manual join.
    if (!ensureValidName()) {
      window.history.replaceState({}, "", "/");
      setPendingAutoJoin(null);
      return;
    }

    const { roomId: roomIdToJoin, asSpectator } = pendingAutoJoin;
    autoJoinInFlightRef.current = true;
    setPendingAutoJoin(null);

    // On refresh we commonly restore a snapshot/metadata from storage.
    // Do NOT clear that state here: if the host is offline (or takeover is in progress),
    // clearing forces a redirect-to-Home on join failure and prevents takeover/reconnect from running.

    // Mirror handleJoinRoom behavior but avoid referencing it before declaration.
    window.history.replaceState({}, "", `/room/${roomIdToJoin}`);
    void (async () => {
      try {
        await room.joinRoom(roomIdToJoin, { asSpectator });
      } catch (error) {
        console.error("Failed to join room:", error);

        // If we fail to join (e.g. host offline), stay on /room/:id using restored state.
        // The room context will remain in reconnecting/offline and may takeover if applicable.
      } finally {
        autoJoinInFlightRef.current = false;
      }
    })();
  }, [ensureValidName, pendingAutoJoin, room, room.displayName, room.roomId]);

  useEffect(() => {
    let mounted = true;
    void persistence.getPreference<boolean>("chat.showConversation", true).then((value) => {
      if (!mounted) return;
      setShowConversation(Boolean(value));
    });
    void persistence.getPreference<boolean>("chat.showGameEvents", true).then((value) => {
      if (!mounted) return;
      setShowGameEvents(Boolean(value));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const theme = useMemo(() => getMuiTheme(themeMode), [themeMode]);

  const handleOpenCreate = (game: GameInfo) => {
    if (!ensureValidName()) return;
    setSelectedGame(game);
    setCreateOpen(true);
  };

  const handleCreateRoom = async ({ players }: { players: number }) => {
    if (!selectedGame) return;
    if (!ensureValidName()) return;
    try {
      const newRoomId = await room.createRoom(selectedGame.id, players);
      window.history.pushState({}, "", `/room/${newRoomId}`);
      const url = buildShareUrl(newRoomId);
      setShareUrl(url);
      void persistence.upsertRecentRoom({ id: newRoomId, name: selectedGame.name, players });
      setCreateOpen(false);
      setCreatedOpen(true);
      setDeferRoomView(false);
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  const handleJoinRoom = async (roomId: string, asSpectator = false) => {
    if (!ensureValidName()) return;

    // Ensure we can transition into the room view immediately.
    setCreatedOpen(false);
    setCreateOpen(false);
    setDeferRoomView(false);
    window.history.pushState({}, "", `/room/${roomId}`);

    try {
      await room.joinRoom(roomId, { asSpectator });
    } catch (error) {
      console.error("Failed to join room:", error);

      // If we fail to join (e.g. host offline), reset state so the user isn't stuck in a half-joined state.
      room.leaveRoom();
      setJoinInitialUrl(undefined);
      setJoinAutoFocus(false);
      window.history.pushState({}, "", "/");
    }
  };

  const handleLeaveRoom = () => {
    room.leaveRoom();
    setJoinInitialUrl(undefined);
    setJoinAutoFocus(false);
    setDeferRoomView(false);
    window.history.pushState({}, "", "/");
  };

  if (!isInviteRoute && room.roomId && !room.metadata && !createdOpen && !deferRoomView) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(0.8rem, 1.6vw, 1.2rem)",
            padding: "clamp(1.4rem, 4vw, 2.4rem)",
            background: "var(--color-bg)"
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Connecting to room…
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
            Waiting for host snapshot
          </Typography>
          <Button variant="outlined" onClick={handleLeaveRoom} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
        </Box>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          showConversation={showConversation}
          onShowConversationChange={(value) => {
            setShowConversation(value);
            void persistence.setPreference("chat.showConversation", value);
          }}
          showGameEvents={showGameEvents}
          onShowGameEventsChange={(value) => {
            setShowGameEvents(value);
            void persistence.setPreference("chat.showGameEvents", value);
          }}
        />
      </ThemeProvider>
    );
  }

  if (!isInviteRoute && room.roomId && room.ui && !createdOpen && !deferRoomView) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GameRoomPage
          ui={room.ui}
          onRequestRoleChange={room.requestRoleChange}
          messages={room.messages}
          onSendChat={room.sendChatMessage}
          showConversation={showConversation}
          showGameEvents={showGameEvents}
          onOpenSettings={() => setSettingsOpen(true)}
          onLeave={handleLeaveRoom}
        />

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          showConversation={showConversation}
          onShowConversationChange={(value) => {
            setShowConversation(value);
            void persistence.setPreference("chat.showConversation", value);
          }}
          showGameEvents={showGameEvents}
          onShowGameEventsChange={(value) => {
            setShowGameEvents(value);
            void persistence.setPreference("chat.showGameEvents", value);
          }}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          width: "100%",
          minHeight: "100vh",
          background: "var(--color-bg)"
        }}
      >
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <Box
          sx={{
            flex: 1,
            width: "100%",
            paddingLeft: isDesktop && sidebarOpen ? "clamp(14rem, 20vw, 22rem)" : "0",
            padding: "clamp(2.5rem, 5vw, 3.5rem) clamp(1.4rem, 4vw, 3rem)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.4rem, 3vw, 2.4rem)"
          }}
        >
          <WelcomeSection
            displayName={room.displayName}
            onSaveName={room.updateLocalName}
            nameGateError={nameGateError}
          />

          {room.roomId && room.metadata && deferRoomView && (
            <Box
              sx={{
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                padding: "clamp(0.9rem, 2vw, 1.1rem)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem"
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                <Typography sx={{ fontWeight: 900 }}>Room is running</Typography>
                <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
                  Others can join using your invite link.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setDeferRoomView(false);
                    window.history.pushState({}, "", `/room/${room.roomId}`);
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Open room
                </Button>
                <Button variant="text" color="error" onClick={handleLeaveRoom} sx={{ textTransform: "none" }}>
                  End room
                </Button>
              </Box>
            </Box>
          )}

          <JoinRoom onJoin={handleJoinRoom} initialUrl={joinInitialUrl} autoFocus={joinAutoFocus} />

          <GameListGrid onSelectGame={handleOpenCreate} />
          <RecentGames
            onResume={(id) => {
              if (room.roomId && room.metadata && id === room.roomId && deferRoomView) {
                setDeferRoomView(false);
                window.history.pushState({}, "", `/room/${id}`);
                return;
              }
              void handleJoinRoom(id, false);
            }}
          />
        </Box>
      </Box>

      <CreateRoomModal
        open={createOpen}
        game={selectedGame}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateRoom}
      />

      <RoomCreatedModal
        open={createdOpen}
        shareUrl={shareUrl}
        onEnter={() => setCreatedOpen(false)}
        onLater={() => {
          setCreatedOpen(false);
          setDeferRoomView(true);
          window.history.pushState({}, "", "/");
        }}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        showConversation={showConversation}
        onShowConversationChange={(value) => {
          setShowConversation(value);
          void persistence.setPreference("chat.showConversation", value);
        }}
        showGameEvents={showGameEvents}
        onShowGameEventsChange={(value) => {
          setShowGameEvents(value);
          void persistence.setPreference("chat.showGameEvents", value);
        }}
      />
    </ThemeProvider>
  );
};
