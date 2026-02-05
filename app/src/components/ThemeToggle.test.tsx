import { describe, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";
import { renderWithI18n } from "../test/render";

describe("ThemeToggle", () => {
  // Tests: clicking a mode calls onChange.
  // Steps:
  // 1) render with mode=light
  // 2) click Dark
  // 3) assert onChange('dark')
  test("clicking a mode calls onChange", async () => {
    console.log("[test] ThemeToggle clicking a mode calls onChange");
    const onChange = vi.fn();

    // Step 1) render with mode=light
    await renderWithI18n(<ThemeToggle mode="light" onChange={onChange} />, { language: "en" });

    // Step 2) click Dark
    console.log("[test] click Dark");
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    // Step 3) assert onChange('dark')
    console.log("[test] assert onChange('dark')");
    expect(onChange).toHaveBeenCalledWith("dark");
  });
});
