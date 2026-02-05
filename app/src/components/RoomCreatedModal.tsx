import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type RoomCreatedModalProps = {
  open: boolean;
  shareUrl: string;
  onEnter: () => void;
  onLater: () => void;
};

export const RoomCreatedModal = ({ open, shareUrl, onEnter, onLater }: RoomCreatedModalProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(true);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onLater}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "clamp(1rem, 2vw, 1.5rem)",
            background: "var(--color-surface)",
            padding: "clamp(1rem, 2vw, 1.6rem)"
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t("room_created.title")}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2vw, 1.4rem)"
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.5rem, 1vw, 0.8rem)" }}>
            <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
              {t("room_created.share_url_label")}
            </Typography>
            <Box sx={{ display: "flex", gap: "clamp(0.6rem, 1vw, 0.9rem)", flexWrap: "wrap" }}>
              <TextField
                value={shareUrl}
                size="small"
                InputProps={{ readOnly: true }}
                sx={{
                  flex: 1,
                  minWidth: "clamp(14rem, 40vw, 22rem)",
                  background: "var(--color-surface-variant)",
                  borderRadius: "0.8rem"
                }}
              />
              <Button
                variant="outlined"
                onClick={handleCopy}
                sx={{
                  borderRadius: "0.8rem",
                  padding: "clamp(0.3rem, 0.7vw, 0.6rem) clamp(0.8rem, 1.6vw, 1.2rem)"
                }}
              >
                {t("room_created.copy_button")}
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
            {t("room_created.helper_text")}
          </Typography>

          <Box sx={{ display: "flex", gap: "clamp(0.6rem, 1vw, 1rem)", flexWrap: "wrap" }}>
            <Button variant="text" onClick={onLater} sx={{ textTransform: "none" }}>
              {t("room_created.later")}
            </Button>
            <Button
              variant="contained"
              onClick={onEnter}
              sx={{
                padding: "clamp(0.45rem, 0.9vw, 0.7rem) clamp(1rem, 2.2vw, 1.6rem)",
                background: "var(--color-primary)",
                color: "var(--on-primary)",
                textTransform: "none",
                fontWeight: 600
              }}
            >
              {t("room_created.enter_room")}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message={t("room_created.copy_success")}
      />
    </>
  );
};
