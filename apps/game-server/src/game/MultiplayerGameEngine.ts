import { 
  GameRoom, 
  RoomPlayer, 
  MultiplayerGameState,
  Snake,
  SnakeSegment,
  Food,
  Position,
  Direction,
  DIRECTIONS,
  DEFAULT_GAME_CONFIG,
  GameConfig,
  GameBounds,
  PlayerWordInventory,
  LetterTile,
  CollectedLetter,
  WordValidationResult,
  getRandomClues,
  generateBoardLetters
} from '@snake-word-arena/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { LetterTileManager } from './LetterTileManager.js';
import { WordValidator } from './WordValidator.js';

export class MultiplayerGameEngine {
  private gameLoop: NodeJS.Timeout | null = null;
  private room: GameRoom;
  private bounds: GameBounds;
  private letterTileManager: LetterTileManager;
  private wordValidator: WordValidator;
  private playerInventories: Map<string, PlayerWordInventory> = new Map();
  private onGameStateUpdate: (gameState: MultiplayerGameState) => void;
  private onGameEnd: (winner?: string, scores?: Array<{ playerId: string; score: number; }>) => void;
  private onCrosswordStateUpdate: (crosswordState: any) => void;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 50; // 50ms (20 updates per second)

  constructor(
    room: GameRoom,
    onGameStateUpdate: (gameState: MultiplayerGameState) => void,
    onGameEnd: (winner?: string, scores?: Array<{ playerId: string; score: number; }>) => void,
    onCrosswordStateUpdate: (crosswordState: any) => void
  ) {
    this.room = room;
    this.onGameStateUpdate = onGameStateUpdate;
    this.onGameEnd = onGameEnd;
    this.onCrosswordStateUpdate = onCrosswordStateUpdate;
    
    this.bounds = {
      minX: 0,
      maxX: Math.floor(room.gameState.config.canvasWidth / room.gameState.config.gridSize),
      minY: 0,
      maxY: Math.floor(room.gameState.config.canvasHeight / room.gameState.config.gridSize)
    };

    console.log('🎮 MultiplayerGameEngine initialized with bounds:', this.bounds);
    console.log('🎮 Canvas size:', room.gameState.config.canvasWidth, 'x', room.gameState.config.canvasHeight);
    console.log('🎮 Grid size:', room.gameState.config.gridSize);
    console.log('🎮 Playable area: (0,0) to (' + (this.bounds.maxX-1) + ',' + (this.bounds.maxY-1) + ')');

    // Initialize letter tile manager and word validator
    this.letterTileManager = new LetterTileManager(this.bounds);
    this.wordValidator = new WordValidator();

    this.initializeGame();
  }

  private initializeGame(): void {
    // Initialize snakes for all players
    this.room.gameState.snakes = [];
    
    this.room.players.forEach((player, index) => {
      const startX = 5 + (index * 10); // Spread players apart
      const startY = Math.floor(this.bounds.maxY / 2);
      
      const snake: Snake = {
        id: `snake-${player.id}`,
        playerId: player.id,
        segments: [],
        direction: DIRECTIONS.RIGHT,
        color: player.color || '#4ECDC4', // Use player's selected color or default
        isAlive: true,
        score: 0
      };

      // Create initial segments
      for (let i = 0; i < this.room.gameState.config.initialSnakeLength; i++) {
        snake.segments.push({
          id: `segment-${i}`,
          position: { x: startX - i, y: startY }
        });
      }

      this.room.gameState.snakes.push(snake);
      player.snake = snake;

      // Initialize player word inventory
      const inventory: PlayerWordInventory = {
        playerId: player.id,
        collectedLetters: [],
        currentWordAttempt: [],
        completedWords: [],
        totalScore: 0
      };
      this.playerInventories.set(player.id, inventory);
    });

    // Initialize game state with letter tiles and inventories
    this.room.gameState.letterTiles = [];
    this.room.gameState.playerInventories = this.playerInventories;

    // Initialize crossword-specific state if needed
    if (this.room.gameMode === 'crossword_search') {
      this.initializeCrosswordGame();
    } else {
      // Classic mode - spawn initial letter tiles (3-5 tiles to start)
      for (let i = 0; i < 4; i++) {
        this.spawnLetterTile();
      }
    }
    
    this.room.gameState.isActive = true;
    this.room.isGameActive = true;
  }

