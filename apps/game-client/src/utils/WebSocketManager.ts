export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

export interface ConnectionEvent {
  type: 'connect' | 'disconnect' | 'error' | 'reconnect' | 'message';
  data?: any;
  error?: Error;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer?: number;
  private heartbeatTimer?: number;
  private listeners: Array<(event: ConnectionEvent) => void> = [];
  private messageQueue: any[] = [];
  private lastHeartbeat = 0;

  constructor(config: WebSocketConfig) {
    this.config = {
      maxReconnectAttempts: 5,
      reconnectInterval: 2000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      ...config
    };
  }

  public connect(): void {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);
    this.clearTimers();

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
      
      // Connection timeout
      setTimeout(() => {
        if (this.state === ConnectionState.CONNECTING) {
          this.handleError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);
      
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public disconnect(): void {
    this.clearTimers();
    this.setState(ConnectionState.DISCONNECTED);
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  public send(data: any): boolean {
    if (this.state === ConnectionState.CONNECTED && this.ws) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        this.messageQueue.push(data);
        return false;
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(data);
      return false;
    }
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  public addEventListener(listener: (event: ConnectionEvent) => void): void {
    this.listeners.push(listener);
  }

  public removeEventListener(listener: (event: ConnectionEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.emit({ type: 'connect' });
      console.log('WebSocket connected successfully');
    };

    this.ws.onclose = (event) => {
      this.clearTimers();
      
      if (event.code === 1000) {
        // Normal closure
        this.setState(ConnectionState.DISCONNECTED);
        this.emit({ type: 'disconnect', data: { code: event.code, reason: event.reason } });
      } else {
        // Unexpected closure
        this.handleDisconnection();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle heartbeat response
        if (data.type === 'pong') {
          this.lastHeartbeat = Date.now();
          return;
        }
        
        this.emit({ type: 'message', data });
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  private handleDisconnection(): void {
    this.setState(ConnectionState.DISCONNECTED);
    this.emit({ type: 'disconnect' });
    
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.setState(ConnectionState.ERROR);
      this.emit({ 
        type: 'error', 
        error: new Error(`Failed to reconnect after ${this.config.maxReconnectAttempts} attempts`) 
      });
    }
  }

  private handleError(error: Error): void {
    console.error('WebSocket manager error:', error);
    this.setState(ConnectionState.ERROR);
    this.emit({ type: 'error', error });
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Try to reconnect after error
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    this.setState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.emit({ type: 'reconnect', data: { attempt: this.reconnectAttempts } });
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.lastHeartbeat = Date.now();
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.state === ConnectionState.CONNECTED && this.ws) {
        // Check if we received a heartbeat response recently
        if (Date.now() - this.lastHeartbeat > this.config.heartbeatInterval * 2) {
          console.warn('Heartbeat timeout, connection may be lost');
          this.handleDisconnection();
          return;
        }
        
        // Send heartbeat
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
          this.handleDisconnection();
        }
      }
    }, this.config.heartbeatInterval);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.state === ConnectionState.CONNECTED) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      console.log(`WebSocket state changed: ${oldState} -> ${newState}`);
    }
  }

  private emit(event: ConnectionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in WebSocket listener:', error);
      }
    });
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  public destroy(): void {
    this.disconnect();
    this.listeners = [];
    this.messageQueue = [];
  }

  // Statistics and diagnostics
  public getStats(): {
    state: ConnectionState;
    reconnectAttempts: number;
    queuedMessages: number;
    lastHeartbeat: number;
    uptime: number;
  } {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.state === ConnectionState.CONNECTED ? Date.now() - this.lastHeartbeat : 0
    };
  }
} 