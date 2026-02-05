import { describe, expect, test, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import type { GameInfo } from "../data/games";
import { GameListGrid } from "./GameListGrid";
import { renderWithI18n } from "../test/render";

const setMatchMedia = (matchesByQuery: Record<string, boolean>) => {
  window.matchMedia = (query: string) =>
    ({
      matches: Boolean(matchesByQuery[query]),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }) as unknown as MediaQueryList;
};

const games: GameInfo[] = [
  {
    id: "catan",
    name: "Catan",
    minPlayers: 3,
    maxPlayers: 4,
    playtime: { min: 60, max: 90 },
    complexity: 3,
    categories: ["Strategy"]
  },
  {
    id: "azul",
    name: "Azul",
    minPlayers: 2,
    maxPlayers: 4,
    playtime: { min: 30, max: 45 },
    complexity: 2,
    categories: ["Family"]
  }
];

describe("GameListGrid", () => {
  // Tests: search filters after debounce.
  // Steps:
  // 1) enable fake timers
  // 2) render with 2 games
  // 3) assert both games initially visible
  // 4) type search 'cat'
  // 5) advance timers past debounce
  // 6) assert only Catan remains
  // 7) restore real timers
  test("filters games after search debounce", async () => {
    console.log("[test] GameListGrid filters games after search debounce");
    // Step 1) enable fake timers
    vi.useFakeTimers();

    // Step 2) render with 2 games
    await renderWithI18n(<GameListGrid games={games} onSelectGame={vi.fn()} />, { language: "en" });

    // Step 3) assert both games initially visible
    console.log("[test] assert initial games visible");
    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();

    // Step 4) type search 'cat'
    console.log("[test] type search 'cat' and advance debounce");
    fireEvent.change(screen.getByPlaceholderText("Search games…"), { target: { value: "cat" } });

    // Step 5) advance timers past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Step 6) assert only Catan remains
    console.log("[test] assert filtered results");
    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.queryByText("Azul")).not.toBeInTheDocument();

    // Step 7) restore real timers
    vi.useRealTimers();
  });

  // Tests: desktop filters apply immediately and Clear all resets.
  // Steps:
  // 1) set desktop breakpoint
  // 2) render
  // 3) open Filters
  // 4) select player count=2
  // 5) assert only Azul remains and badge shows 1
  // 6) click Clear all
  // 7) assert both games visible and badge reset
  test("desktop: filters apply immediately and Clear all resets", async () => {
    console.log("[test] GameListGrid desktop filters apply immediately + Clear all resets");

    // Step 1) set desktop breakpoint
    setMatchMedia({
      "(max-width: 767px)": false,
      "(min-width: 768px) and (max-width: 1024px)": false,
      "(min-width: 1025px)": true,
      "(max-width: 360px)": false
    });

    // Step 2) render
    await renderWithI18n(<GameListGrid games={games} onSelectGame={vi.fn()} />, { language: "en" });

    // Step 3) open Filters
    console.log("[test] open Filters");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(await screen.findByText("Player count")).toBeInTheDocument();

    // Apply player count=2, which should keep Azul (2-4) and exclude Catan (3-4).
    // Step 4) select player count=2
    console.log("[test] apply player count=2");
    fireEvent.click(screen.getByLabelText("2"));

    // Step 5) assert only Azul remains and badge shows 1
    console.log("[test] assert filter badge + filtered results");
    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
    expect(screen.queryByText("Catan")).not.toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();

    // Step 6) click Clear all
    console.log("[test] click Clear all");
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    // Step 7) assert both games visible and badge reset
    console.log("[test] assert filters reset");
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
  });

  // Tests: mobile filter changes are draft until Apply.
  // Steps:
  // 1) set mobile breakpoint
  // 2) render
  // 3) open Filters
  // 4) select player count=2 (draft)
  // 5) assert results unchanged before Apply
  // 6) click Apply
  // 7) assert only Azul remains and badge shows 1
  test("mobile: filter changes are draft until Apply", async () => {
    console.log("[test] GameListGrid mobile filters are draft until Apply");

    // Step 1) set mobile breakpoint
    setMatchMedia({
      "(max-width: 767px)": true,
      "(min-width: 768px) and (max-width: 1024px)": false,
      "(min-width: 1025px)": false,
      "(max-width: 360px)": false
    });

    // Step 2) render
    await renderWithI18n(<GameListGrid games={games} onSelectGame={vi.fn()} />, { language: "en" });

    // Step 3) open Filters
    console.log("[test] open Filters");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(await screen.findByText("Player count")).toBeInTheDocument();

    // Step 4) select player count=2 (draft)
    console.log("[test] select player count=2 (draft)");
    fireEvent.click(screen.getByLabelText("2"));

    // Not applied yet.
    // Step 5) assert results unchanged before Apply
    console.log("[test] assert results unchanged before Apply");
    expect(screen.getByText("Catan")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();

    // Step 6) click Apply
    console.log("[test] click Apply");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    // Step 7) assert only Azul remains and badge shows 1
    console.log("[test] assert filter badge + filtered results");
    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
    expect(screen.queryByText("Catan")).not.toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
  });

  // Tests: tablet filters drawer applies immediately, no Apply button.
  // Steps:
  // 1) set tablet breakpoint
  // 2) render
  // 3) open Filters
  // 4) assert Apply not present
  // 5) select player count=2
  // 6) close filters drawer
  // 7) assert only Azul remains and badge shows 1
  test("tablet: filters open in a side drawer and apply immediately (no Apply button)", async () => {
    console.log("[test] GameListGrid tablet filters apply immediately (no Apply)");

    // Step 1) set tablet breakpoint
    setMatchMedia({
      "(max-width: 767px)": false,
      "(min-width: 768px) and (max-width: 1024px)": true,
      "(min-width: 1025px)": false,
      "(max-width: 360px)": false
    });

    // Step 2) render
    await renderWithI18n(<GameListGrid games={games} onSelectGame={vi.fn()} />, { language: "en" });

    // Step 3) open Filters
    console.log("[test] open Filters");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(await screen.findByText("Player count")).toBeInTheDocument();

    // Step 4) assert Apply not present
    console.log("[test] assert Apply not present");
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();

    // Step 5) select player count=2
    console.log("[test] select player count=2");
    fireEvent.click(screen.getByLabelText("2"));

    // Close the drawer so the underlying page is no longer aria-hidden.
    // Step 6) close filters drawer
    console.log("[test] close filters drawer");
    fireEvent.click(screen.getByRole("button", { name: "Close filters" }));

    // Step 7) assert only Azul remains and badge shows 1
    console.log("[test] assert filter badge + filtered results");
    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
    expect(screen.queryByText("Catan")).not.toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
  });

  // Tests: filters use AND logic across types; chips can remove individual filters.
  // Steps:
  // 1) set desktop breakpoint
  // 2) render
  // 3) open Filters
  // 4) apply player=2 and category=Strategy
  // 5) assert empty results state and chips visible
  // 6) remove Strategy chip
  // 7) assert only player filter remains and Azul is visible
  test("filters use AND logic across types and chips can remove individual filters", async () => {
    console.log("[test] GameListGrid filters AND logic + chips remove individual filters");

    // Step 1) set desktop breakpoint
    setMatchMedia({
      "(max-width: 767px)": false,
      "(min-width: 768px) and (max-width: 1024px)": false,
      "(min-width: 1025px)": true,
      "(max-width: 360px)": false
    });

    // Step 2) render
    await renderWithI18n(<GameListGrid games={games} onSelectGame={vi.fn()} />, { language: "en" });

    // Step 3) open Filters
    console.log("[test] open Filters");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(await screen.findByText("Player count")).toBeInTheDocument();

    // Player=2 matches Azul, Category=Strategy matches Catan.
    // AND across types means the intersection is empty.
    // Step 4) apply player=2 and category=Strategy
    console.log("[test] apply player=2 and category=Strategy");
    fireEvent.click(screen.getByLabelText("2"));
    fireEvent.click(screen.getByLabelText("Strategy"));

    // Step 5) assert empty results state and chips visible
    console.log("[test] assert empty results state");
    expect(screen.getByRole("button", { name: "Filters (2)" })).toBeInTheDocument();
    expect(screen.queryByText("Catan")).not.toBeInTheDocument();
    expect(screen.queryByText("Azul")).not.toBeInTheDocument();
    expect(screen.getByText("No games available")).toBeInTheDocument();

    // Chips reflect active filters.
    expect(screen.getByText("2-2 players")).toBeInTheDocument();

    const strategyChipRoot = screen
      .getAllByText("Strategy")
      .map((element) => element.closest(".MuiChip-root"))
      .find((element): element is HTMLElement => Boolean(element));
    expect(strategyChipRoot).not.toBeNull();

    // Step 6) remove Strategy chip
    console.log("[test] remove Strategy chip");
    fireEvent.click(within(strategyChipRoot as HTMLElement).getByTestId("CancelIcon"));

    // Now only the player filter remains.
    // Step 7) assert only player filter remains and Azul is visible
    console.log("[test] assert only player filter remains and Azul is visible");
    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
    expect(screen.queryByText("Catan")).not.toBeInTheDocument();
  });

  // Tests: pagination resets to page 1 when results shrink.
  // Steps:
  // 1) set desktop breakpoint
  // 2) enable fake timers
  // 3) render many games
  // 4) assert page 1 of 2 initially
  // 5) go to page 2
  // 6) type search to narrow to 1 item
  // 7) advance timers past debounce
  // 8) assert page resets to 1/1 and item visible
  // 9) restore real timers
  test("pagination resets to page 1 when results shrink", async () => {
    console.log("[test] GameListGrid pagination resets to page 1 when results shrink");

    // Step 1) set desktop breakpoint
    setMatchMedia({
      "(max-width: 767px)": false,
      "(min-width: 768px) and (max-width: 1024px)": false,
      "(min-width: 1025px)": true,
      "(max-width: 360px)": false
    });

    const manyGames: GameInfo[] = Array.from({ length: 11 }).map((_, index) => ({
      id: `g${index + 1}`,
      name: `Game ${index + 1}`,
      minPlayers: 2,
      maxPlayers: 4,
      playtime: { min: 30, max: 45 },
      complexity: 2,
      categories: ["Family"]
    }));

    // Step 2) enable fake timers
    vi.useFakeTimers();

    // Step 3) render many games
    await renderWithI18n(<GameListGrid games={manyGames} onSelectGame={vi.fn()} />, { language: "en" });

    // Step 4) assert page 1 of 2 initially
    console.log("[test] assert page 1 of 2 initially");
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    // Move to page 2.
    // Step 5) go to page 2
    console.log("[test] go to page 2");
    fireEvent.click(screen.getByLabelText("Go to page 2"));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    // Narrow results down to a single item; should reset to page 1.
    // Step 6) type search to narrow to 1 item
    console.log("[test] type search 'Game 1' and advance debounce");
    fireEvent.change(screen.getByPlaceholderText("Search games…"), { target: { value: "Game 1" } });

    // Step 7) advance timers past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Step 8) assert page resets to 1/1 and item visible
    console.log("[test] assert page reset to 1/1 and Game 1 visible");
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(screen.getByText("Game 1")).toBeInTheDocument();

    // Step 9) restore real timers
    vi.useRealTimers();
  });

  // Tests: pagination disables prev on first page and next on last page.
  // Steps:
  // 1) set desktop breakpoint
  // 2) render many games
  // 3) locate prev/next controls
  // 4) assert prev disabled and next enabled
  // 5) go to page 2
  // 6) assert next disabled and prev enabled
  test("pagination disables prev on first page and next on last page", async () => {
    console.log("[test] GameListGrid pagination disables prev/next at edges");

    // Step 1) set desktop breakpoint
    setMatchMedia({
      "(max-width: 767px)": false,
      "(min-width: 768px) and (max-width: 1024px)": false,
      "(min-width: 1025px)": true,
      "(max-width: 360px)": false
    });

    const manyGames: GameInfo[] = Array.from({ length: 11 }).map((_, index) => ({
      id: `g${index + 1}`,
      name: `Game ${index + 1}`,
      minPlayers: 2,
      maxPlayers: 4,
      playtime: { min: 30, max: 45 },
      complexity: 2,
      categories: ["Family"]
    }));

    // Step 2) render many games
    await renderWithI18n(<GameListGrid games={manyGames} onSelectGame={vi.fn()} />, { language: "en" });

    // Step 3) locate prev/next controls
    const prev = screen.getByLabelText("Go to previous page");
    const next = screen.getByLabelText("Go to next page");

    // Step 4) assert prev disabled and next enabled
    console.log("[test] assert initial prev disabled and next enabled");
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    // Step 5) go to page 2
    console.log("[test] go to page 2");
    fireEvent.click(screen.getByLabelText("Go to page 2"));

    // Step 6) assert next disabled and prev enabled
    console.log("[test] assert next disabled and prev enabled");
    expect(screen.getByLabelText("Go to next page")).toBeDisabled();
    expect(screen.getByLabelText("Go to previous page")).not.toBeDisabled();
  });

  // Tests: clicking a card calls onSelectGame with GameInfo.
  // Steps:
  // 1) render
  // 2) click game title
  // 3) assert callback called with matching game
  test("calls onSelectGame when clicking a card", async () => {
    console.log("[test] GameListGrid calls onSelectGame when clicking a card");
    const onSelectGame = vi.fn();

    // Step 1) render
    await renderWithI18n(<GameListGrid games={games} onSelectGame={onSelectGame} />, { language: "en" });

    // Step 2) click game title
    console.log("[test] click Catan card");
    fireEvent.click(screen.getByText("Catan"));

    // Step 3) assert callback called with matching game
    console.log("[test] assert callback payload");
    expect(onSelectGame).toHaveBeenCalledWith(games[0]);
  });
});
