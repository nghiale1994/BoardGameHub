import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Switch,
  Typography
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../hooks/useConfirm";
import { persistence } from "../services/persistence";
import { LanguageSelection } from "./LanguageSelection";
import { ThemeToggle } from "./ThemeToggle";

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  themeMode: "light" | "dark";
  onThemeChange: (mode: "light" | "dark") => void;
  showConversation: boolean;
  onShowConversationChange: (value: boolean) => void;
  showGameEvents: boolean;
  onShowGameEventsChange: (value: boolean) => void;
};

export const SettingsModal = ({
  open,
  onClose,
  themeMode,
  onThemeChange,
  showConversation,
  onShowConversationChange,
  showGameEvents,
  onShowGameEventsChange
}: SettingsModalProps) => {
  const { t } = useTranslation();

  const confirm = useConfirm(() => {
    void persistence.clearAll().then(() => {
      window.location.reload();
    });
  });

  const requestClear = () => {
    confirm.confirm({
      title: t("settings.clear_data"),
      message: t("settings.clear_data_confirm"),
      confirmLabel: t("settings.confirm"),
      cancelLabel: t("settings.cancel")
    });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{t("settings.title")}</DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2vw, 1.4rem)",
            paddingTop: "clamp(0.6rem, 1.2vw, 1rem)"
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.5vw, 1.2rem)" }}>
            <LanguageSelection />
            <ThemeToggle mode={themeMode} onChange={onThemeChange} />
          </Box>

          <Divider />

          <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.6rem, 1.2vw, 1rem)" }}>
            <Typography variant="body2" sx={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>
              {t("settings.chat_settings")}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={showConversation}
                  onChange={(e) => onShowConversationChange(e.target.checked)}
                />
              }
              label={t("settings.show_conversation")}
            />

            <FormControlLabel
              control={
                <Switch checked={showGameEvents} onChange={(e) => onShowGameEventsChange(e.target.checked)} />
              }
              label={t("settings.show_game_events")}
            />
          </Box>

          <Divider />

          <Button
            variant="outlined"
            color="error"
            onClick={requestClear}
            sx={{
              alignSelf: "flex-start",
              borderRadius: "0.8rem",
              padding: "clamp(0.5rem, 1vw, 0.8rem) clamp(0.8rem, 1.6vw, 1.2rem)",
              textTransform: "none"
            }}
          >
            {t("settings.clear_data")}
          </Button>
        </DialogContent>

        <DialogActions sx={{ padding: "clamp(0.8rem, 1.6vw, 1.2rem)" }}>
          <Button onClick={onClose} sx={{ textTransform: "none" }}>
            {t("settings.close")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm.open} onClose={confirm.handleCancel}>
        <DialogTitle>{confirm.options?.title}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.6vw, 1.2rem)",
            paddingTop: "clamp(0.6rem, 1.2vw, 1rem)"
          }}
        >
          <Box>{confirm.options?.message}</Box>
          <Box sx={{ display: "flex", gap: "clamp(0.5rem, 1vw, 0.8rem)", justifyContent: "flex-end" }}>
            <Button variant="text" onClick={confirm.handleCancel} sx={{ textTransform: "none" }}>
              {confirm.options?.cancelLabel}
            </Button>
            <Button variant="contained" onClick={confirm.handleConfirm} color="error" sx={{ textTransform: "none" }}>
              {confirm.options?.confirmLabel}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};
