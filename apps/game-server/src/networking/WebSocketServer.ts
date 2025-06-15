import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'http';
import { 
  ClientMessageTypes, 
  ServerMessageTypes, 
  Player,
  ConnectedMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  ChatBroadcastMessage,
  PlayerColorMessage
} from '@snake-spell/shared-types';
import { 
  MultiplayerMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  CreateRoomMessage,
  RoomListMessage,
  PlayerReadyMessage,
  GameInputMessage,
  StartGameMessage
} from '@snake-spell/shared-types';
import { RoomManager } from '../game/RoomManager.js';

export interface ClientConnection {
  id: string;
  ws: WebSocket;
  player?: Player;
  isAlive: boolean;
}

export class GameWebSocketServer {
  private wss: WSServer;
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval!: NodeJS.Timeout;
  private memoryCleanupInterval!: NodeJS.Timeout;
  private roomManager: RoomManager;

  constructor(server: Server) {
    this.wss = new WSServer({ server });
    this.roomManager = new RoomManager();
    this.setupHeartbeat();
    this.setupMemoryCleanup();
    this.setupConnectionHandlers();
    
    console.log(`🚀 WebSocket server attached to HTTP server`);
  }

  private setupConnectionHandlers() {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      const client: ClientConnection = {
        id: clientId,
        ws,
        isAlive: true
      };

      this.clients.set(clientId, client);
      
      console.log(`👋 Client connected: ${clientId}`);

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Check if it's a multiplayer message or regular chat message
          if (this.isMultiplayerMessage(message)) {
            this.handleMultiplayerMessage(clientId, message as MultiplayerMessage);
          } else {
            this.handleMessage(clientId, message as ClientMessageTypes);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      // Handle heartbeat
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
        }
      });
    });
  }

  private handleMessage(clientId: string, message: ClientMessageTypes) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`📨 Message from ${clientId}:`, message.type);

    switch (message.type) {
      case 'connect':
        this.handleConnect(clientId, message.data.playerName);
        break;
      case 'chat':
        this.handleChat(clientId, message.data.message);
        break;
      case 'disconnect':
        this.handleDisconnect(clientId);
        break;
    }
  }

  private handleConnect(clientId: string, playerName: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const player: Player = {
      id: clientId,
      name: playerName,
      connected: true,
      joinedAt: Date.now()
    };

    client.player = player;

    // Register player with room manager
    this.roomManager.addPlayer(clientId, playerName, client.ws);

    // Send confirmation to the connecting client
    const connectedMessage: ConnectedMessage = {
      type: 'connected',
      data: {
        playerId: player.id,
        playerName: player.name
      },
      timestamp: Date.now()
    };
    this.sendToClient(clientId, connectedMessage);

    // Broadcast to all other clients
    const joinedMessage: PlayerJoinedMessage = {
      type: 'player_joined',
      data: {
        playerId: player.id,
        playerName: player.name
      },
      timestamp: Date.now()
    };
    this.broadcastToOthers(clientId, joinedMessage);

    console.log(`✅ Player connected: ${playerName} (${clientId})`);
  }

  private handleChat(clientId: string, message: string) {
    const client = this.clients.get(clientId);
    if (!client?.player) return;

    const chatMessage: ChatBroadcastMessage = {
      type: 'chat_broadcast',
      data: {
        playerId: client.player.id,
        playerName: client.player.name,
        message
      },
      timestamp: Date.now()
    };

    this.broadcastToAll(chatMessage);
    console.log(`💬 Chat from ${client.player.name}: ${message}`);
  }

  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from room manager
    this.roomManager.removePlayer(clientId);

    if (client.player) {
      const leftMessage: PlayerLeftMessage = {
        type: 'player_left',
        data: {
          playerId: client.player.id
        },
        timestamp: Date.now()
      };
      this.broadcastToOthers(clientId, leftMessage);
      console.log(`👋 Player disconnected: ${client.player.name} (${clientId})`);
    }

    this.clients.delete(clientId);
  }

  private isMultiplayerMessage(message: any): boolean {
    const multiplayerTypes = [
      'join_room', 'leave_room', 'create_room', 'room_list', 
      'player_ready', 'player_color', 'start_game', 'game_input'
    ];
    return multiplayerTypes.includes(message.type);
  }

  private handleMultiplayerMessage(clientId: string, message: MultiplayerMessage) {
    const client = this.clients.get(clientId);
    if (!client?.player) return;

    console.log(`🎮 Multiplayer message from ${clientId}:`, message.type);

    switch (message.type) {
      case 'create_room':
        this.handleCreateRoom(clientId, message);
        break;
      case 'join_room':
        this.handleJoinRoom(clientId, message);
        break;
      case 'leave_room':
        this.handleLeaveRoom(clientId, message);
        break;
      case 'room_list':
        this.handleRoomList(clientId);
        break;
      case 'player_ready':
        this.handlePlayerReady(clientId, message);
        break;
      case 'player_color':
        this.handlePlayerColor(clientId, message as PlayerColorMessage);
        break;
      case 'start_game':
        this.handleStartGame(clientId, message);
        break;
      case 'game_input':
        this.handleGameInput(clientId, message);
        break;
    }
  }

  private handleCreateRoom(clientId: string, message: CreateRoomMessage) {
    const room = this.roomManager.createRoom(
      message.roomName,
      message.gameMode,
      message.maxPlayers,
      clientId,
      message.isPrivate
    );

    if (room) {
      this.roomManager.broadcastToPlayer(clientId, {
        type: 'room_joined',
        room
      });
    }
  }

  private handleJoinRoom(clientId: string, message: JoinRoomMessage) {
    const room = this.roomManager.joinRoom(clientId, message.roomId);

    if (room) {
      this.roomManager.broadcastToPlayer(clientId, {
        type: 'room_joined',
        room
      });
    }
  }

  private handleLeaveRoom(clientId: string, message: LeaveRoomMessage) {
    this.roomManager.leaveRoom(clientId, message.roomId);
    
    this.roomManager.broadcastToPlayer(clientId, {
      type: 'room_left',
      roomId: message.roomId
    });
  }

  private handleRoomList(clientId: string) {
    const rooms = this.roomManager.getRoomList();
    
    this.roomManager.broadcastToPlayer(clientId, {
      type: 'room_list_response',
      rooms
    });
  }

  private handlePlayerReady(clientId: string, message: PlayerReadyMessage) {
    this.roomManager.setPlayerReady(clientId, message.roomId, message.isReady);
  }

  private handlePlayerColor(clientId: string, message: PlayerColorMessage) {
    console.log(`🎨 Color change request from ${clientId}: ${message.color} in room ${message.roomId}`);
    this.roomManager.setPlayerColor(clientId, message.roomId, message.color);
  }

  private handleStartGame(clientId: string, message: StartGameMessage) {
    console.log(`🎮 Start game request from ${clientId} for room ${message.roomId}`);
    const success = this.roomManager.startGameByHost(clientId, message.roomId);
    if (!success) {
      console.log(`❌ Failed to start game: ${clientId} tried to start game in room ${message.roomId}`);
      // Send error message back to client
      this.roomManager.broadcastToPlayer(clientId, {
        type: 'error',
        message: 'Failed to start game. Make sure you are the host and at least one player is ready.'
      });
    } else {
      console.log(`✅ Game started successfully in room ${message.roomId}`);
    }
  }

  private handleGameInput(clientId: string, message: GameInputMessage) {
    this.roomManager.handleGameInput(clientId, message.roomId, message.direction);
  }

  private sendToClient(clientId: string, message: ServerMessageTypes) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToAll(message: ServerMessageTypes) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  private broadcastToOthers(excludeClientId: string, message: ServerMessageTypes) {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.handleDisconnect(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Check every 30 seconds
  }

  private setupMemoryCleanup() {
    this.memoryCleanupInterval = setInterval(() => {
      // Get current memory usage
      const memUsage = process.memoryUsage();
      const memoryUsedMB = Math.round(memUsage.heapUsed / (1024 * 1024));
      const totalMemoryMB = Math.round(memUsage.heapTotal / (1024 * 1024));
      const percentage = (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2);
      
      // Log memory usage if it's above 70%
      if (memUsage.heapUsed / memUsage.heapTotal > 0.7) {
        console.warn(`High memory usage detected {
  "version": "0.1.0",
  "percentage": "${percentage}",
  "used": ${memoryUsedMB},
  "total": ${totalMemoryMB}
}`);
        
        // Force garbage collection if available
        if (global.gc) {
          try {
            global.gc();
            console.log('Forced garbage collection completed');
          } catch (e) {
            console.error('Error running manual garbage collection:', e);
          }
        }
      }
    }, 120000); // Run every 2 minutes
  }

  public getConnectedPlayers(): Player[] {
    return Array.from(this.clients.values())
      .filter(client => client.player)
      .map(client => client.player!);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public cleanup() {
    console.log('🧹 Running WebSocketServer cleanup...');
    
    // Force room manager to clean up
    this.roomManager.cleanupInactivePlayers?.();
    this.roomManager.cleanupEmptyRooms?.();
    
    // Close any dead connections
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.CLOSING || client.ws.readyState === WebSocket.CLOSED) {
        console.log(`🧹 Removing dead connection: ${clientId}`);
        this.handleDisconnect(clientId);
      }
    });
    
    console.log(`🧹 Cleanup complete. Active clients: ${this.clients.size}`);
    return { cleanedClients: this.clients.size };
  }

  public close() {
    clearInterval(this.heartbeatInterval);
    clearInterval(this.memoryCleanupInterval);
    this.wss.close();
  }
} 