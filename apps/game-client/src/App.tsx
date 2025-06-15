import { SnakeGame } from './components/SnakeGame'
import { CrosswordSnakeGame } from './components/CrosswordSnakeGame'
import { GameModeSelector } from './components/GameModeSelector'
import { MultiplayerLobby } from './components/MultiplayerLobby'
import { useState } from 'react'
import { GameMode } from '@snake-spell/shared-types'

function App() {
  const [currentView, setCurrentView] = useState<'menu' | 'game-mode-select' | 'snake' | 'crossword' | 'multiplayer'>('menu');

  const handleGameModeSelect = (gameMode: GameMode) => {
    if (gameMode === 'classic') {
      setCurrentView('snake');
    } else if (gameMode === 'crossword_search') {
      setCurrentView('crossword');
    } else {
      // For now, other modes show coming soon and go back to selection
      alert('Coming Soon! This game mode is not yet available.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {currentView === 'menu' && (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-8">
          <h1 className="text-6xl font-bold text-white mb-8">Snake Spell</h1>
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => setCurrentView('game-mode-select')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-xl font-semibold transition-colors"
            >
              🐍 Play Single Player
            </button>
            <button
              onClick={() => setCurrentView('multiplayer')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg text-xl font-semibold transition-colors"
            >
              🌐 Multiplayer
            </button>
          </div>
        </div>
      )}

      {currentView === 'game-mode-select' && (
        <div>
          <button
            onClick={() => setCurrentView('menu')}
            className="absolute top-4 left-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors z-10"
          >
            ← Back to Menu
          </button>
          <GameModeSelector onSelectMode={handleGameModeSelect} />
        </div>
      )}

      {currentView === 'snake' && (
        <div>
          <button
            onClick={() => setCurrentView('game-mode-select')}
            className="absolute top-4 left-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
          >
            ← Back to Game Modes
          </button>
          <SnakeGame />
        </div>
      )}

      {currentView === 'crossword' && (
        <div>
          <button
            onClick={() => setCurrentView('game-mode-select')}
            className="absolute top-4 left-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
          >
            ← Back to Game Modes
          </button>
          <CrosswordSnakeGame />
        </div>
      )}

      {currentView === 'multiplayer' && (
        <MultiplayerLobby onBackToMenu={() => setCurrentView('menu')} />
      )}
    </div>
  )
}

export default App 