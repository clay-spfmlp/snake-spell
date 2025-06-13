export type GameMode = 
  | 'classic'
  | 'crossword_search'
  | 'time_attack'
  | 'word_rush'
  | 'survival'
  | 'king_of_hill'
  | 'team_battle'
  | 'elimination'
  | 'sandbox';

export interface GameModeDefinition {
  id: GameMode;
  name: string;
  description: string;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  defaultDuration: number; // in seconds, 0 = unlimited
  rules: GameModeRules;
  scoreSystem: ScoreSystem;
}

export interface GameModeRules {
  timeLimit?: number; // seconds, undefined = no limit
  wordTimeLimit?: number; // seconds to form words
  eliminationOnCollision: boolean;
  respawnEnabled: boolean;
  powerUpsEnabled: boolean;
  teamMode: boolean;
  targetScore?: number;
  specialRules: string[];
}

export interface ScoreSystem {
  wordPoints: number; // multiplier for word scores
  letterPoints: number; // multiplier for letter collection
  survivalBonus: number; // points per second survived
  killBonus: number; // points for eliminating others
  teamSharing: boolean; // share points with team
}

export const GAME_MODES: Record<GameMode, GameModeDefinition> = {
  classic: {
    id: 'classic',
    name: 'Classic Mode',
    description: 'Traditional snake with word building - no time limits',
    icon: '🐍',
    minPlayers: 1,
    maxPlayers: 8,
    defaultDuration: 0, // Unlimited
    rules: {
      eliminationOnCollision: true,
      respawnEnabled: false,
      powerUpsEnabled: true,
      teamMode: false,
      specialRules: ['Last snake standing wins', 'Form words to grow and score']
    },
    scoreSystem: {
      wordPoints: 1.0,
      letterPoints: 1.0,
      survivalBonus: 0,
      killBonus: 50,
      teamSharing: false
    }
  },

  crossword_search: {
    id: 'crossword_search',
    name: 'Cross Word Search',
    description: 'Solve crossword clues by collecting letters in sequence',
    icon: '🧩',
    minPlayers: 1,
    maxPlayers: 8,
    defaultDuration: 0, // Unlimited
    rules: {
      eliminationOnCollision: false,
      respawnEnabled: false,
      powerUpsEnabled: false,
      teamMode: false,
      specialRules: [
        'Solve crossword clues by collecting letters',
        'Wrong letters shrink your snake',
        'Complete words to grow and get new clues',
        'Letters scramble after each correct letter'
      ]
    },
    scoreSystem: {
      wordPoints: 10.0,
      letterPoints: 2.0,
      survivalBonus: 0,
      killBonus: 0,
      teamSharing: false
    }
  },

  time_attack: {
    id: 'time_attack',
    name: 'Time Attack',
    description: '5 minutes to score as many points as possible',
    icon: '⏰',
    minPlayers: 1,
    maxPlayers: 8,
    defaultDuration: 300, // 5 minutes
    rules: {
      timeLimit: 300,
      eliminationOnCollision: false,
      respawnEnabled: true,
      powerUpsEnabled: true,
      teamMode: false,
      specialRules: ['Respawn after collisions', 'Highest score wins']
    },
    scoreSystem: {
      wordPoints: 1.5,
      letterPoints: 1.0,
      survivalBonus: 1,
      killBonus: 25,
      teamSharing: false
    }
  },

  word_rush: {
    id: 'word_rush',
    name: 'Word Rush',
    description: 'Fast-paced word formation with time pressure',
    icon: '📝',
    minPlayers: 2,
    maxPlayers: 6,
    defaultDuration: 180, // 3 minutes
    rules: {
      timeLimit: 180,
      wordTimeLimit: 10, // 10 seconds to form words
      eliminationOnCollision: false,
      respawnEnabled: true,
      powerUpsEnabled: false,
      teamMode: false,
      specialRules: ['Form words quickly or lose letters', 'No power-ups']
    },
    scoreSystem: {
      wordPoints: 2.0,
      letterPoints: 0.5,
      survivalBonus: 0,
      killBonus: 0,
      teamSharing: false
    }
  },

  survival: {
    id: 'survival',
    name: 'Survival',
    description: 'Increasingly difficult waves of challenges',
    icon: '💀',
    minPlayers: 1,
    maxPlayers: 4,
    defaultDuration: 0, // Until death
    rules: {
      eliminationOnCollision: true,
      respawnEnabled: false,
      powerUpsEnabled: true,
      teamMode: false,
      specialRules: ['Speed increases over time', 'More obstacles spawn', 'Bonus points for survival time']
    },
    scoreSystem: {
      wordPoints: 1.0,
      letterPoints: 1.0,
      survivalBonus: 5,
      killBonus: 0,
      teamSharing: false
    }
  },

  king_of_hill: {
    id: 'king_of_hill',
    name: 'King of the Hill',
    description: 'Control the center area to score points',
    icon: '👑',
    minPlayers: 3,
    maxPlayers: 8,
    defaultDuration: 300, // 5 minutes
    rules: {
      timeLimit: 300,
      eliminationOnCollision: false,
      respawnEnabled: true,
      powerUpsEnabled: true,
      teamMode: false,
      specialRules: ['Control center area for points', 'Form words in the hill for bonus']
    },
    scoreSystem: {
      wordPoints: 1.0,
      letterPoints: 1.0,
      survivalBonus: 3, // Points for being in the hill
      killBonus: 20,
      teamSharing: false
    }
  },

  team_battle: {
    id: 'team_battle',
    name: 'Team Battle',
    description: '2 teams compete to form the most words',
    icon: '⚔️',
    minPlayers: 4,
    maxPlayers: 8,
    defaultDuration: 480, // 8 minutes
    rules: {
      timeLimit: 480,
      eliminationOnCollision: false,
      respawnEnabled: true,
      powerUpsEnabled: true,
      teamMode: true,
      specialRules: ['2 teams of players', 'Shared team score', 'Team power-ups']
    },
    scoreSystem: {
      wordPoints: 1.0,
      letterPoints: 1.0,
      survivalBonus: 0,
      killBonus: 15,
      teamSharing: true
    }
  },

  elimination: {
    id: 'elimination',
    name: 'Elimination',
    description: 'Last player standing wins',
    icon: '🎯',
    minPlayers: 3,
    maxPlayers: 12,
    defaultDuration: 0, // Until one remains
    rules: {
      eliminationOnCollision: true,
      respawnEnabled: false,
      powerUpsEnabled: true,
      teamMode: false,
      specialRules: ['One life only', 'Shrinking play area', 'Power-ups spawn more frequently']
    },
    scoreSystem: {
      wordPoints: 0.5,
      letterPoints: 0.5,
      survivalBonus: 2,
      killBonus: 100,
      teamSharing: false
    }
  },

  sandbox: {
    id: 'sandbox',
    name: 'Sandbox',
    description: 'Practice mode with custom settings',
    icon: '🎮',
    minPlayers: 1,
    maxPlayers: 1,
    defaultDuration: 0, // Unlimited
    rules: {
      eliminationOnCollision: false,
      respawnEnabled: true,
      powerUpsEnabled: true,
      teamMode: false,
      specialRules: ['Practice without pressure', 'Unlimited lives', 'Adjustable settings']
    },
    scoreSystem: {
      wordPoints: 1.0,
      letterPoints: 1.0,
      survivalBonus: 0,
      killBonus: 0,
      teamSharing: false
    }
  }
};

