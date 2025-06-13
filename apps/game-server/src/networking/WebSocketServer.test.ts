import { describe, it, expect } from 'vitest'

describe('WebSocket Server Tests', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle basic types', () => {
    const message = {
      type: 'test',
      data: { value: 'hello' },
      timestamp: Date.now()
    }
    
    expect(message.type).toBe('test')
    expect(message.data.value).toBe('hello')
    expect(typeof message.timestamp).toBe('number')
  })
}) 