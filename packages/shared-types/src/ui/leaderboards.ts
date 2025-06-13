export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  highestScore: number;
  totalWordsFormed: number;
  longestWord: string;
  favoriteGameMode: string;
  totalPlayTime: number; // in seconds
  averageScore: number;
  winRate: number;
  lettersCollected: number;
  averageWordLength: number;
  createdAt: number;
  lastPlayed: number;
}

export interface GameResult {
  gameId: string;
  playerId: string;
  playerName: string;
  gameMode: string;
  score: number;
  wordsFormed: string[];
  longestWord: string;
  lettersCollected: number;
  playTime: number;
  placement: number; // 1st, 2nd, 3rd, etc.
  totalPlayers: number;
  completedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  value: number;
  change: number; // +/- change from last period
  trend: 'up' | 'down' | 'same';
}

export type LeaderboardType = 
  | 'highest_score'
  | 'total_score'
  | 'win_rate'
  | 'words_formed'
  | 'longest_word'
  | 'games_played'
  | 'average_score'
  | 'play_time';

export interface Leaderboard {
  type: LeaderboardType;
  title: string;
  description: string;
  entries: LeaderboardEntry[];
  lastUpdated: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'gameplay' | 'words' | 'social' | 'progression';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: AchievementRequirement[];
  reward: {
    points: number;
    title?: string;
    cosmetic?: string;
  };
}

export interface AchievementRequirement {
  type: 'score' | 'games_won' | 'word_length' | 'total_words' | 'streak' | 'special';
  value: number;
  description: string;
}

export interface PlayerAchievement {
  achievementId: string;
  playerId: string;
  unlockedAt: number;
  progress: number; // 0.0 to 1.0
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_word',
    name: 'Word Smith',
    description: 'Form your first word',
    icon: '📝',
    category: 'words',
    rarity: 'common',
    requirements: [{
      type: 'total_words',
      value: 1,
      description: 'Form 1 word'
    }],
    reward: { points: 10 }
  },
  
  {
    id: 'century_score',
    name: 'Century Club',
    description: 'Score 100 points in a single game',
    icon: '💯',
    category: 'gameplay',
    rarity: 'common',
    requirements: [{
      type: 'score',
      value: 100,
      description: 'Score 100 points'
    }],
    reward: { points: 25 }
  },
  
  {
    id: 'long_word',
    name: 'Vocabulary Virtuoso',
    description: 'Form a word with 8+ letters',
    icon: '📚',
    category: 'words',
    rarity: 'rare',
    requirements: [{
      type: 'word_length',
      value: 8,
      description: 'Form an 8+ letter word'
    }],
    reward: { points: 50, title: 'Wordsmith' }
  },
  
  {
    id: 'win_streak',
    name: 'Unstoppable',
    description: 'Win 5 games in a row',
    icon: '🔥',
    category: 'gameplay',
    rarity: 'epic',
    requirements: [{
      type: 'streak',
      value: 5,
      description: 'Win 5 consecutive games'
    }],
    reward: { points: 100, title: 'Champion' }
  },
  
  {
    id: 'thousand_score',
    name: 'Grand Master',
    description: 'Score 1000 points in a single game',
    icon: '👑',
    category: 'gameplay',
    rarity: 'legendary',
    requirements: [{
      type: 'score',
      value: 1000,
      description: 'Score 1000 points'
    }],
    reward: { points: 200, title: 'Grand Master', cosmetic: 'golden_snake' }
  }
];

export const LEADERBOARD_CONFIGS: Record<LeaderboardType, Omit<Leaderboard, 'entries' | 'lastUpdated'>> = {
  highest_score: {
    type: 'highest_score',
    title: 'Highest Score',
    description: 'Best single-game scores',
    period: 'all_time'
  },
  
  total_score: {
    type: 'total_score', 
    title: 'Total Score',
    description: 'Cumulative scores across all games',
    period: 'all_time'
  },
  
  win_rate: {
    type: 'win_rate',
    title: 'Win Rate',
    description: 'Percentage of games won (min 10 games)',
    period: 'all_time'
  },
  
  words_formed: {
    type: 'words_formed',
    title: 'Word Master',
    description: 'Total words formed',
    period: 'all_time'
  },
  
  longest_word: {
    type: 'longest_word',
    title: 'Vocabulary Champion',
    description: 'Longest words formed',
    period: 'all_time'
  },
  
  games_played: {
    type: 'games_played',
    title: 'Most Active',
    description: 'Total games played',
    period: 'all_time'
  },
  
  average_score: {
    type: 'average_score',
    title: 'Consistent Scorer',
    description: 'Average score per game (min 5 games)',
    period: 'all_time'
  },
  
  play_time: {
    type: 'play_time',
    title: 'Time Champions',
    description: 'Total time played',
    period: 'all_time'
  }
};

export interface StatsMessage {
  type: 'get_stats';
  playerId?: string; // If not provided, gets current player stats
}

export interface LeaderboardMessage {
  type: 'get_leaderboard';
  leaderboardType: LeaderboardType;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  limit?: number; // Default 50
}

export interface AchievementsMessage {
  type: 'get_achievements';
  playerId?: string;
}

export type StatsSystemMessage = 
  | StatsMessage
  | LeaderboardMessage
  | AchievementsMessage; 