import React, { useState } from 'react';
import { GAME_MODES, GameMode, Lobby } from '@shared/game/modes';
import { soundManager } from '../utils/SoundManager.js';

interface GameLobbyProps {
  onStartSinglePlayer: (gameMode: GameMode) => void;
  onJoinMultiplayer: (lobbyId: string) => void;
  onCreateLobby: (gameMode: GameMode, lobbyName: string, maxPlayers: number, isPrivate: boolean) => void;
  lobbies: Lobby[];
  currentLobby?: Lobby;
  isInLobby: boolean;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  onStartSinglePlayer,
  onJoinMultiplayer,
  onCreateLobby,
  lobbies,
  currentLobby,
  isInLobby
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [showCreateLobby, setShowCreateLobby] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    soundManager.playUIClick();
  };

  const handleStartSinglePlayer = () => {
    soundManager.playUIClick();
    onStartSinglePlayer(selectedMode);
  };

  const handleCreateLobby = () => {
    if (lobbyName.trim()) {
      soundManager.playUIClick();
      onCreateLobby(selectedMode, lobbyName.trim(), maxPlayers, isPrivate);
      setShowCreateLobby(false);
      setLobbyName('');
    }
  };

  const handleJoinLobby = (lobbyId: string) => {
    soundManager.playUIClick();
    onJoinMultiplayer(lobbyId);
  };

  if (isInLobby && currentLobby) {
    return <LobbyWaitingRoom lobby={currentLobby} />;
  }

  return (
    <div className="game-lobby">
      {/* Header */}
      <div className="lobby-header">
        <h1 className="lobby-title">🐍 Snake Word Arena</h1>
        <p className="lobby-subtitle">Choose your game mode and start playing!</p>
      </div>

      {/* Tab Navigation */}
      <div className="lobby-tabs">
        <button
          className={`tab ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('single');
            soundManager.playUIClick();
          }}
        >
          Single Player
        </button>
        <button
          className={`tab ${activeTab === 'multi' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('multi');
            soundManager.playUIClick();
          }}
        >
          Multiplayer
        </button>
      </div>

      <div className="lobby-content">
        {activeTab === 'single' ? (
          <SinglePlayerTab
            selectedMode={selectedMode}
            onModeSelect={handleModeSelect}
            onStartGame={handleStartSinglePlayer}
          />
        ) : (
          <MultiplayerTab
            selectedMode={selectedMode}
            onModeSelect={handleModeSelect}
            lobbies={lobbies}
            onJoinLobby={handleJoinLobby}
            onShowCreateLobby={() => setShowCreateLobby(true)}
          />
        )}
      </div>

      {/* Create Lobby Modal */}
      {showCreateLobby && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Lobby</h3>
            <div className="modal-content">
              <div className="form-group">
                <label>Lobby Name:</label>
                <input
                  type="text"
                  value={lobbyName}
                  onChange={(e) => setLobbyName(e.target.value)}
                  placeholder="Enter lobby name..."
                  maxLength={30}
                />
              </div>
              
              <div className="form-group">
                <label>Max Players:</label>
                <select value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))}>
                  <option value={2}>2 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={6}>6 Players</option>
                  <option value={8}>8 Players</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  Private Lobby
                </label>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowCreateLobby(false);
                  soundManager.playUIClick();
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateLobby}
                disabled={!lobbyName.trim()}
              >
                Create Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .game-lobby {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          overflow-y: auto;
        }

        .lobby-header {
          text-align: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .lobby-title {
          font-size: 3rem;
          font-weight: bold;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .lobby-subtitle {
          font-size: 1.2rem;
          margin: 0.5rem 0 0 0;
          opacity: 0.9;
        }

        .lobby-tabs {
          display: flex;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .tab {
          background: none;
          border: none;
          color: white;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 3px solid transparent;
        }

        .tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .tab.active {
          border-bottom-color: #4ade80;
          background: rgba(255, 255, 255, 0.1);
        }

        .lobby-content {
          flex: 1;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 1rem;
          padding: 2rem;
          min-width: 400px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .modal h3 {
          margin: 0 0 1.5rem 0;
          text-align: center;
        }

        .modal-content {
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1rem;
        }

        .form-group input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .checkbox-label {
          display: flex !important;
          align-items: center;
          cursor: pointer;
        }

        .checkbox-label input {
          width: auto !important;
          margin-right: 0.5rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #4ade80;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #22c55e;
          transform: translateY(-2px);
        }

        .btn-primary:disabled {
          background: #6b7280;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

const SinglePlayerTab: React.FC<{
  selectedMode: GameMode;
  onModeSelect: (mode: GameMode) => void;
  onStartGame: () => void;
}> = ({ selectedMode, onModeSelect, onStartGame }) => {
  const singlePlayerModes = Object.values(GAME_MODES).filter(mode => 
    mode.minPlayers === 1 || mode.id === 'classic'
  );

  return (
    <div className="single-player-tab">
      <div className="mode-grid">
        {singlePlayerModes.map((mode) => (
          <div
            key={mode.id}
            className={`mode-card ${selectedMode === mode.id ? 'selected' : ''}`}
            onClick={() => onModeSelect(mode.id)}
          >
            <div className="mode-icon">{mode.icon}</div>
            <h3 className="mode-name">{mode.name}</h3>
            <p className="mode-description">{mode.description}</p>
            <div className="mode-details">
              {mode.defaultDuration > 0 && (
                <span className="detail">⏱️ {Math.floor(mode.defaultDuration / 60)} min</span>
              )}
              {mode.rules.powerUpsEnabled && (
                <span className="detail">⚡ Power-ups</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="start-section">
        <button className="start-btn" onClick={onStartGame}>
          Start {GAME_MODES[selectedMode].name}
        </button>
      </div>

      <style>{`
        .single-player-tab {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .mode-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .mode-card {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .mode-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .mode-card.selected {
          border-color: #4ade80;
          background: rgba(74, 222, 128, 0.2);
        }

        .mode-icon {
          font-size: 3rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        .mode-name {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0 0 0.5rem 0;
          text-align: center;
        }

        .mode-description {
          text-align: center;
          opacity: 0.9;
          margin: 0 0 1rem 0;
          line-height: 1.4;
        }

        .mode-details {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .detail {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.9rem;
        }

        .start-section {
          text-align: center;
        }

        .start-btn {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: white;
          border: none;
          padding: 1rem 3rem;
          font-size: 1.2rem;
          font-weight: bold;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
        }

        .start-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(74, 222, 128, 0.4);
        }
      `}</style>
    </div>
  );
};

const MultiplayerTab: React.FC<{
  selectedMode: GameMode;
  onModeSelect: (mode: GameMode) => void;
  lobbies: Lobby[];
  onJoinLobby: (lobbyId: string) => void;
  onShowCreateLobby: () => void;
}> = ({ selectedMode, onModeSelect, lobbies, onJoinLobby, onShowCreateLobby }) => {
  const multiplayerModes = Object.values(GAME_MODES).filter(mode => 
    mode.minPlayers > 1
  );

  return (
    <div className="multiplayer-tab">
      <div className="create-section">
        <h3>Create New Game</h3>
        <div className="mode-selector">
          {multiplayerModes.map((mode) => (
            <button
              key={mode.id}
              className={`mode-btn ${selectedMode === mode.id ? 'selected' : ''}`}
              onClick={() => onModeSelect(mode.id)}
            >
              {mode.icon} {mode.name}
            </button>
          ))}
        </div>
        <button className="create-btn" onClick={onShowCreateLobby}>
          Create Lobby
        </button>
      </div>

      <div className="lobbies-section">
        <h3>Join Existing Game</h3>
        {lobbies.length === 0 ? (
          <div className="no-lobbies">
            <p>No active lobbies found</p>
            <p className="hint">Create one to get started!</p>
          </div>
        ) : (
          <div className="lobbies-list">
            {lobbies.map((lobby) => (
              <LobbyCard
                key={lobby.id}
                lobby={lobby}
                onJoin={() => onJoinLobby(lobby.id)}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .multiplayer-tab {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .create-section,
        .lobbies-section {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 2rem;
          backdrop-filter: blur(10px);
        }

        .create-section h3,
        .lobbies-section h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
          text-align: center;
        }

        .mode-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          justify-content: center;
        }

        .mode-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mode-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .mode-btn.selected {
          background: rgba(74, 222, 128, 0.3);
          border-color: #4ade80;
        }

        .create-btn {
          display: block;
          margin: 0 auto;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: bold;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .create-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }

        .no-lobbies {
          text-align: center;
          padding: 2rem;
          opacity: 0.7;
        }

        .no-lobbies p {
          margin: 0.5rem 0;
        }

        .hint {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .lobbies-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
};

const LobbyCard: React.FC<{
  lobby: Lobby;
  onJoin: () => void;
}> = ({ lobby, onJoin }) => {
  const mode = GAME_MODES[lobby.settings.gameMode];
  
  return (
    <div className="lobby-card">
      <div className="lobby-info">
        <div className="lobby-name">
          {lobby.settings.isPrivate && '🔒'} {lobby.name}
        </div>
        <div className="lobby-details">
          <span className="mode">{mode.icon} {mode.name}</span>
          <span className="players">
            👥 {lobby.players.length}/{lobby.settings.maxPlayers}
          </span>
        </div>
      </div>
      
      <button
        className="join-btn"
        onClick={onJoin}
        disabled={lobby.players.length >= lobby.settings.maxPlayers}
      >
        {lobby.players.length >= lobby.settings.maxPlayers ? 'Full' : 'Join'}
      </button>

      <style>{`
        .lobby-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          padding: 1rem 1.5rem;
          transition: all 0.3s ease;
        }

        .lobby-card:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateX(4px);
        }

        .lobby-info {
          flex: 1;
        }

        .lobby-name {
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .lobby-details {
          display: flex;
          gap: 1rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .join-btn {
          background: #4ade80;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .join-btn:hover:not(:disabled) {
          background: #22c55e;
          transform: translateY(-2px);
        }

        .join-btn:disabled {
          background: #6b7280;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

const LobbyWaitingRoom: React.FC<{
  lobby: Lobby;
}> = ({ lobby }) => {
  const mode = GAME_MODES[lobby.settings.gameMode];
  
  return (
    <div className="waiting-room">
      <div className="waiting-header">
        <h2>🎮 {lobby.name}</h2>
        <div className="mode-info">
          <span className="mode-badge">{mode.icon} {mode.name}</span>
        </div>
      </div>

      <div className="players-section">
        <h3>Players ({lobby.players.length}/{lobby.settings.maxPlayers})</h3>
        <div className="players-grid">
          {lobby.players.map((player) => (
            <div key={player.id} className="player-card">
              <div className="player-info">
                <span className="player-name">
                  {player.isHost && '👑'} {player.name}
                </span>
                {player.team && (
                  <span className={`team-badge ${player.team}`}>
                    Team {player.team.toUpperCase()}
                  </span>
                )}
              </div>
              <div className={`ready-status ${player.isReady ? 'ready' : 'not-ready'}`}>
                {player.isReady ? '✅ Ready' : '⏳ Not Ready'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-rules">
        <h3>Game Rules</h3>
        <div className="rules-grid">
          <div className="rule">
            <span className="rule-label">Duration:</span>
            <span>{mode.defaultDuration > 0 ? `${Math.floor(mode.defaultDuration / 60)} minutes` : 'Unlimited'}</span>
          </div>
          <div className="rule">
            <span className="rule-label">Power-ups:</span>
            <span>{mode.rules.powerUpsEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
          <div className="rule">
            <span className="rule-label">Respawn:</span>
            <span>{mode.rules.respawnEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
          </div>
          <div className="rule">
            <span className="rule-label">Team Mode:</span>
            <span>{mode.rules.teamMode ? '✅ Teams' : '❌ Free for All'}</span>
          </div>
        </div>
      </div>

      <style>{`
        .waiting-room {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          overflow-y: auto;
        }

        .waiting-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .waiting-header h2 {
          margin: 0 0 1rem 0;
          font-size: 2rem;
        }

        .mode-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 1rem;
          font-size: 1.1rem;
        }

        .players-section,
        .game-rules {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .players-section h3,
        .game-rules h3 {
          margin: 0 0 1rem 0;
          text-align: center;
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .player-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .player-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .player-name {
          font-weight: bold;
        }

        .team-badge {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          width: fit-content;
        }

        .team-badge.red {
          background: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .team-badge.blue {
          background: rgba(59, 130, 246, 0.3);
          color: #93c5fd;
        }

        .ready-status {
          font-size: 0.9rem;
          text-align: center;
        }

        .ready-status.ready {
          color: #4ade80;
        }

        .ready-status.not-ready {
          color: #fbbf24;
        }

        .rules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .rule {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
        }

        .rule-label {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}; 