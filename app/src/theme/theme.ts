import { createTheme } from "@mui/material/styles";

const TOKENS = {
  light: {
    primary: "#ff3b81",
    primaryLight: "#ff6fa3",
    secondary: "#ffd200",
    surface: "#ffffff",
    bg: "#fff7fb",
    textPrimary: "#0b1020",
    textSecondary: "#4b5563",
    border: "rgba(11, 16, 32, 0.06)"
  },
  dark: {
    primary: "#ff6fa3",
    primaryLight: "#ff95c0",
    secondary: "#ffb800",
    surface: "#121212",
    bg: "#0b0b10",
    textPrimary: "#ffffff",
    textSecondary: "#b0b0b0",
    border: "rgba(255, 255, 255, 0.06)"
  }
} as const;

export const getMuiTheme = (mode: "light" | "dark") => {
  const t = mode === "dark" ? TOKENS.dark : TOKENS.light;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: t.primary,
        light: t.primaryLight
      },
      secondary: {
        main: t.secondary
      },
      background: {
        default: t.bg,
        paper: t.surface
      },
      text: {
        primary: t.textPrimary,
        secondary: t.textSecondary
      },
      divider: t.border
    },
    shape: {
      borderRadius: 12
    },
    typography: {
      fontFamily: "Inter, Segoe UI, system-ui, -apple-system, sans-serif"
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: "0.8rem"
          }
        }
      }
    }
  });
};
