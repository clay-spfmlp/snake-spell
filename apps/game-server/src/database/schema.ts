import { pgTable, text, integer, timestamp, boolean, jsonb, uuid, varchar, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Players table
export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  gamesPlayed: integer('games_played').default(0).notNull(),
  gamesWon: integer('games_won').default(0).notNull(),
  totalScore: integer('total_score').default(0).notNull(),
  highestScore: integer('highest_score').default(0).notNull(),
  totalWordsFormed: integer('total_words_formed').default(0).notNull(),
  longestWord: varchar('longest_word', { length: 50 }).default('').notNull(),
  favoriteGameMode: varchar('favorite_game_mode', { length: 50 }).default('classic').notNull(),
  totalPlayTime: integer('total_play_time').default(0).notNull(), // in seconds
  lettersCollected: integer('letters_collected').default(0).notNull(),
  averageWordLength: decimal('average_word_length', { precision: 4, scale: 2 }).default('0').notNull(),
  lastPlayed: timestamp('last_played'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Games table
export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  mode: varchar('mode', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('waiting').notNull(), // waiting, in_progress, finished, aborted
  playerCount: integer('player_count').default(0).notNull(),
  maxPlayers: integer('max_players').default(8).notNull(),
  duration: integer('duration'), // in seconds, null for unlimited
  settings: jsonb('settings'), // game mode specific settings
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Game participants
export const gameParticipants = pgTable('game_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  placement: integer('placement'), // 1st, 2nd, 3rd, etc.
  score: integer('score').default(0).notNull(),
  wordsFormed: jsonb('words_formed').$type<string[]>().default([]).notNull(),
  longestWord: varchar('longest_word', { length: 50 }).default('').notNull(),
  lettersCollected: integer('letters_collected').default(0).notNull(),
  playTime: integer('play_time').default(0).notNull(), // in seconds
  powerUpsUsed: jsonb('power_ups_used').$type<string[]>().default([]).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
});

// Achievements table
export const achievements = pgTable('achievements', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 10 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(),
  requirements: jsonb('requirements').notNull(),
  reward: jsonb('reward').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Player achievements
export const playerAchievements = pgTable('player_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  achievementId: varchar('achievement_id', { length: 100 }).references(() => achievements.id).notNull(),
  progress: decimal('progress', { precision: 3, scale: 2 }).default('0').notNull(), // 0.00 to 1.00
  unlockedAt: timestamp('unlocked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Leaderboards cache table (for performance)
export const leaderboards = pgTable('leaderboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(),
  period: varchar('period', { length: 20 }).notNull(), // daily, weekly, monthly, all_time
  data: jsonb('data').notNull(), // cached leaderboard entries
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

// Player sessions for tracking concurrent users
export const playerSessions = pgTable('player_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  sessionToken: varchar('session_token', { length: 255 }).notNull(),
  gameId: uuid('game_id').references(() => games.id),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, inactive, disconnected
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  lastHeartbeat: timestamp('last_heartbeat').defaultNow().notNull(),
  disconnectedAt: timestamp('disconnected_at'),
});

// Word submissions for validation and analytics
export const wordSubmissions = pgTable('word_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  gameId: uuid('game_id').references(() => games.id).notNull(),
  word: varchar('word', { length: 50 }).notNull(),
  letters: jsonb('letters').$type<string[]>().notNull(),
  isValid: boolean('is_valid').notNull(),
  score: integer('score').default(0).notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
});

// Relations
export const playersRelations = relations(players, ({ many }) => ({
  gameParticipants: many(gameParticipants),
  achievements: many(playerAchievements),
  sessions: many(playerSessions),
  wordSubmissions: many(wordSubmissions),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  participants: many(gameParticipants),
  sessions: many(playerSessions),
  wordSubmissions: many(wordSubmissions),
}));

export const gameParticipantsRelations = relations(gameParticipants, ({ one }) => ({
  game: one(games, {
    fields: [gameParticipants.gameId],
    references: [games.id],
  }),
  player: one(players, {
    fields: [gameParticipants.playerId],
    references: [players.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  playerAchievements: many(playerAchievements),
}));

export const playerAchievementsRelations = relations(playerAchievements, ({ one }) => ({
  player: one(players, {
    fields: [playerAchievements.playerId],
    references: [players.id],
  }),
  achievement: one(achievements, {
    fields: [playerAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const playerSessionsRelations = relations(playerSessions, ({ one }) => ({
  player: one(players, {
    fields: [playerSessions.playerId],
    references: [players.id],
  }),
  game: one(games, {
    fields: [playerSessions.gameId],
    references: [games.id],
  }),
}));

export const wordSubmissionsRelations = relations(wordSubmissions, ({ one }) => ({
  player: one(players, {
    fields: [wordSubmissions.playerId],
    references: [players.id],
  }),
  game: one(games, {
    fields: [wordSubmissions.gameId],
    references: [games.id],
  }),
})); 