  private initializeCrosswordGame(): void {
    console.log('🎯 initializeCrosswordGame() called');
    
    // Test getRandomClues function
    try {
      // Remove debug logging for test clues
      const testClues = getRandomClues(3);
    } catch (error) {
      console.error('❌ Error calling getRandomClues:', error);
    }
    
    // Get random clues for the game
    const clues = getRandomClues(10);
    // Only log important info
    console.log(`🎯 Initializing crossword game with ${clues.length} clues`);
    
    // Initialize crossword state
    if (!this.room.crosswordState) {
      this.room.crosswordState = {
        currentClues: [],
        playerProgress: new Map(),
        availableLetters: [],
        nextCorrectLetter: '',
        gameStats: {
          totalClues: 0,
          completedClues: 0,
          averageTime: 0
        }
      };
    }
    
    // Always set the clues (even if crosswordState already existed)
    this.room.crosswordState.currentClues = clues;
    this.room.crosswordState.gameStats.totalClues = clues.length;

    // Initialize each player's progress
    this.room.players.forEach(player => {
      this.room.crosswordState!.playerProgress.set(player.id, {
        currentClueIndex: 0,
        currentLetterIndex: 0,
        completedClues: 0,
        wrongLetterCount: 0
      });
    });

    // Generate initial letters based on first clue
    const firstClue = clues[0];
    if (!firstClue) {
      console.error('❌ No first clue found! Clues array:', clues);
      return;
    }
    
    const letters = generateBoardLetters(firstClue.answer, 0);
    this.room.crosswordState.availableLetters = letters;
    this.room.crosswordState.nextCorrectLetter = firstClue.answer[0];

    // Spawn letter tiles with the generated letters
    this.spawnCrosswordLetters(letters);
    
    // Immediately broadcast crossword state after initialization
    this.broadcastCrosswordState();
  }

  private spawnCrosswordLetters(letters: string[]): void {
    // Clear existing tiles
    this.room.gameState.letterTiles = [];
    
    // Spawn new tiles with the specified letters
    letters.forEach((letter, index) => {
      const availablePositions = this.getAvailablePositions();
      if (availablePositions.length > 0) {
        const position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
        
        const tile: LetterTile = {
          id: `tile-${Date.now()}-${index}`,
          letter,
          position,
          points: 1,
          rarity: 'common'
        };
        
        this.room.gameState.letterTiles.push(tile);
      }
    });
  }

  public start(): void {
    if (this.gameLoop) return;

    console.log(`🎮 Starting multiplayer game for room ${this.room.id}`);
    console.log(`🎮 Game mode: ${this.room.gameMode}`);
    console.log(`🎮 Has crossword state: ${!!this.room.crosswordState}`);
    
    // Send initial crossword state if in crossword mode
    if (this.room.gameMode === 'crossword_search' && this.room.crosswordState) {
      console.log('🎯 Sending initial crossword state...');
      this.broadcastCrosswordState();
    }
    
    this.gameLoop = setInterval(() => {
      this.updateGame();
    }, this.room.gameState.config.gameSpeed);
  }

  public stop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    
    this.room.gameState.isActive = false;
    this.room.isGameActive = false;
    
