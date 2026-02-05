import { Avatar, Box, Button, List, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { persistence, type RecentRoom } from "../services/persistence";

type RecentGamesProps = {
  onResume?: (roomId: string) => void;
};

const formatRelativeTime = (updatedAt: number, locale: string): string => {
  const diffMs = Date.now() - updatedAt;
  if (!Number.isFinite(diffMs)) return "";

  const minutes = Math.round(diffMs / (60 * 1000));
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (typeof Intl === "undefined" || !("RelativeTimeFormat" in Intl)) {
    const safeMinutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    if (safeMinutes < 60) return `${safeMinutes}m`;
    const safeHours = Math.floor(safeMinutes / 60);
    if (safeHours < 24) return `${safeHours}h`;
    const safeDays = Math.floor(safeHours / 24);
    return `${safeDays}d`;
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(-Math.max(1, minutes), "minute");
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  return rtf.format(-days, "day");
};

const toAvatarLabel = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "🎲";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const RecentGames = ({ onResume }: RecentGamesProps) => {
  const { i18n, t } = useTranslation();
  const [rooms, setRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    let mounted = true;
    void persistence.getRecentRooms().then((result) => {
      if (!mounted) return;
      setRooms(result);
    });

    const unsubscribe = persistence.subscribe((message) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "pref_updated" &&
        "key" in message &&
        (message as { key: string }).key === "recentRooms"
      ) {
        void persistence.getRecentRooms().then(setRooms);
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const handleClear = () => {
    void persistence.setRecentRooms([]).then(() => setRooms([]));
  };

  return (
    <Box
      sx={{
        background: "var(--color-surface)",
        borderRadius: "clamp(1rem, 2vw, 1.4rem)",
        padding: "clamp(1rem, 2vw, 1.6rem)",
        border: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.8rem, 1.4vw, 1.2rem)"
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "clamp(0.6rem, 1vw, 1rem)"
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("recent_games.title")}
        </Typography>
        <Button
          variant="text"
          onClick={handleClear}
          sx={{ textTransform: "none", color: "var(--color-text-secondary)" }}
        >
          {t("recent_games.clear_all")}
        </Button>
      </Box>

      {rooms.length === 0 ? (
        <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
          {t("recent_games.no_recent")}
        </Typography>
      ) : (
        <List sx={{ padding: 0 }}>
          {rooms.map((room) => (
            <ListItem
              key={room.id}
              sx={{
                padding: "clamp(0.4rem, 0.8vw, 0.6rem) 0",
                borderBottom: "1px solid var(--color-border)"
              }}
              secondaryAction={
                <Button
                  variant="outlined"
                  onClick={() => onResume?.(room.id)}
                  sx={{
                    textTransform: "none",
                    borderRadius: "0.7rem",
                    padding: "clamp(0.3rem, 0.6vw, 0.6rem) clamp(0.8rem, 1.6vw, 1.2rem)"
                  }}
                >
                  {t("recent_games.resume")}
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "var(--color-surface-variant)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border)"
                  }}
                >
                  {toAvatarLabel(room.name)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={room.name}
                secondary={`${t("recent_games.player_count", { count: room.players })} · ${t(
                  "recent_games.time_ago",
                  { time: formatRelativeTime(room.updatedAt, i18n.language) }
                )}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
