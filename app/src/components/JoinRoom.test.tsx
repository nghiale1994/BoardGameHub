import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { JoinRoom } from "./JoinRoom";
import { renderWithI18n } from "../test/render";

describe("JoinRoom", () => {
  // Tests: Join button disabled until URL is valid.
  // Steps:
  // 1) render JoinRoom
  // 2) assert Join is disabled initially
  // 3) type an invalid URL
  // 4) assert Join remains disabled
  // 5) type a roomId
  // 6) assert Join becomes enabled
  test("join button is disabled until URL is valid", async () => {
    console.log("[test] JoinRoom join button enablement");

    // Step 1) render JoinRoom
    await renderWithI18n(<JoinRoom onJoin={vi.fn()} />, { language: "en" });

    // Step 2) assert Join is disabled initially
    const joinButton = screen.getByRole("button", { name: "Join" });
    console.log("[test] assert Join disabled initially");
    expect(joinButton).toBeDisabled();

    // Step 3) type an invalid URL
    console.log("[test] type invalid URL");
    fireEvent.change(screen.getByPlaceholderText("Paste room URL"), { target: { value: "not a url" } });

    // Step 4) assert Join remains disabled
    console.log("[test] assert Join disabled");
    expect(joinButton).toBeDisabled();

    // Step 5) type a roomId
    console.log("[test] type roomId");
    fireEvent.change(screen.getByPlaceholderText("Paste room URL"), { target: { value: "ABC123" } });

    // Step 6) assert Join becomes enabled
    console.log("[test] assert Join enabled");
    expect(joinButton).toBeEnabled();
  });

  // Tests: calls onJoin with roomId and spectator flag.
  // Steps:
  // 1) render JoinRoom
  // 2) type a roomId
  // 3) toggle "Join as spectator"
  // 4) click Join
  // 5) assert onJoin called with roomId and spectator flag
  test("calls onJoin with roomId and spectator flag", async () => {
    console.log("[test] JoinRoom onJoin args (roomId, asSpectator)");
    const onJoin = vi.fn();

    // Step 1) render JoinRoom
    await renderWithI18n(<JoinRoom onJoin={onJoin} />, { language: "en" });

    // Step 2) type a roomId
    console.log("[test] type roomId");
    fireEvent.change(screen.getByPlaceholderText("Paste room URL"), { target: { value: "ABC123" } });

    // Step 3) toggle "Join as spectator"
    console.log("[test] toggle Join as spectator");
    fireEvent.click(screen.getByLabelText("Join as spectator"));

    // Step 4) click Join
    console.log("[test] click Join");
    fireEvent.click(screen.getByRole("button", { name: "Join" }));

    // Step 5) assert onJoin called with roomId and spectator flag
    console.log("[test] assert onJoin called");
    expect(onJoin).toHaveBeenCalledWith("ABC123", true);
  });
});
