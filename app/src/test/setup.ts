import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }) as unknown as MediaQueryList;
}

if (!Element.prototype.scrollIntoView) {
  // eslint-disable-next-line no-extend-native
  Element.prototype.scrollIntoView = vi.fn();
} else {
  vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => undefined);
}

class NoopResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

if (!window.ResizeObserver) {
  // @ts-expect-error - jsdom environment polyfill
  window.ResizeObserver = NoopResizeObserver;
}

if (!navigator.clipboard) {
  // @ts-expect-error - jsdom environment polyfill
  navigator.clipboard = { writeText: vi.fn(async () => undefined) };
}
