import { useEffect, useRef, useState } from "react";

type BroadcastMessage =
  | { type: "sync"; key: string; value: unknown }
  | { type: "clear" };

export const useCrossTabSync = (onMessage?: (msg: BroadcastMessage) => void) => {
  const [isListening, setIsListening] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return;
    }

    try {
      const channel = new BroadcastChannel("boardgamehub");
      channelRef.current = channel;

      const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
        if (onMessage) {
          onMessage(event.data);
        }
      };

      channel.addEventListener("message", handleMessage);
      setIsListening(true);

      return () => {
        channel.removeEventListener("message", handleMessage);
        channel.close();
      };
    } catch (error) {
      console.warn("BroadcastChannel not available:", error);
      return undefined;
    }
  }, [onMessage]);

  const broadcast = (message: BroadcastMessage) => {
    if (channelRef.current) {
      channelRef.current.postMessage(message);
    }
  };

  return { isListening, broadcast };
};
