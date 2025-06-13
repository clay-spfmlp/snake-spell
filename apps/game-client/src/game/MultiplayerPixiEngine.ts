import * as PIXI from 'pixi.js';
import { 
  MultiplayerGameState,
  Snake,
  LetterTile,
  GameConfig,
  DEFAULT_GAME_CONFIG
} from '@snake-word-arena/shared-types';
import { SnakeEntity } from './entities/SnakeEntity.js';
import { FoodEntity } from './entities/FoodEntity.js';
import { LetterTileEntity } from './entities/LetterTileEntity.js';

export interface MultiplayerGameEvents {
  onPlayerSnakeUpdate: (playerId: string, snake: Snake) => void;
}

export class MultiplayerPixiEngine {
  private app: PIXI.Application;
  private gameContainer: PIXI.Container;
  private snakeEntities: Map<string, SnakeEntity> = new Map();
  private foodEntities: Map<string, FoodEntity> = new Map();
  private letterTileEntities: Map<string, LetterTileEntity> = new Map();
  private config: GameConfig;

  constructor(
    parentElement: HTMLElement,
    config: Partial<GameConfig> = {}
  ) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    
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
    console.log('🎮 Multiplayer game engine started');
  }

  public pause(): void {
    console.log('⏸️ Multiplayer game engine paused');
  }

  public resume(): void {
    console.log('▶️ Multiplayer game engine resumed');
  }

  public updateGameState(newGameState: MultiplayerGameState) {
    console.log('🎮 MultiplayerPixiEngine updating game state:', newGameState);
    
    // Update snakes
    this.updateSnakes(newGameState.snakes);
    
    // Update letter tiles
    this.updateLetterTiles(newGameState.letterTiles);
    
    // Update food items
    this.updateFood(newGameState.foods || []);
  }

  private updateSnakes(snakes: Snake[]) {
    console.log('🐍 Updating snakes:', snakes.length);
    
    // Remove snakes that no longer exist
    for (const [snakeId, snakeEntity] of this.snakeEntities) {
      if (!snakes.find(s => s.id === snakeId)) {
        console.log(`🗑️ Removing snake ${snakeId}`);
        this.gameContainer.removeChild(snakeEntity.container);
        this.snakeEntities.delete(snakeId);
      }
    }
    
    // Update existing snakes and create new ones
    for (const snake of snakes) {
      let snakeEntity = this.snakeEntities.get(snake.id);
      
      if (!snakeEntity) {
        console.log(`🆕 Creating new snake entity for ${snake.id}`);
        snakeEntity = new SnakeEntity(snake, this.config.gridSize);
        this.gameContainer.addChild(snakeEntity.container);
        this.snakeEntities.set(snake.id, snakeEntity);
      }
      
      snakeEntity.updateFromServerState(snake);
    }
  }

  private updateLetterTiles(letterTiles: LetterTile[]) {
    console.log('🔤 Updating letter tiles:', letterTiles.length);
    
    // Remove tiles that no longer exist
    for (const [tileId, tileEntity] of this.letterTileEntities) {
      if (!letterTiles.find(t => t.id === tileId)) {
        console.log(`🗑️ Removing letter tile ${tileId}`);
        this.gameContainer.removeChild(tileEntity.container);
        this.letterTileEntities.delete(tileId);
      }
    }
    
    // Update existing tiles and create new ones
    for (const tile of letterTiles) {
      let tileEntity = this.letterTileEntities.get(tile.id);
      
      if (!tileEntity) {
        console.log(`🆕 Creating new letter tile entity for ${tile.id}`);
        tileEntity = new LetterTileEntity(tile, this.config.gridSize);
        this.gameContainer.addChild(tileEntity.container);
        this.letterTileEntities.set(tile.id, tileEntity);
      }
      
      tileEntity.update();
    }
  }

  private updateFood(food: any[]) {
    console.log('🍎 Updating food:', food.length);
    
    // Remove food that no longer exists
    for (const [foodId, foodEntity] of this.foodEntities) {
      if (!food.find(f => f.id === foodId)) {
        console.log(`🗑️ Removing food ${foodId}`);
        this.gameContainer.removeChild(foodEntity.container);
        this.foodEntities.delete(foodId);
      }
    }
    
    // Update existing food and create new ones
    for (const foodItem of food) {
      let foodEntity = this.foodEntities.get(foodItem.id);
      
      if (!foodEntity) {
        console.log(`🆕 Creating new food entity for ${foodItem.id}`);
        // Create food entity (implementation depends on your food entity class)
        // foodEntity = new FoodEntity(foodItem);
        // this.gameContainer.addChild(foodEntity.container);
        // this.foodEntities.set(foodItem.id, foodEntity);
      }
      
      // foodEntity.update(foodItem);
    }
  }

  public setCurrentPlayer(): void {
    // Update highlighting for all snakes
    this.snakeEntities.forEach((snakeEntity) => {
      snakeEntity.container.filters = [];
      // Re-highlight if this is the current player's snake
      // We'll need to track the playerId somehow - this is a simplification
    });
  }

  public getPlayerSnake(): Snake | null {
    // We need a way to get the snake data from the entity
    // This would require extending SnakeEntity to expose the snake data
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