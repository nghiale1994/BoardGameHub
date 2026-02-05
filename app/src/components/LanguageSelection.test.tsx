import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import i18n from "../i18n";
import { LanguageSelection } from "./LanguageSelection";
import { renderWithI18n } from "../test/render";

const persistenceMock = vi.hoisted(() => ({
  setPreference: vi.fn(async () => undefined)
}));

vi.mock("../services/persistence", () => ({
  persistence: persistenceMock
}));

describe("LanguageSelection", () => {
  // Tests: changing language updates i18n and persists preference.
  // Steps:
  // 1) clear stored language preference
  // 2) render LanguageSelection
  // 3) open language combobox
  // 4) select Vietnamese
  // 5) assert i18n.language becomes 'vi'
  // 6) assert localStorage and persistence updated
  test("changing language updates i18n and persists preference", async () => {
    console.log("[test] LanguageSelection changing language updates i18n and persists");

    // Step 1) clear stored language preference
    localStorage.removeItem("boardgamehub.language");
    persistenceMock.setPreference.mockClear();

    // Step 2) render LanguageSelection
    await renderWithI18n(<LanguageSelection />, { language: "en" });

    const combo = screen.getByRole("combobox");

    // Step 3) open language combobox
    console.log("[test] open language combobox");
    fireEvent.mouseDown(combo);

    // Step 4) select Vietnamese
    console.log("[test] select Vietnamese");
    fireEvent.click(screen.getByRole("option", { name: "Vietnamese" }));

    // Step 5) assert i18n.language becomes 'vi'
    console.log("[test] await i18n updates to vi");
    await waitFor(() => {
      expect(i18n.language).toBe("vi");
    });

    // Step 6) assert localStorage and persistence updated
    console.log("[test] assert localStorage + persistence preference");
    expect(localStorage.getItem("boardgamehub.language")).toBe("vi");
    expect(persistenceMock.setPreference).toHaveBeenCalledWith("language", "vi");
  });
});
