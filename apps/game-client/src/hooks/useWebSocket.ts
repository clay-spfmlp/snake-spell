import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ClientMessageTypes, 
  ServerMessageTypes,
  ConnectMessage,
  ChatMessage,
  DisconnectMessage
} from '@shared/networking/messages';

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: ServerMessageTypes) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<'Connecting' | 'Open' | 'Closed'>('Closed');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('Connecting');
    
    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setConnectionStatus('Open');
        onConnect?.();
        console.log('🔗 WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: ServerMessageTypes = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setConnectionStatus('Closed');
        onDisconnect?.();
        console.log('🔌 WebSocket disconnected');
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('Closed');
    }
  }, [url, onMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionStatus('Closed');
  }, []);

  const sendMessage = useCallback((message: ClientMessageTypes) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  // Specific message sending functions
  const connectPlayer = useCallback((playerName: string) => {
    const message: ConnectMessage = {
      type: 'connect',
      data: { playerName },
      timestamp: Date.now()
    };
    sendMessage(message);
  }, [sendMessage]);

  const sendChat = useCallback((message: string) => {
    const chatMessage: ChatMessage = {
      type: 'chat',
      data: { message },
      timestamp: Date.now()
    };
    sendMessage(chatMessage);
  }, [sendMessage]);

  const disconnectPlayer = useCallback(() => {
    const message: DisconnectMessage = {
      type: 'disconnect',
      timestamp: Date.now()
    };
    sendMessage(message);
  }, [sendMessage]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
    connectPlayer,
    sendChat,
    disconnectPlayer,
    isConnected: connectionStatus === 'Open'
  };
} 