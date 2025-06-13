import { create } from 'zustand';
import { Player } from '@shared/game/entities';

interface GameStore {
  // Connection state
  isConnected: boolean;
  connectionStatus: 'Connecting' | 'Open' | 'Closed';
  
  // Player state
  currentPlayer: Player | null;
  players: Player[];
  
  // Chat state
  chatMessages: Array<{
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
  }>;
  
  // Actions
  setConnectionStatus: (status: 'Connecting' | 'Open' | 'Closed') => void;
  setCurrentPlayer: (player: Player | null) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  addChatMessage: (playerId: string, playerName: string, message: string) => void;
  clearChat: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  isConnected: false,
  connectionStatus: 'Closed',
  currentPlayer: null,
  players: [],
  chatMessages: [],

  // Actions
  setConnectionStatus: (status) => set({ 
    connectionStatus: status,
    isConnected: status === 'Open' 
  }),

  setCurrentPlayer: (player) => set({ currentPlayer: player }),

  addPlayer: (player) => set((state) => ({
    players: [...state.players.filter(p => p.id !== player.id), player]
  })),

  removePlayer: (playerId) => set((state) => ({
    players: state.players.filter(p => p.id !== playerId)
  })),

  updatePlayer: (playerId, updates) => set((state) => ({
    players: state.players.map(p => 
      p.id === playerId ? { ...p, ...updates } : p
    )
  })),

  addChatMessage: (playerId, playerName, message) => set((state) => ({
    chatMessages: [...state.chatMessages, {
      id: `${playerId}-${Date.now()}`,
      playerId,
      playerName,
      message,
      timestamp: Date.now()
    }]
  })),

  clearChat: () => set({ chatMessages: [] }),

  reset: () => set({
    isConnected: false,
    connectionStatus: 'Closed',
    currentPlayer: null,
    players: [],
    chatMessages: []
  })
})); 