    console.log(`🛑 Stopped multiplayer game for room ${this.room.id}`);
  }

  public handlePlayerInput(playerId: string, direction: Direction): void {
    console.log(`🎮 MultiplayerGameEngine.handlePlayerInput: player=${playerId}, direction=`, direction);
    
    // Debug: Show all current snakes and their player IDs
    console.log(`🐍 Current snakes in game:`, this.room.gameState.snakes.map(s => ({ id: s.id, playerId: s.playerId, isAlive: s.isAlive })));
    
    // Debug: Show all players in room
    console.log(`👥 Current players in room:`, this.room.players.map(p => ({ id: p.id, name: p.name, isAlive: p.isAlive })));
    
    let snake = this.room.gameState.snakes.find(s => s.playerId === playerId);
    if (!snake) {
      console.log(`🐍 Snake not found for player ${playerId}, creating new snake for mid-game join`);
      
      // Find the player in the room
      const player = this.room.players.find(p => p.id === playerId);
      if (!player) {
        console.log(`❌ Player ${playerId} not found in room`);
        console.log(`🔍 Available players in room:`, this.room.players.map(p => `${p.name} (${p.id})`));
        return;
      }
      
      // Create a new snake for this player
      this.createSnakeForPlayer(playerId, player.name, player.color || '#4ECDC4');
      snake = this.room.gameState.snakes.find(s => s.playerId === playerId);
      
      if (!snake) {
        console.log(`❌ Failed to create snake for player ${playerId}`);
        return;
      }
    }
    
    if (!snake.isAlive) {
      console.log(`❌ Snake is dead for player ${playerId}`);
      return;
    }

    console.log(`🐍 Current snake direction:`, snake.direction);
    console.log(`🐍 Snake segments count:`, snake.segments.length);

    // Prevent 180-degree turns
    const current = snake.direction;
    if (
      (current.x !== 0 && direction.x === -current.x) ||
      (current.y !== 0 && direction.y === -current.y)
    ) {
      console.log(`❌ 180-degree turn prevented`);
      return;
    }

    console.log(`✅ Setting nextDirection to:`, direction);
    snake.nextDirection = direction;
  }

  private createSnakeForPlayer(playerId: string, playerName: string, color: string): void {
    console.log(`🐍 Creating snake for player ${playerName} (${playerId})`);
    
    // Find a safe spawn position
    const spawnPosition = this.findSafeSpawnPosition();
    if (!spawnPosition) {
      console.log(`❌ No safe spawn position found for player ${playerName}`);
      return;
    }

    // Create initial segments for the new snake
    const initialSegments: any[] = [];
    for (let i = 0; i < this.room.gameState.config.initialSnakeLength; i++) {
      initialSegments.push({
        id: `segment-${Date.now()}-${i}`,
        position: {
          x: spawnPosition.x - i,
          y: spawnPosition.y
        }
      });
    }

    // Create new snake
    const newSnake: Snake = {
      id: `snake-${playerId}`,
      playerId: playerId,
      segments: initialSegments,
      direction: { x: 1, y: 0 }, // Start moving right
      color: color,
      isAlive: true,
      score: 0
    };

    // Add snake to game state
    this.room.gameState.snakes.push(newSnake);

    // Initialize crossword progress for the new player
    if (this.room.crosswordState && this.room.gameMode === 'crossword_search') {
      this.room.crosswordState.playerProgress.set(playerId, {
        currentClueIndex: 0,
        currentLetterIndex: 0,
        completedClues: 0,
        wrongLetterCount: 0
      });
    }

    console.log(`✅ Created snake for player ${playerName} at position (${spawnPosition.x}, ${spawnPosition.y})`);
  }

  private updateGame(): void {
    if (!this.room.gameState.isActive) return;

    // Current timestamp
    const now = Date.now();
    
    this.room.gameState.gameTime += this.room.gameState.config.gameSpeed;

    // Move all snakes
    this.room.gameState.snakes.forEach(snake => {
      if (snake.isAlive) {
        this.moveSnake(snake);
      }
    });

    // Check collisions
    this.checkCollisions();

    // Check win condition
    this.checkWinCondition();

    // Only broadcast game state updates at the specified interval
    // This reduces network traffic and memory usage from frequent updates
    if (now - this.lastUpdateTime >= this.updateInterval) {
      this.lastUpdateTime = now;
      this.onGameStateUpdate(this.room.gameState);
    }
  }

  private moveSnake(snake: Snake): void {
    // Apply pending direction change
    if (snake.nextDirection) {
      snake.direction = snake.nextDirection;
      snake.nextDirection = undefined;
    }

    // Calculate new head position
    const head = snake.segments[0];
    const newHead = {
      id: `segment-${Date.now()}-${Math.random()}`,
      position: {
        x: head.position.x + snake.direction.x,
        y: head.position.y + snake.direction.y
      }
    };

    // Add new head
    snake.segments.unshift(newHead);

    // Check if snake collected a letter tile
    const tileIndex = this.room.gameState.letterTiles.findIndex(tile =>
      tile.position.x === newHead.position.x &&
      tile.position.y === newHead.position.y
    );

    if (tileIndex !== -1) {
      const tile = this.room.gameState.letterTiles[tileIndex];
      
      if (this.room.gameMode === 'crossword_search') {
        // Handle crossword search logic
        this.handleCrosswordLetterCollection(snake.playerId, tile);
      } else {
        // Classic mode - add letter to inventory
        const inventory = this.playerInventories.get(snake.playerId);
        if (inventory) {
          const collectedLetter: CollectedLetter = {
            letter: tile.letter,
            collectTime: Date.now(),
            fromTileId: tile.id,
            points: tile.points
          };
          inventory.collectedLetters.push(collectedLetter);
          inventory.currentWordAttempt.push(tile.letter);
        }
        
        // Remove tile and spawn new one
        this.room.gameState.letterTiles.splice(tileIndex, 1);
        this.letterTileManager.removeTile(tile.id);
        this.spawnLetterTile();
      }

      console.log(`📝 Player ${snake.playerId} collected letter '${tile.letter}'`);
    } else {
      // No letter collected - remove tail
      snake.segments.pop();
    }
  }

  private handleCrosswordLetterCollection(playerId: string, tile: LetterTile): void {
    if (!this.room.crosswordState) return;

    const playerProgress = this.room.crosswordState.playerProgress.get(playerId);
    if (!playerProgress) return;

    const currentClue = this.room.crosswordState.currentClues[playerProgress.currentClueIndex];
    if (!currentClue) return;

    const expectedLetter = currentClue.answer[playerProgress.currentLetterIndex];
    const isCorrect = tile.letter === expectedLetter;

    // Remove the collected tile
    const tileIndex = this.room.gameState.letterTiles.findIndex(t => t.id === tile.id);
    if (tileIndex !== -1) {
      this.room.gameState.letterTiles.splice(tileIndex, 1);
      this.letterTileManager.removeTile(tile.id);
    }

    if (isCorrect) {
      // Correct letter - advance progress
      playerProgress.currentLetterIndex++;
      
      // Check if word is complete
      if (playerProgress.currentLetterIndex >= currentClue.answer.length) {
        // Word completed!
        playerProgress.completedClues++;
        playerProgress.currentClueIndex++;
        playerProgress.currentLetterIndex = 0;
        
        // Check if all clues completed
        if (playerProgress.currentClueIndex >= this.room.crosswordState.currentClues.length) {
          // Player completed all clues!
          this.handlePlayerWin(playerId);
          return;
        }
        
        // Move to next clue - generate new letters
        const nextClue = this.room.crosswordState.currentClues[playerProgress.currentClueIndex];
        const newLetters = generateBoardLetters(nextClue.answer, 0);
        this.room.crosswordState.availableLetters = newLetters;
        this.room.crosswordState.nextCorrectLetter = nextClue.answer[0]; // Update next correct letter
        this.spawnCrosswordLetters(newLetters);
      } else {
        // Continue with current word - scramble letters
        const newLetters = generateBoardLetters(currentClue.answer, playerProgress.currentLetterIndex);
        this.room.crosswordState.availableLetters = newLetters;
        this.room.crosswordState.nextCorrectLetter = currentClue.answer[playerProgress.currentLetterIndex]; // Update next correct letter
        this.spawnCrosswordLetters(newLetters);
      }
    } else {
      // Wrong letter - shrink snake
      playerProgress.wrongLetterCount++;
      this.shrinkSnake(playerId);
      
      // Respawn the same letters (don't change the puzzle)
      this.spawnCrosswordLetters(this.room.crosswordState.availableLetters);
    }

    // Broadcast crossword state update
    this.broadcastCrosswordState();
  }

  private shrinkSnake(playerId: string): void {
    const snake = this.room.gameState.snakes.find(s => s.playerId === playerId);
    if (!snake) {
      console.log(`❌ shrinkSnake: Snake not found for player ${playerId}`);
      return;
    }

    console.log(`🔄 shrinkSnake: Player ${playerId} snake has ${snake.segments.length} segments before shrinking`);

    // If snake has only 2 segments (head + tail), player dies
    if (snake.segments.length <= 2) {
      console.log(`💀 shrinkSnake: Player ${playerId} dies - snake too short (${snake.segments.length} segments)`);
      snake.isAlive = false;
      const player = this.room.players.find(p => p.id === playerId);
      if (player) {
        player.isAlive = false;
        console.log(`💀 shrinkSnake: Player ${player.name} marked as dead in room players`);
      }
      return;
    }
    
    // Remove exactly 1 tail segment
    snake.segments.pop();
    console.log(`🔄 shrinkSnake: Player ${playerId} snake now has ${snake.segments.length} segments after shrinking`);
  }

  private handlePlayerWin(playerId: string): void {
    const player = this.room.players.find(p => p.id === playerId);
    if (!player) return;

    console.log(`🎉 Player ${player.name} completed all crossword clues!`);
    
    // End the game with this player as winner
    const scores = this.room.players.map(p => {
      const progress = this.room.crosswordState?.playerProgress.get(p.id);
      return {
        playerId: p.id,
        score: progress?.completedClues || 0
      };
    });

    this.onGameEnd(player.name, scores);
  }

  private broadcastCrosswordState(): void {
    if (!this.room.crosswordState) return;

    // Convert Map to object for JSON serialization
    const playerProgressObj: any = {};
    this.room.crosswordState.playerProgress.forEach((progress, playerId) => {
      playerProgressObj[playerId] = progress;
    });

    const crosswordStateMessage = {
      type: 'crossword_state',
      roomId: this.room.id,
      crosswordState: {
        currentClues: [...this.room.crosswordState.currentClues], // Force array copy
        playerProgress: playerProgressObj,
        availableLetters: [...this.room.crosswordState.availableLetters], // Force array copy
        nextCorrectLetter: this.room.crosswordState.nextCorrectLetter,
        gameStats: { ...this.room.crosswordState.gameStats } // Force object copy
      }
    };

    // Send crossword state to all players using the callback
    this.onCrosswordStateUpdate(crosswordStateMessage);
  }

  private checkCollisions(): void {
    this.room.gameState.snakes.forEach(snake => {
      if (!snake.isAlive) return;

      const head = snake.segments[0];

      // Check wall collision
      if (this.checkWallCollision(head.position)) {
        console.log(`💥 WALL COLLISION! Player ${snake.playerId} hit wall at (${head.position.x}, ${head.position.y})`);
        console.log(`   Bounds: minX=${this.bounds.minX}, maxX=${this.bounds.maxX}, minY=${this.bounds.minY}, maxY=${this.bounds.maxY}`);
        snake.isAlive = false;
        const player = this.room.players.find(p => p.id === snake.playerId);
        if (player) {
          player.isAlive = false;
          console.log(`💀 COLLISION: Player ${player.name} marked as dead due to wall collision`);
        }
        return;
      }

      // Check self collision
      for (let i = 1; i < snake.segments.length; i++) {
        if (
          head.position.x === snake.segments[i].position.x &&
          head.position.y === snake.segments[i].position.y
        ) {
          console.log(`💥 SELF COLLISION! Player ${snake.playerId} hit themselves`);
          snake.isAlive = false;
          const player = this.room.players.find(p => p.id === snake.playerId);
          if (player) {
            player.isAlive = false;
            console.log(`💀 COLLISION: Player ${player.name} marked as dead due to self collision`);
          }
          return;
        }
      }

      // Check collision with other snakes
      this.room.gameState.snakes.forEach(otherSnake => {
        if (otherSnake.id === snake.id || !otherSnake.isAlive) return;

        otherSnake.segments.forEach(segment => {
          if (
            head.position.x === segment.position.x &&
            head.position.y === segment.position.y
          ) {
            console.log(`💥 SNAKE COLLISION! Player ${snake.playerId} hit player ${otherSnake.playerId}`);
            snake.isAlive = false;
            const player = this.room.players.find(p => p.id === snake.playerId);
            if (player) {
              player.isAlive = false;
              console.log(`💀 COLLISION: Player ${player.name} marked as dead due to snake collision`);
            }
          }
        });
      });
    });
  }

  private checkWallCollision(position: Position): boolean {
    const collision = (
      position.x < this.bounds.minX ||
      position.x >= this.bounds.maxX ||
      position.y < this.bounds.minY ||
      position.y >= this.bounds.maxY
    );
    
    if (collision) {
      console.log(`🔍 Wall collision detected: position (${position.x}, ${position.y}) vs bounds (${this.bounds.minX}-${this.bounds.maxX-1}, ${this.bounds.minY}-${this.bounds.maxY-1})`);
    }
    
    return collision;
  }

  private checkWinCondition(): void {
    // In crossword mode, end game when all players are dead or when all clues are completed
    if (this.room.gameMode === 'crossword_search') {
      // Check if all players are dead
      const allPlayersDead = this.room.players.every(p => !p.isAlive);
      
      if (allPlayersDead) {
        console.log('🏁 All players are dead - ending game');
        this.stop();
        
        // Find player with highest score
        const scores = this.room.players.map(p => {
          const progress = this.room.crosswordState?.playerProgress.get(p.id);
          return {
            playerId: p.id,
            score: progress?.completedClues || 0
          };
        });
        
        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);
        
        // Get winner name (if there's a tie, first player in the list wins)
        const winnerPlayer = scores.length > 0 ? 
          this.room.players.find(p => p.id === scores[0].playerId) : undefined;
          
        this.onGameEnd(winnerPlayer?.name, scores);
      }
      
      return;
    }
    
    // Classic mode - end game when only one snake remains
    const aliveSnakes = this.room.gameState.snakes.filter(s => s.isAlive);
    
    if (aliveSnakes.length <= 1) {
      this.stop();
      
      const winner = aliveSnakes.length === 1 ? aliveSnakes[0].playerId : undefined;
      const scores = this.room.gameState.snakes.map(snake => ({
        playerId: snake.playerId,
        score: snake.score
      }));

      this.onGameEnd(winner, scores);
    }
  }

  private spawnLetterTile(): void {
    // Get all current snake positions to avoid spawning on snakes
    const snakePositions: Position[] = [];
    this.room.gameState.snakes.forEach(snake => {
      snake.segments.forEach(segment => {
        snakePositions.push(segment.position);
      });
    });

    const tile = this.letterTileManager.spawnLetterTile(snakePositions);
    if (tile) {
      this.room.gameState.letterTiles.push(tile);
    }
  }

  private getAvailablePositions(): Position[] {
    const occupiedPositions = new Set<string>();

    // Add snake positions
    this.room.gameState.snakes.forEach(snake => {
      snake.segments.forEach(segment => {
        occupiedPositions.add(`${segment.position.x},${segment.position.y}`);
      });
    });

    // Add food positions
    this.room.gameState.foods.forEach(food => {
      occupiedPositions.add(`${food.position.x},${food.position.y}`);
    });

    const available: Position[] = [];
    for (let x = this.bounds.minX; x < this.bounds.maxX; x++) {
      for (let y = this.bounds.minY; y < this.bounds.maxY; y++) {
        if (!occupiedPositions.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    return available;
  }

  private getRandomLetter(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
  }

  public submitWord(playerId: string, letters: string[]): WordValidationResult {
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) {
      return {
        isValid: false,
        word: letters.join(''),
        basePoints: 0,
        bonusPoints: 0,
        totalPoints: 0,
        reason: 'Player inventory not found'
      };
    }

    // Validate that player has all the letters
    const playerLetters = inventory.collectedLetters.map(l => l.letter);
    const wordLetters = [...letters];
    
    for (const letter of wordLetters) {
      const letterIndex = playerLetters.indexOf(letter);
      if (letterIndex === -1) {
        return {
          isValid: false,
          word: letters.join(''),
          basePoints: 0,
          bonusPoints: 0,
          totalPoints: 0,
          reason: `Player doesn't have letter '${letter}'`
        };
      }
      playerLetters.splice(letterIndex, 1); // Remove used letter
    }

    // Create CollectedLetter objects for validation
    const collectedLettersForWord: CollectedLetter[] = [];
    const remainingLetters = [...inventory.collectedLetters];
    
    for (const letter of letters) {
      const letterIndex = remainingLetters.findIndex(l => l.letter === letter);
      if (letterIndex !== -1) {
        collectedLettersForWord.push(remainingLetters[letterIndex]);
        remainingLetters.splice(letterIndex, 1);
      }
    }

    // Validate word
    const result = this.wordValidator.validateWord(collectedLettersForWord);

    if (result.isValid) {
      // Update player inventory
      inventory.collectedLetters = remainingLetters;
      inventory.currentWordAttempt = [];
      inventory.completedWords.push({
        word: result.word,
        letters: collectedLettersForWord,
        points: result.totalPoints,
        timestamp: Date.now(),
        isValid: true,
        bonusMultiplier: 1
      });
      inventory.totalScore += result.totalPoints;

      // Update snake score
      const snake = this.room.gameState.snakes.find(s => s.playerId === playerId);
      if (snake) {
        snake.score += result.totalPoints;
      }

      console.log(`✅ Player ${playerId} formed word '${result.word}' for ${result.totalPoints} points`);
    } else {
      console.log(`❌ Player ${playerId} failed to form word '${result.word}': ${result.reason}`);
    }

    return result;
  }

  public clearPlayerLetters(playerId: string): void {
    const inventory = this.playerInventories.get(playerId);
    if (inventory) {
      inventory.currentWordAttempt = [];
      console.log(`🗑️ Player ${playerId} cleared their letter attempt`);
    }
  }

  public getPlayerInventory(playerId: string): PlayerWordInventory | undefined {
    return this.playerInventories.get(playerId);
  }

  public getGameState(): MultiplayerGameState {
    return this.room.gameState;
  }

  public addPlayerToActiveGame(playerId: string, playerName: string, color: string): void {
    console.log(`🐍 Adding player ${playerName} (${playerId}) to active game`);
    
    // Check if player already has a snake
    const existingSnake = this.room.gameState.snakes.find(s => s.playerId === playerId);
    if (existingSnake) {
      console.log(`⚠️ Player ${playerName} already has a snake in the game`);
      return;
    }

    // Find a safe spawn position
    const spawnPosition = this.findSafeSpawnPosition();
    if (!spawnPosition) {
      console.log(`❌ No safe spawn position found for player ${playerName}`);
      return;
    }

    // Create initial segments for the new snake
    const initialSegments: SnakeSegment[] = [];
    for (let i = 0; i < this.room.gameState.config.initialSnakeLength; i++) {
      initialSegments.push({
        id: `segment-${Date.now()}-${i}`,
        position: {
          x: spawnPosition.x - i,
          y: spawnPosition.y
        }
      });
    }

    // Create new snake
    const newSnake: Snake = {
      id: `snake-${playerId}`,
      playerId: playerId,
      segments: initialSegments,
      direction: { x: 1, y: 0 }, // Start moving right
      color: color,
      isAlive: true,
      score: 0
    };

    // Add snake to game state
    this.room.gameState.snakes.push(newSnake);

    // Initialize crossword progress for the new player
    if (this.room.crosswordState && this.room.gameMode === 'crossword_search') {
      this.room.crosswordState.playerProgress.set(playerId, {
        currentClueIndex: 0,
        currentLetterIndex: 0,
        completedClues: 0,
        wrongLetterCount: 0
      });
    }

    console.log(`✅ Added snake for player ${playerName} at position (${spawnPosition.x}, ${spawnPosition.y})`);
  }

  public updatePlayerIdForReconnection(oldPlayerId: string, newPlayerId: string): void {
    console.log(`🔄 Updating player ID for reconnection: ${oldPlayerId} -> ${newPlayerId}`);
    
    // Update snake player ID
    const snake = this.room.gameState.snakes.find(s => s.playerId === oldPlayerId);
    if (snake) {
      snake.playerId = newPlayerId;
      snake.id = `snake-${newPlayerId}`; // Update snake ID as well
      console.log(`✅ Updated snake player ID: ${oldPlayerId} -> ${newPlayerId}`);
    } else {
      console.log(`⚠️ No snake found for old player ID: ${oldPlayerId}`);
    }
    
    // Update crossword progress if it exists
    if (this.room.crosswordState && this.room.gameMode === 'crossword_search') {
      const progress = this.room.crosswordState.playerProgress.get(oldPlayerId);
      if (progress) {
        this.room.crosswordState.playerProgress.delete(oldPlayerId);
        this.room.crosswordState.playerProgress.set(newPlayerId, progress);
        console.log(`✅ Updated crossword progress: ${oldPlayerId} -> ${newPlayerId}`);
      }
    }
    
    // Update player inventory if it exists
    const inventory = this.playerInventories.get(oldPlayerId);
    if (inventory) {
      inventory.playerId = newPlayerId;
      this.playerInventories.delete(oldPlayerId);
      this.playerInventories.set(newPlayerId, inventory);
      console.log(`✅ Updated player inventory: ${oldPlayerId} -> ${newPlayerId}`);
    }
    
    console.log(`🔄 Player ID update complete: ${oldPlayerId} -> ${newPlayerId}`);
  }

  private findSafeSpawnPosition(): Position | null {
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.floor(Math.random() * (this.bounds.maxX - this.bounds.minX - 5)) + this.bounds.minX + 2;
      const y = Math.floor(Math.random() * (this.bounds.maxY - this.bounds.minY - 5)) + this.bounds.minY + 2;
      
      const position = { x, y };
      
      // Check if position is safe (not occupied by other snakes or food)
      const isSafe = this.isPositionSafe(position);
      if (isSafe) {
        return position;
      }
    }
    
    console.log(`❌ Could not find safe spawn position after ${maxAttempts} attempts`);
    return null;
  }

  private isPositionSafe(position: Position): boolean {
    // Check against all snake segments
    for (const snake of this.room.gameState.snakes) {
      for (const segment of snake.segments) {
        if (segment.position.x === position.x && segment.position.y === position.y) {
          return false;
        }
      }
    }
    
    // Check against food/letter tiles
    for (const tile of this.room.gameState.letterTiles) {
      if (tile.position.x === position.x && tile.position.y === position.y) {
        return false;
      }
    }
    
    return true;
  }
} 