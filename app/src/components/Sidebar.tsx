import MenuIcon from "@mui/icons-material/Menu";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelection } from "./LanguageSelection";
import { ThemeToggle } from "./ThemeToggle";

type SidebarProps = {
  open: boolean;
  onToggle: () => void;
  themeMode: "light" | "dark";
  onThemeChange: (mode: "light" | "dark") => void;
  onOpenSettings: () => void;
};

const drawerWidth = "clamp(14rem, 20vw, 22rem)";

export const Sidebar = ({ open, onToggle, themeMode, onThemeChange, onOpenSettings }: SidebarProps) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 769px)");
  const buttonOffset = useMemo(() => "clamp(0.6rem, 1.5vw, 1rem)", []);
  const drawerPaperRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const applyHamburgerPosition = () => {
      const hamburger = hamburgerRef.current;
      if (!hamburger) return;

      const paper = drawerPaperRef.current;
      if (!paper) {
        // Fallback: keep it reachable near the left edge.
        hamburger.style.left = buttonOffset;
        hamburger.style.right = "auto";
        return;
      }

      const rect = paper.getBoundingClientRect();
      const rightEdgePx = Math.max(rect.right, 0);

      const isFullWidthOpen = open && rect.right >= window.innerWidth - 1;
      if (isFullWidthOpen) {
        hamburger.style.left = "auto";
        hamburger.style.right = buttonOffset;
        return;
      }

      hamburger.style.right = "auto";
      hamburger.style.left = `calc(${rightEdgePx}px + ${buttonOffset})`;
    };

    let rafId = 0;
    let timeoutId = 0;

    const syncDuringTransition = () => {
      // MUI Drawer animates via transform; update each frame so the button stays pinned.
      const START = (window.performance && performance.now) ? performance.now() : Date.now();
      const DURATION_MS = 320;

      const step = () => {
        applyHamburgerPosition();
        const now = (window.performance && performance.now) ? performance.now() : Date.now();
        if (now - START < DURATION_MS) {
          rafId = window.requestAnimationFrame(step);
        } else {
          applyHamburgerPosition();
        }
      };

      rafId = window.requestAnimationFrame(step);

      // Safety: if the drawer is already in final state, still re-apply once shortly after.
      timeoutId = window.setTimeout(applyHamburgerPosition, 60);
    };

    syncDuringTransition();

    const onResize = () => {
      syncDuringTransition();
    };
    window.addEventListener("resize", onResize);

    const paper = drawerPaperRef.current;
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") return;
      applyHamburgerPosition();
    };
    paper?.addEventListener("transitionend", onTransitionEnd);

    return () => {
      window.removeEventListener("resize", onResize);
      paper?.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
    };
  }, [buttonOffset, open]);

  return (
    <>
      <IconButton
        aria-label={t("nav.menu_toggle")}
        onClick={onToggle}
        ref={hamburgerRef}
        sx={{
          position: "fixed",
          top: "clamp(0.6rem, 1.5vw, 1rem)",
          left: buttonOffset,
          right: "auto",
          transition: "none",
          zIndex: 1400,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 0.4rem 1rem var(--color-shadow)"
        }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        variant={isDesktop ? "persistent" : "temporary"}
        open={open}
        onClose={onToggle}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          ref: drawerPaperRef,
          sx: {
            width: drawerWidth,
            background: "var(--color-surface)",
            borderRight: "1px solid var(--color-border)",
            padding: "clamp(1rem, 2vw, 1.5rem)",
            height: "100vh"
          }
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(1rem, 2vw, 1.6rem)" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t("sidebar.title")}
          </Typography>

          <LanguageSelection />
          <ThemeToggle mode={themeMode} onChange={onThemeChange} />

          <Button
            variant="outlined"
            startIcon={<SettingsOutlinedIcon />}
            onClick={() => {
              onOpenSettings();
              if (!isDesktop) onToggle();
            }}
            sx={{
              justifyContent: "flex-start",
              borderRadius: "0.8rem",
              padding: "clamp(0.5rem, 1vw, 0.8rem) clamp(0.8rem, 1.6vw, 1.2rem)",
              textTransform: "none"
            }}
          >
            {t("sidebar.settings")}
          </Button>
        </Box>
      </Drawer>
    </>
  );
};