// Lobby and matchmaking types
export interface LobbySettings {
  gameMode: GameMode;
  maxPlayers: number;
  isPrivate: boolean;
  customRules?: Partial<GameModeRules>;
  password?: string;
}

export interface Lobby {
  id: string;
  name: string;
  hostPlayerId: string;
  settings: LobbySettings;
  players: LobbyPlayer[];
  status: 'waiting' | 'starting' | 'in_game' | 'finished';
  createdAt: number;
  gameStartTime?: number;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
  team?: 'red' | 'blue';
  joinedAt: number;
}

// Spectator mode
export interface SpectatorInfo {
  playerId: string;
  playerName: string;
  isSpectating: boolean;
  spectatingGameId?: string;
}

// Game state extensions for different modes
export interface GameModeState {
  mode: GameMode;
  timeRemaining?: number;
  currentWave?: number; // For survival mode
  hillController?: string; // For king of hill
  teamScores?: { red: number; blue: number }; // For team battle
  playArea?: { x: number; y: number; width: number; height: number }; // For elimination
}

// Messages for lobby system
export interface CreateLobbyMessage {
  type: 'create_lobby';
  lobbyName: string;
  settings: LobbySettings;
}

export interface JoinLobbyMessage {
  type: 'join_lobby';
  lobbyId: string;
  password?: string;
}

export interface LeaveLobbyMessage {
  type: 'leave_lobby';
  lobbyId: string;
}

export interface LobbyListMessage {
  type: 'lobby_list';
}

export interface UpdateLobbySettingsMessage {
  type: 'update_lobby_settings';
  lobbyId: string;
  settings: Partial<LobbySettings>;
}

export interface StartLobbyGameMessage {
  type: 'start_lobby_game';
  lobbyId: string;
}

export interface SpectateGameMessage {
  type: 'spectate_game';
  gameId: string;
}

export type GameModeMessage = 
  | CreateLobbyMessage
  | JoinLobbyMessage
  | LeaveLobbyMessage
  | LobbyListMessage
  | UpdateLobbySettingsMessage
  | StartLobbyGameMessage
  | SpectateGameMessage; 