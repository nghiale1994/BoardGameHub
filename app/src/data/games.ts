export type GameInfo = {
  id: string;
  name: string;
  imageUrl?: string;
  minPlayers: number;
  maxPlayers: number;
  playtime: {
    min: number;
    max: number;
  };
  complexity: 1 | 2 | 3 | 4 | 5;
  categories: string[];
};

export const games: GameInfo[] = [
  {
    id: "catan",
    name: "Catan",
    minPlayers: 3,
    maxPlayers: 4,
    playtime: { min: 60, max: 90 },
    complexity: 3,
    categories: ["Strategy", "Competitive", "Trading"]
  },
  {
    id: "carcassonne",
    name: "Carcassonne",
    minPlayers: 2,
    maxPlayers: 5,
    playtime: { min: 35, max: 45 },
    complexity: 2,
    categories: ["Family", "Tile Placement"]
  },
  {
    id: "azul",
    name: "Azul",
    minPlayers: 2,
    maxPlayers: 4,
    playtime: { min: 30, max: 45 },
    complexity: 2,
    categories: ["Abstract", "Family"]
  },
  {
    id: "splendor",
    name: "Splendor",
    minPlayers: 2,
    maxPlayers: 4,
    playtime: { min: 30, max: 40 },
    complexity: 2,
    categories: ["Engine Building", "Competitive"]
  },
  {
    id: "ticket",
    name: "Ticket to Ride",
    minPlayers: 2,
    maxPlayers: 5,
    playtime: { min: 45, max: 60 },
    complexity: 2,
    categories: ["Family", "Route Building"]
  },
  {
    id: "sevenwonders",
    name: "7 Wonders",
    minPlayers: 3,
    maxPlayers: 7,
    playtime: { min: 30, max: 45 },
    complexity: 3,
    categories: ["Card Drafting", "Strategy"]
  },
  {
    id: "kingdomino",
    name: "Kingdomino",
    minPlayers: 2,
    maxPlayers: 4,
    playtime: { min: 15, max: 25 },
    complexity: 1,
    categories: ["Family", "Tile Placement"]
  },
  {
    id: "everdell",
    name: "Everdell",
    minPlayers: 1,
    maxPlayers: 4,
    playtime: { min: 40, max: 80 },
    complexity: 4,
    categories: ["Worker Placement", "Engine Building"]
  },
  {
    id: "wingspan",
    name: "Wingspan",
    minPlayers: 1,
    maxPlayers: 5,
    playtime: { min: 40, max: 70 },
    complexity: 3,
    categories: ["Engine Building", "Family"]
  },
  {
    id: "sushi",
    name: "Sushi Go!",
    minPlayers: 2,
    maxPlayers: 5,
    playtime: { min: 15, max: 20 },
    complexity: 1,
    categories: ["Party", "Card Drafting"]
  },
  {
    id: "quacks",
    name: "Quacks",
    minPlayers: 2,
    maxPlayers: 4,
    playtime: { min: 30, max: 45 },
    complexity: 3,
    categories: ["Push Your Luck", "Family"]
  },
  {
    id: "pandemic",
    name: "Pandemic",
    minPlayers: 2,
    maxPlayers: 4,
    playtime: { min: 45, max: 60 },
    complexity: 3,
    categories: ["Cooperative", "Strategy"]
  },
  {
    id: "codenames",
    name: "Codenames",
    minPlayers: 2,
    maxPlayers: 8,
    playtime: { min: 15, max: 25 },
    complexity: 1,
    categories: ["Party", "Word Game"]
  },
  {
    id: "hanabi",
    name: "Hanabi",
    minPlayers: 2,
    maxPlayers: 5,
    playtime: { min: 25, max: 30 },
    complexity: 2,
    categories: ["Cooperative", "Card Game"]
  },
  {
    id: "railroad",
    name: "Railroad Ink",
    minPlayers: 1,
    maxPlayers: 6,
    playtime: { min: 20, max: 30 },
    complexity: 2,
    categories: ["Roll & Write", "Family"]
  }
];
