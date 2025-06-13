import React, { useRef, useEffect, useState } from 'react';
import { PixiGameEngine, GameEvents } from '../game/PixiGameEngine.js';
import { Food } from '@shared/game/snake';

interface GameStats {
  score: number;
  lettersCollected: string[];
  isGameOver: boolean;
  isPlaying: boolean;
}

export const SnakeGame: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<PixiGameEngine | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    lettersCollected: [],
    isGameOver: false,
    isPlaying: false
  });

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const gameEvents: GameEvents = {
      onScoreChange: (score: number) => {
        setGameStats(prev => ({ ...prev, score }));
      },
      onGameOver: (finalScore: number) => {
        setGameStats(prev => ({ 
          ...prev, 
          score: finalScore, 
          isGameOver: true, 
          isPlaying: false 
        }));
      },
      onFoodCollected: (food: Food) => {
        console.log('Food collected:', food);
      },
      onLetterCollected: (letter: string) => {
        setGameStats(prev => ({
          ...prev,
          lettersCollected: [...prev.lettersCollected, letter]
        }));
      }
    };

    // Initialize game engine
    gameEngineRef.current = new PixiGameEngine(
      gameContainerRef.current,
      {
        canvasWidth: 800,
        canvasHeight: 600,
        gridSize: 20,
        gameSpeed: 150
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
      setGameStats({
        score: 0,
        lettersCollected: [],
        isGameOver: false,
        isPlaying: false
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <h1 className="text-3xl font-bold text-white mb-4">Snake Word Arena</h1>
      
      {/* Game Stats */}
      <div className="flex space-x-8 text-white">
        <div className="text-center">
          <div className="text-sm opacity-80">Score</div>
          <div className="text-2xl font-bold">{gameStats.score}</div>
        </div>
        <div className="text-center">
          <div className="text-sm opacity-80">Letters</div>
          <div className="text-2xl font-bold">{gameStats.lettersCollected.length}</div>
        </div>
      </div>

      {/* Letters Collected */}
      {gameStats.lettersCollected.length > 0 && (
        <div className="text-white text-center">
          <div className="text-sm opacity-80 mb-2">Letters Collected:</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {gameStats.lettersCollected.map((letter, index) => (
              <span 
                key={index}
                className="bg-blue-600 px-2 py-1 rounded text-sm font-bold"
              >
                {letter}
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
          Reset
        </button>
      </div>

      {/* Game Over Message */}
      {gameStats.isGameOver && (
        <div className="text-center text-white">
          <div className="text-xl font-bold text-red-400 mb-2">Game Over!</div>
          <div className="text-lg">Final Score: {gameStats.score}</div>
          <div className="text-sm opacity-80 mt-2">
            You collected {gameStats.lettersCollected.length} letters
          </div>
        </div>
      )}

      {/* Controls Instructions */}
      <div className="text-white text-sm text-center opacity-80">
        <div className="mb-1">Use arrow keys or WASD to control the snake</div>
        <div>Collect letters to grow and increase your score!</div>
      </div>

      {/* Game Canvas Container */}
      <div 
        ref={gameContainerRef}
        className="border-2 border-gray-600 rounded-lg overflow-hidden shadow-2xl"
        style={{ 
          background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
        }}
      />
    </div>
  );
}; 