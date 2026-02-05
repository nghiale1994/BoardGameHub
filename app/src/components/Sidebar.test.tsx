import { describe, expect, test, vi, beforeEach } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
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

describe("Sidebar", () => {
  let rafCallbacks: FrameRequestCallback[];
  let rafTimeMs: number;

  const flushRaf = (durationMs = 400, stepMs = 16) => {
    const target = rafTimeMs + durationMs;
    while (rafCallbacks.length > 0 && rafTimeMs < target) {
      const callbacks = rafCallbacks;
      rafCallbacks = [];
      rafTimeMs += stepMs;
      callbacks.forEach((cb) => cb(rafTimeMs));
    }
  };

  beforeEach(() => {
    rafCallbacks = [];
    rafTimeMs = 0;

    // Keep RAF-driven positioning deterministic and bounded.
    vi.spyOn(performance, "now").mockImplementation(() => rafTimeMs);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  // Tests: desktop hamburger pinned to drawer right edge.
  // Steps:
  // 1) enable fake timers
  // 2) set desktop media + innerWidth
  // 3) mock drawer getBoundingClientRect right=240
  // 4) render open sidebar
  // 5) flush RAF positioning + timers
  // 6) assert toggle left contains 240px
  // 7) restore real timers
  test("hamburger button is pinned to drawer right edge (desktop)", async () => {
    console.log("[test] Sidebar hamburger pinned to drawer edge (desktop)");
    // Step 1) enable fake timers
    vi.useFakeTimers();

    // Step 2) set desktop media + innerWidth
    console.log("[test] set desktop matchMedia + innerWidth");
    setMatchMedia({ "(min-width: 769px)": true });
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });

    // Step 3) mock drawer getBoundingClientRect right=240
    console.log("[test] mock drawer getBoundingClientRect right=240");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const element = this;
      if (element.className.includes("MuiDrawer-paper")) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 600,
          right: 240,
          width: 240,
          height: 600,
          toJSON: () => ""
        } as unknown as DOMRect;
      }
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        toJSON: () => ""
      } as unknown as DOMRect;
    });

    await renderWithI18n(
    // Step 4) render open sidebar
      <Sidebar
        open
        onToggle={vi.fn()}
        themeMode="light"
        onThemeChange={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 5) flush RAF positioning + timers
    console.log("[test] flush RAF positioning + timers");
    await act(async () => {
      flushRaf(400);
      vi.advanceTimersByTime(80);
    });

    // Step 6) assert toggle left contains 240px
    console.log("[test] assert toggle pinned to 240px");
    const toggle = screen.getByRole("button", { name: "Open menu", hidden: true });
    expect(toggle.style.left).toContain("240px");

    // Step 7) restore real timers
    vi.useRealTimers();
  });

  // Tests: mobile/full-width drawer pins hamburger to viewport right edge (clamp).
  // Steps:
  // 1) enable fake timers
  // 2) set mobile media + innerWidth
  // 3) mock drawer getBoundingClientRect right=360 (full width)
  // 4) render open sidebar
  // 5) flush RAF positioning + timers
  // 6) assert toggle left is auto and right contains clamp
  // 7) restore real timers
  test("hamburger button pins to viewport right edge when drawer is full-width open", async () => {
    console.log("[test] Sidebar hamburger pins to viewport right when drawer full-width");
    // Step 1) enable fake timers
    vi.useFakeTimers();

    // Step 2) set mobile media + innerWidth
    console.log("[test] set mobile matchMedia + innerWidth");
    setMatchMedia({ "(min-width: 769px)": false });
    Object.defineProperty(window, "innerWidth", { value: 360, configurable: true });

    // Step 3) mock drawer getBoundingClientRect right=360 (full width)
    console.log("[test] mock drawer getBoundingClientRect right=360");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const element = this;
      if (element.className.includes("MuiDrawer-paper")) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 600,
          right: 360,
          width: 360,
          height: 600,
          toJSON: () => ""
        } as unknown as DOMRect;
      }
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        toJSON: () => ""
      } as unknown as DOMRect;
    });

    await renderWithI18n(
    // Step 4) render open sidebar
      <Sidebar
        open
        onToggle={vi.fn()}
        themeMode="light"
        onThemeChange={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
      { language: "en" }
    );

    // Step 5) flush RAF positioning + timers
    console.log("[test] flush RAF positioning + timers");
    await act(async () => {
      flushRaf(400);
      vi.advanceTimersByTime(80);
    });

    // Step 6) assert toggle left is auto and right contains clamp
    console.log("[test] assert toggle pinned to viewport right (clamp)");
    const toggle = screen.getByRole("button", { name: "Open menu", hidden: true });
    expect(toggle.style.left).toBe("auto");
    expect(toggle.style.right).toContain("clamp");

    // Step 7) restore real timers
    vi.useRealTimers();
  });

  // Tests: Settings on mobile calls onOpenSettings and closes drawer.
  // Steps:
  // 1) set mobile media
  // 2) render open sidebar
  // 3) click Settings
  // 4) assert onOpenSettings called
  // 5) assert onToggle called (drawer closes)
  test("Settings button calls onOpenSettings and closes drawer on mobile", async () => {
    console.log("[test] Sidebar Settings closes drawer on mobile");

    // Step 1) set mobile media
    setMatchMedia({ "(min-width: 769px)": false });
    const onToggle = vi.fn();
    const onOpenSettings = vi.fn();

    // Step 2) render open sidebar
    await renderWithI18n(
      <Sidebar
        open
        onToggle={onToggle}
        themeMode="light"
        onThemeChange={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
      { language: "en" }
    );

    // Step 3) click Settings
    console.log("[test] click Settings");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    // Step 4) assert onOpenSettings called
    console.log("[test] assert onOpenSettings called");
    expect(onOpenSettings).toHaveBeenCalled();

    // Step 5) assert onToggle called (drawer closes)
    console.log("[test] assert onToggle called (drawer closes)");
    expect(onToggle).toHaveBeenCalled();
  });

  // Tests: Settings on desktop calls onOpenSettings without closing drawer.
  // Steps:
  // 1) set desktop media
  // 2) render open sidebar
  // 3) click Settings
  // 4) assert onOpenSettings called
  // 5) assert onToggle not called
  test("Settings button calls onOpenSettings without closing drawer on desktop", async () => {
    console.log("[test] Sidebar Settings does not close drawer on desktop");

    // Step 1) set desktop media
    setMatchMedia({ "(min-width: 769px)": true });
    const onToggle = vi.fn();
    const onOpenSettings = vi.fn();

    // Step 2) render open sidebar
    await renderWithI18n(
      <Sidebar
        open
        onToggle={onToggle}
        themeMode="light"
        onThemeChange={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
      { language: "en" }
    );

    // Step 3) click Settings
    console.log("[test] click Settings");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    // Step 4) assert onOpenSettings called
    console.log("[test] assert onOpenSettings called");
    expect(onOpenSettings).toHaveBeenCalled();

    // Step 5) assert onToggle not called
    console.log("[test] assert onToggle not called");
    expect(onToggle).not.toHaveBeenCalled();
  });
});
