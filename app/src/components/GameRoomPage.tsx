import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import CloseIcon from "@mui/icons-material/Close";
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { games } from "../data/games";
import { peerService } from "../services/peerService";
import { buildShareUrl } from "../services/roomHelpers";
import type { RoomUIModel } from "../services/roomUiProjection";
import type { ChatMessage } from "../utils/chat";

type GameRoomPageProps = {
  ui: RoomUIModel;
  onRequestRoleChange: (asSpectator: boolean) => void;
  messages: ChatMessage[];
  onSendChat: (text: string) => void;
  showConversation: boolean;
  showGameEvents: boolean;
  onOpenSettings: () => void;
  onLeave: () => void;
};

const SIDE_SHEET_WIDTH = "clamp(16rem, 26vw, 22rem)";

const CHAT_GUTTER_PC = "clamp(0.5rem, 1vw, 0.75rem)";

const CHAT_COMPOSER_CONTROL_HEIGHT = "clamp(2.4rem, 5vw, 3rem)";

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const GameRoomPage = ({
  ui,
  onRequestRoleChange,
  messages,
  onSendChat,
  showConversation,
  showGameEvents,
  onOpenSettings,
  onLeave
}: GameRoomPageProps) => {
  const { t } = useTranslation();

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isPcTablet = !isMobile;

  const gameName = useMemo(() => {
    return games.find((g) => g.id === ui.gameId)?.name ?? ui.gameId;
  }, [ui.gameId]);

  const isSpectator = ui.self.isSpectator;

  const [sideOpen, setSideOpen] = useState(true);
  const [tab, setTab] = useState<"participants" | "chat">("participants");

  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileParticipantsOpen, setMobileParticipantsOpen] = useState(false);

  const [copyToastOpen, setCopyToastOpen] = useState(false);

  const [input, setInput] = useState("");

  useEffect(() => {
    const unsubscribe = peerService.onEvent(() => {
      // no-op: keep PeerJS event loop alive while mounted
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (m.type === "system") return true;
      if (m.type === "user") return showConversation;
      if (m.type === "move") return showGameEvents;
      return true;
    });
  }, [messages, showConversation, showGameEvents]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);

  const totalParticipants = ui.members.totalCount;

  const isChatVisible = isMobile ? mobileChatOpen : sideOpen && tab === "chat";

  useEffect(() => {
    const lastUserMessage = [...messages].reverse().find((m) => m.type === "user");
    if (!lastUserMessage) return;

    if (isChatVisible) {
      setUnreadCount(0);
      setLastSeenMessageId(lastUserMessage.id);
      return;
    }

    if (lastUserMessage.id === lastSeenMessageId) return;

    if (lastSeenMessageId === null) {
      // Baseline on first load to avoid counting the entire history.
      setLastSeenMessageId(lastUserMessage.id);
      return;
    }

    if (lastUserMessage.senderId !== ui.self.peerId) {
      setUnreadCount((prev) => prev + 1);
    }
    setLastSeenMessageId(lastUserMessage.id);
  }, [isChatVisible, lastSeenMessageId, messages, ui.self.peerId]);

  const handleCopyShareUrl = async () => {
    const inviteUrl = buildShareUrl(ui.roomId);

    const tryCopyWithFallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = inviteUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    };

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        setCopyToastOpen(true);
        return;
      }
    } catch {
      // fall through to fallback
    }

    try {
      const ok = tryCopyWithFallback();
      if (ok) setCopyToastOpen(true);
    } catch {
      // ignore
    }
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    onSendChat(trimmed);
  };

  const phase = ui.phase;
  const phaseLabel =
    phase === "playing"
      ? t("gameroom.phase_playing")
      : phase === "finished"
        ? t("gameroom.phase_finished")
        : t("gameroom.phase_setup");

  const connectionDot = (status: "connected" | "reconnecting" | "offline") => {
    const color = status === "connected" ? "#2e7d32" : status === "reconnecting" ? "#ed6c02" : "#d32f2f";

    return (
      <Box
        sx={{
          width: "0.55rem",
          height: "0.55rem",
          borderRadius: "999px",
          background: color,
          boxShadow: "0 0 0 2px rgba(0,0,0,0.08)"
        }}
      />
    );
  };

  const header = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "clamp(0.6rem, 1.2vw, 1rem)",
        padding: "clamp(0.8rem, 1.8vw, 1.2rem)",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)"
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.25rem, 0.6vw, 0.4rem)" }}>
        <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 800, lineHeight: 1.1 }}>
          {t("gameroom.title", { gameName })}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(0.4rem, 0.8vw, 0.6rem)", flexWrap: "wrap" }}>
          <Chip
            label={t("gameroom.room_id", { roomId: ui.roomId })}
            size="small"
            sx={{ borderRadius: "0.8rem" }}
          />
          <IconButton aria-label={t("gameroom.copy_room_id")} onClick={handleCopyShareUrl}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          <Chip
            label={ui.isHost ? t("gameroom.host_badge") : t("gameroom.peer_badge")}
            size="small"
            color={ui.isHost ? "primary" : "default"}
            data-testid="room-host-badge"
            sx={{ borderRadius: "0.8rem" }}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(0.4rem, 0.8vw, 0.6rem)", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Chip
          size="small"
          label={
            ui.connectionStatus === "connected"
              ? t("gameroom.connection_connected")
              : ui.connectionStatus === "reconnecting"
                ? t("gameroom.connection_reconnecting")
                : t("gameroom.connection_offline")
          }
          data-testid="room-connection-status"
          sx={{
            borderRadius: "0.8rem",
            color: "var(--color-text)",
            borderColor: "var(--color-border)",
            "& .MuiChip-label": { fontWeight: 700 }
          }}
        />

        <Button
          variant="outlined"
          disabled={!ui.canToggleRole}
          onClick={() => {
            const nextAsSpectator = !isSpectator;
            onRequestRoleChange(nextAsSpectator);
          }}
          sx={{
            borderRadius: "0.9rem",
            padding: "clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.7rem, 1.4vw, 1rem)",
            textTransform: "none"
          }}
        >
          {isMobile
            ? isSpectator
              ? t("gameroom.role_join_as_player_short")
              : t("gameroom.role_become_spectator_short")
            : isSpectator
              ? t("gameroom.role_join_as_player")
              : t("gameroom.role_become_spectator")}
        </Button>

        {isMobile ? (
          <IconButton aria-label={t("gameroom.open_participants")} onClick={() => setMobileParticipantsOpen(true)}>
            <Badge
              badgeContent={totalParticipants}
              color="primary"
              overlap="circular"
            >
              <GroupOutlinedIcon />
            </Badge>
          </IconButton>
        ) : null}

        {isMobile ? (
          <IconButton aria-label={t("gameroom.settings")} onClick={onOpenSettings}>
            <SettingsOutlinedIcon />
          </IconButton>
        ) : (
          <Button
            variant="outlined"
            onClick={onOpenSettings}
            startIcon={<SettingsOutlinedIcon />}
            sx={{
              borderRadius: "0.9rem",
              padding: "clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.7rem, 1.4vw, 1rem)",
              textTransform: "none"
            }}
          >
            {t("gameroom.settings")}
          </Button>
        )}

        {isMobile ? (
          <IconButton aria-label={t("gameroom.leave")} onClick={onLeave} color="error">
            <LogoutOutlinedIcon />
          </IconButton>
        ) : (
          <Button
            variant="outlined"
            color="error"
            onClick={onLeave}
            startIcon={<LogoutOutlinedIcon />}
            sx={{
              borderRadius: "0.9rem",
              padding: "clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.7rem, 1.4vw, 1rem)",
              textTransform: "none"
            }}
          >
            {t("gameroom.leave")}
          </Button>
        )}
      </Box>
    </Box>
  );

  const board = (
    <Box
      sx={{
        flex: 1,
        minHeight: "min(100vh, 70vh)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "clamp(1rem, 2vw, 1.4rem)",
        padding: "clamp(1rem, 2vw, 1.6rem)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.8rem, 1.6vw, 1.2rem)"
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "clamp(0.6rem, 1.2vw, 1rem)" }}>
        <Typography variant="body2" sx={{ color: "var(--color-text-secondary)", fontWeight: 700 }}>
          {t("gameroom.board")}
        </Typography>
        <Chip label={phaseLabel} size="small" sx={{ borderRadius: "0.8rem" }} />
      </Box>
      <Divider />
      <Box
        sx={{
          flex: 1,
          borderRadius: "clamp(0.9rem, 1.8vw, 1.2rem)",
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 45%), radial-gradient(circle at 80% 30%, color-mix(in srgb, var(--color-secondary) 10%, transparent) 0%, transparent 50%), var(--color-surface-variant)",
          border: "1px dashed var(--color-border)",
          display: "grid",
          placeItems: "center",
          padding: "clamp(1rem, 2vw, 1.6rem)"
        }}
      >
        <Typography variant="body1" sx={{ color: "var(--color-text-secondary)", textAlign: "center" }}>
          {t("gameroom.board_placeholder")}
        </Typography>
      </Box>
    </Box>
  );

  const participantsPanel = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.6vw, 1.2rem)" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.4rem, 0.8vw, 0.6rem)" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t("gameroom.players", { count: ui.members.players.length })}
        </Typography>
        {ui.members.players.map((p) => (
          <Box
            key={p.peerId}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "clamp(0.6rem, 1.2vw, 0.9rem)",
              padding: "clamp(0.5rem, 1vw, 0.8rem)",
              borderRadius: "0.9rem",
              background: "var(--color-surface-variant)",
              border: "1px solid var(--color-border)"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "clamp(0.5rem, 1vw, 0.8rem)" }}>
              {connectionDot(p.status)}
              <Box
                sx={{
                  width: "clamp(0.6rem, 1.2vw, 0.8rem)",
                  height: "clamp(0.6rem, 1.2vw, 0.8rem)",
                  borderRadius: "999px",
                  background: "var(--color-primary)"
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                {p.displayName}
                {p.isSelf ? ` (${t("gameroom.me")})` : ""}
              </Typography>
            </Box>
            {p.isHost ? (
              <Chip label={t("gameroom.host_badge")} size="small" sx={{ borderRadius: "0.8rem" }} />
            ) : null}
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.4rem, 0.8vw, 0.6rem)" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t("gameroom.spectators", { count: ui.members.spectators.length })}
        </Typography>
        {ui.members.spectators.length === 0 ? (
          <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
            {t("gameroom.no_spectators")}
          </Typography>
        ) : (
          ui.members.spectators.map((s) => (
            <Box
              key={s.peerId}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.6rem, 1.2vw, 0.9rem)",
                padding: "clamp(0.5rem, 1vw, 0.8rem)",
                borderRadius: "0.9rem",
                background: "var(--color-surface-variant)",
                border: "1px solid var(--color-border)"
              }}
            >
              {connectionDot(s.status)}
              <Box
                sx={{
                  width: "clamp(0.6rem, 1.2vw, 0.8rem)",
                  height: "clamp(0.6rem, 1.2vw, 0.8rem)",
                  borderRadius: "999px",
                  background: "var(--color-text-secondary)",
                  opacity: 0.7
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                {s.displayName}
                {s.isSelf ? ` (${t("gameroom.me")})` : ""}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );

  const chatPanel = (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        display: isPcTablet ? "grid" : "flex",
        gridTemplateRows: isPcTablet ? "minmax(0, 1fr) auto" : undefined,
        gap: isPcTablet ? CHAT_GUTTER_PC : "clamp(0.8rem, 1.6vw, 1.2rem)",
        flexDirection: isPcTablet ? undefined : "column"
      }}
    >
      {isPcTablet ? null : (
        <Typography variant="body2" sx={{ color: "var(--color-text-secondary)", fontWeight: 700 }}>
          {t("gameroom.chat")}
        </Typography>
      )}

      <Box
        sx={{
          minHeight: 0,
          flex: isPcTablet ? undefined : 1,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.4rem, 0.8vw, 0.6rem)",
          padding: "clamp(0.6rem, 1.2vw, 0.9rem)",
          borderRadius: "0.9rem",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface-variant)"
        }}
        data-testid="chat-message-list"
      >
        {filteredMessages.map((m) => {
          if (m.type === "move") {
            return (
              <Typography
                key={m.id}
                variant="caption"
                sx={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
              >
                {`${formatTime(m.timestamp)} • ${m.actorName} ${m.actionText}`}
              </Typography>
            );
          }

          if (m.type === "system") {
            const text =
              m.kind === "joined"
                ? t("gameroom.system_user_joined", { name: m.actorName })
                : m.kind === "left"
                  ? t("gameroom.system_user_left", { name: m.actorName })
                  : m.kind === "became_spectator"
                    ? t("gameroom.system_user_became_spectator", { name: m.actorName })
                    : t("gameroom.system_user_became_player", { name: m.actorName });
            return (
              <Typography
                key={m.id}
                variant="caption"
                sx={{ color: "var(--color-text-secondary)", fontStyle: "italic", lineHeight: 1.6 }}
              >
                {text}
              </Typography>
            );
          }

          return (
            <Box key={m.id} sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.15rem, 0.4vw, 0.25rem)" }}>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", fontWeight: 700 }}>
                {m.isSpectator ? t("gameroom.spectator_label", { name: m.senderName }) : m.senderName}
              </Typography>
              <Box
                sx={{
                  alignSelf: "flex-start",
                  maxWidth: "min(100%, 70ch)",
                  padding: "clamp(0.5rem, 1vw, 0.8rem)",
                  borderRadius: "0.9rem",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)"
                }}
              >
                <Typography variant="body2">{m.text}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          minHeight: 0,
          flex: isPcTablet ? undefined : "0 0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          overflow: "hidden"
        }}
        data-testid="chat-composer"
      >
        <Box sx={{ display: "flex", gap: "clamp(0.6rem, 1.2vw, 0.9rem)" }}>
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("gameroom.chat_placeholder")}
            size="small"
            fullWidth
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            sx={{
              background: "var(--color-surface)",
              borderRadius: "0.9rem",
              "& .MuiInputBase-root": {
                height: CHAT_COMPOSER_CONTROL_HEIGHT
              }
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            sx={{
              borderRadius: "0.9rem",
              height: CHAT_COMPOSER_CONTROL_HEIGHT,
              padding: "0 clamp(0.9rem, 1.8vw, 1.2rem)",
              fontWeight: 700
            }}
          >
            {t("gameroom.send")}
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const sideSheetContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        height: "100%",
        overflow: "hidden"
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="fullWidth"
        sx={{
          borderBottom: "1px solid var(--color-border)",
          minHeight: "clamp(2.4rem, 6vw, 3rem)"
        }}
      >
        <Tab
          value="participants"
          label={`${t("gameroom.participants")} (${totalParticipants})`}
          sx={{ minHeight: "clamp(2.4rem, 6vw, 3rem)" }}
        />
        <Tab
          value="chat"
          label={
            <Badge color="error" badgeContent={unreadCount} invisible={unreadCount === 0}>
              <Box component="span" sx={{ paddingRight: "0.2rem" }}>
                {t("gameroom.chat")}
              </Box>
            </Badge>
          }
          sx={{ minHeight: "clamp(2.4rem, 6vw, 3rem)" }}
        />
      </Tabs>
      {tab === "participants" ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: "clamp(1rem, 2vw, 1.4rem)"
          }}
        >
          {participantsPanel}
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            px: "clamp(1rem, 2vw, 1.4rem)",
            py: CHAT_GUTTER_PC,
            display: "grid",
            gridTemplateRows: "minmax(0, 1fr)"
          }}
        >
          {chatPanel}
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        height: isPcTablet ? "100vh" : "auto",
        overflow: isPcTablet ? "hidden" : "visible",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {header}

      <Snackbar
        open={copyToastOpen}
        autoHideDuration={2000}
        onClose={() => setCopyToastOpen(false)}
        message={t("gameroom.copy_success")}
      />

      {isPcTablet ? (
        <Box
          sx={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            width: "100%",
            alignItems: "stretch",
            gap: "clamp(0.8rem, 1.6vw, 1.2rem)",
            padding: "clamp(1rem, 2vw, 1.6rem)"
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            {board}
          </Box>

          <Box
            sx={{
              width: sideOpen ? SIDE_SHEET_WIDTH : "clamp(3.2rem, 5vw, 3.8rem)",
              transition: "width 160ms ease",
              borderRadius: "clamp(1rem, 2vw, 1.4rem)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              height: "100%",
              maxHeight: "100%"
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: sideOpen ? "space-between" : "center",
                padding: sideOpen ? "clamp(0.4rem, 0.9vw, 0.7rem)" : "clamp(0.2rem, 0.6vw, 0.4rem)"
              }}
            >
              {sideOpen ? (
                <Typography variant="caption" sx={{ color: "var(--color-text-secondary)", fontWeight: 800 }}>
                  {t("gameroom.side_sheet")}
                </Typography>
              ) : null}
              <IconButton
                aria-label={t("gameroom.toggle_side_sheet")}
                onClick={() => setSideOpen((v) => !v)}
                sx={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  boxShadow: "0 0.35rem 0.9rem var(--color-shadow)"
                }}
              >
                {sideOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </Box>
            {sideOpen ? <Box sx={{ flex: 1, minHeight: 0 }}>{sideSheetContent}</Box> : null}
          </Box>
        </Box>
      ) : (
        <Box sx={{ position: "relative", flex: 1, padding: "clamp(1rem, 2vw, 1.6rem)" }}>
          {board}

          <Box sx={{ position: "fixed", right: "clamp(1rem, 2.5vw, 1.6rem)", bottom: "clamp(1rem, 2.5vw, 1.6rem)", display: "flex", flexDirection: "column", gap: "clamp(0.6rem, 1.4vw, 1rem)" }}>
            <Badge badgeContent={unreadCount} color="error">
              <IconButton
                aria-label={t("gameroom.open_chat")}
                onClick={() => {
                  setMobileParticipantsOpen(false);
                  setMobileChatOpen(true);
                }}
                sx={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 0.5rem 1.2rem var(--color-shadow)"
                }}
              >
                <ChatBubbleOutlineIcon />
              </IconButton>
            </Badge>
          </Box>

          <Drawer
            anchor="bottom"
            open={mobileChatOpen}
            onClose={() => setMobileChatOpen(false)}
            PaperProps={{
              sx: {
                borderTopLeftRadius: "clamp(1rem, 2vw, 1.4rem)",
                borderTopRightRadius: "clamp(1rem, 2vw, 1.4rem)",
                height: "min(80vh, 44rem)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "clamp(0.8rem, 1.8vw, 1.2rem)" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {t("gameroom.chat")}
              </Typography>
              <IconButton aria-label={t("gameroom.close")} onClick={() => setMobileChatOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, padding: "clamp(1rem, 2vw, 1.4rem)" }}>{chatPanel}</Box>
          </Drawer>

          <Drawer
            anchor="bottom"
            open={mobileParticipantsOpen}
            onClose={() => setMobileParticipantsOpen(false)}
            PaperProps={{
              sx: {
                borderTopLeftRadius: "clamp(1rem, 2vw, 1.4rem)",
                borderTopRightRadius: "clamp(1rem, 2vw, 1.4rem)",
                maxHeight: "min(80vh, 44rem)"
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "clamp(0.8rem, 1.8vw, 1.2rem)" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {t("gameroom.participants")}
              </Typography>
              <IconButton aria-label={t("gameroom.close")} onClick={() => setMobileParticipantsOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ padding: "clamp(1rem, 2vw, 1.4rem)" }}>{participantsPanel}</Box>
          </Drawer>
        </Box>
      )}
    </Box>
  );
};
