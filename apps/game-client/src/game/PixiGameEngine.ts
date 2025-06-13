import * as PIXI from 'pixi.js';
import { 
  Snake, 
  Food, 
  GameConfig, 
  GameBounds,
  DIRECTIONS,
  DEFAULT_GAME_CONFIG,
  Position
} from '@shared/game/snake';
import { SnakeEntity } from './entities/SnakeEntity.js';
import { FoodEntity } from './entities/FoodEntity.js';
import { InputHandler } from './systems/InputHandler.js';
import { CollisionSystem } from './systems/CollisionSystem.js';

export interface GameEvents {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onFoodCollected: (food: Food) => void;
  onLetterCollected: (letter: string) => void;
}

// Extended GameConfig for crossword mode
export interface ExtendedGameConfig extends GameConfig {
  customLetters?: string[];
}

export class PixiGameEngine {
  private app: PIXI.Application;
  private gameContainer: PIXI.Container;
  private backgroundSprite?: PIXI.Sprite;
  private snake!: SnakeEntity;
  private foods: Map<string, FoodEntity> = new Map();
  private inputHandler!: InputHandler;
  private collisionSystem!: CollisionSystem;
  
  private config: ExtendedGameConfig;
  private bounds: GameBounds;
  private isRunning = false;
  private lastMoveTime = 0;
  private gameStartTime = 0;
  private customLetters?: string[];
  
  private events: GameEvents;

  constructor(
    parentElement: HTMLElement,
    config: Partial<ExtendedGameConfig> = {},
    events: GameEvents
  ) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    this.customLetters = config.customLetters;
    this.events = events;
    
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

    // Load and setup background
    this.setupBackground();

    // Calculate game bounds
    this.bounds = {
      minX: 0,
      maxX: Math.floor(this.config.canvasWidth / this.config.gridSize),
      minY: 0,
      maxY: Math.floor(this.config.canvasHeight / this.config.gridSize)
    };

    // Initialize systems
    this.inputHandler = new InputHandler();
    this.collisionSystem = new CollisionSystem(this.bounds);

    // Initialize snake
    this.initializeSnake();

    // Set up game loop
    this.app.ticker.add(this.gameLoop, this);
    
