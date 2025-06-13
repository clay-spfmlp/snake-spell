import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MultiplayerPixiEngine, MultiplayerGameEvents } from '../game/MultiplayerPixiEngine.js';
import { 
  GameRoom, 
  MultiplayerGameState, 
  MultiplayerCrosswordState,
} from '@snake-word-arena/shared-types';
import { WebSocketManager } from '../utils/WebSocketManager.js';
import { 
  Snake, 
  GameConfig, 
  LetterTile 
} from '@shared/game/snake';

interface PlayerStats {
  id: string;
  name: string;
  score: number;
  cluesCompleted: number;
  snakeLength: number;
  wrongLetterCount: number;
  isAlive: boolean;
}

interface MultiplayerCrosswordGameProps {
  room: GameRoom;
  playerName: string;
  wsManager: WebSocketManager;
  onLeaveGame: () => void;
}

export const MultiplayerCrosswordGame: React.FC<MultiplayerCrosswordGameProps> = ({
  room,
  playerName,
  wsManager,
  onLeaveGame
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<MultiplayerPixiEngine | null>(null);
  
  // Game state
  const [gameState, setGameState] = useState<MultiplayerGameState>(room.gameState);
  const [crosswordState, setCrosswordState] = useState<MultiplayerCrosswordState | null>(room.crosswordState || null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [isGameActive, setIsGameActive] = useState(room.isGameActive);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState<any>(null);

  // Helper function to safely get player progress (handles serialized object from WebSocket)
  const getPlayerProgress = useCallback((playerId: string) => {
    if (!crosswordState?.playerProgress) return null;
    
    // After WebSocket serialization, Maps become plain objects
    return (crosswordState.playerProgress as any)[playerId] || null;
  }, [crosswordState]);

  // Find current player's progress
  const currentPlayerProgress = getPlayerProgress(currentPlayerId);
  const currentClue = crosswordState?.currentClues[currentPlayerProgress?.currentClueIndex || 0];

  // Debug logging
  useEffect(() => {
    console.log('🐛 Debug state:', {
      crosswordState: !!crosswordState,
      currentPlayerId,
      currentPlayerProgress,
      currentClue,
      isGameActive,
      availableLetters: crosswordState?.availableLetters,
      gameStateSnakes: gameState.snakes.length,
      letterTiles: gameState.letterTiles.length
    });
  }, [crosswordState, currentPlayerId, currentPlayerProgress, currentClue, isGameActive, gameState]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event: any) => {
    if (event.type === 'message') {
      const message = event.data;
      console.log('Game received message:', message);

      switch (message.type) {
        case 'game_state':
          if (message.roomId === room.id) {
            console.log('🎮 Updating game state:', message.gameState);
            setGameState(message.gameState);
            // Update game active state from the game state
            setIsGameActive(message.gameState.isActive);
            
            // Update multiplayer game engine with new state
            if (gameEngineRef.current) {
              gameEngineRef.current.updateGameState(message.gameState);
            }
          }
          break;

        case 'crossword_state':
          if (message.roomId === room.id) {
            console.log('🎯 Received crossword state:', message.crosswordState);
            setCrosswordState(message.crosswordState);
          }
          break;

        case 'room_updated':
          // Update room state if needed
          break;

        case 'game_ended':
          if (message.roomId === room.id) {
            console.log('🏁 Game ended:', message);
            setIsGameActive(false);
            setShowResults(true);
            setResultsData(message);
          }
          break;

        case 'crossword_letter_collected':
          if (message.roomId === room.id) {
            // Handle letter collection feedback
            console.log(`Player ${message.playerId} collected letter: ${message.letter}, correct: ${message.isCorrect}`);
          }
          break;

        case 'crossword_word_completed':
          if (message.roomId === room.id) {
            // Handle word completion
            console.log(`Player ${message.playerId} completed word: ${message.word}`);
          }
          break;
      }
    }
  }, [room.id]);

  // Setup WebSocket listener
  useEffect(() => {
    wsManager.addEventListener(handleWebSocketMessage);
    return () => {
      wsManager.removeEventListener(handleWebSocketMessage);
    };
  }, [wsManager, handleWebSocketMessage]);

  // Update player stats when game state changes
  useEffect(() => {
    if (!gameState) return;

    const newPlayerStats: PlayerStats[] = room.players.map(player => {
      const snake = gameState.snakes.find(s => s.playerId === player.id);
      const progress = crosswordState?.playerProgress?.get?.(player.id) || getPlayerProgress(player.id);
      
      const stats = {
        id: player.id,
        name: player.name,
        score: progress?.completedClues || 0,
        cluesCompleted: progress?.completedClues || 0,
        snakeLength: snake?.segments?.length || 0,
        wrongLetterCount: progress?.wrongLetterCount || 0,
        isAlive: snake?.isAlive ?? player.isAlive
      };
      
      // Debug when current player's alive status changes
      if (player.id === currentPlayerId) {
        console.log(`🎯 Current player (${player.name}) stats update:`, {
          isAlive: stats.isAlive,
          snakeExists: !!snake,
          snakeIsAlive: snake?.isAlive,
          playerIsAlive: player.isAlive,
          snakeLength: stats.snakeLength
        });
      }
      
      return stats;
    });

    // Check if current player's alive status changed
    const oldCurrentPlayer = playerStats.find(p => p.id === currentPlayerId);
    const newCurrentPlayer = newPlayerStats.find(p => p.id === currentPlayerId);
    
    if (oldCurrentPlayer && newCurrentPlayer && oldCurrentPlayer.isAlive !== newCurrentPlayer.isAlive) {
      console.log(`🚨 PLAYER ALIVE STATUS CHANGED: ${oldCurrentPlayer.isAlive} → ${newCurrentPlayer.isAlive}`);
      console.log('🚨 This might be causing the control loss!');
    }

    console.log('📊 Updated playerStats:', newPlayerStats.map(p => ({ id: p.id, name: p.name, isAlive: p.isAlive })));
    setPlayerStats(newPlayerStats);
  }, [gameState, room.players, crosswordState, currentPlayerId, playerStats]);

  // Initialize game engine
  useEffect(() => {
    if (!gameContainerRef.current) return;

    // Find current player ID
    const currentPlayer = room.players.find(p => p.name === playerName);
    if (currentPlayer) {
      setCurrentPlayerId(currentPlayer.id);
    }

    const multiplayerEvents: MultiplayerGameEvents = {
      onPlayerSnakeUpdate: (playerId: string, snake: any) => {
        console.log(`Snake updated for player ${playerId}:`, snake);
      }
    };

    // Initialize multiplayer game engine instead of single-player
    gameEngineRef.current = new MultiplayerPixiEngine(
      gameContainerRef.current,
      {
        canvasWidth: 800,
        canvasHeight: 600,
        gridSize: 20,
        gameSpeed: 200,
        initialSnakeLength: 3,
        foodSpawnRate: 2
      },
      multiplayerEvents,
      currentPlayer?.id
    );

    // Set initial game state
    gameEngineRef.current.updateGameState(gameState);

    // Start the game if it's active
    if (isGameActive) {
      gameEngineRef.current.start();
    }

    // Cleanup on unmount
    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.destroy();
      }
    };
  }, [room.id, room.players, playerName]);

  // Update currentPlayerId when room players change (handles reconnection)
  useEffect(() => {
    const currentPlayer = room.players.find(p => p.name === playerName);
    if (currentPlayer && currentPlayer.id !== currentPlayerId) {
      console.log(`🔄 Updating currentPlayerId: ${currentPlayerId} → ${currentPlayer.id} for player ${playerName}`);
      setCurrentPlayerId(currentPlayer.id);
      
      // Also update the game engine's current player
      if (gameEngineRef.current) {
        gameEngineRef.current.setCurrentPlayer(currentPlayer.id);
      }
    }
  }, [room.players, playerName, currentPlayerId]);

  // Update game engine when game state or active status changes
  useEffect(() => {
    if (!gameEngineRef.current) return;

    try {
      // Guard against invalid game states
      if (gameState?.snakes) {
        // Update game state
        gameEngineRef.current.updateGameState(gameState);
      }

      // Start/pause based on active status
      if (isGameActive) {
        gameEngineRef.current.start();
      } else {
        gameEngineRef.current.pause();
      }
    } catch (error) {
      console.error('Error updating game engine:', error);
    }
  }, [gameState, isGameActive]);

  // Handle movement input
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    console.log('🎮 Key pressed:', event.key);
    
    // Don't handle input if results page is shown
    if (showResults) {
      console.log('❌ Results page is shown, ignoring input');
      return;
    }
    
    if (!wsManager) {
      console.log('❌ No wsManager');
      return;
    }
    
    // Check WebSocket connection state
    console.log('🔗 WebSocket state:', wsManager.getState());
    
    if (!currentPlayerId) {
      console.log('❌ No currentPlayerId:', currentPlayerId);
      return;
    }
    
    if (!isGameActive) {
      console.log('❌ Game not active, isGameActive:', isGameActive);
      return;
    }

    // Find the current player in playerStats
    const currentPlayer = playerStats.find(p => p.id === currentPlayerId);
    console.log('🎮 Current player search result:', currentPlayer);
    console.log('🎮 Current player ID we are looking for:', currentPlayerId);
    console.log('🎮 All player stats:', playerStats.map(p => ({ id: p.id, name: p.name, isAlive: p.isAlive })));
    console.log('🎮 Room players:', room.players.map(p => ({ id: p.id, name: p.name, isAlive: p.isAlive })));
    
    // Only allow movement if the player is alive
    if (!currentPlayer) {
      console.log('❌ Current player not found in playerStats');
      return;
    }
    
    if (!currentPlayer.isAlive) {
      console.log('❌ Player is dead, ignoring movement input. Player alive status:', currentPlayer.isAlive);
      return;
    }

    let direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null = null;

    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        direction = 'UP';
        break;
      case 'arrowdown':
      case 's':
        direction = 'DOWN';
        break;
      case 'arrowleft':
      case 'a':
        direction = 'LEFT';
        break;
      case 'arrowright':
      case 'd':
        direction = 'RIGHT';
        break;
    }

    if (direction) {
      console.log(`✅ Sending movement: ${direction} for player ${currentPlayerId}`);
      
      const message = {
        type: 'game_input',
        roomId: room.id,
        direction
      };
      
      console.log('📤 Sending message:', message);
      
      try {
        wsManager.send(message);
        console.log('✅ Message sent successfully');
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    } else {
      console.log('❌ No valid direction from key:', event.key);
    }
  }, [wsManager, currentPlayerId, room.id, isGameActive, playerStats, showResults, room.players]);

  // Setup keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Periodic debugging to monitor player state
  useEffect(() => {
    const interval = setInterval(() => {
      if (isGameActive && currentPlayerId) {
        const currentPlayer = playerStats.find(p => p.id === currentPlayerId);
        console.log('🔍 Periodic check - Player control status:', {
          currentPlayerId,
          playerFound: !!currentPlayer,
          isAlive: currentPlayer?.isAlive,
          gameActive: isGameActive,
          wsState: wsManager?.getState(),
          wsConnected: wsManager?.isConnected(),
          showResults,
          playerStatsCount: playerStats.length
        });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isGameActive, currentPlayerId, playerStats, wsManager, showResults]);

  // Progress indicator for current word
  const getWordProgress = () => {
    if (!currentClue || !currentPlayerProgress) return [];
    
    const answer = currentClue.answer;
    return answer.split('').map((letter, index) => ({
      letter,
      revealed: index < currentPlayerProgress.currentLetterIndex,
      current: index === currentPlayerProgress.currentLetterIndex
    }));
  };

  // Results page overlay
  if (showResults && resultsData) {
    const winner = resultsData.winner;
    const finalScores = resultsData.finalScores || [];
    // Map playerId to player name and color
    const playerMap = Object.fromEntries(room.players.map(p => [p.id, p]));
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 bg-opacity-95 backdrop-blur-lg">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-10 max-w-2xl w-full flex flex-col items-center">
          <h2 className="text-4xl font-bold text-yellow-300 mb-4">Game Over</h2>
          <div className="text-2xl text-white mb-6">
            {winner ? (
              <span>🏆 Winner: <span className="font-bold text-green-300">{winner}</span></span>
            ) : (
              <span>No winner</span>
            )}
          </div>
          <table className="w-full mb-8 text-lg text-white bg-white/5 rounded-lg overflow-hidden">
            <thead>
              <tr className="text-blue-200">
                <th className="py-2">Player</th>
                <th>Clues</th>
                <th>Snake</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {finalScores.map((score: any) => {
                const player = playerMap[score.playerId];
                return (
                  <tr key={score.playerId} className="text-center border-b border-white/10 last:border-0">
                    <td className="py-2 flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: player?.color || '#4ECDC4' }}></span>
                      <span>{player?.name || score.playerId}</span>
                    </td>
                    <td>{score.score}</td>
                    <td>{player?.snake?.segments?.length || '-'}</td>
                    <td>{player?.isAlive ? <span className="text-green-400">Alive</span> : <span className="text-red-400">Dead</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            onClick={onLeaveGame}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl font-semibold shadow-lg transition-colors"
          >
            Back to Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-6 min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-6xl">
        <h1 className="text-3xl font-bold text-white">Multiplayer Crossword Snake</h1>
        <button
          onClick={onLeaveGame}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Leave Game
        </button>
      </div>

      {/* Game Status */}
      <div className="text-center">
        <div className="text-white text-lg">
          Room: <span className="font-bold text-yellow-300">{room.name}</span> | 
          Code: <span className="font-bold text-green-300">{room.code}</span>
        </div>
        <div className="text-gray-300">
          {isGameActive ? '🎮 Game Active' : '⏸️ Game Paused'}
        </div>
      </div>

      {/* Player List */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 w-full max-w-6xl">
        <h3 className="text-white text-lg font-semibold mb-3">Players</h3>
        <div className="flex flex-wrap gap-4">
          {playerStats.map(player => (
            <div
              key={player.id}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                player.isAlive ? 'bg-green-600/20 border border-green-400' : 'bg-red-600/20 border border-red-400'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: room.players.find(p => p.id === player.id)?.color || '#4ECDC4' }}
              />
              <span className="text-white font-medium">{player.name}</span>
              <span className="text-gray-300 text-sm">
                {player.cluesCompleted} clues | {player.snakeLength} length
              </span>
              {!player.isAlive && <span className="text-red-400 text-sm">💀</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Current Clue */}
      {crosswordState && crosswordState.currentClues && crosswordState.currentClues.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-3xl text-center">
          <div className="text-white text-xl font-bold mb-3">
            Clue #{(currentPlayerProgress?.currentClueIndex || 0) + 1} of {crosswordState.currentClues.length}
          </div>
          <div className="text-white text-2xl mb-4 font-semibold">
            {currentClue?.clue || 'Loading clue...'}
          </div>
          {currentClue && (
            <>
              <div className="text-gray-300 text-lg mb-2">
                Category: <span className="text-blue-300">{currentClue.category}</span>
              </div>
              <div className="text-gray-300 text-lg">
                Difficulty: <span className="text-yellow-300">{currentClue.difficulty}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Word Progress */}
      {currentClue && (
        <div className="flex space-x-3 mb-6">
          {getWordProgress().map((letterInfo, index) => (
            <div
              key={index}
              className={`
                w-12 h-12 border-3 rounded-lg flex items-center justify-center font-bold text-2xl
                ${letterInfo.revealed 
                  ? 'bg-green-600 border-green-400 text-white shadow-lg' 
                  : letterInfo.current
                    ? 'bg-yellow-600 border-yellow-400 text-white animate-pulse shadow-lg'
                    : 'bg-gray-700 border-gray-500 text-gray-400'
                }
              `}
            >
              {letterInfo.revealed ? letterInfo.letter : '_'}
            </div>
          ))}
        </div>
      )}

      {/* Game Canvas */}
      <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
        <div ref={gameContainerRef} className="w-[800px] h-[600px]" />
      </div>

      {/* Game Instructions */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-3xl text-center">
        <div className="text-white text-lg font-semibold mb-2">How to Play</div>
        <div className="text-gray-300 text-sm space-y-1">
          <div>🐍 Use WASD or arrow keys to move your snake</div>
          <div>📝 Collect letters in the correct sequence to spell the answer</div>
          <div>✅ Correct letters advance your progress and grow your snake</div>
          <div>❌ Wrong letters shrink your snake - be careful!</div>
          <div>🏆 Complete all clues to win the game</div>
        </div>
      </div>

      {/* Loading State */}
      {!crosswordState && (
        <div className="text-center">
          <div className="text-white text-xl">Loading crossword...</div>
          <div className="text-gray-300">Please wait while the game initializes</div>
        </div>
      )}
    </div>
  );
}; 