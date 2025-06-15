import { 
  GameRoom, 
  RoomPlayer, 
  MultiplayerGameState,
  GameRoomInfo,
  DEFAULT_GAME_CONFIG,
  GameMode,
  SNAKE_COLORS
} from '@snake-spell/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { MultiplayerGameEngine } from './MultiplayerGameEngine.js';
import { WebSocket } from 'ws';
import { optimizeObject } from '../utils/memoryOptimizer.js';

interface PlayerConnection {
  id: string;
  name: string;
  socket: WebSocket;
  roomId?: string;
  lastActivity: number; // Track last activity timestamp
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private players = new Map<string, PlayerConnection>();
  private gameEngines = new Map<string, MultiplayerGameEngine>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    // Clean up inactive players and empty rooms every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactivePlayers();
      this.cleanupEmptyRooms();
    }, 10 * 60 * 1000); // 10 minutes
  }

  public cleanupInactivePlayers() {
    const now = Date.now();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes of inactivity
    
    const inactivePlayers: string[] = [];
    
    this.players.forEach((player, playerId) => {
      if ((now - player.lastActivity) > inactivityThreshold && !player.roomId) {
        inactivePlayers.push(playerId);
      }
    });
    
    inactivePlayers.forEach(playerId => {
      this.removePlayer(playerId);
      console.log(`👤 Removed inactive player ${playerId} due to inactivity`);
    });
    
    return inactivePlayers.length;
  }

  public cleanupEmptyRooms() {
    const emptyRoomIds: string[] = [];
    
    this.rooms.forEach((room, roomId) => {
      // Clean up rooms with no players
      if (room.players.length === 0) {
        emptyRoomIds.push(roomId);
      }
    });
    
    emptyRoomIds.forEach(roomId => {
      this.rooms.delete(roomId);
      console.log(`🏠 Removed empty room: ${roomId}`);
    });
    
    return emptyRoomIds.length;
  }

  public addPlayer(playerId: string, playerName: string, socket: WebSocket): void {
    // Check if this player is reconnecting to an active game
    // Look for a room where this player name exists and the game is active
    let reconnectedToRoom = false;
    
    for (const [roomId, room] of this.rooms) {
      if (room.isGameActive) {
        const existingPlayerIndex = room.players.findIndex(p => p.name === playerName);
        
        if (existingPlayerIndex !== -1) {
          // Player is reconnecting to an active game
          const existingPlayer = room.players[existingPlayerIndex];
          const oldPlayerId = existingPlayer.id;
          
          console.log(`🔄 Player ${playerName} reconnecting to active game. Old ID: ${oldPlayerId}, New ID: ${playerId}`);
          
          // Update the player ID in the room
          existingPlayer.id = playerId;
          
          // Update the snake's player ID in the game engine
          const gameEngine = this.gameEngines.get(room.id);
          if (gameEngine) {
            gameEngine.updatePlayerIdForReconnection(oldPlayerId, playerId);
          }
          
          // Add player to players map with room reference
          this.players.set(playerId, {
            id: playerId,
            name: playerName,
            socket,
            roomId: room.id,
            lastActivity: Date.now()
          });
          
          // Broadcast room update to all players in room
          this.broadcastToRoom(room.id, {
            type: 'room_updated',
            room
          });
          
          // Send room joined message to the reconnecting player
          this.broadcastToPlayer(playerId, {
            type: 'room_joined',
            room
          });
          
          console.log(`✅ Player ${playerName} successfully reconnected to room "${room.name}"`);
          reconnectedToRoom = true;
          break;
        }
      }
    }
    
    // If not reconnecting to an active game, add normally
    if (!reconnectedToRoom) {
      this.players.set(playerId, {
        id: playerId,
        name: playerName,
        socket,
        lastActivity: Date.now()
      });
      
      console.log(`👤 Player ${playerName} (${playerId}) connected`);
    }
  }

  public removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // If player is in an active game, don't remove them from the room immediately
    // Instead, keep them in the room so they can reconnect
    if (player.roomId) {
      const room = this.rooms.get(player.roomId);
      if (room && room.isGameActive) {
        console.log(`🔌 Player ${player.name} disconnected from active game - keeping in room for potential reconnection`);
        // Don't call leaveRoom - just remove from players map
        // The room player record stays so they can reconnect
        this.players.delete(playerId);
        console.log(`👤 Player ${player.name} disconnected (kept in room for reconnection)`);
        return;
      } else {
        // Normal leave room process for non-active games
        this.leaveRoom(playerId, player.roomId);
      }
    }

    this.players.delete(playerId);
    console.log(`👤 Player ${player.name} disconnected`);
  }

  public updatePlayerActivity(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.lastActivity = Date.now();
    }
  }

  public createRoom(roomName: string, gameMode: GameMode, maxPlayers: number, creatorId: string, isPrivate: boolean = false): GameRoom | null {
    const player = this.players.get(creatorId);
    if (!player) return null;

    const roomId = uuidv4();
    const roomCode = this.generateRoomCode();
    const roomPlayer: RoomPlayer = {
      id: creatorId,
      name: player.name,
      isReady: true, // Host is automatically ready
      isAlive: true,
      joinedAt: Date.now(),
      color: SNAKE_COLORS[0] // Host gets first color
    };

    const room: GameRoom = {
      id: roomId,
      name: roomName,
      code: roomCode,
      gameMode,
      hostPlayerId: creatorId,
      players: [roomPlayer],
      gameState: {
        snakes: [],
        foods: [],
        letterTiles: [],
        playerInventories: new Map(),
        gameTime: 0,
        isActive: false,
        config: { ...DEFAULT_GAME_CONFIG }
      },
      maxPlayers,
      isGameActive: false,
      isPrivate,
      createdAt: Date.now()
    };

    // Initialize crossword state if needed
    if (gameMode === 'crossword_search') {
      room.crosswordState = {
        currentClues: [],
        playerProgress: new Map(),
        availableLetters: [],
        nextCorrectLetter: '',
        gameStats: {
          totalClues: 0,
          completedClues: 0,
          averageTime: 0
        }
      };
    }

    this.rooms.set(roomId, room);
    player.roomId = roomId;

    console.log(`🏠 Room "${roomName}" (${gameMode}) created by ${player.name} with code ${roomCode}`);
    return room;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    do {
      result = '';
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.isRoomCodeTaken(result));
    return result;
  }

  private isRoomCodeTaken(code: string): boolean {
    return Array.from(this.rooms.values()).some(room => room.code === code);
  }

  public joinRoom(playerId: string, roomIdOrCode: string): GameRoom | null {
    const player = this.players.get(playerId);
    
    // Try to find room by ID first, then by code
    let room = this.rooms.get(roomIdOrCode);
    if (!room) {
      room = this.findRoomByCode(roomIdOrCode);
    }
    
    if (!player || !room) return null;
    if (room.players.length >= room.maxPlayers) return null;

    // Leave current room if in one
    if (player.roomId) {
      this.leaveRoom(playerId, player.roomId);
    }

    // Check if this player is reconnecting to an active game
    // Look for a player with the same name who might have disconnected
    const existingPlayerIndex = room.players.findIndex(p => p.name === player.name);
    
    if (existingPlayerIndex !== -1 && room.isGameActive) {
      // Player is reconnecting to an active game - update their ID
      const existingPlayer = room.players[existingPlayerIndex];
      const oldPlayerId = existingPlayer.id;
      
      console.log(`🔄 Player ${player.name} reconnecting to active game. Old ID: ${oldPlayerId}, New ID: ${playerId}`);
      
      // Update the player ID in the room
      existingPlayer.id = playerId;
      
      // Update the snake's player ID in the game engine
      const gameEngine = this.gameEngines.get(room.id);
      if (gameEngine) {
        gameEngine.updatePlayerIdForReconnection(oldPlayerId, playerId);
      }
      
      // Update player's room reference
      player.roomId = room.id;
      
      console.log(`✅ Player ${player.name} successfully reconnected to room "${room.name}"`);
    } else {
      // Normal join process for new players or non-active games
      // Assign color to new player
      const usedColors = room.players.map(p => p.color);
      const availableColors = SNAKE_COLORS.filter(color => !usedColors.includes(color));
      const playerColor = availableColors[0] || SNAKE_COLORS[0]; // Fallback to first color

      const roomPlayer: RoomPlayer = {
        id: playerId,
        name: player.name,
        isReady: false,
        isAlive: true,
        joinedAt: Date.now(),
        color: playerColor
      };

      room.players.push(roomPlayer);
      player.roomId = room.id; // Use room.id, not the input parameter

      console.log(`👥 Player ${player.name} joined room "${room.name}" (${room.code})`);

      // If joining an active game, add the player to the game
      if (room.isGameActive) {
        const gameEngine = this.gameEngines.get(room.id);
        if (gameEngine) {
          console.log(`🎮 Adding player ${player.name} to active game`);
          // For now, we'll use a simple approach - just add them to the room
          // The game engine will handle creating their snake when they send input
          roomPlayer.isReady = true; // Auto-ready for active games
        }
      }
    }

    // Broadcast room update to all players in room
    this.broadcastToRoom(room.id, {
      type: 'room_updated',
      room
    });

    // If this is a crossword room and has crossword state, send it to the new player
    if (room.gameMode === 'crossword_search' && room.crosswordState && room.crosswordState.currentClues.length > 0) {
      console.log('🎯 Sending crossword state to newly joined player...');
      
      // Convert Map to object for JSON serialization
      const playerProgressObj: any = {};
      room.crosswordState.playerProgress.forEach((progress, playerId) => {
        playerProgressObj[playerId] = progress;
      });

      const crosswordStateMessage = {
        type: 'crossword_state',
        roomId: room.id,
        crosswordState: {
          currentClues: [...room.crosswordState.currentClues],
          playerProgress: playerProgressObj,
          availableLetters: [...room.crosswordState.availableLetters],
          nextCorrectLetter: room.crosswordState.nextCorrectLetter,
          gameStats: { ...room.crosswordState.gameStats }
        }
      };

      // Send to the specific player who just joined
      this.broadcastToPlayer(playerId, crosswordStateMessage);
    }

    return room;
  }

  private findRoomByCode(code: string): GameRoom | undefined {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  private getAvailableColor(room: GameRoom): string {
    const usedColors = room.players.map(p => p.color).filter(Boolean);
    const availableColors = SNAKE_COLORS.filter(color => !usedColors.includes(color));
    return availableColors[0] || SNAKE_COLORS[0]; // Fallback to first color if all taken
  }

  public leaveRoom(playerId: string, roomId: string): void {
    const player = this.players.get(playerId);
    const room = this.rooms.get(roomId);
    
    if (!player || !room) return;

    const isHost = room.hostPlayerId === playerId;
    const playerName = player.name;
    const roomName = room.name;

    // If host is leaving and there are other players, notify them that the room is closing
    if (isHost && room.players.length > 1) {
      console.log(`👑 Host ${playerName} is leaving room "${roomName}" - closing room for all players`);
      
      // Notify all players that the room is being closed due to host leaving
      this.broadcastToRoom(roomId, {
        type: 'room_closed',
        roomId: roomId,
        reason: 'host_left',
        message: `Room closed because the host (${playerName}) left the game.`
      });
    }

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    player.roomId = undefined;

    // Stop game if it was active
    if (room.isGameActive) {
      const gameEngine = this.gameEngines.get(roomId);
      if (gameEngine) {
        gameEngine.stop();
        this.gameEngines.delete(roomId);
      }
      room.isGameActive = false;
      room.gameState.isActive = false;
    }

    // If host left or room is empty, delete the room
    if (isHost || room.players.length === 0) {
      this.rooms.delete(roomId);
      console.log(`🏠 Room "${roomName}" deleted (${isHost ? 'host left' : 'empty'})`);
    } else {
      // Notify remaining players about the updated room state
      this.broadcastToRoom(roomId, {
        type: 'room_updated',
        room
      });
    }

    console.log(`🏠 Player ${playerName} left room "${roomName}"`);
  }

  public setPlayerReady(playerId: string, roomId: string, isReady: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    player.isReady = isReady;

    // Broadcast updated room state
    this.broadcastToRoom(roomId, {
      type: 'room_updated',
      room
    });

    console.log(`🎮 Player ${player.name} is ${isReady ? 'ready' : 'not ready'} in room ${room.name}`);
  }

  public setPlayerColor(playerId: string, roomId: string, color: string): void {
    console.log(`🎨 setPlayerColor called: player=${playerId}, room=${roomId}, color=${color}`);
    
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      console.log(`❌ Player ${playerId} not found in room ${roomId}`);
      console.log(`📊 Current players in room:`, room.players.map(p => ({ id: p.id, name: p.name, color: p.color })));
      return;
    }

    // Check if color is available (not used by other players)
    const isColorTaken = room.players.some(p => p.id !== playerId && p.color === color);
    if (isColorTaken) {
      console.log(`❌ Color ${color} is already taken in room ${room.name}`);
      return;
    }

    // Check if color is valid
    if (!SNAKE_COLORS.includes(color as any)) {
      console.log(`❌ Invalid color ${color} requested by ${player.name}`);
      return;
    }

    const oldColor = player.color;
    player.color = color;

    // Broadcast updated room state
    this.broadcastToRoom(roomId, {
      type: 'room_updated',
      room
    });

    console.log(`🎨 Player ${player.name} changed color from ${oldColor} to ${color} in room ${room.name}`);
  }

  public startGameByHost(hostPlayerId: string, roomId: string): boolean {
    console.log(`🎮 startGameByHost called: host=${hostPlayerId}, room=${roomId}`);
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`❌ Room not found: ${roomId}`);
      return false;
    }
    if (room.isGameActive) {
      console.log(`❌ Game already active in room: ${roomId}`);
      return false;
    }

    // Verify the player is the host
    if (room.hostPlayerId !== hostPlayerId) {
      console.log(`❌ Player ${hostPlayerId} is not the host. Host is: ${room.hostPlayerId}`);
      return false;
    }

    // Verify minimum player count is met and at least one non-host player is ready
    const nonHostPlayers = room.players.filter(p => p.id !== room.hostPlayerId);
    console.log(`📊 Room stats: total players=${room.players.length}, non-host players=${nonHostPlayers.length}`);
    console.log(`📊 Non-host players ready status:`, nonHostPlayers.map(p => ({ name: p.name, ready: p.isReady })));
    
    const hasReadyPlayers = room.players.length >= 2 && nonHostPlayers.some(p => p.isReady);
    if (!hasReadyPlayers) {
      console.log(`❌ Not enough ready players. Need >=2 total and >=1 non-host ready`);
      return false;
    }

    console.log(`✅ All conditions met, starting game in room ${roomId}`);
    this.startGame(roomId);
    return true;
  }

  public handleGameInput(playerId: string, roomId: string, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): void {
    console.log(`🎮 handleGameInput: player=${playerId}, room=${roomId}, direction=${direction}`);
    
    const gameEngine = this.gameEngines.get(roomId);
    if (!gameEngine) {
      console.log(`❌ No game engine found for room ${roomId}`);
      return;
    }

    const directionMap = {
      'UP': { x: 0, y: -1 },
      'DOWN': { x: 0, y: 1 },
      'LEFT': { x: -1, y: 0 },
      'RIGHT': { x: 1, y: 0 }
    };

    console.log(`✅ Calling gameEngine.handlePlayerInput with direction:`, directionMap[direction]);
    gameEngine.handlePlayerInput(playerId, directionMap[direction]);
  }

  private startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || this.gameEngines.has(roomId)) return;

    console.log(`🎮 Starting game in room "${room.name}"`);

    const gameEngine = new MultiplayerGameEngine(
      room,
      (gameState) => {
        // Broadcast game state to all players in room
        this.broadcastToRoom(roomId, {
          type: 'game_state',
          roomId,
          gameState
        });
      },
      (winner, scores) => {
        // Game ended
        this.broadcastToRoom(roomId, {
          type: 'game_ended',
          roomId,
          winner,
          finalScores: scores || []
        });

        // Reset room state
        room.isGameActive = false;
        room.gameState.isActive = false;
        room.players.forEach(p => {
          p.isReady = false;
          p.isAlive = true;
        });

        this.gameEngines.delete(roomId);
        
        // Broadcast updated room state so clients know players are no longer ready
        this.broadcastToRoom(roomId, {
          type: 'room_updated',
          room
        });
        
        console.log(`🏁 Game ended in room ${roomId}, room state reset and broadcasted`);
      },
      (crosswordStateMessage) => {
        // Broadcast crossword state to all players in room
        this.broadcastToRoom(roomId, crosswordStateMessage);
      }
    );

    this.gameEngines.set(roomId, gameEngine);
    gameEngine.start();

    // Notify players that game started
    this.broadcastToRoom(roomId, {
      type: 'game_started',
      roomId
    });
  }

  public getRoomList(): GameRoomInfo[] {
    return Array.from(this.rooms.values())
      .filter(room => !room.isGameActive && !room.isPrivate) // Only show public, joinable rooms
      .map(room => ({
        id: room.id,
        name: room.name,
        code: room.code,
        gameMode: room.gameMode,
        hostPlayerName: this.players.get(room.hostPlayerId)?.name || 'Unknown',
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        isGameActive: room.isGameActive
      }));
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public getPlayerRoom(playerId: string): GameRoom | undefined {
    const player = this.players.get(playerId);
    if (!player?.roomId) return undefined;
    return this.rooms.get(player.roomId);
  }

  private broadcastToRoom(roomId: string, message: any): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Optimize the message object to reduce memory usage
    const optimizedMessage = optimizeObject(message);
    const messageStr = JSON.stringify(optimizedMessage);

    room.players.forEach(roomPlayer => {
      const player = this.players.get(roomPlayer.id);
      if (player && player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(messageStr);
        this.updatePlayerActivity(roomPlayer.id);
      }
    });
  }

  public broadcastToPlayer(playerId: string, message: any): void {
    const player = this.players.get(playerId);
    if (player && player.socket.readyState === WebSocket.OPEN) {
      // Optimize the message object to reduce memory usage
      const optimizedMessage = optimizeObject(message);
      player.socket.send(JSON.stringify(optimizedMessage));
      this.updatePlayerActivity(playerId);
    }
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }

  public dispose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clean up all game engines
    this.gameEngines.forEach(engine => {
      engine.stop();
    });
    this.gameEngines.clear();
    
    // Clear all rooms and players
    this.rooms.clear();
    this.players.clear();
  }
}