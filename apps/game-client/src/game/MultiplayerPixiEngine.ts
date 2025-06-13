import * as PIXI from 'pixi.js';
import { 
  MultiplayerGameState,
  Snake,
  Food,
  LetterTile,
  GameConfig,
  DEFAULT_GAME_CONFIG
} from '@snake-word-arena/shared-types';
import { SnakeEntity } from './entities/SnakeEntity.js';
import { FoodEntity } from './entities/FoodEntity.js';

export interface MultiplayerGameEvents {
  onPlayerSnakeUpdate: (playerId: string, snake: Snake) => void;
}

export class MultiplayerPixiEngine {
  private app: PIXI.Application;
  private gameContainer: PIXI.Container;
  private snakeEntities: Map<string, SnakeEntity> = new Map();
  private foodEntities: Map<string, FoodEntity> = new Map();
  private config: GameConfig;
  private events: MultiplayerGameEvents;
  private currentPlayerId?: string;
  private isRunning: boolean = false;

  constructor(
    parentElement: HTMLElement,
    config: Partial<GameConfig> = {},
    events: MultiplayerGameEvents,
    playerId?: string
  ) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    this.events = events;
    this.currentPlayerId = playerId;
    
    // Initialize PixiJS application
    this.app = new PIXI.Application({
      width: this.config.canvasWidth,
      height: this.config.canvasHeight,
      backgroundColor: 0x2c3e50,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Add canvas to DOM
    parentElement.appendChild(this.app.view as HTMLCanvasElement);

    // Create game container
    this.gameContainer = new PIXI.Container();
    this.app.stage.addChild(this.gameContainer);

    console.log('🎮 Multiplayer PixiJS Engine initialized');
  }

  public start(): void {
    this.isRunning = true;
    console.log('🎮 Multiplayer game engine started');
  }

  public pause(): void {
    this.isRunning = false;
    console.log('⏸️ Multiplayer game engine paused');
  }

  public resume(): void {
    this.isRunning = true;
    console.log('▶️ Multiplayer game engine resumed');
  }

  public updateGameState(gameState: MultiplayerGameState): void {
    if (!this.isRunning) return;

    // Update snakes
    this.updateSnakes(gameState.snakes);
    
    // Update food from letter tiles
    this.updateFoodFromLetterTiles(gameState.letterTiles);
    
    // Update all entities
    this.updateEntities();
  }

  private updateSnakes(snakes: Snake[]): void {
    // If snakes array is null or empty, don't attempt any updates
    if (!snakes || snakes.length === 0) {
      return;
    }

    // Track which snakes are still active (alive)
    const activeSnakeIds = new Set(snakes.filter(s => s.isAlive).map(s => s.id));
    
    // Remove dead snakes from display after a short delay
    for (const [snakeId, snakeEntity] of this.snakeEntities) {
      const snake = snakes.find(s => s.id === snakeId);
      
      // If snake is no longer in the game at all, remove immediately
      if (!snake) {
        this.gameContainer.removeChild(snakeEntity.container);
        this.snakeEntities.delete(snakeId);
        continue;
      }
      
      // If snake is dead, remove it after a short delay to show death effect
      if (!snake.isAlive && !snakeEntity.isBeingRemoved) {
        console.log(`💀 Snake ${snakeId} died, removing from display in 2 seconds`);
        snakeEntity.isBeingRemoved = true;
        
        // Add death effect (fade out)
        snakeEntity.container.alpha = 0.5;
        
        setTimeout(() => {
          if (this.snakeEntities.has(snakeId)) {
            this.gameContainer.removeChild(snakeEntity.container);
            this.snakeEntities.delete(snakeId);
            console.log(`🗑️ Removed dead snake ${snakeId} from display`);
          }
        }, 2000); // Remove after 2 seconds
      }
    }

    // Update existing snakes and create new ones (only alive snakes)
    snakes.filter(s => s.isAlive).forEach(snake => {
      // Skip if snake data is invalid
      if (!snake || !snake.id) {
        console.warn("Received invalid snake data", snake);
        return;
      }
      
      let snakeEntity = this.snakeEntities.get(snake.id);
      
      if (!snakeEntity) {
        try {
          // Create new snake entity
          snakeEntity = new SnakeEntity(snake, this.config.gridSize);
          this.snakeEntities.set(snake.id, snakeEntity);
          this.gameContainer.addChild(snakeEntity.container);
          
          // Highlight current player's snake
          if (snake.playerId === this.currentPlayerId) {
            this.highlightPlayerSnake(snakeEntity);
          }
        } catch (error) {
          console.error(`Error creating snake entity for ${snake.id}:`, error);
        }
      } else {
        try {
          // Update existing snake data
          snakeEntity.updateFromServerState(snake);
        } catch (error) {
          console.error(`Error updating snake entity ${snake.id}:`, error);
        }
      }

      // Set alive/dead tint if entity exists
      if (snakeEntity) {
        try {
          snakeEntity.setAlive(snake.isAlive);
        } catch (error) {
          console.error(`Error setting alive state for snake ${snake.id}:`, error);
        }
      }

      // Trigger event for snake updates
      try {
        this.events.onPlayerSnakeUpdate(snake.playerId, snake);
      } catch (error) {
        console.error(`Error triggering player update event for ${snake.playerId}:`, error);
      }
    });
  }

  private updateFoodFromLetterTiles(letterTiles: LetterTile[]): void {
    // Convert letter tiles to food objects for rendering
    const foods: Food[] = letterTiles.map(tile => ({
      id: tile.id,
      position: tile.position,
      type: 'letter' as const,
      value: tile.letter,
      points: tile.points,
      color: '#e74c3c'
    }));

    this.updateFood(foods);
  }

  private updateFood(foods: Food[]): void {
    // Track which foods are still active
    const activeFoodIds = new Set(foods.map(f => f.id));
    
    // Remove foods that are no longer in the game
    for (const [foodId, foodEntity] of this.foodEntities) {
      if (!activeFoodIds.has(foodId)) {
        this.gameContainer.removeChild(foodEntity.container);
        this.foodEntities.delete(foodId);
      }
    }

    // Update existing foods and create new ones
    foods.forEach(food => {
      let foodEntity = this.foodEntities.get(food.id);
      
      if (!foodEntity) {
        // Create new food entity
        foodEntity = new FoodEntity(food, this.config.gridSize);
        this.foodEntities.set(food.id, foodEntity);
        this.gameContainer.addChild(foodEntity.container);
      }
      // Note: Food entities don't typically need updates since they're static
    });
  }

  private updateEntities(): void {
    // Update all snake entities
    this.snakeEntities.forEach(snake => snake.update());
    
    // Update all food entities (for animations)
    this.foodEntities.forEach(food => food.update());
  }

  private highlightPlayerSnake(snakeEntity: SnakeEntity): void {
    // Add visual highlighting for the player's snake
    // We'll implement this later with proper visual indicators
    console.log('🎯 Highlighting player snake');
  }

  public setCurrentPlayer(playerId: string): void {
    this.currentPlayerId = playerId;
    
    // Update highlighting for all snakes
    this.snakeEntities.forEach((snakeEntity, snakeId) => {
      const snake = Array.from(this.snakeEntities.values()).find(s => s.container === snakeEntity.container);
      if (snake) {
        snakeEntity.container.filters = [];
        // Re-highlight if this is the current player's snake
        // We'll need to track the playerId somehow - this is a simplification
      }
    });
  }

  public getPlayerSnake(playerId: string): Snake | null {
    for (const snakeEntity of this.snakeEntities.values()) {
      // We need a way to get the snake data from the entity
      // This would require extending SnakeEntity to expose the snake data
    }
    return null;
  }

  public destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
    console.log('🗑️ Multiplayer Game Engine Destroyed');
  }

  public getApp(): PIXI.Application {
    return this.app;
  }

  public getSnakeCount(): number {
    return this.snakeEntities.size;
  }

  public getFoodCount(): number {
    return this.foodEntities.size;
  }
} 