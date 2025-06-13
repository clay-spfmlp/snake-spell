import '@testing-library/jest-dom'

// Mock WebSocket for tests
Object.defineProperty(global, 'WebSocket', {
  writable: true,
  value: class MockWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    
    constructor() {
      // Mock implementation
    }
    
    send() {}
    close() {}
    
    // Mock properties
    readyState = 1 // OPEN
    CONNECTING = 0
    OPEN = 1
    CLOSING = 2
    CLOSED = 3
    
    // Mock event handlers
    onopen: ((event: Event) => void) | null = null
    onclose: ((event: CloseEvent) => void) | null = null
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true }
  }
})

// Mock URL.createObjectURL
class MockURL {
  createObjectURL = () => 'mock-url';
  revokeObjectURL = () => {};
}

(global as any).URL = new MockURL(); 