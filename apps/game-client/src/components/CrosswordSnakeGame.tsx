import React, { useRef, useEffect, useState } from 'react';
import { PixiGameEngine, GameEvents } from '../game/PixiGameEngine.js';
import { Food } from '@snake-word-arena/shared-types';
import { 
  CrosswordClue, 
  CrosswordGameState, 
  getRandomClues, 
  generateBoardLetters 
} from '@snake-word-arena/shared-types';

interface CrosswordGameStats extends CrosswordGameState {
  isGameOver: boolean;
  isPlaying: boolean;
  snakeLength: number;
}

export const CrosswordSnakeGame: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<PixiGameEngine | null>(null);
  const [gameClues] = useState<CrosswordClue[]>(() => getRandomClues(10));
  const [gameStats, setGameStats] = useState<CrosswordGameStats>({
    currentClueIndex: 0,
    currentClue: gameClues[0],
    currentLetterIndex: 0,
    completedWords: [],
    score: 0,
    cluesCompleted: 0,
    wrongLetterCount: 0,
    isGameOver: false,
    isPlaying: false,
    snakeLength: 3
  });

  // Use refs to track current state for callbacks
  const gameStatsRef = useRef(gameStats);
  gameStatsRef.current = gameStats;

  // Generate board letters based on current state
  const [boardLetters, setBoardLetters] = useState<string[]>(() => 
    generateBoardLetters(gameClues[0].answer, 0)
  );

  const scrambleLetters = (letterIndex?: number) => {
    const currentStats = gameStatsRef.current;
    if (currentStats.currentClue) {
      const indexToUse = letterIndex !== undefined ? letterIndex : currentStats.currentLetterIndex;
      const newLetters = generateBoardLetters(
        currentStats.currentClue.answer, 
        indexToUse
      );
      setBoardLetters(newLetters);
      
      // Update the game engine with new letters
      if (gameEngineRef.current) {
        gameEngineRef.current.updateFoodLetters(newLetters);
      }
    }
  };

  const handleCorrectLetter = () => {
    const currentStats = gameStatsRef.current;
    const newLetterIndex = currentStats.currentLetterIndex + 1;
    const isWordComplete = newLetterIndex >= currentStats.currentClue.answer.length;
    
    console.log(`✅ Correct letter! Current index: ${currentStats.currentLetterIndex}, New index: ${newLetterIndex}`);
    
    if (isWordComplete) {
      // Word completed - move to next clue
      const newClueIndex = currentStats.currentClueIndex + 1;
      const isGameComplete = newClueIndex >= gameClues.length;
      
      if (isGameComplete) {
        // Game completed!
        setGameStats(prev => ({
          ...prev,
          currentLetterIndex: newLetterIndex, // Update letter index immediately
          completedWords: [...prev.completedWords, prev.currentClue.answer],
          score: prev.score + (prev.currentClue.answer.length * 10),
          cluesCompleted: prev.cluesCompleted + 1,
          isGameOver: true,
          isPlaying: false,
          snakeLength: prev.snakeLength + 1
        }));
        
        if (gameEngineRef.current) {
          gameEngineRef.current.pause();
        }
      } else {
        // Move to next clue
        const nextClue = gameClues[newClueIndex];
        setGameStats(prev => ({
          ...prev,
          currentClueIndex: newClueIndex,
          currentClue: nextClue,
          currentLetterIndex: 0,
          completedWords: [...prev.completedWords, prev.currentClue.answer],
          score: prev.score + (prev.currentClue.answer.length * 10),
          cluesCompleted: prev.cluesCompleted + 1,
          snakeLength: prev.snakeLength + 1
        }));
        
        // Generate new letters for the new clue
        setTimeout(() => {
          const newLetters = generateBoardLetters(nextClue.answer, 0);
          setBoardLetters(newLetters);
          if (gameEngineRef.current) {
            gameEngineRef.current.updateFoodLetters(newLetters);
          }
        }, 100);
      }
    } else {
      // Continue with current word - update letter index immediately
      setGameStats(prev => ({
        ...prev,
        currentLetterIndex: newLetterIndex,
        score: prev.score + 2,
        snakeLength: prev.snakeLength + 1
      }));
      
      // Scramble letters after correct letter with the NEW letter index
      setTimeout(() => scrambleLetters(newLetterIndex), 500);
    }
  };

  const handleWrongLetter = () => {
    console.log(`❌ Wrong letter!`);
    
    // Get current snake length from game engine for accuracy
    const currentEngineLength = gameEngineRef.current?.getSnakeLength() || gameStatsRef.current.snakeLength;
    const newSnakeLength = Math.max(1, currentEngineLength - 1);
    
    setGameStats(prev => {
      const newWrongCount = prev.wrongLetterCount + 1;
      
      // Check if snake is down to just the head (1 segment)
      if (newSnakeLength <= 1) {
        if (gameEngineRef.current) {
          gameEngineRef.current.pause();
        }
        return {
          ...prev,
          wrongLetterCount: newWrongCount,
          snakeLength: 1, // Ensure it shows 1 (head only)
          isGameOver: true,
          isPlaying: false
        };
      }
      
      return {
        ...prev,
        wrongLetterCount: newWrongCount,
        snakeLength: newSnakeLength
      };
    });
    
    // Shrink the snake in the game engine
    if (gameEngineRef.current) {
      gameEngineRef.current.shrinkSnake();
    }
  };

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const gameEvents: GameEvents = {
      onScoreChange: () => {
        // Score is managed by crossword logic
      },
      onGameOver: () => {
        setGameStats(prev => ({ 
          ...prev, 
          isGameOver: true, 
          isPlaying: false 
        }));
      },
      onFoodCollected: (food: Food) => {
        const collectedLetter = food.value; // Food.value contains the letter
        const currentStats = gameStatsRef.current; // Use ref to get current state
        const expectedLetter = currentStats.currentClue.answer[currentStats.currentLetterIndex];
        
        console.log(`🍎 Food collected: "${collectedLetter}", Expected: "${expectedLetter}", Index: ${currentStats.currentLetterIndex}`);
        
        if (collectedLetter === expectedLetter) {
          handleCorrectLetter();
        } else {
          handleWrongLetter();
        }
      },
      onLetterCollected: () => {
        // Handled in onFoodCollected
      }
    };

    // Initialize game engine with crossword-specific settings
    gameEngineRef.current = new PixiGameEngine(
      gameContainerRef.current,
      {
        canvasWidth: 800,
        canvasHeight: 600,
        gridSize: 20,
        gameSpeed: 200, // Slightly slower for thinking time
        initialSnakeLength: 3,
        foodSpawnRate: 2,
        customLetters: boardLetters
      },
      gameEvents
    );

    // Cleanup on unmount
    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.destroy();
      }
    };
  }, []);

  // Sync snake length with game engine periodically
  useEffect(() => {
    if (!gameStats.isPlaying || !gameEngineRef.current) return;

    const syncInterval = setInterval(() => {
      const engineLength = gameEngineRef.current?.getSnakeLength();
      if (engineLength && engineLength !== gameStats.snakeLength) {
        setGameStats(prev => ({
          ...prev,
          snakeLength: engineLength
        }));
      }
    }, 100); // Check every 100ms

    return () => clearInterval(syncInterval);
  }, [gameStats.isPlaying, gameStats.snakeLength]);

  const startGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.start();
      setGameStats(prev => ({ 
        ...prev, 
        isPlaying: true, 
        isGameOver: false 
      }));
    }
  };

  const pauseGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.pause();
      setGameStats(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const resumeGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.resume();
      setGameStats(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const resetGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.reset();
    }
    
    // Reset to first clue
    const newClues = getRandomClues(10);
    setGameStats({
      currentClueIndex: 0,
      currentClue: newClues[0],
      currentLetterIndex: 0,
      completedWords: [],
      score: 0,
      cluesCompleted: 0,
      wrongLetterCount: 0,
      isGameOver: false,
      isPlaying: false,
      snakeLength: 3
    });
    
    // Generate new letters
    const newLetters = generateBoardLetters(newClues[0].answer, 0);
    setBoardLetters(newLetters);
    if (gameEngineRef.current) {
      gameEngineRef.current.updateFoodLetters(newLetters);
    }
  };

  // Progress indicator for current word
  const getWordProgress = () => {
    const answer = gameStats.currentClue.answer;
    return answer.split('').map((letter, index) => ({
      letter,
      revealed: index < gameStats.currentLetterIndex,
      current: index === gameStats.currentLetterIndex
    }));
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <h1 className="text-3xl font-bold text-white mb-4">Crossword Search</h1>
      
      {/* Current Clue */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-2xl text-center">
        <div className="text-white text-lg font-semibold mb-2">
          Clue #{gameStats.currentClueIndex + 1} of {gameClues.length}
        </div>
        <div className="text-white text-xl mb-3">
          {gameStats.currentClue.clue}
        </div>
        <div className="text-gray-300 text-sm">
          Category: {gameStats.currentClue.category} | Difficulty: {gameStats.currentClue.difficulty}
        </div>
      </div>

      {/* Word Progress */}
      <div className="flex space-x-2 mb-4">
        {getWordProgress().map((letterInfo, index) => (
          <div
            key={index}
            className={`
              w-8 h-8 border-2 rounded flex items-center justify-center font-bold text-lg
              ${letterInfo.revealed 
                ? 'bg-green-600 border-green-400 text-white' 
                : letterInfo.current
                  ? 'bg-yellow-600 border-yellow-400 text-white animate-pulse'
                  : 'bg-gray-600 border-gray-400 text-gray-300'
              }
            `}
          >
            {letterInfo.revealed ? letterInfo.letter : '_'}
          </div>
        ))}
      </div>

      {/* Game Stats */}
      <div className="flex space-x-8 text-white">
        <div className="text-center">
          <div className="text-sm opacity-80">Score</div>
          <div className="text-2xl font-bold">{gameStats.score}</div>
        </div>
        <div className="text-center">
          <div className="text-sm opacity-80">Words Completed</div>
          <div className="text-2xl font-bold">{gameStats.cluesCompleted}</div>
        </div>
        <div className="text-center">
          <div className="text-sm opacity-80">Snake Length</div>
          <div className="text-2xl font-bold">{gameStats.snakeLength}</div>
        </div>
        <div className="text-center">
          <div className="text-sm opacity-80">Wrong Letters</div>
          <div className="text-2xl font-bold text-red-400">{gameStats.wrongLetterCount}</div>
        </div>
      </div>

      {/* Completed Words */}
      {gameStats.completedWords.length > 0 && (
        <div className="text-white text-center">
          <div className="text-sm opacity-80 mb-2">Completed Words:</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {gameStats.completedWords.map((word, index) => (
              <span 
                key={index}
                className="bg-green-600 px-3 py-1 rounded text-sm font-bold"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className="flex space-x-4">
        {!gameStats.isPlaying && !gameStats.isGameOver && (
          <button
            onClick={startGame}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold transition-colors"
          >
            Start Game
          </button>
        )}
        
        {gameStats.isPlaying && (
          <button
            onClick={pauseGame}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded font-semibold transition-colors"
          >
            Pause
          </button>
        )}
        
        {!gameStats.isPlaying && !gameStats.isGameOver && gameStats.score > 0 && (
          <button
            onClick={resumeGame}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition-colors"
          >
            Resume
          </button>
        )}
        
        <button
          onClick={resetGame}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold transition-colors"
        >
          New Game
        </button>
      </div>

      {/* Game Over Message */}
      {gameStats.isGameOver && (
        <div className="text-center text-white">
          <div className="text-xl font-bold text-green-400 mb-2">
            {gameStats.cluesCompleted === gameClues.length ? 'Congratulations!' : 'Game Over!'}
          </div>
          <div className="text-lg">Final Score: {gameStats.score}</div>
          <div className="text-sm opacity-80 mt-2">
            You completed {gameStats.cluesCompleted} out of {gameClues.length} clues
          </div>
          {gameStats.cluesCompleted === gameClues.length && (
            <div className="text-sm text-green-400 mt-1">
              🎉 Perfect! You solved all the clues! 🎉
            </div>
          )}
        </div>
      )}

      {/* Controls Instructions
      <div className="text-white text-sm text-center opacity-80">
        <div className="mb-1">Use arrow keys or WASD to control the snake</div>
        <div className="mb-1">Collect the correct letters in sequence to spell the word</div>
        <div className="text-red-300">⚠️ Wrong letters will shrink your snake!</div>
      </div> */}

      {/* Game Canvas Container */}
      <div 
        ref={gameContainerRef}
        className="border-2 border-gray-600 rounded-lg overflow-hidden shadow-2xl"
        style={{ 
          background: 'linear-gradient(135deg, #2c3e50 0%, #8e44ad 100%)',
        }}
      />
    </div>
  );
}; 