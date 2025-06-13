import { Direction, DIRECTIONS, DirectionName } from '@shared/game/snake';

export class InputHandler {
  private currentDirection: Direction | null = null;
  private keyMap: Map<string, DirectionName> = new Map([
    ['ArrowUp', 'UP'],
    ['ArrowDown', 'DOWN'],
    ['ArrowLeft', 'LEFT'],
    ['ArrowRight', 'RIGHT'],
    ['KeyW', 'UP'],
    ['KeyS', 'DOWN'],
    ['KeyA', 'LEFT'],
    ['KeyD', 'RIGHT']
  ]);

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const directionName = this.keyMap.get(event.code);
    
    if (directionName) {
      event.preventDefault();
      this.currentDirection = DIRECTIONS[directionName];
    }
  };

  public getDirection(): Direction | null {
    const direction = this.currentDirection;
    this.currentDirection = null; // Clear after reading
    return direction;
  }

  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
} 