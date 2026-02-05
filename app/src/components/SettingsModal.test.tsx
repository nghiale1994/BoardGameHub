import { describe, expect, test, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { SettingsModal } from "./SettingsModal";
import { renderWithI18n } from "../test/render";

const persistenceMock = vi.hoisted(() => ({
  setPreference: vi.fn(async () => undefined),
  clearAll: vi.fn(async () => undefined)
}));

vi.mock("../services/persistence", () => ({
  persistence: persistenceMock
}));

describe("SettingsModal", () => {
  beforeEach(() => {
    persistenceMock.setPreference.mockClear();
    persistenceMock.clearAll.mockClear();
  });

  // Tests: SettingsModal open/close.
  // Steps:
  // 1) render with open=true
  // 2) assert dialog visible
  // 3) click Close
  // 4) assert onClose invoked
  test("opens and closes via Close button", async () => {
    console.log("[test] SettingsModal opens and closes via Close button");
    const onClose = vi.fn();

    // Step 1) render with open=true
    await renderWithI18n(
      <SettingsModal
        open
        onClose={onClose}
        themeMode="light"
        onThemeChange={vi.fn()}
        showConversation
        onShowConversationChange={vi.fn()}
        showGameEvents
        onShowGameEventsChange={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) assert dialog visible
    console.log("[test] assert Settings dialog visible");
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();

    // Step 3) click Close
    console.log("[test] click Close");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    // Step 4) assert onClose invoked
    console.log("[test] assert onClose called");
    expect(onClose).toHaveBeenCalled();
  });

  // Tests: theme toggle calls onThemeChange.
  // Steps:
  // 1) render with themeMode=light
  // 2) click Dark
  // 3) assert callback receives 'dark'
  test("theme toggle calls onThemeChange", async () => {
    console.log("[test] SettingsModal theme toggle calls onThemeChange");
    const onThemeChange = vi.fn();

    // Step 1) render with themeMode=light
    await renderWithI18n(
      <SettingsModal
        open
        onClose={vi.fn()}
        themeMode="light"
        onThemeChange={onThemeChange}
        showConversation
        onShowConversationChange={vi.fn()}
        showGameEvents
        onShowGameEventsChange={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 2) click Dark
    console.log("[test] click Dark theme button");
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    // Step 3) assert callback receives 'dark'
    console.log("[test] assert callback arg 'dark'");
    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  // Tests: chat settings toggles call callbacks.
  // Steps:
  // 1) render with showConversation/showGameEvents true
  // 2) toggle Show conversation off
  // 3) assert onShowConversationChange(false)
  // 4) toggle Show game events off
  // 5) assert onShowGameEventsChange(false)
  test("chat settings switches call callbacks", async () => {
    console.log("[test] SettingsModal chat settings switches call callbacks");
    const onShowConversationChange = vi.fn();
    const onShowGameEventsChange = vi.fn();

    // Step 1) render with showConversation/showGameEvents true
    await renderWithI18n(
      <SettingsModal
        open
        onClose={vi.fn()}
        themeMode="light"
        onThemeChange={vi.fn()}
        showConversation
        onShowConversationChange={onShowConversationChange}
        showGameEvents
        onShowGameEventsChange={onShowGameEventsChange}
      />,
      { language: "en" }
    );

    // Step 2) toggle Show conversation off
    console.log("[test] toggle Show conversation off");
    fireEvent.click(screen.getByLabelText("Show conversation"));

    // Step 3) assert onShowConversationChange(false)
    console.log("[test] assert onShowConversationChange(false)");
    expect(onShowConversationChange).toHaveBeenCalledWith(false);

    // Step 4) toggle Show game events off
    console.log("[test] toggle Show game events off");
    fireEvent.click(screen.getByLabelText("Show game events"));

    // Step 5) assert onShowGameEventsChange(false)
    console.log("[test] assert onShowGameEventsChange(false)");
    expect(onShowGameEventsChange).toHaveBeenCalledWith(false);
  });
});
