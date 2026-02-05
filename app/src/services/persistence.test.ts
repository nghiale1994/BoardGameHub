import { describe, expect, test, vi, beforeEach } from "vitest";
import { persistence } from "./persistence";

type FakeMessageEvent = { data: unknown };

describe("persistence (BroadcastChannel)", () => {
  const postMessage = vi.fn();
  const close = vi.fn();
  const instances: FakeBroadcastChannel[] = [];

  class FakeBroadcastChannel {
    name: string;
    onmessage: ((event: FakeMessageEvent) => void) | null = null;

    constructor(name: string) {
      this.name = name;
      instances.push(this);
    }

    postMessage(message: unknown) {
      postMessage(message);
    }

    close() {
      close();
    }
  }

  beforeEach(() => {
    postMessage.mockClear();
    close.mockClear();
    instances.length = 0;
    // @ts-expect-error - test shim
    globalThis.BroadcastChannel = FakeBroadcastChannel;
  });

  // Tests: setPreference publishes pref_updated and closes the channel.
  // Steps:
  // 1) call setPreference
  // 2) assert BroadcastChannel.postMessage payload
  // 3) assert channel close called
  test("setPreference publishes pref_updated", async () => {
    console.log("[test] persistence.setPreference publishes pref_updated");

    // Step 1) call setPreference
    await persistence.setPreference("displayName", "Alice");

    // Step 2) assert BroadcastChannel.postMessage payload
    // Step 3) assert channel close called
    console.log("[test] assert BroadcastChannel postMessage + close");
    expect(postMessage).toHaveBeenCalledWith({ type: "pref_updated", key: "displayName" });
    expect(close).toHaveBeenCalled();
  });

  // Tests: subscribe receives messages.
  // Steps:
  // 1) subscribe
  // 2) simulate channel onmessage
  // 3) assert callback invoked with payload
  test("subscribe receives messages", async () => {
    console.log("[test] persistence.subscribe receives BroadcastChannel messages");

    // Step 1) subscribe
    const callback = vi.fn();
    const unsubscribe = persistence.subscribe(callback);

    console.log("[test] assert unsubscribe is function");
    expect(typeof unsubscribe).toBe("function");

    // Step 2) simulate channel onmessage
    // Simulate a message arriving on the channel created by subscribe().
    console.log("[test] simulate BroadcastChannel onmessage");
    expect(instances.length).toBeGreaterThan(0);
    instances[0].onmessage?.({ data: { type: "pref_updated", key: "recentRooms" } });

    // Step 3) assert callback invoked with payload
    console.log("[test] assert callback invoked");
    expect(callback).toHaveBeenCalledWith({ type: "pref_updated", key: "recentRooms" });
  });
});
