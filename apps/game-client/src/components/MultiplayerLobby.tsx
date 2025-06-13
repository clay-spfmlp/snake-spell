import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, GAME_MODES, SNAKE_COLORS } from '@snake-word-arena/shared-types';
import {
  GameRoom,
  GameRoomInfo,
  MultiplayerMessage,
  CreateRoomMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  PlayerReadyMessage,
  RoomListMessage
} from '@snake-word-arena/shared-types';
import { WebSocketManager, ConnectionState } from '../utils/WebSocketManager';
import { MultiplayerCrosswordGame } from './MultiplayerCrosswordGame';

interface MultiplayerLobbyProps {
  onBackToMenu: () => void;
}

type LobbyView = 'name' | 'select' | 'host' | 'join' | 'waiting' | 'game';

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onBackToMenu }) => {
  const [currentView, setCurrentView] = useState<LobbyView>('name');
  const [playerName, setPlayerName] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // Host game state
  const [roomName, setRoomName] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('crossword_search');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);

  // Join game state
  const [roomCode, setRoomCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState<GameRoomInfo[]>([]);

  // Current room state
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  
  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);

  // WebSocket connection - only create when needed
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);

  // Pending action state
  const [pendingAction, setPendingAction] = useState<{
    type: 'host' | 'join_code' | 'join_room' | 'browse';
    data?: any;
  } | null>(null);

  // WebSocket event handler
  const handleWebSocketMessage = useCallback((event: any) => {
    if (event.type === 'message') {
      const message = event.data as MultiplayerMessage;
      console.log('Received message:', message);

      switch (message.type) {
        case 'room_list_response':
          setAvailableRooms(message.rooms);
          break;

        case 'room_joined':
          setCurrentRoom(message.room);
          // Find current player ID by name
          const joinedPlayer = message.room.players.find(p => p.name === playerName);
          if (joinedPlayer) {
            setCurrentPlayerId(joinedPlayer.id);
          }
          
          // If joining an active game (reconnection), go directly to game view
          if (message.room.isGameActive) {
            console.log('🔄 Reconnecting to active game, going directly to game view');
            setCurrentView('game');
          } else {
            setCurrentView('waiting');
          }
          break;

        case 'room_updated':
          setCurrentRoom(message.room);
          // Sync local ready state with server state
          const updatedPlayer = message.room.players.find(p => p.name === playerName);
          if (updatedPlayer) {
            console.log(`🔄 Syncing ready state: local=${isReady} → server=${updatedPlayer.isReady} for player ${playerName}`);
            setIsReady(updatedPlayer.isReady);
            
            // Also update currentPlayerId if it changed (for reconnection scenarios)
            if (updatedPlayer.id !== currentPlayerId) {
              console.log(`🔄 Updating currentPlayerId: ${currentPlayerId} → ${updatedPlayer.id}`);
              setCurrentPlayerId(updatedPlayer.id);
            }
          }
          break;

        case 'room_left':
          setCurrentRoom(null);
          setIsReady(false);
          setCurrentView('select');
          break;

        case 'room_closed':
          console.log('🏠 Room closed:', message.message);
          // Show alert to user about room closure
          alert(message.message);
          // Reset state and go back to lobby
          setCurrentRoom(null);
          setIsReady(false);
          setCountdown(null);
          setCurrentView('select');
          break;

        case 'game_started':
          console.log('🎮 Game started message received:', message);
          console.log('Current room ID:', currentRoom?.id);
          console.log('Message room ID:', message.roomId);
          if (message.roomId === currentRoom?.id) {
            console.log('✅ Starting countdown');
            // Start 3-second countdown
            setCountdown(3);
          } else {
            console.log('❌ Room ID mismatch, not transitioning');
          }
          break;

        case 'game_ended':
          // Don't manually update room state here - the server will send a room_updated message
          // with the correct state after resetting all players to not ready
          console.log('🏁 Game ended, waiting for room_updated message from server');
          break;
      }
    }
  }, [currentRoom, playerName]);

  // Setup WebSocket connection when wsManager is created
  useEffect(() => {
    if (!wsManager) return;

    const handleConnectionEvent = (event: any) => {
      if (event.type === 'connect') {
        setIsConnected(true);
        setConnectionState(ConnectionState.CONNECTED);
        // Send connect message with player name
        wsManager.send({
          type: 'connect',
          data: { playerName }
        });

        // Execute pending action if any
        if (pendingAction) {
          setTimeout(() => {
            switch (pendingAction.type) {
              case 'host':
                const hostMessage: CreateRoomMessage = {
                  type: 'create_room',
                  roomName: roomName.trim(),
                  gameMode: selectedGameMode,
                  maxPlayers,
                  playerName,
                  isPrivate: isPrivateRoom
                };
                wsManager.send(hostMessage);
                break;

              case 'join_code':
                const joinCodeMessage: JoinRoomMessage = {
                  type: 'join_room',
                  roomId: pendingAction.data.roomCode,
                  playerName
                };
                wsManager.send(joinCodeMessage);
                break;

              case 'join_room':
                const joinRoomMessage: JoinRoomMessage = {
                  type: 'join_room',
                  roomId: pendingAction.data.roomId,
                  playerName
                };
                wsManager.send(joinRoomMessage);
                break;

              case 'browse':
                const browseMessage: RoomListMessage = {
                  type: 'room_list'
                };
                wsManager.send(browseMessage);
                break;
            }
            setPendingAction(null);
          }, 100); // Small delay to ensure connection is fully established
        }
      } else if (event.type === 'disconnect') {
        setIsConnected(false);
        setConnectionState(ConnectionState.DISCONNECTED);
      } else if (event.type === 'error') {
        setConnectionState(ConnectionState.ERROR);
        setPendingAction(null); // Clear pending action on error
      }
    };

    wsManager.addEventListener(handleWebSocketMessage);
    wsManager.addEventListener(handleConnectionEvent);

    return () => {
      wsManager.removeEventListener(handleWebSocketMessage);
      wsManager.removeEventListener(handleConnectionEvent);
    };
  }, [wsManager, handleWebSocketMessage, playerName, roomName, selectedGameMode, maxPlayers, pendingAction, isPrivateRoom]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsManager) {
        wsManager.disconnect();
      }
    };
  }, [wsManager]);

  const initializeConnection = useCallback(() => {
    if (!wsManager) {
      const newWsManager = new WebSocketManager({
        url: 'ws://localhost:3001'
      });
      setWsManager(newWsManager);
      setConnectionState(ConnectionState.CONNECTING);
      newWsManager.connect();
    }
  }, [wsManager]);

  const refreshRoomList = useCallback(() => {
    if (!isConnected) return;

    const message: RoomListMessage = {
      type: 'room_list'
    };

    wsManager?.send(message);
  }, [isConnected, wsManager]);

  // Handle view changes - refresh room list when entering join view
  const handleBrowseRooms = useCallback(() => {
    if (!isConnected) {
      setPendingAction({ type: 'browse' });
      initializeConnection();
      return;
    }
    refreshRoomList();
  }, [isConnected, initializeConnection, refreshRoomList]);

  const handleNameSubmit = () => {
    if (playerName.trim()) {
      setCurrentView('select');
    }
  };

  const handleHostGame = () => {
    if (!roomName.trim()) return;

    if (!isConnected) {
      setPendingAction({ type: 'host' });
      initializeConnection();
      return;
    }

    const message: CreateRoomMessage = {
      type: 'create_room',
      roomName: roomName.trim(),
      gameMode: selectedGameMode,
      maxPlayers,
      playerName,
      isPrivate: isPrivateRoom
    };

    wsManager?.send(message);
  };

  const handleJoinByCode = () => {
    if (!roomCode.trim()) return;

    if (!isConnected) {
      setPendingAction({
        type: 'join_code',
        data: { roomCode: roomCode.toUpperCase() }
      });
      initializeConnection();
      return;
    }

    const message: JoinRoomMessage = {
      type: 'join_room',
      roomId: roomCode.toUpperCase(),
      playerName
    };

    wsManager?.send(message);
  };

  const handleJoinRoom = (room: GameRoomInfo) => {
    if (!isConnected) {
      setPendingAction({
        type: 'join_room',
        data: { roomId: room.id }
      });
      initializeConnection();
      return;
    }

    const message: JoinRoomMessage = {
      type: 'join_room',
      roomId: room.id,
      playerName
    };

    wsManager?.send(message);
  };

  const handleToggleReady = () => {
    if (!currentRoom || !isConnected) return;

    const newReadyState = !isReady;
    setIsReady(newReadyState);

    const message: PlayerReadyMessage = {
      type: 'player_ready',
      roomId: currentRoom.id,
      isReady: newReadyState
    };

    wsManager?.send(message);
  };

  const handleLeaveRoom = () => {
    if (!wsManager || !currentRoom) return;

    const message: LeaveRoomMessage = {
      type: 'leave_room',
      roomId: currentRoom.id
    };

    wsManager.send(message);
  };

  const handleColorChange = (color: string) => {
    if (!wsManager || !currentRoom) return;

    console.log(`🎨 Attempting to change color to ${color} for player ${playerName} (${currentPlayerId})`);

    const message = {
      type: 'player_color',
      roomId: currentRoom.id,
      color: color
    };

    console.log(`📤 Sending color change message:`, message);
    wsManager.send(message);
  };

  useEffect(() => {
    if (currentView === 'join') {
      handleBrowseRooms();
    }
  }, [currentView, handleBrowseRooms]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      // Countdown finished, start the game
      setCountdown(null);
      setCurrentView('game');
      return;
    }

    // Decrement countdown every second
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Name entry screen
  if (currentView === 'name') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <button
          onClick={onBackToMenu}
          className="absolute top-4 left-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors z-10"
        >
          ← Back to Menu
        </button>

        <div className="max-w-md w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white text-center mb-6">Enter Your Name</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-white font-semibold mb-2">Display Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
                maxLength={20}
                autoFocus
              />
            </div>

            <button
              onClick={handleNameSubmit}
              disabled={!playerName.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Host or Join selection
  if (currentView === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <button
          onClick={() => setCurrentView('name')}
          className="absolute top-4 left-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors z-10"
        >
          ← Back
        </button>

        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">Multiplayer</h1>
            <p className="text-xl text-gray-300">Welcome, {playerName}! Choose how you want to play.</p>

            {/* Connection status indicator */}
            {connectionState !== ConnectionState.DISCONNECTED && (
              <div className="mt-4">
                <div className={`inline-flex items-center px-4 py-2 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-green-500/20 text-green-300' :
                    connectionState === ConnectionState.CONNECTING ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                  }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${connectionState === ConnectionState.CONNECTED ? 'bg-green-400' :
                      connectionState === ConnectionState.CONNECTING ? 'bg-yellow-400' :
                        'bg-red-400'
                    }`} />
                  {connectionState === ConnectionState.CONNECTED ? 'Connected to Server' :
                    connectionState === ConnectionState.CONNECTING ? 'Connecting to Server...' :
                      'Connection Error'}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Host Game */}
            <div
              onClick={() => setCurrentView('host')}
              className="bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:border-green-400 rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-green-400/10"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">👑</div>
                <h2 className="text-3xl font-bold text-white mb-4">Host a Game</h2>
                <p className="text-gray-300 mb-6">Create a new room and invite friends to join your game</p>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>• Choose game mode and settings</div>
                  <div>• Get a shareable room code</div>
                  <div>• Control when the game starts</div>
                </div>
              </div>
            </div>

            {/* Join Game */}
            <div
              onClick={() => setCurrentView('join')}
              className="bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:border-blue-400 rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-blue-400/10"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-3xl font-bold text-white mb-4">Join a Game</h2>
                <p className="text-gray-300 mb-6">Enter a room code or browse available games to join</p>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>• Browse public rooms</div>
                  <div>• Join with a room code</div>
                  <div>• Play with friends</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Host game setup
  if (currentView === 'host') {
    // Show all multiplayer game modes
    const multiplayerModes = Object.values(GAME_MODES).filter(mode =>
      mode.minPlayers > 1 || mode.id === 'crossword_search'
    );

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <button
          onClick={() => setCurrentView('select')}
          className="absolute top-4 left-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors z-10"
        >
          ← Back
        </button>

        <div className="max-w-4xl w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Host a Game</h1>

          <div className="space-y-6">
            {/* Room Name */}
            <div>
              <label className="block text-white font-semibold mb-2">Room Name</label>
              <input
                type="text"
                placeholder="Enter room name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
                maxLength={30}
              />
            </div>

            {/* Game Mode */}
            <div>
              <label className="block text-white font-semibold mb-2">Game Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {multiplayerModes.map((mode) => {
                  const isAvailable = mode.id === 'crossword_search';
                  const isSelected = selectedGameMode === mode.id;
                  
                  return (
                    <div
                      key={mode.id}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedGameMode(mode.id);
                          setMaxPlayers(mode.maxPlayers); // Use game mode's max players
                        }
                      }}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        isAvailable 
                          ? `cursor-pointer ${isSelected
                              ? 'border-green-400 bg-green-400/20'
                              : 'border-white/30 bg-white/10 hover:border-white/50'
                            }`
                          : 'cursor-not-allowed border-gray-500/50 bg-gray-500/10 opacity-60'
                      }`}
                    >
                      {/* Coming Soon Badge for unavailable modes */}
                      {!isAvailable && (
                        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                          Coming Soon
                        </div>
                      )}

                      <div className="text-3xl mb-2">{mode.icon}</div>
                      <div className={`font-bold text-lg mb-1 ${isAvailable ? 'text-white' : 'text-gray-100'}`}>
                        {mode.name}
                      </div>
                      <div className={`text-sm mb-2 ${isAvailable ? 'text-white/90' : 'text-gray-100'}`}>
                        {mode.minPlayers}-{mode.maxPlayers} players
                      </div>
                      <div className={`text-sm ${isAvailable ? 'text-white/80' : 'text-gray-100'}`}>
                        {mode.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Private Room */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="private"
                checked={isPrivateRoom}
                onChange={(e) => setIsPrivateRoom(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500"
              />
              <label htmlFor="private" className="text-white font-semibold">
                Private Room (only accessible with room code)
              </label>
            </div>

            {/* Create Button */}
            <button
              onClick={handleHostGame}
              disabled={!roomName.trim() || connectionState === ConnectionState.CONNECTING || selectedGameMode !== 'crossword_search'}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {connectionState === ConnectionState.CONNECTING ? 'Connecting...' : 
               selectedGameMode !== 'crossword_search' ? 'Select Cross Word Search to Continue' :
               'Create Room'}
            </button>

            {/* Connection status */}
            {connectionState === ConnectionState.CONNECTING && (
              <div className="text-center text-yellow-300 text-sm">
                Connecting to server...
              </div>
            )}
            {connectionState === ConnectionState.ERROR && (
              <div className="text-center text-red-300 text-sm">
                Connection failed. Please try again.
              </div>
            )}
            {selectedGameMode !== 'crossword_search' && (
              <div className="text-center text-yellow-300 text-sm">
                Please select Cross Word Search to create a multiplayer room.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Join game screen
  if (currentView === 'join') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <button
          onClick={() => setCurrentView('select')}
          className="absolute top-4 left-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors z-10"
        >
          ← Back
        </button>

        <div className="max-w-4xl w-full">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Join a Game</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Join by Code */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Join by Room Code</h2>
              <p className="text-gray-300 mb-6">Enter a 4-character room code to join a private game</p>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-2xl font-mono tracking-widest"
                  maxLength={4}
                />
                <button
                  onClick={handleJoinByCode}
                  disabled={roomCode.length !== 4 || connectionState === ConnectionState.CONNECTING}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  {connectionState === ConnectionState.CONNECTING ? 'Connecting...' : 'Join Room'}
                </button>
              </div>
            </div>

            {/* Browse Public Rooms */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Public Rooms</h2>
                <button
                  onClick={handleBrowseRooms}
                  disabled={connectionState === ConnectionState.CONNECTING}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  {connectionState === ConnectionState.CONNECTING ? 'Connecting...' : 'Refresh'}
                </button>
              </div>
              <p className="text-gray-300 mb-6">Browse and join available public games</p>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableRooms.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="text-4xl mb-2">🔍</div>
                    <p>No public rooms available</p>
                    <p className="text-sm">Try creating one or joining with a code!</p>
                  </div>
                ) : (
                  availableRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-white/10 border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer"
                      onClick={() => handleJoinRoom(room)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{room.name}</h3>
                          <p className="text-sm text-gray-300">Host: {room.hostPlayerName}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-300">
                            {room.playerCount}/{room.maxPlayers} players
                          </div>
                          <div className="text-xs text-gray-400">
                            Code: {room.code}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{GAME_MODES[room.gameMode].icon}</span>
                          <span className="text-sm text-gray-300">{GAME_MODES[room.gameMode].name}</span>
                        </div>
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
                          disabled={room.playerCount >= room.maxPlayers}
                        >
                          {room.playerCount >= room.maxPlayers ? 'Full' : 'Join'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting room
  if (currentView === 'waiting' && currentRoom) {
    const isHost = currentRoom.hostPlayerId === currentPlayerId;
    const nonHostPlayers = currentRoom.players.filter(p => p.id !== currentRoom.hostPlayerId);
    const canStartGame = isHost && currentRoom.players.length >= 2 && nonHostPlayers.some(p => p.isReady);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <button
          onClick={handleLeaveRoom}
          className="absolute top-4 left-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors z-10"
        >
          ← Leave Room
        </button>

        <div className="max-w-4xl w-full">
          {/* Room Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">{currentRoom.name}</h1>
            <div className="flex items-center justify-center space-x-6 text-gray-300">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{GAME_MODES[currentRoom.gameMode].icon}</span>
                <span>{GAME_MODES[currentRoom.gameMode].name}</span>
              </div>
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full font-mono text-lg">
                {currentRoom.code}
              </div>
            </div>
          </div>

          {/* Room Code Display */}
          {isHost && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6 text-center">
              <h3 className="text-white font-semibold mb-2">Share this room code with friends:</h3>
              <div className="text-3xl font-mono font-bold text-green-300 tracking-widest">
                {currentRoom.code}
              </div>
            </div>
          )}

          {/* Players List */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Players ({currentRoom.players.length}/{currentRoom.maxPlayers})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentRoom.players.map((player) => {
                const isPlayerHost = player.id === currentRoom.hostPlayerId;
                return (
                  <div
                    key={player.id}
                    className="bg-white/10 border border-white/20 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white/50"
                          style={{ backgroundColor: player.color || '#4ECDC4' }}
                        ></div>
                        <span className="text-white font-semibold">
                          {isPlayerHost && '👑 '}{player.name}
                          {player.name === playerName && ' (You)'}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded text-sm font-semibold ${isPlayerHost
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : player.isReady
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                        {isPlayerHost ? 'Host' : player.isReady ? 'Ready' : 'Not Ready'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty slots */}
              {Array.from({ length: currentRoom.maxPlayers - currentRoom.players.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 border-dashed"
                >
                  <div className="text-center text-gray-500">
                    <div className="text-2xl mb-1">👤</div>
                    <div className="text-sm">Waiting for player...</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Choose Your Snake Color</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {SNAKE_COLORS.map((color) => {
                const currentPlayer = currentRoom.players.find(p => p.id === currentPlayerId);
                const isSelected = currentPlayer?.color === color;
                const isUsedByOther = currentRoom.players.some(p => p.id !== currentPlayerId && p.color === color);
                
                return (
                  <button
                    key={color}
                    onClick={() => !isUsedByOther && handleColorChange(color)}
                    disabled={isUsedByOther}
                    className={`
                      w-12 h-12 rounded-full border-4 transition-all duration-200
                      ${isSelected 
                        ? 'border-white scale-110 shadow-lg' 
                        : isUsedByOther
                          ? 'border-gray-500 opacity-50 cursor-not-allowed'
                          : 'border-gray-400 hover:border-white hover:scale-105 cursor-pointer'
                      }
                    `}
                    style={{ backgroundColor: color }}
                    title={isUsedByOther ? 'Color taken by another player' : `Select ${color}`}
                  >
                    {isSelected && (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-xl font-bold">✓</span>
                      </div>
                    )}
                    {isUsedByOther && (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-300 text-lg">✗</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Game Controls */}
          <div className="text-center space-y-4">
            {!isHost && (
              <button
                onClick={handleToggleReady}
                className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${isReady
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
              >
                {isReady ? 'Cancel Ready' : 'Ready Up!'}
              </button>
            )}

            {isHost && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (canStartGame && wsManager && currentRoom) {
                      console.log('🚀 Host starting game for room:', currentRoom.id);
                      // Send start game message to server
                      wsManager.send({
                        type: 'start_game',
                        roomId: currentRoom.id
                      });
                    } else {
                      console.log('❌ Cannot start game:', { canStartGame, hasWsManager: !!wsManager, hasRoom: !!currentRoom });
                    }
                  }}
                  disabled={!canStartGame}
                  className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${canStartGame
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-500 cursor-not-allowed text-gray-300'
                    }`}
                >
                  Start Game
                </button>
                {!canStartGame && (
                  <p className="text-gray-400 text-sm">
                    {currentRoom.players.length < 2
                      ? 'Need at least 2 players to start'
                      : 'At least one player must be ready to start'
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="text-8xl font-bold text-white mb-4 animate-pulse">
                  {countdown}
                </div>
                <div className="text-2xl text-gray-300">
                  Game starting...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Multiplayer Game
  if (currentView === 'game' && currentRoom && wsManager) {
    return (
      <MultiplayerCrosswordGame
        room={currentRoom}
        playerName={playerName}
        wsManager={wsManager}
        onLeaveGame={() => {
          console.log('🔄 Returning to waiting room from game');
          setCurrentView('waiting');
          // Reset local ready state to match server (server resets all players to not ready)
          setIsReady(false);
          // Clear any countdown state
          setCountdown(null);
        }}
      />
    );
  }

  return null;
};