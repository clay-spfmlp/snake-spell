import { neon } from '@neondatabase/serverless';
import { logger, logError, logPerformance } from '../utils/logger.js';
import { PlayerStats, GameResult, LeaderboardEntry } from '@snake-word-arena/shared-types';

export class DatabaseService {
  private sql: any;
  private isConnected = false;

  constructor() {
    const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    
    if (!DATABASE_URL) {
      logger.warn('No database URL provided - running without persistence');
      return;
    }

    this.sql = neon(DATABASE_URL);
  }

  async initialize(): Promise<void> {
    try {
      if (!this.sql) {
        logger.info('Database service skipped - no database configured');
        return;
      }
      
      logger.info('Initializing database service...');
      await this.healthCheck();
      this.isConnected = true;
      logger.info('Database service initialized successfully');
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'initialize' });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.sql`SELECT 1`;
      return true;
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'healthCheck' });
      return false;
    }
  }

  // Player management
  async createPlayer(name: string, email?: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const result = await this.sql`
        INSERT INTO players (name, email)
        VALUES (${name}, ${email || null})
        RETURNING id
      `;
      
      logPerformance('createPlayer', startTime);
      logger.info('Player created', { playerId: result[0].id, name });
      
      return result[0].id;
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'createPlayer', name, email });
      throw error;
    }
  }

  async getPlayer(playerId: string): Promise<PlayerStats | null> {
    const startTime = Date.now();
    
    try {
      const result = await this.sql`
        SELECT 
          id as "playerId",
          name as "playerName",
          games_played as "gamesPlayed",
          games_won as "gamesWon",
          total_score as "totalScore",
          highest_score as "highestScore",
          total_words_formed as "totalWordsFormed",
          longest_word as "longestWord",
          favorite_game_mode as "favoriteGameMode",
          total_play_time as "totalPlayTime",
          letters_collected as "lettersCollected",
          CAST(average_word_length AS FLOAT) as "averageWordLength",
          CASE 
            WHEN games_played > 0 THEN CAST(games_won AS FLOAT) / games_played * 100
            ELSE 0 
          END as "winRate",
          CASE 
            WHEN games_played > 0 THEN CAST(total_score AS FLOAT) / games_played
            ELSE 0 
          END as "averageScore",
          EXTRACT(EPOCH FROM created_at) * 1000 as "createdAt",
          EXTRACT(EPOCH FROM last_played) * 1000 as "lastPlayed"
        FROM players 
        WHERE id = ${playerId}
      `;
      
      logPerformance('getPlayer', startTime);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'getPlayer', playerId });
      throw error;
    }
  }

  async updatePlayerStats(playerId: string, gameResult: Partial<GameResult>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.sql`
        UPDATE players SET
          games_played = games_played + 1,
          games_won = games_won + ${gameResult.placement === 1 ? 1 : 0},
          total_score = total_score + ${gameResult.score || 0},
          highest_score = GREATEST(highest_score, ${gameResult.score || 0}),
          total_words_formed = total_words_formed + ${gameResult.wordsFormed?.length || 0},
          longest_word = CASE 
            WHEN LENGTH(${gameResult.longestWord || ''}) > LENGTH(longest_word) 
            THEN ${gameResult.longestWord || ''}
            ELSE longest_word 
          END,
          letters_collected = letters_collected + ${gameResult.lettersCollected || 0},
          total_play_time = total_play_time + ${gameResult.playTime || 0},
          last_played = NOW(),
          updated_at = NOW()
        WHERE id = ${playerId}
      `;
      
      logPerformance('updatePlayerStats', startTime);
      logger.info('Player stats updated', { playerId, gameResult });
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'updatePlayerStats', playerId, gameResult });
      throw error;
    }
  }

  // Game management
  async createGame(mode: string, maxPlayers: number, settings?: any): Promise<string> {
    const startTime = Date.now();
    
    try {
      const result = await this.sql`
        INSERT INTO games (mode, max_players, settings, status)
        VALUES (${mode}, ${maxPlayers}, ${JSON.stringify(settings || {})}, 'waiting')
        RETURNING id
      `;
      
      logPerformance('createGame', startTime);
      logger.info('Game created', { gameId: result[0].id, mode, maxPlayers });
      
      return result[0].id;
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'createGame', mode, maxPlayers });
      throw error;
    }
  }

  async updateGameStatus(gameId: string, status: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.sql`
        UPDATE games SET 
          status = ${status},
          ${status === 'in_progress' ? this.sql`started_at = NOW(),` : this.sql``}
          ${status === 'finished' ? this.sql`finished_at = NOW(),` : this.sql``}
          updated_at = NOW()
        WHERE id = ${gameId}
      `;
      
      logPerformance('updateGameStatus', startTime);
      logger.info('Game status updated', { gameId, status });
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'updateGameStatus', gameId, status });
      throw error;
    }
  }

  async recordGameResult(gameId: string, playerId: string, result: GameResult): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.sql`
        INSERT INTO game_participants (
          game_id, player_id, placement, score, words_formed, 
          longest_word, letters_collected, play_time, power_ups_used
        )
        VALUES (
          ${gameId}, ${playerId}, ${result.placement}, ${result.score},
          ${JSON.stringify(result.wordsFormed)}, ${result.longestWord},
          ${result.lettersCollected}, ${result.playTime}, 
          ${JSON.stringify([])}
        )
      `;
      
      // Update player stats
      await this.updatePlayerStats(playerId, result);
      
      logPerformance('recordGameResult', startTime);
      logger.info('Game result recorded', { gameId, playerId, result });
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'recordGameResult', gameId, playerId });
      throw error;
    }
  }

  // Leaderboards
  async getLeaderboard(type: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    const startTime = Date.now();
    
    try {
      let query;
      
      switch (type) {
        case 'highest_score':
          query = this.sql`
            SELECT 
              ROW_NUMBER() OVER (ORDER BY highest_score DESC) as rank,
              id as "playerId",
              name as "playerName",
              highest_score as value,
              0 as change,
              'same' as trend
            FROM players 
            WHERE highest_score > 0
            ORDER BY highest_score DESC 
            LIMIT ${limit}
          `;
          break;
          
        case 'total_score':
          query = this.sql`
            SELECT 
              ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank,
              id as "playerId",
              name as "playerName", 
              total_score as value,
              0 as change,
              'same' as trend
            FROM players 
            WHERE total_score > 0
            ORDER BY total_score DESC 
            LIMIT ${limit}
          `;
          break;
          
        case 'words_formed':
          query = this.sql`
            SELECT 
              ROW_NUMBER() OVER (ORDER BY total_words_formed DESC) as rank,
              id as "playerId",
              name as "playerName",
              total_words_formed as value,
              0 as change,
              'same' as trend
            FROM players 
            WHERE total_words_formed > 0
            ORDER BY total_words_formed DESC 
            LIMIT ${limit}
          `;
          break;
          
        default:
          throw new Error(`Unknown leaderboard type: ${type}`);
      }
      
      const result = await query;
      
      logPerformance('getLeaderboard', startTime);
      
      return result;
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'getLeaderboard', type, limit });
      throw error;
    }
  }

  // Session management for concurrent players
  async createSession(playerId: string, sessionToken: string, ipAddress?: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.sql`
        INSERT INTO player_sessions (player_id, session_token, ip_address, status)
        VALUES (${playerId}, ${sessionToken}, ${ipAddress || null}, 'active')
        ON CONFLICT (session_token) DO UPDATE SET
          status = 'active',
          last_heartbeat = NOW()
      `;
      
      logPerformance('createSession', startTime);
      logger.info('Session created', { playerId, ipAddress });
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'createSession', playerId });
      throw error;
    }
  }

  async updateHeartbeat(sessionToken: string): Promise<void> {
    try {
      await this.sql`
        UPDATE player_sessions 
        SET last_heartbeat = NOW() 
        WHERE session_token = ${sessionToken} AND status = 'active'
      `;
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'updateHeartbeat', sessionToken });
      throw error;
    }
  }

  async closeSession(sessionToken: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.sql`
        UPDATE player_sessions 
        SET status = 'disconnected', disconnected_at = NOW()
        WHERE session_token = ${sessionToken}
      `;
      
      logPerformance('closeSession', startTime);
      logger.info('Session closed', { sessionToken });
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'closeSession', sessionToken });
      throw error;
    }
  }

  async getActiveSessions(): Promise<number> {
    try {
      const result = await this.sql`
        SELECT COUNT(*) as count 
        FROM player_sessions 
        WHERE status = 'active' 
        AND last_heartbeat > NOW() - INTERVAL '30 seconds'
      `;
      
      return parseInt(result[0].count);
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'getActiveSessions' });
      return 0;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up old sessions
      await this.sql`
        UPDATE player_sessions 
        SET status = 'disconnected', disconnected_at = NOW()
        WHERE status = 'active' 
        AND last_heartbeat < NOW() - INTERVAL '5 minutes'
      `;

      logger.info('Database cleanup completed');
    } catch (error) {
      logError(error as Error, { service: 'DatabaseService', method: 'cleanup' });
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService(); 