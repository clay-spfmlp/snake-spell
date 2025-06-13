export interface Position {
  x: number;
  y: number;
}

export interface Direction {
  x: number;
  y: number;
}

export interface SnakeSegment {
  position: Position;
  id: string;
}

export interface Snake {
  id: string;
  playerId: string;
  segments: SnakeSegment[];
  direction: Direction;
  nextDirection?: Direction;
  color: string;
  isAlive: boolean;
  score: number;
}

export interface Food {
  id: string;
  position: Position;
  type: 'letter' | 'bonus' | 'special';
  value: string; // For letters, this is the letter. For bonus, could be points
  points: number;
  color: string;
}

export interface GameConfig {
  gridSize: number;
  canvasWidth: number;
  canvasHeight: number;
  gameSpeed: number; // milliseconds between moves
  initialSnakeLength: number;
  foodSpawnRate: number; // seconds between food spawns
}

export interface GameBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface GameStats {
  score: number;
  wordsFormed: string[];
  gameTime: number;
  lettersCollected: number;
}

export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
} as const;

export type DirectionName = keyof typeof DIRECTIONS;

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gridSize: 20,
  canvasWidth: 800,
  canvasHeight: 600,
  gameSpeed: 200,
  initialSnakeLength: 3,
  foodSpawnRate: 2
}; 