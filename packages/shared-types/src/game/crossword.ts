export interface CrosswordClue {
  id: string;
  clue: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export interface CrosswordGameState {
  currentClueIndex: number;
  currentClue: CrosswordClue;
  currentLetterIndex: number; // Which letter in the answer we're looking for next
  completedWords: string[];
  score: number;
  cluesCompleted: number;
  wrongLetterCount: number;
}

// Predefined crossword clues - at least 10 as requested
export const CROSSWORD_CLUES: CrosswordClue[] = [
  {
    id: 'clue_1',
    clue: 'Man\'s best friend (3 letters)',
    answer: 'DOG',
    difficulty: 'easy',
    category: 'Animals'
  },
  {
    id: 'clue_2',
    clue: 'Large feline with mane (4 letters)',
    answer: 'LION',
    difficulty: 'easy',
    category: 'Animals'
  },
  {
    id: 'clue_3',
    clue: 'Flying mammal (3 letters)',
    answer: 'BAT',
    difficulty: 'easy',
    category: 'Animals'
  },
  {
    id: 'clue_4',
    clue: 'Ocean predator with fins (5 letters)',
    answer: 'SHARK',
    difficulty: 'medium',
    category: 'Animals'
  },
  {
    id: 'clue_5',
    clue: 'Red fruit often mistaken for vegetable (6 letters)',
    answer: 'TOMATO',
    difficulty: 'medium',
    category: 'Food'
  },
  {
    id: 'clue_6',
    clue: 'Yellow curved fruit (6 letters)',
    answer: 'BANANA',
    difficulty: 'easy',
    category: 'Food'
  },
  {
    id: 'clue_7',
    clue: 'Frozen water (3 letters)',
    answer: 'ICE',
    difficulty: 'easy',
    category: 'Nature'
  },
  {
    id: 'clue_8',
    clue: 'Bright star in our solar system (3 letters)',
    answer: 'SUN',
    difficulty: 'easy',
    category: 'Nature'
  },
  {
    id: 'clue_9',
    clue: 'Device for telling time (5 letters)',
    answer: 'CLOCK',
    difficulty: 'medium',
    category: 'Objects'
  },
  {
    id: 'clue_10',
    clue: 'Writing instrument with ink (3 letters)',
    answer: 'PEN',
    difficulty: 'easy',
    category: 'Objects'
  },
  {
    id: 'clue_11',
    clue: 'Vehicle with two wheels (7 letters)',
    answer: 'BICYCLE',
    difficulty: 'medium',
    category: 'Transportation'
  },
  {
    id: 'clue_12',
    clue: 'Flying vehicle (8 letters)',
    answer: 'AIRPLANE',
    difficulty: 'hard',
    category: 'Transportation'
  },
  {
    id: 'clue_13',
    clue: 'Tall plant with trunk and leaves (4 letters)',
    answer: 'TREE',
    difficulty: 'easy',
    category: 'Nature'
  },
  {
    id: 'clue_14',
    clue: 'Colorful arc in the sky after rain (7 letters)',
    answer: 'RAINBOW',
    difficulty: 'medium',
    category: 'Nature'
  },
  {
    id: 'clue_15',
    clue: 'Electronic device for computing (8 letters)',
    answer: 'COMPUTER',
    difficulty: 'medium',
    category: 'Technology'
  }
];

// Helper function to get a random set of clues
export function getRandomClues(count: number = 10): CrosswordClue[] {
  const shuffled = [...CROSSWORD_CLUES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, CROSSWORD_CLUES.length));
}

// Helper function to generate letters for the board
export function generateBoardLetters(currentAnswer: string, currentLetterIndex: number): string[] {
  const letters: string[] = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Always include the next correct letter first
  if (currentLetterIndex < currentAnswer.length) {
    const nextCorrectLetter = currentAnswer[currentLetterIndex];
    letters.push(nextCorrectLetter);
  }
  
  // Add random letters to fill up to at least 10 letters
  while (letters.length < 10) {
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    letters.push(randomLetter);
  }
  
  // Shuffle the letters to randomize positions
  return letters.sort(() => Math.random() - 0.5);
} 