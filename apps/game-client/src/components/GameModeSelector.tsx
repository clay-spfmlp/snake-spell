import React, { useState } from 'react';
import { GameMode, GAME_MODES } from '@snake-spell/shared-types';

interface GameModeSelectorProps {
  onSelectMode: (gameMode: GameMode) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onSelectMode }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');

  const handleModeClick = (mode: GameMode) => {
    setSelectedMode(mode);
  };

  const handleStartGame = () => {
    onSelectMode(selectedMode);
  };

  // Filter to single player modes
  const singlePlayerModes = Object.values(GAME_MODES).filter(mode => 
    mode.minPlayers === 1
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Choose Your Game Mode</h1>
          <p className="text-xl text-gray-300">Select a single player mode to begin your adventure</p>
        </div>

        {/* Game Mode Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {singlePlayerModes.map((mode) => (
            <div
              key={mode.id}
              className={`
                relative bg-white/10 backdrop-blur-sm border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-105
                ${selectedMode === mode.id 
                  ? 'border-green-400 bg-green-400/20 shadow-lg shadow-green-400/25' 
                  : 'border-white/20 hover:border-white/40'
                }
              `}
              onClick={() => handleModeClick(mode.id)}
            >
              {/* Coming Soon Badge for non-classic and non-crossword modes */}
              {mode.id !== 'classic' && mode.id !== 'crossword_search' && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                  Coming Soon
                </div>
              )}

              {/* Mode Icon */}
              <div className="text-6xl text-center mb-4">
                {mode.icon}
              </div>

              {/* Mode Info */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">{mode.name}</h3>
                <p className="text-gray-300 mb-4 leading-relaxed">{mode.description}</p>

                {/* Mode Details */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {mode.defaultDuration > 0 && (
                    <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                      ⏱️ {Math.floor(mode.defaultDuration / 60)} min
                    </span>
                  )}
                  {mode.rules.powerUpsEnabled && (
                    <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                      ⚡ Power-ups
                    </span>
                  )}
                  {mode.rules.respawnEnabled && (
                    <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                      🔄 Respawn
                    </span>
                  )}
                </div>

                {/* Special Rules */}
                <div className="text-sm text-gray-400">
                  {mode.rules.specialRules.slice(0, 2).map((rule, index) => (
                    <div key={index} className="mb-1">• {rule}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStartGame}
            className={`
              px-12 py-4 text-xl font-bold rounded-xl transition-all duration-300 transform hover:scale-105
              ${selectedMode === 'classic' || selectedMode === 'crossword_search'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
                : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40'
              }
            `}
          >
            {selectedMode === 'classic' || selectedMode === 'crossword_search'
              ? `🚀 Start ${GAME_MODES[selectedMode].name}`
              : `🔒 ${GAME_MODES[selectedMode].name} - Coming Soon`
            }
          </button>
          
          {selectedMode !== 'classic' && selectedMode !== 'crossword_search' && (
            <p className="text-gray-400 text-sm mt-3">
              This game mode is under development. Try Classic Mode or Cross Word Search for now!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}; 