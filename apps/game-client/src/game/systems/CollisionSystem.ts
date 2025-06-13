import { Position, SnakeSegment, GameBounds } from '@shared/game/snake';

export class CollisionSystem {
  private bounds: GameBounds;

  constructor(bounds: GameBounds) {
    this.bounds = bounds;
  }

  public checkWallCollision(position: Position): boolean {
    return (
      position.x < this.bounds.minX ||
      position.x >= this.bounds.maxX ||
      position.y < this.bounds.minY ||
      position.y >= this.bounds.maxY
    );
  }

  public checkSelfCollision(segments: SnakeSegment[]): boolean {
    if (segments.length < 2) return false;

    const head = segments[0];
    
    // Check if head collides with any body segment
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      if (
        head.position.x === segment.position.x &&
        head.position.y === segment.position.y
      ) {
        return true;
      }
    }

    return false;
  }

  public checkFoodCollision(snakeHead: Position, foodPosition: Position): boolean {
    return (
      snakeHead.x === foodPosition.x &&
      snakeHead.y === foodPosition.y
    );
  }

  public checkSnakeCollision(segments1: SnakeSegment[], segments2: SnakeSegment[]): boolean {
    const head1 = segments1[0];
    
    // Check if head of snake1 collides with any segment of snake2
    for (const segment of segments2) {
      if (
        head1.position.x === segment.position.x &&
        head1.position.y === segment.position.y
      ) {
        return true;
      }
    }

    return false;
  }

  public isPositionOccupied(position: Position, snakeSegments: SnakeSegment[]): boolean {
    return snakeSegments.some(segment =>
      segment.position.x === position.x &&
      segment.position.y === position.y
    );
  }
} 