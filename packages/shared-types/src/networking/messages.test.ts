import { describe, it, expect } from 'vitest'
import type { 
  ConnectMessage, 
  ConnectedMessage, 
  ChatMessage,
  ChatBroadcastMessage 
} from './messages'

describe('Message Types', () => {
  describe('ConnectMessage', () => {
    it('should have correct structure', () => {
      const message: ConnectMessage = {
        type: 'connect',
        data: {
          playerName: 'TestPlayer'
        },
        timestamp: Date.now()
      }

      expect(message.type).toBe('connect')
      expect(message.data.playerName).toBe('TestPlayer')
      expect(typeof message.timestamp).toBe('number')
    })
  })

  describe('ConnectedMessage', () => {
    it('should have correct structure', () => {
      const message: ConnectedMessage = {
        type: 'connected',
        data: {
          playerId: 'player-123',
          playerName: 'TestPlayer'
        },
        timestamp: Date.now()
      }

      expect(message.type).toBe('connected')
      expect(message.data.playerId).toBe('player-123')
      expect(message.data.playerName).toBe('TestPlayer')
    })
  })

  describe('ChatMessage', () => {
    it('should have correct structure', () => {
      const message: ChatMessage = {
        type: 'chat',
        data: {
          message: 'Hello, world!'
        },
        timestamp: Date.now()
      }

      expect(message.type).toBe('chat')
      expect(message.data.message).toBe('Hello, world!')
    })
  })

  describe('ChatBroadcastMessage', () => {
    it('should have correct structure', () => {
      const message: ChatBroadcastMessage = {
        type: 'chat_broadcast',
        data: {
          playerId: 'player-123',
          playerName: 'TestPlayer',
          message: 'Hello everyone!'
        },
        timestamp: Date.now()
      }

      expect(message.type).toBe('chat_broadcast')
      expect(message.data.playerId).toBe('player-123')
      expect(message.data.playerName).toBe('TestPlayer')
      expect(message.data.message).toBe('Hello everyone!')
    })
  })
}) 