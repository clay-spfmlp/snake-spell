export interface ClientMessage {
  type: string;
  data?: any;
  timestamp: number;
}

export interface ServerMessage {
  type: string;
  data?: any;
  timestamp: number;
}

// Connection messages
export interface ConnectMessage extends ClientMessage {
  type: 'connect';
  data: {
    playerName: string;
  };
}

export interface DisconnectMessage extends ClientMessage {
  type: 'disconnect';
}

export interface ConnectedMessage extends ServerMessage {
  type: 'connected';
  data: {
    playerId: string;
    playerName: string;
  };
}

export interface PlayerJoinedMessage extends ServerMessage {
  type: 'player_joined';
  data: {
    playerId: string;
    playerName: string;
  };
}

export interface PlayerLeftMessage extends ServerMessage {
  type: 'player_left';
  data: {
    playerId: string;
  };
}

// Chat messages
export interface ChatMessage extends ClientMessage {
  type: 'chat';
  data: {
    message: string;
  };
}

export interface ChatBroadcastMessage extends ServerMessage {
  type: 'chat_broadcast';
  data: {
    playerId: string;
    playerName: string;
    message: string;
  };
}

export type ClientMessageTypes = 
  | ConnectMessage 
  | DisconnectMessage 
  | ChatMessage;

export type ServerMessageTypes = 
  | ConnectedMessage 
  | PlayerJoinedMessage 
  | PlayerLeftMessage 
  | ChatBroadcastMessage; 