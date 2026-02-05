import { describe, expect, test, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { WelcomeSection } from "./WelcomeSection";
import { renderWithI18n } from "../test/render";

describe("WelcomeSection", () => {
  // Tests: welcome copy renders.
  // Steps:
  // 1) render WelcomeSection
  // 2) assert headline and subcopy are visible
  test("renders welcome copy", async () => {
    console.log("[test] WelcomeSection renders welcome copy");

    // Step 1) render WelcomeSection
    await renderWithI18n(
      <WelcomeSection displayName="" onSaveName={vi.fn()} nameGateError={null} />,
      { language: "en" }
    );

    // Step 2) assert headline and subcopy are visible
    console.log("[test] assert welcome texts");
    expect(screen.getByText("Welcome to BoardGame Hub")).toBeInTheDocument();
    expect(screen.getByText("Connect with online board game players")).toBeInTheDocument();
  });

  // Tests: empty name validation prevents save.
  // Steps:
  // 1) render with empty displayName
  // 2) click Save
  // 3) assert validation message and onSaveName not called
  test("validates empty name on Save", async () => {
    console.log("[test] WelcomeSection validates empty name on Save");
    const onSaveName = vi.fn();

    // Step 1) render with empty displayName
    await renderWithI18n(<WelcomeSection displayName="" onSaveName={onSaveName} nameGateError={null} />, {
      language: "en"
    });

    // Step 2) click Save
    console.log("[test] click Save");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Step 3) assert validation message and onSaveName not called
    console.log("[test] assert validation and no callback");
    expect(screen.getByText("Please enter and save your name before continuing.")).toBeInTheDocument();
    expect(onSaveName).not.toHaveBeenCalled();
  });

  // Tests: quotes-only name validation prevents save.
  // Steps:
  // 1) render with empty displayName
  // 2) type '""'
  // 3) click Save
  // 4) assert invalid-name message and onSaveName not called
  test("validates quotes-only name on Save", async () => {
    console.log("[test] WelcomeSection validates quotes-only name on Save");
    const onSaveName = vi.fn();

    // Step 1) render with empty displayName
    await renderWithI18n(<WelcomeSection displayName="" onSaveName={onSaveName} nameGateError={null} />, {
      language: "en"
    });

    // Step 2) type '""'
    console.log("[test] type quotes-only name");
    fireEvent.change(screen.getByLabelText("Enter your name"), { target: { value: "\"\"" } });

    // Step 3) click Save
    console.log("[test] click Save");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Step 4) assert invalid-name message and onSaveName not called
    console.log("[test] assert invalid message and no callback");
    expect(screen.getByText("Invalid name (must not be quotes only).")).toBeInTheDocument();
    expect(onSaveName).not.toHaveBeenCalled();
  });

  // Tests: onSaveName called with trimmed name.
  // Steps:
  // 1) render with empty displayName
  // 2) type name with whitespace
  // 3) click Save
  // 4) assert callback receives trimmed value
  test("calls onSaveName with trimmed name", async () => {
    console.log("[test] WelcomeSection calls onSaveName with trimmed name");
    const onSaveName = vi.fn();

    // Step 1) render with empty displayName
    await renderWithI18n(<WelcomeSection displayName="" onSaveName={onSaveName} nameGateError={null} />, {
      language: "en"
    });

    // Step 2) type name with whitespace
    console.log("[test] type name with whitespace");
    fireEvent.change(screen.getByLabelText("Enter your name"), { target: { value: "  Alice  " } });

    // Step 3) click Save
    console.log("[test] click Save");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Step 4) assert callback receives trimmed value
    console.log("[test] assert callback arg trimmed");
    expect(onSaveName).toHaveBeenCalledWith("Alice");
  });
});
