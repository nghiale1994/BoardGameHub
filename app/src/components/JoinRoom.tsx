import { Box, Button, Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseShareUrl } from "../services/roomHelpers";

type JoinRoomProps = {
  onJoin: (roomId: string, asSpectator: boolean) => void;
  initialUrl?: string;
  autoFocus?: boolean;
};

const isValidRoomUrl = (value: string) => {
  return parseShareUrl(value) !== null;
};

export const JoinRoom = ({ onJoin, initialUrl, autoFocus }: JoinRoomProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [asSpectator, setAsSpectator] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!initialUrl) return;
    setUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (!autoFocus) return;
    const handle = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, [autoFocus]);

  const handleJoin = () => {
    const roomId = parseShareUrl(url);
    if (!roomId) {
      setError(t("join_room.invalid_url"));
      return;
    }
    setError(null);
    onJoin(roomId, asSpectator);
  };

  return (
    <Box
      id="join-room"
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
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {t("join_room.title")}
      </Typography>
      <TextField
        placeholder={t("join_room.paste_url_placeholder")}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        size="small"
        error={Boolean(error)}
        helperText={error}
        inputRef={(node) => {
          inputRef.current = node;
        }}
        sx={{
          background: "var(--color-surface-variant)",
          borderRadius: "0.8rem"
        }}
      />

      <FormControlLabel
        control={<Checkbox checked={asSpectator} onChange={(e) => setAsSpectator(e.target.checked)} />}
        label={t("join_room.spectator_label")}
      />
      <Button
        variant="contained"
        onClick={handleJoin}
        disabled={!isValidRoomUrl(url)}
        sx={{
          alignSelf: "flex-start",
          padding: "clamp(0.45rem, 0.9vw, 0.7rem) clamp(1rem, 2.2vw, 1.6rem)",
          borderRadius: "0.8rem",
          background: "var(--color-primary)",
          color: "var(--on-primary)",
          textTransform: "none",
          fontWeight: 600
        }}
      >
        {t("join_room.join_button")}
      </Button>
    </Box>
  );
};
