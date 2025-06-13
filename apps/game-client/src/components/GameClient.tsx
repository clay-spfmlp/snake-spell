import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGameStore } from '@/stores/gameStore';
import { ServerMessageTypes } from '@shared/networking/messages';

const WS_URL = 'ws://localhost:3002';

export function GameClient() {
  const [playerName, setPlayerName] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  
  const {
    connectionStatus,
    currentPlayer,
    players,
    chatMessages,
    setConnectionStatus,
    setCurrentPlayer,
    addPlayer,
    removePlayer,
    addChatMessage,
  } = useGameStore();

  const handleMessage = (message: ServerMessageTypes) => {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'connected':
        setCurrentPlayer({
          id: message.data.playerId,
          name: message.data.playerName,
          connected: true,
          joinedAt: Date.now()
        });
        break;
        
      case 'player_joined':
        addPlayer({
          id: message.data.playerId,
          name: message.data.playerName,
          connected: true,
          joinedAt: Date.now()
        });
        break;
        
      case 'player_left':
        removePlayer(message.data.playerId);
        break;
        
      case 'chat_broadcast':
        addChatMessage(
          message.data.playerId,
          message.data.playerName,
          message.data.message
        );
        break;
    }
  };

  const {
    connect,
    disconnect,
    connectPlayer,
    sendChat,
    isConnected
  } = useWebSocket({
    url: WS_URL,
    onMessage: handleMessage,
    onConnect: () => setConnectionStatus('Open'),
    onDisconnect: () => setConnectionStatus('Closed'),
    onError: (error) => console.error('WebSocket error:', error)
  });

  useEffect(() => {
    setConnectionStatus(connectionStatus as any);
  }, [connectionStatus, setConnectionStatus]);

  const handleConnect = () => {
    if (!playerName.trim()) return;
    
    connect();
    setIsNameSubmitted(true);
    
    // Wait a bit for connection to establish, then send connect message
    setTimeout(() => {
      connectPlayer(playerName.trim());
    }, 100);
  };

  const handleDisconnect = () => {
    disconnect();
    setIsNameSubmitted(false);
    setCurrentPlayer(null);
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !isConnected) return;
    
    sendChat(chatInput.trim());
    setChatInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          🐍 Snake Word Arena
        </h1>
        
        {/* Connection Status */}
        <div className="mb-6 text-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${
            connectionStatus === 'Open' ? 'bg-green-500' : 
            connectionStatus === 'Connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              connectionStatus === 'Open' ? 'bg-green-200' : 
              connectionStatus === 'Connecting' ? 'bg-yellow-200' : 'bg-red-200'
            }`} />
            {connectionStatus}
          </div>
        </div>

        {/* Connection Form */}
        {!isNameSubmitted && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Join Game</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleConnect)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
                maxLength={20}
              />
              <button
                onClick={handleConnect}
                disabled={!playerName.trim() || connectionStatus === 'Connecting'}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {connectionStatus === 'Connecting' ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Game Interface */}
        {isNameSubmitted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Game Area */}
            <div className="lg:col-span-2">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 h-96">
                <h2 className="text-xl font-semibold mb-4">Game Area</h2>
                <div className="text-center text-white/70">
                  🎮 Game will start here in Phase 2!
                  <br />
                  <br />
                  {currentPlayer && (
                    <div>
                      Playing as: <span className="font-bold text-blue-300">{currentPlayer.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Players List */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                <h3 className="font-semibold mb-3">Players ({players.length + (currentPlayer ? 1 : 0)})</h3>
                <div className="space-y-2">
                  {currentPlayer && (
                    <div className="flex items-center text-blue-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                      {currentPlayer.name} (You)
                    </div>
                  )}
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                      {player.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                <h3 className="font-semibold mb-3">Chat</h3>
                <div className="space-y-2 h-40 overflow-y-auto mb-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-medium text-blue-300">{msg.playerName}:</span>{' '}
                      <span className="text-white/80">{msg.message}</span>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="text-white/50 text-sm">No messages yet...</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleSendChat)}
                    disabled={!isConnected}
                    className="flex-1 px-3 py-1 text-sm rounded bg-white/20 border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    maxLength={100}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || !isConnected}
                    className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed rounded transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 