import type { PeerId } from "./types";

export type SystemMessageKind = "joined" | "left" | "became_spectator" | "became_player";

export type ChatMessage =
  | {
      id: string;
      timestamp: number;
      type: "system";
      kind: SystemMessageKind;
      actorName: string;
    }
  | {
      id: string;
      timestamp: number;
      type: "user";
      senderId: PeerId;
      senderName: string;
      isSpectator: boolean;
      text: string;
    }
  | {
      id: string;
      timestamp: number;
      type: "move";
      actorName: string;
      actionText: string;
    };

export const createId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
