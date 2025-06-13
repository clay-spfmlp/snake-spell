// Position interface moved to snake.ts to avoid duplication

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
}

// GameRoom and GameState moved to multiplayer.ts for better organization 