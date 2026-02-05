import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { RoomCreatedModal } from "./RoomCreatedModal";
import { renderWithI18n } from "../test/render";

describe("RoomCreatedModal", () => {
  // Tests: Copy writes shareUrl to clipboard and shows confirmation.
  // Steps:
  // 1) render open modal with shareUrl
  // 2) click Copy
  // 3) assert clipboard.writeText called with shareUrl
  // 4) assert "Link copied!" appears
  test("copy writes to clipboard and shows confirmation", async () => {
    console.log("[test] RoomCreatedModal copy writes clipboard + shows confirmation");
    const shareUrl = "https://boardgamehub.com/i/ABC123";

    // Step 1) render open modal with shareUrl
    await renderWithI18n(
      <RoomCreatedModal open shareUrl={shareUrl} onEnter={vi.fn()} onLater={vi.fn()} />,
      { language: "en" }
    );

    // Step 2) click Copy
    console.log("[test] click Copy");
    const copy = screen.getByRole("button", { name: "Copy" });
    fireEvent.click(copy);

    // Step 3) assert clipboard.writeText called with shareUrl
    console.log("[test] assert clipboard.writeText called");
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(shareUrl);
    });

    // Step 4) assert "Link copied!" appears
    console.log("[test] assert confirmation shown");
    await waitFor(() => {
      expect(screen.getByText("Link copied!")).toBeInTheDocument();
    });
  });

  // Tests: Enter room and Later invoke callbacks.
  // Steps:
  // 1) render open modal
  // 2) click Enter room
  // 3) assert onEnter called
  // 4) click Later
  // 5) assert onLater called
  test("enter and later actions invoke callbacks", async () => {
    console.log("[test] RoomCreatedModal enter and later invoke callbacks");
    const onEnter = vi.fn();
    const onLater = vi.fn();

    // Step 1) render open modal
    await renderWithI18n(
      <RoomCreatedModal open shareUrl="https://boardgamehub.com/i/ABC123" onEnter={onEnter} onLater={onLater} />,
      { language: "en" }
    );

    // Step 2) click Enter room
    console.log("[test] click Enter room");
    fireEvent.click(screen.getByRole("button", { name: "Enter room" }));

    // Step 3) assert onEnter called
    console.log("[test] assert onEnter called");
    expect(onEnter).toHaveBeenCalled();

    // Step 4) click Later
    console.log("[test] click Later");
    fireEvent.click(screen.getByRole("button", { name: "Later" }));

    // Step 5) assert onLater called
    console.log("[test] assert onLater called");
    expect(onLater).toHaveBeenCalled();
  });
});