    console.log('🎮 PixiJS Game Engine initialized');
  }

  private async setupBackground(): Promise<void> {
    try {
      // Try to load background image
      const texture = await PIXI.Assets.load('/background.jpg');
      this.backgroundSprite = new PIXI.Sprite(texture);
      
      // Scale background to fit canvas
      this.backgroundSprite.width = this.config.canvasWidth;
      this.backgroundSprite.height = this.config.canvasHeight;
      
      // Add background as the first child (behind everything else)
      this.gameContainer.addChildAt(this.backgroundSprite, 0);
      
      console.log('✅ Background image loaded successfully');
    } catch (error) {
      console.log('⚠️ Background image not found, using default background color');
      // Background color is already set in PIXI.Application config
    }
  }

  private initializeSnake(): void {
    const startX = Math.floor(this.bounds.maxX / 2);
    const startY = Math.floor(this.bounds.maxY / 2);
    
    const snakeData: Snake = {
      id: 'player-snake',
      playerId: 'player-1',
      segments: [],
      direction: DIRECTIONS.RIGHT,
      color: '#3498db',
      isAlive: true,
      score: 0
    };

    // Create initial segments
    for (let i = 0; i < this.config.initialSnakeLength; i++) {
      snakeData.segments.push({
        id: `segment-${i}`,
        position: { x: startX - i, y: startY }
      });
    }

    this.snake = new SnakeEntity(snakeData, this.config.gridSize);
    this.gameContainer.addChild(this.snake.container);
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = this.app.ticker.lastTime;
    
    // Handle input
    const inputDirection = this.inputHandler.getDirection();
    if (inputDirection) {
      this.snake.setDirection(inputDirection);
    }

    // Move snake at configured speed
    if (currentTime - this.lastMoveTime >= this.config.gameSpeed) {
      this.moveSnake();
      this.lastMoveTime = currentTime;
    }

    // Update entities
    this.snake.update();
    this.foods.forEach(food => food.update());

    // Check collisions
    this.checkCollisions();
  };

  private moveSnake(): void {
    if (!this.snake.isAlive()) return;

    this.snake.move();

    // Check wall collisions
    const head = this.snake.getHeadPosition();
    if (this.collisionSystem.checkWallCollision(head)) {
      this.gameOver();
      return;
    }

    // Check self collision
    if (this.collisionSystem.checkSelfCollision(this.snake.getSegments())) {
      this.gameOver();
      return;
    }
  }

  private checkCollisions(): void {
    const headPosition = this.snake.getHeadPosition();
    
    // Check food collisions
    for (const [foodId, foodEntity] of this.foods) {
      if (this.collisionSystem.checkFoodCollision(headPosition, foodEntity.getPosition())) {
        this.collectFood(foodId, foodEntity);
        break; // Only collect one food per frame
      }
    }
  }

  private collectFood(foodId: string, foodEntity: FoodEntity): void {
    const foodData = foodEntity.getFoodData();
    
    // Grow snake
    this.snake.grow();
    
    // Update score
    this.snake.addScore(foodData.points);
    this.events.onScoreChange(this.snake.getScore());
    
    // Trigger events
    this.events.onFoodCollected(foodData);
    if (foodData.type === 'letter') {
      this.events.onLetterCollected(foodData.value);
    }

    // Remove food
    this.gameContainer.removeChild(foodEntity.container);
    this.foods.delete(foodId);

    // Spawn new food
    this.spawnFood();
  }

  private spawnFood(): void {
    const availablePositions = this.getAvailablePositions();
    if (availablePositions.length === 0) return;

    const randomPos = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    const letter = this.getRandomLetter();
    
    const food: Food = {
      id: `food-${Date.now()}`,
      position: randomPos,
      type: 'letter',
      value: letter,
      points: 10,
      color: '#e74c3c'
    };

    const foodEntity = new FoodEntity(food, this.config.gridSize);
    this.foods.set(food.id, foodEntity);
    this.gameContainer.addChild(foodEntity.container);
  }

  private spawnMultipleFoods(): void {
    // Clear existing foods
    this.foods.forEach(foodEntity => {
      this.gameContainer.removeChild(foodEntity.container);
    });
    this.foods.clear();

    const availablePositions = this.getAvailablePositions();
    const lettersToSpawn = this.customLetters || this.getRandomLetters(10);
    
    // Ensure we don't spawn more foods than available positions
    const maxFoods = Math.min(lettersToSpawn.length, availablePositions.length);
    
    for (let i = 0; i < maxFoods; i++) {
      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      const position = availablePositions.splice(randomIndex, 1)[0];
      
      const food: Food = {
        id: `food-${Date.now()}-${i}`,
        position,
        type: 'letter',
        value: lettersToSpawn[i],
        points: 10,
        color: '#e74c3c'
      };

      const foodEntity = new FoodEntity(food, this.config.gridSize);
      this.foods.set(food.id, foodEntity);
      this.gameContainer.addChild(foodEntity.container);
    }
  }

  private getRandomLetters(count: number): string[] {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(letters[Math.floor(Math.random() * letters.length)]);
    }
    return result;
  }

  private getAvailablePositions(): Position[] {
    const snakePositions = new Set(
      this.snake.getSegments().map(seg => `${seg.position.x},${seg.position.y}`)
    );
    
    const foodPositions = new Set(
      Array.from(this.foods.values()).map(food => {
        const pos = food.getPosition();
        return `${pos.x},${pos.y}`;
      })
    );

    const available: Position[] = [];
    
    for (let x = this.bounds.minX; x < this.bounds.maxX; x++) {
      for (let y = this.bounds.minY; y < this.bounds.maxY; y++) {
        const posKey = `${x},${y}`;
        if (!snakePositions.has(posKey) && !foodPositions.has(posKey)) {
          available.push({ x, y });
        }
      }
    }
    
    return available;
  }

  private getRandomLetter(): string {
    if (this.customLetters && this.customLetters.length > 0) {
      return this.customLetters[Math.floor(Math.random() * this.customLetters.length)];
    }
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
  }

  private gameOver(): void {
    this.isRunning = false;
    this.snake.setAlive(false);
    this.events.onGameOver(this.snake.getScore());
    console.log('🎮 Game Over! Final Score:', this.snake.getScore());
  }

  // Public API
  public start(): void {
    this.isRunning = true;
    this.gameStartTime = this.app.ticker.lastTime;
    this.lastMoveTime = this.gameStartTime;
    
    // Spawn initial food(s)
    if (this.customLetters) {
      this.spawnMultipleFoods();
    } else {
      this.spawnFood();
    }
    
    console.log('🚀 Game Started!');
  }

  public pause(): void {
    this.isRunning = false;
    console.log('⏸️ Game Paused');
  }

  public resume(): void {
    this.isRunning = true;
    this.lastMoveTime = this.app.ticker.lastTime;
    console.log('▶️ Game Resumed');
  }

  public reset(): void {
    this.pause();
    
    // Clear existing entities (but keep background)
    this.gameContainer.removeChildren();
    this.foods.clear();
    
    // Re-add background if it exists
    if (this.backgroundSprite) {
      this.gameContainer.addChildAt(this.backgroundSprite, 0);
    }
    
    // Reinitialize
    this.initializeSnake();
    
    console.log('🔄 Game Reset');
  }

  public destroy(): void {
    this.pause();
    this.inputHandler.destroy();
    
    // Clean up background sprite
    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
      this.backgroundSprite = undefined;
    }
    
    this.app.destroy(true, { children: true, texture: true });
    console.log('🗑️ Game Engine Destroyed');
  }

  public getScore(): number {
    return this.snake.getScore();
  }

  public isGameRunning(): boolean {
    return this.isRunning;
  }

  public getSnakeLength(): number {
    return this.snake.getSegments().length;
  }

  // New methods for crossword mode
  public updateFoodLetters(letters: string[]): void {
    this.customLetters = letters;
    if (this.isRunning) {
      this.spawnMultipleFoods();
    }
  }

  public shrinkSnake(): void {
    this.snake.shrink();
  }
} 