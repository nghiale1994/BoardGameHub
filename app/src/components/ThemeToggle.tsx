import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

type ThemeToggleProps = {
  mode: "light" | "dark";
  onChange: (mode: "light" | "dark") => void;
};

export const ThemeToggle = ({ mode, onChange }: ThemeToggleProps) => {
  const { t } = useTranslation();

  const handleChange = (_: MouseEvent<HTMLElement>, value: "light" | "dark" | null) => {
    if (!value) return;
    onChange(value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.4rem, 0.8vw, 0.7rem)" }}>
      <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
        {t("theme_toggle.label")}
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={handleChange}
        size="small"
        sx={{
          borderRadius: "0.6rem",
          background: "var(--color-surface-variant)",
          padding: "clamp(0.2rem, 0.5vw, 0.4rem)"
        }}
      >
        <ToggleButton value="light" sx={{ padding: "clamp(0.3rem, 0.6vw, 0.5rem)" }}>
          {t("theme_toggle.light")}
        </ToggleButton>
        <ToggleButton value="dark" sx={{ padding: "clamp(0.3rem, 0.6vw, 0.5rem)" }}>
          {t("theme_toggle.dark")}
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
};
