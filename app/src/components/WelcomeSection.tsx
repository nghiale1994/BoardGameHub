import { Box, Button, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDisplayName } from "../utils/displayName";

type WelcomeSectionProps = {
  displayName: string;
  onSaveName: (name: string) => void;
  nameGateError?: "empty" | "invalid" | null;
};

export const WelcomeSection = ({ displayName, onSaveName, nameGateError }: WelcomeSectionProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(displayName);
  const [localError, setLocalError] = useState<"empty" | "invalid" | null>(null);

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  const handleSave = () => {
    const result = normalizeDisplayName(name);
    if (!result.ok) {
      setLocalError(result.reason);
      return;
    }
    setLocalError(null);
    onSaveName(result.value);
  };

  const effectiveError = nameGateError ?? localError;
  const helperText =
    effectiveError === "empty"
      ? t("welcome_section.name_required")
      : effectiveError === "invalid"
        ? t("welcome_section.name_invalid")
        : undefined;

  return (
    <Box
      id="welcome-section"
      sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.6vw, 1.2rem)" }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {displayName ? t("homepage.welcome_back", { name: displayName }) : t("homepage.welcome")}
      </Typography>
      <Typography variant="body1" sx={{ color: "var(--color-text-secondary)" }}>
        {t("homepage.subtitle")}
      </Typography>

      <Box sx={{ display: "flex", gap: "clamp(0.6rem, 1vw, 1rem)", flexWrap: "wrap" }}>
        <TextField
          label={t("welcome_section.enter_name")}
          placeholder={t("welcome_section.name_placeholder")}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (localError) setLocalError(null);
          }}
          size="small"
          error={Boolean(effectiveError)}
          helperText={helperText}
          sx={{
            minWidth: "clamp(16rem, 40vw, 26rem)",
            background: "var(--color-surface)",
            borderRadius: "0.8rem"
          }}
        />
        <Button
          variant="contained"
          onClick={handleSave}
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
          {displayName ? t("welcome_section.edit") : t("welcome_section.save")}
        </Button>
      </Box>
    </Box>
  );
};
