export interface LetterTile {
  id: string;
  letter: string;
  position: { x: number; y: number };
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
  collectTime?: number;
}

export interface PlayerWordInventory {
  playerId: string;
  collectedLetters: CollectedLetter[];
  currentWordAttempt: string[];
  completedWords: CompletedWord[];
  totalScore: number;
}

export interface CollectedLetter {
  letter: string;
  collectTime: number;
  fromTileId: string;
  points: number;
}

export interface CompletedWord {
  word: string;
  letters: CollectedLetter[];
  points: number;
  timestamp: number;
  isValid: boolean;
  bonusMultiplier?: number;
}

export interface WordValidationResult {
  isValid: boolean;
  word: string;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  reason?: string;
}

export interface LetterFrequency {
  letter: string;
  frequency: number;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

// Word-related game messages
export interface SubmitWordMessage {
  type: 'submit_word';
  roomId: string;
  letters: string[];
}

export interface WordSubmittedMessage {
  type: 'word_submitted';
  playerId: string;
  result: WordValidationResult;
  newInventory: PlayerWordInventory;
}

export interface InventoryUpdatedMessage {
  type: 'inventory_updated';
  playerId: string;
  inventory: PlayerWordInventory;
}

export interface ClearLettersMessage {
  type: 'clear_letters';
  roomId: string;
}

// Letter frequency system similar to Scrabble
export const LETTER_FREQUENCIES: LetterFrequency[] = [
  // Common letters (1-2 points)
  { letter: 'E', frequency: 12.7, points: 1, rarity: 'common' },
  { letter: 'T', frequency: 9.1, points: 1, rarity: 'common' },
  { letter: 'A', frequency: 8.2, points: 1, rarity: 'common' },
  { letter: 'O', frequency: 7.5, points: 1, rarity: 'common' },
  { letter: 'I', frequency: 7.0, points: 1, rarity: 'common' },
  { letter: 'N', frequency: 6.7, points: 1, rarity: 'common' },
  { letter: 'S', frequency: 6.3, points: 1, rarity: 'common' },
  { letter: 'H', frequency: 6.1, points: 2, rarity: 'common' },
  { letter: 'R', frequency: 6.0, points: 1, rarity: 'common' },
  
  // Uncommon letters (3-4 points)
  { letter: 'D', frequency: 4.3, points: 2, rarity: 'uncommon' },
  { letter: 'L', frequency: 4.0, points: 1, rarity: 'uncommon' },
  { letter: 'C', frequency: 2.8, points: 3, rarity: 'uncommon' },
  { letter: 'U', frequency: 2.8, points: 1, rarity: 'uncommon' },
  { letter: 'M', frequency: 2.4, points: 3, rarity: 'uncommon' },
  { letter: 'W', frequency: 2.4, points: 4, rarity: 'uncommon' },
  { letter: 'F', frequency: 2.2, points: 4, rarity: 'uncommon' },
  { letter: 'G', frequency: 2.0, points: 2, rarity: 'uncommon' },
  { letter: 'Y', frequency: 2.0, points: 4, rarity: 'uncommon' },
  { letter: 'P', frequency: 1.9, points: 3, rarity: 'uncommon' },
  { letter: 'B', frequency: 1.3, points: 3, rarity: 'uncommon' },
  
  // Rare letters (5-8 points)
  { letter: 'V', frequency: 1.0, points: 4, rarity: 'rare' },
  { letter: 'K', frequency: 0.8, points: 5, rarity: 'rare' },
  { letter: 'J', frequency: 0.15, points: 8, rarity: 'rare' },
  { letter: 'X', frequency: 0.15, points: 8, rarity: 'rare' },
  
  // Epic letters (10 points)
  { letter: 'Q', frequency: 0.10, points: 10, rarity: 'epic' },
  { letter: 'Z', frequency: 0.07, points: 10, rarity: 'epic' }
];

export const LETTER_COLORS = {
  common: '#3498db',    // Blue
  uncommon: '#2ecc71',  // Green  
  rare: '#9b59b6',      // Purple
  epic: '#f39c12'       // Orange
};

export const WORD_LENGTH_BONUSES = {
  3: 0,     // No bonus for 3-letter words
  4: 5,     // 5 point bonus
  5: 15,    // 15 point bonus
  6: 30,    // 30 point bonus
  7: 50,    // 50 point bonus
  8: 75,    // 75 point bonus
  9: 100,   // 100 point bonus
  10: 150   // 150+ point bonus for very long words
};

export type WordMessage = 
  | SubmitWordMessage 
  | WordSubmittedMessage 
  | InventoryUpdatedMessage 
  | ClearLettersMessage; 