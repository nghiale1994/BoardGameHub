import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameInfo } from "../data/games";

type CreateRoomModalProps = {
  open: boolean;
  game: GameInfo | null;
  onClose: () => void;
  onCreate: (payload: { players: number }) => void;
};

export const CreateRoomModal = ({ open, game, onClose, onCreate }: CreateRoomModalProps) => {
  const { t } = useTranslation();
  const [players, setPlayers] = useState(4);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enableExpansions, setEnableExpansions] = useState(false);
  const playerOptions = useMemo(() => [2, 3, 4, 5, 6], []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "clamp(1rem, 2vw, 1.5rem)",
          background: "var(--color-surface)",
          padding: "clamp(1rem, 2vw, 1.6rem)"
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{t("create_room.title")}</DialogTitle>
      <DialogContent
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "clamp(1rem, 2vw, 1.6rem)",
          "@media (min-width: 769px)": {
            gridTemplateColumns: "minmax(12rem, 40%) 1fr"
          }
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.6vw, 1.2rem)" }}>
          <TextField
            label={t("create_room.select_game")}
            value={game?.name ?? ""}
            size="small"
            InputProps={{ readOnly: true }}
          />

          <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.6rem, 1.2vw, 1rem)" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("create_room_modal.essentials")}
            </Typography>

            <FormControl size="small">
              <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
                {t("create_room_modal.players")}
              </Typography>
              <Select
                value={players}
                onChange={(event) => setPlayers(Number(event.target.value))}
                sx={{ marginTop: "clamp(0.3rem, 0.6vw, 0.5rem)" }}
              >
                {playerOptions.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label={t("create_room_modal.playtime")}
              value={game ? `${game.playtime.min} - ${game.playtime.max}` : ""}
              size="small"
              InputProps={{ readOnly: true }}
            />

            <Button
              variant="outlined"
              onClick={() => setSettingsOpen((prev) => !prev)}
              sx={{ alignSelf: "flex-start", textTransform: "none", borderRadius: "0.8rem" }}
            >
              {t("create_room_modal.settings_button")}
            </Button>

            <Collapse in={settingsOpen}>
              <Box
                sx={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "clamp(0.8rem, 1.6vw, 1rem)",
                  padding: "clamp(0.8rem, 1.6vw, 1.1rem)",
                  background: "var(--color-surface-variant)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.5rem, 1vw, 0.8rem)"
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t("create_room_modal.advanced_settings")}
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={enableExpansions}
                      onChange={(e) => setEnableExpansions(e.target.checked)}
                    />
                  }
                  label={t("create_room_modal.enable_expansions")}
                />
              </Box>
            </Collapse>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.4vw, 1.2rem)",
            justifyContent: "space-between"
          }}
        >
          <Box
            sx={{
              border: "1px dashed var(--color-border)",
              borderRadius: "clamp(0.8rem, 1.6vw, 1rem)",
              padding: "clamp(1rem, 2vw, 1.4rem)",
              minHeight: "clamp(8rem, 16vw, 12rem)"
            }}
          />

          <Box sx={{ display: "flex", gap: "clamp(0.6rem, 1vw, 1rem)", flexWrap: "wrap" }}>
            <Button variant="text" onClick={onClose} sx={{ textTransform: "none" }}>
              {t("create_room_modal.back")}
            </Button>
            <Button
              variant="contained"
              onClick={() => onCreate({ players })}
              sx={{
                padding: "clamp(0.45rem, 0.9vw, 0.7rem) clamp(1rem, 2.2vw, 1.6rem)",
                background: "var(--color-primary)",
                color: "var(--on-primary)",
                textTransform: "none",
                fontWeight: 600
              }}
            >
              {t("create_room_modal.create")}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
