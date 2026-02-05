import CloseIcon from "@mui/icons-material/Close";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Pagination,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameInfo } from "../data/games";
import { games as allGames } from "../data/games";
import { GameCard } from "./GameCard";

const PAGE_SIZE = 10;

type GameListGridProps = {
  games?: GameInfo[];
  onSelectGame: (game: GameInfo) => void;
};

type PlaytimeRange = "<30" | "30-60" | "60-120" | ">120";
type ComplexityLevel = "light" | "medium" | "heavy";

type ActiveFilters = {
  playerCount: number[];
  playtime: PlaytimeRange | null;
  complexity: ComplexityLevel | null;
  categories: string[];
};

const DEFAULT_FILTERS: ActiveFilters = {
  playerCount: [],
  playtime: null,
  complexity: null,
  categories: []
};

export const GameListGrid = ({ games = allGames, onSelectGame }: GameListGridProps) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1024px)");
  const isDesktop = useMediaQuery("(min-width: 1025px)");
  const isTinyMobile = useMediaQuery("(max-width: 360px)");

  useEffect(() => {
    const handle = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const activeFilterCount =
    filters.playerCount.length +
    filters.categories.length +
    (filters.playtime ? 1 : 0) +
    (filters.complexity ? 1 : 0);

  const allCategories = useMemo(() => {
    const categorySet = new Set<string>();
    for (const game of games) {
      for (const category of game.categories) {
        categorySet.add(category);
      }
    }
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  }, [games]);

  const filteredGames = useMemo(() => {
    const query = searchQuery.toLowerCase();

    const matchesPlayerCount = (game: GameInfo) => {
      if (filters.playerCount.length === 0) return true;
      return filters.playerCount.some((count) => game.minPlayers <= count && game.maxPlayers >= count);
    };

    const matchesPlaytime = (game: GameInfo) => {
      if (!filters.playtime) return true;
      const gameMin = game.playtime.min;
      const gameMax = game.playtime.max;

      const range = (() => {
        switch (filters.playtime) {
          case "<30":
            return { min: 0, max: 29 };
          case "30-60":
            return { min: 30, max: 60 };
          case "60-120":
            return { min: 60, max: 120 };
          case ">120":
            return { min: 121, max: Number.POSITIVE_INFINITY };
        }
      })();

      return gameMin <= range.max && gameMax >= range.min;
    };

    const matchesComplexity = (game: GameInfo) => {
      if (!filters.complexity) return true;
      switch (filters.complexity) {
        case "light":
          return game.complexity <= 2;
        case "medium":
          return game.complexity === 3;
        case "heavy":
          return game.complexity >= 4;
      }
    };

    const matchesCategories = (game: GameInfo) => {
      if (filters.categories.length === 0) return true;
      return filters.categories.some((selected) => game.categories.includes(selected));
    };

    return games
      .filter((game) => (query.length ? game.name.toLowerCase().includes(query) : true))
      .filter(matchesPlayerCount)
      .filter(matchesPlaytime)
      .filter(matchesComplexity)
      .filter(matchesCategories);
  }, [filters, games, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));
  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageGames = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredGames.slice(start, start + PAGE_SIZE);
  }, [filteredGames, page]);

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    if (isMobile && filterPanelOpen) {
      setDraftFilters(DEFAULT_FILTERS);
    }
  };

  const openFilterPanel = () => {
    if (isMobile) setDraftFilters(filters);
    setFilterPanelOpen(true);
  };

  const closeFilterPanel = () => setFilterPanelOpen(false);

  const setPlayerCount = (count: number, checked: boolean) => {
    const update = (prev: ActiveFilters): ActiveFilters => ({
      ...prev,
      playerCount: checked ? Array.from(new Set([...prev.playerCount, count])) : prev.playerCount.filter((c) => c !== count)
    });

    if (isMobile) setDraftFilters(update);
    else setFilters(update);
  };

  const setPlaytime = (value: PlaytimeRange | null) => {
    if (isMobile) setDraftFilters((prev) => ({ ...prev, playtime: value }));
    else setFilters((prev) => ({ ...prev, playtime: value }));
  };

  const setComplexity = (value: ComplexityLevel | null) => {
    if (isMobile) setDraftFilters((prev) => ({ ...prev, complexity: value }));
    else setFilters((prev) => ({ ...prev, complexity: value }));
  };

  const setCategory = (category: string, checked: boolean) => {
    const update = (prev: ActiveFilters): ActiveFilters => ({
      ...prev,
      categories: checked
        ? Array.from(new Set([...prev.categories, category]))
        : prev.categories.filter((c) => c !== category)
    });

    if (isMobile) setDraftFilters(update);
    else setFilters(update);
  };

  const appliedChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onDelete: () => void }> = [];

    for (const count of filters.playerCount) {
      const label =
        count === 6
          ? t("game_list.players_label_plus", { min: 6 })
          : t("game_list.players_label", { min: count, max: count });
      chips.push({
        key: `players:${count}`,
        label,
        onDelete: () =>
          setFilters((prev) => ({
            ...prev,
            playerCount: prev.playerCount.filter((c) => c !== count)
          }))
      });
    }

    if (filters.playtime) {
      const labelKey =
        filters.playtime === "<30"
          ? "game_list.playtime_lt_30"
          : filters.playtime === "30-60"
            ? "game_list.playtime_30_60"
            : filters.playtime === "60-120"
              ? "game_list.playtime_60_120"
              : "game_list.playtime_gt_120";
      chips.push({
        key: `playtime:${filters.playtime}`,
        label: t(labelKey),
        onDelete: () => setFilters((prev) => ({ ...prev, playtime: null }))
      });
    }

    if (filters.complexity) {
      const labelKey =
        filters.complexity === "light"
          ? "game_list.complexity_light"
          : filters.complexity === "medium"
            ? "game_list.complexity_medium"
            : "game_list.complexity_heavy";
      chips.push({
        key: `complexity:${filters.complexity}`,
        label: t(labelKey),
        onDelete: () => setFilters((prev) => ({ ...prev, complexity: null }))
      });
    }

    for (const category of filters.categories) {
      chips.push({
        key: `category:${category}`,
        label: category,
        onDelete: () =>
          setFilters((prev) => ({
            ...prev,
            categories: prev.categories.filter((c) => c !== category)
          }))
      });
    }

    return chips;
  }, [filters, t]);

  useEffect(() => {
    if (!isMobile || !filterPanelOpen) return;
    setDraftFilters(filters);
  }, [filters, filterPanelOpen, isMobile]);

  const renderFilterControls = (mode: "desktop" | "drawer" | "bottom") => {
    const currentFilters = isMobile ? draftFilters : filters;

    const header = (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t("game_list.filters")}
        </Typography>
        <IconButton onClick={closeFilterPanel} aria-label="Close filters" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );

    const content = (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, marginBottom: "0.4rem" }}>
            {t("game_list.player_count")}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <FormControlLabel
                key={count}
                control={
                  <Checkbox
                    checked={currentFilters.playerCount.includes(count)}
                    onChange={(event) => setPlayerCount(count, event.target.checked)}
                  />
                }
                label={count === 6 ? "6+" : String(count)}
              />
            ))}
          </Box>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, marginBottom: "0.4rem" }}>
            {t("game_list.playtime")}
          </Typography>
          <RadioGroup
            value={currentFilters.playtime ?? ""}
            onChange={(event) => setPlaytime((event.target.value || null) as PlaytimeRange | null)}
          >
            <FormControlLabel value="<30" control={<Radio />} label={t("game_list.playtime_lt_30")} />
            <FormControlLabel value="30-60" control={<Radio />} label={t("game_list.playtime_30_60")} />
            <FormControlLabel value="60-120" control={<Radio />} label={t("game_list.playtime_60_120")} />
            <FormControlLabel value=">120" control={<Radio />} label={t("game_list.playtime_gt_120")} />
          </RadioGroup>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, marginBottom: "0.4rem" }}>
            {t("game_list.complexity")}
          </Typography>
          <RadioGroup
            value={currentFilters.complexity ?? ""}
            onChange={(event) => setComplexity((event.target.value || null) as ComplexityLevel | null)}
          >
            <FormControlLabel value="light" control={<Radio />} label={t("game_list.complexity_light")} />
            <FormControlLabel value="medium" control={<Radio />} label={t("game_list.complexity_medium")} />
            <FormControlLabel value="heavy" control={<Radio />} label={t("game_list.complexity_heavy")} />
          </RadioGroup>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, marginBottom: "0.4rem" }}>
            {t("game_list.category")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "0.2rem", maxHeight: "16rem", overflow: "auto" }}>
            {allCategories.map((category) => (
              <FormControlLabel
                key={category}
                control={
                  <Checkbox
                    checked={currentFilters.categories.includes(category)}
                    onChange={(event) => setCategory(category, event.target.checked)}
                  />
                }
                label={category}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: "0.8rem", marginTop: "0.4rem" }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (isMobile) setDraftFilters(DEFAULT_FILTERS);
              else setFilters(DEFAULT_FILTERS);
            }}
            sx={{ textTransform: "none", borderRadius: "0.7rem" }}
          >
            {t("game_list.reset")}
          </Button>

          {mode === "bottom" ? (
            <Button
              variant="contained"
              onClick={() => {
                setFilters(draftFilters);
                closeFilterPanel();
              }}
              sx={{ textTransform: "none", borderRadius: "0.7rem", marginLeft: "auto" }}
            >
              {t("game_list.apply")}
            </Button>
          ) : null}
        </Box>
      </Box>
    );

    if (mode === "desktop") {
      return (
        <Paper
          elevation={0}
          sx={{
            width: "18.75rem",
            borderRadius: "1rem",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            padding: "1rem",
            alignSelf: "flex-start",
            position: "sticky",
            top: "clamp(1rem, 2vw, 1.5rem)"
          }}
        >
          {header}
          <Box sx={{ height: "0.8rem" }} />
          {content}
        </Paper>
      );
    }

    return (
      <Box sx={{ padding: "1rem" }}>
        {header}
        <Box sx={{ height: "0.8rem" }} />
        {content}
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "clamp(0.8rem, 1.6vw, 1.2rem)" }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {t("game_list.title")}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: isDesktop ? "row" : "column",
          gap: "0.8rem",
          alignItems: isDesktop ? "center" : "stretch"
        }}
      >
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("game_list.search_placeholder")}
          size="small"
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <Box sx={{ display: "flex", alignItems: "center", color: "var(--color-text-secondary)", marginRight: "0.5rem" }}>
                <SearchIcon fontSize="small" />
              </Box>
            ),
            endAdornment: searchInput.length ? (
              <IconButton aria-label="Clear search" onClick={() => setSearchInput("")} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            ) : null
          }}
        />

        <Button
          variant="outlined"
          startIcon={<FilterAltOutlinedIcon />}
          onClick={() => (filterPanelOpen ? closeFilterPanel() : openFilterPanel())}
          sx={{
            textTransform: "none",
            borderRadius: "0.7rem",
            whiteSpace: "nowrap",
            alignSelf: isDesktop ? "auto" : "flex-start"
          }}
        >
          {activeFilterCount > 0 ? `${t("game_list.filters")} (${activeFilterCount})` : t("game_list.filters")}
        </Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          shape="rounded"
          color="primary"
        />
        <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
          {t("game_list.page_indicator", { current: page, total: totalPages })}
        </Typography>
      </Box>

      {appliedChips.length > 0 ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            flexWrap: isDesktop ? "wrap" : "nowrap",
            overflowX: isDesktop ? "visible" : "auto",
            paddingBottom: isDesktop ? 0 : "0.2rem"
          }}
        >
          {appliedChips.map((chip) => (
            <Chip key={chip.key} label={chip.label} onDelete={chip.onDelete} size="small" />
          ))}

          <Button
            variant="text"
            onClick={clearAllFilters}
            sx={{ textTransform: "none", marginLeft: isDesktop ? 0 : "auto", flex: "0 0 auto" }}
          >
            {t("game_list.clear_all")}
          </Button>
        </Box>
      ) : null}

      {isTablet ? (
        <Drawer anchor="right" open={filterPanelOpen} onClose={closeFilterPanel}>
          <Box sx={{ width: "min(22rem, 88vw)" }}>{renderFilterControls("drawer")}</Box>
        </Drawer>
      ) : null}

      {isMobile ? (
        <Drawer anchor="bottom" open={filterPanelOpen} onClose={closeFilterPanel}>
          <Box sx={{ maxHeight: "85vh", overflow: "auto" }}>{renderFilterControls("bottom")}</Box>
        </Drawer>
      ) : null}

      <Box
        sx={{
          display: "flex",
          flexDirection: isDesktop ? "row" : "column",
          gap: "clamp(1rem, 2vw, 1.4rem)",
          alignItems: "flex-start"
        }}
      >
        <Box sx={{ flex: 1, width: "100%" }}>
          {pageGames.length === 0 ? (
        <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
          {t("game_list.no_games")}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isDesktop
              ? "repeat(5, minmax(0, 1fr))"
              : isTablet
                ? "repeat(3, minmax(0, 1fr))"
                : isTinyMobile
                  ? "repeat(1, minmax(0, 1fr))"
                  : "repeat(2, minmax(0, 1fr))",
            gap: "clamp(0.8rem, 1.6vw, 1.2rem)"
          }}
        >
          {pageGames.map((game) => (
            <GameCard key={game.id} game={game} onSelect={onSelectGame} />
          ))}
        </Box>
      )}
        </Box>

        {isDesktop ? (
          <Collapse in={filterPanelOpen} orientation="horizontal" collapsedSize={0}>
            {renderFilterControls("desktop")}
          </Collapse>
        ) : null}
      </Box>
    </Box>
  );
};
