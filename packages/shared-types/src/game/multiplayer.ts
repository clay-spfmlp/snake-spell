import { Snake, Food, GameConfig, Position } from './snake';
import { PlayerWordInventory, LetterTile } from './words';
import { GameMode } from './modes';
import { CrosswordClue, CrosswordGameState } from './crossword';

export interface GameRoom {
  id: string;
  name: string;
  code: string;
  gameMode: GameMode;
  hostPlayerId: string;
  players: RoomPlayer[];
  gameState: MultiplayerGameState;
  crosswordState?: MultiplayerCrosswordState;
  maxPlayers: number;
  isGameActive: boolean;
  isPrivate: boolean;
  createdAt: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  isReady: boolean;
  snake?: Snake;
  isAlive: boolean;
  joinedAt: number;
  color?: string;
}

// Available snake colors (excluding green)
export const SNAKE_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Light Green (different from game green)
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#F8C471', // Orange
  '#EC7063'  // Coral
] as const;

export interface MultiplayerGameState {
  snakes: Snake[];
  foods: Food[];
  letterTiles: LetterTile[];
  playerInventories: Map<string, PlayerWordInventory>;
  gameTime: number;
  isActive: boolean;
  winner?: string;
  config: GameConfig;
}

export interface MultiplayerCrosswordState {
  currentClues: CrosswordClue[];
  playerProgress: Map<string, {
    currentClueIndex: number;
    currentLetterIndex: number;
    completedClues: number;
    wrongLetterCount: number;
  }>;
  availableLetters: string[];
  nextCorrectLetter: string;
  gameStats: {
    totalClues: number;
    completedClues: number;
    averageTime: number;
  };
}

export interface GameRoomInfo {
  id: string;
  name: string;
  code: string;
  gameMode: GameMode;
  hostPlayerName: string;
  playerCount: number;
  maxPlayers: number;
  isGameActive: boolean;
}

// Room-related message types
export interface JoinRoomMessage {
  type: 'join_room';
  roomId: string;
  playerName: string;
}

export interface LeaveRoomMessage {
  type: 'leave_room';
  roomId: string;
}

export interface CreateRoomMessage {
  type: 'create_room';
  roomName: string;
  gameMode: GameMode;
  maxPlayers: number;
  playerName: string;
  isPrivate: boolean;
}

export interface RoomListMessage {
  type: 'room_list';
}

export interface PlayerReadyMessage {
  type: 'player_ready';
  roomId: string;
  isReady: boolean;
}

export interface StartGameMessage {
  type: 'start_game';
  roomId: string;
}

export interface PlayerColorMessage {
  type: 'player_color';
  roomId: string;
  color: string;
}

export interface GameInputMessage {
  type: 'game_input';
  roomId: string;
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}

// Server to client messages
export interface RoomJoinedMessage {
  type: 'room_joined';
  room: GameRoom;
}

export interface RoomLeftMessage {
  type: 'room_left';
  roomId: string;
}

export interface RoomListResponseMessage {
  type: 'room_list_response';
  rooms: GameRoomInfo[];
}

export interface RoomUpdatedMessage {
  type: 'room_updated';
  room: GameRoom;
}

export interface GameStateMessage {
  type: 'game_state';
  roomId: string;
  gameState: MultiplayerGameState;
}

export interface PlayerJoinedRoomMessage {
  type: 'player_joined_room';
  player: RoomPlayer;
  roomId: string;
}

export interface PlayerLeftRoomMessage {
  type: 'player_left_room';
  playerId: string;
  roomId: string;
}

export interface GameStartedMessage {
  type: 'game_started';
  roomId: string;
}

export interface GameEndedMessage {
  type: 'game_ended';
  roomId: string;
  winner?: string;
  finalScores: Array<{ playerId: string; score: number; }>;
}

export interface RoomClosedMessage {
  type: 'room_closed';
  roomId: string;
  reason: 'host_left' | 'empty' | 'error';
  message: string;
}

// Crossword-specific messages
export interface CrosswordStateMessage {
  type: 'crossword_state';
  roomId: string;
  crosswordState: MultiplayerCrosswordState;
}

export interface CrosswordLetterCollectedMessage {
  type: 'crossword_letter_collected';
  roomId: string;
  playerId: string;
  letter: string;
  isCorrect: boolean;
  newSnakeLength: number;
}

export interface CrosswordWordCompletedMessage {
  type: 'crossword_word_completed';
  roomId: string;
  playerId: string;
  word: string;
  clueIndex: number;
  score: number;
}

export type MultiplayerMessage = 
  | JoinRoomMessage
  | LeaveRoomMessage
  | CreateRoomMessage
  | RoomListMessage
  | PlayerReadyMessage
  | StartGameMessage
  | PlayerColorMessage
  | GameInputMessage
  | RoomJoinedMessage
  | RoomLeftMessage
  | RoomListResponseMessage
  | RoomUpdatedMessage
  | GameStateMessage
  | PlayerJoinedRoomMessage
  | PlayerLeftRoomMessage
  | GameStartedMessage
  | GameEndedMessage
  | RoomClosedMessage
  | CrosswordStateMessage
  | CrosswordLetterCollectedMessage
  | CrosswordWordCompletedMessage; 