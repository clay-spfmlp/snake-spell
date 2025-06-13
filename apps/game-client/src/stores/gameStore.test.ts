import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import type { Player } from '@shared/game/entities'

describe('GameStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.getState().reset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useGameStore.getState()
      
      expect(state.isConnected).toBe(false)
      expect(state.connectionStatus).toBe('Closed')
      expect(state.currentPlayer).toBeNull()
      expect(state.players).toEqual([])
      expect(state.chatMessages).toEqual([])
    })
  })

  describe('Connection Management', () => {
    it('should update connection status', () => {
      const { setConnectionStatus } = useGameStore.getState()
      
      setConnectionStatus('Connecting')
      expect(useGameStore.getState().connectionStatus).toBe('Connecting')
      expect(useGameStore.getState().isConnected).toBe(false)
      
      setConnectionStatus('Open')
      expect(useGameStore.getState().connectionStatus).toBe('Open')
      expect(useGameStore.getState().isConnected).toBe(true)
    })

    it('should set current player', () => {
      const { setCurrentPlayer } = useGameStore.getState()
      const player: Player = {
        id: 'player-1',
        name: 'TestPlayer',
        connected: true,
        joinedAt: Date.now()
      }
      
      setCurrentPlayer(player)
      expect(useGameStore.getState().currentPlayer).toEqual(player)
    })
  })

  describe('Player Management', () => {
    it('should add players', () => {
      const { addPlayer } = useGameStore.getState()
      const player: Player = {
        id: 'player-1',
        name: 'TestPlayer',
        connected: true,
        joinedAt: Date.now()
      }
      
      addPlayer(player)
      expect(useGameStore.getState().players).toContain(player)
      expect(useGameStore.getState().players).toHaveLength(1)
    })

    it('should remove players', () => {
      const { addPlayer, removePlayer } = useGameStore.getState()
      const player: Player = {
        id: 'player-1',
        name: 'TestPlayer',
        connected: true,
        joinedAt: Date.now()
      }
      
      addPlayer(player)
      expect(useGameStore.getState().players).toHaveLength(1)
      
      removePlayer('player-1')
      expect(useGameStore.getState().players).toHaveLength(0)
    })

    it('should update existing player instead of duplicating', () => {
      const { addPlayer } = useGameStore.getState()
      const player1: Player = {
        id: 'player-1',
        name: 'TestPlayer',
        connected: true,
        joinedAt: Date.now()
      }
      const player1Updated: Player = {
        id: 'player-1',
        name: 'UpdatedPlayer',
        connected: false,
        joinedAt: Date.now()
      }
      
      addPlayer(player1)
      addPlayer(player1Updated)
      
      const players = useGameStore.getState().players
      expect(players).toHaveLength(1)
      expect(players[0].name).toBe('UpdatedPlayer')
      expect(players[0].connected).toBe(false)
    })
  })

  describe('Chat Management', () => {
    it('should add chat messages', () => {
      const { addChatMessage } = useGameStore.getState()
      
      addChatMessage('player-1', 'TestPlayer', 'Hello world!')
      
      const messages = useGameStore.getState().chatMessages
      expect(messages).toHaveLength(1)
      expect(messages[0].playerId).toBe('player-1')
      expect(messages[0].playerName).toBe('TestPlayer')
      expect(messages[0].message).toBe('Hello world!')
      expect(typeof messages[0].id).toBe('string')
      expect(typeof messages[0].timestamp).toBe('number')
    })

    it('should clear chat messages', () => {
      const { addChatMessage, clearChat } = useGameStore.getState()
      
      addChatMessage('player-1', 'TestPlayer', 'Hello!')
      addChatMessage('player-2', 'TestPlayer2', 'Hi there!')
      
      expect(useGameStore.getState().chatMessages).toHaveLength(2)
      
      clearChat()
      expect(useGameStore.getState().chatMessages).toHaveLength(0)
    })
  })

  describe('Reset Functionality', () => {
    it('should reset all state to initial values', () => {
      const { 
        setConnectionStatus, 
        setCurrentPlayer, 
        addPlayer, 
        addChatMessage, 
        reset 
      } = useGameStore.getState()
      
      // Modify state
      setConnectionStatus('Open')
      setCurrentPlayer({ id: 'player-1', name: 'Test', connected: true, joinedAt: Date.now() })
      addPlayer({ id: 'player-2', name: 'Test2', connected: true, joinedAt: Date.now() })
      addChatMessage('player-1', 'Test', 'Hello!')
      
      // Verify state is modified
      const stateBeforeReset = useGameStore.getState()
      expect(stateBeforeReset.isConnected).toBe(true)
      expect(stateBeforeReset.currentPlayer).not.toBeNull()
      expect(stateBeforeReset.players).toHaveLength(1)
      expect(stateBeforeReset.chatMessages).toHaveLength(1)
      
      // Reset and verify
      reset()
      const stateAfterReset = useGameStore.getState()
      expect(stateAfterReset.isConnected).toBe(false)
      expect(stateAfterReset.connectionStatus).toBe('Closed')
      expect(stateAfterReset.currentPlayer).toBeNull()
      expect(stateAfterReset.players).toEqual([])
      expect(stateAfterReset.chatMessages).toEqual([])
    })
  })
}) 