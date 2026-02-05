import {
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Typography
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { persistence } from "../services/persistence";

const LANG_STORAGE_KEY = "boardgamehub.language";

export const LanguageSelection = () => {
  const { i18n, t } = useTranslation();

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    void i18n.changeLanguage(value);
    localStorage.setItem(LANG_STORAGE_KEY, value);
    void persistence.setPreference("language", value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.4rem, 0.8vw, 0.7rem)" }}>
      <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
        {t("language_selection.label")}
      </Typography>

      <FormControl size="small">
        <Select
          value={i18n.language}
          onChange={handleChange}
          sx={{
            borderRadius: "0.6rem",
            background: "var(--color-surface-variant)"
          }}
        >
          <MenuItem value="vi">{t("language_selection.vietnamese")}</MenuItem>
          <MenuItem value="en">{t("language_selection.english")}</MenuItem>
        </Select>
      </FormControl>
    </div>
  );
};
