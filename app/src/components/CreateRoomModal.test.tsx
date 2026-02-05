import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { CreateRoomModal } from "./CreateRoomModal";
import { renderWithI18n } from "../test/render";
import type { GameInfo } from "../data/games";

describe("CreateRoomModal", () => {
  const game: GameInfo = {
    id: "catan",
    name: "Catan",
    minPlayers: 3,
    maxPlayers: 4,
    playtime: { min: 60, max: 90 },
    complexity: 3,
    categories: ["Strategy"]
  };

  // Tests: essentials visible and Settings panel toggles.
  // Steps:
  // 1) render open modal
  // 2) assert dialog and essential fields are visible
  // 3) assert advanced settings are hidden by default
  // 4) click Settings to open advanced panel
  // 5) assert advanced settings become visible
  // 6) toggle expansions checkbox
  test("essential settings are always visible and Settings panel toggles", async () => {
    console.log("[test] CreateRoomModal essentials visible + Settings toggles");

    // Step 1) render open modal
    await renderWithI18n(
      <CreateRoomModal open game={game} onClose={vi.fn()} onCreate={vi.fn()} />,
      { language: "en" }
    );

    // Step 2) assert dialog and essential fields are visible
    console.log("[test] assert dialog and essential fields");
    expect(screen.getByRole("dialog", { name: "Create new room" })).toBeInTheDocument();
    expect(screen.getByText("Essentials")).toBeInTheDocument();
    expect(screen.getByText("Players")).toBeInTheDocument();
    expect(screen.getByLabelText("Playtime")).toBeInTheDocument();

    // Settings panel hidden by default.
    // Step 3) assert advanced settings are hidden by default
    console.log("[test] assert advanced settings hidden");
    expect(screen.getByText("Advanced settings")).not.toBeVisible();

    // Step 4) click Settings to open advanced panel
    console.log("[test] open Settings panel");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    // Step 5) assert advanced settings become visible
    console.log("[test] assert advanced settings visible");
    expect(screen.getByText("Advanced settings")).toBeVisible();

    const expansions = screen.getByRole("checkbox", { name: "Enable expansions" });

    // Step 6) toggle expansions checkbox
    console.log("[test] toggle expansions checkbox");
    expect(expansions).not.toBeChecked();
    fireEvent.click(expansions);
    expect(expansions).toBeChecked();
  });

  // Tests: changing players updates create payload.
  // Steps:
  // 1) render open modal
  // 2) open players combobox
  // 3) select players=6
  // 4) click Create Room
  // 5) assert onCreate called with players=6
  test("changing players updates create payload", async () => {
    console.log("[test] CreateRoomModal changing players updates payload");
    const onCreate = vi.fn();

    // Step 1) render open modal
    await renderWithI18n(
      <CreateRoomModal open game={game} onClose={vi.fn()} onCreate={onCreate} />,
      { language: "en" }
    );

    // Step 2) open players combobox
    // Step 3) select players=6
    console.log("[test] select players=6");
    const playerSelect = screen.getByRole("combobox");
    fireEvent.mouseDown(playerSelect);
    fireEvent.click(screen.getByRole("option", { name: "6" }));

    // Step 4) click Create Room
    console.log("[test] click Create Room");
    fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

    // Step 5) assert onCreate called with players=6
    console.log("[test] assert onCreate called with players=6");
    expect(onCreate).toHaveBeenCalledWith({ players: 6 });
  });
});
