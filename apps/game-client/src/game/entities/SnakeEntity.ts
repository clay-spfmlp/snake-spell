import * as PIXI from 'pixi.js';
import { Snake, SnakeSegment, Direction, Position } from '@shared/game/snake';

export class SnakeEntity {
  public container: PIXI.Container;
  private segments: PIXI.Graphics[] = [];
  private snakeData: Snake;
  private gridSize: number;
  public isBeingRemoved: boolean = false; // Track if snake is being removed

  constructor(snakeData: Snake, gridSize: number) {
    this.snakeData = { ...snakeData };
    this.gridSize = gridSize;
    this.container = new PIXI.Container();
    
    this.createSegments();
  }

  private createSegments(): void {
    // Clear existing segments
    this.segments.forEach(segment => this.container.removeChild(segment));
    this.segments = [];

    // Create new segments
    this.snakeData.segments.forEach((segmentData, index) => {
      const segment = new PIXI.Graphics();
      
      if (index === 0) {
        // Draw head with eyes and mouth
        this.drawHead(segment);
      } else if (index === this.snakeData.segments.length - 1) {
        // Draw pointed tail
        this.drawTail(segment, index);
      } else {
        // Draw regular body segment
        this.drawBodySegment(segment);
      }
      
      // Position the segment
      segment.x = segmentData.position.x * this.gridSize + 1;
      segment.y = segmentData.position.y * this.gridSize + 1;
      
      this.segments.push(segment);
      this.container.addChild(segment);
    });
  }

  private drawHead(segment: PIXI.Graphics): void {
    const size = this.gridSize - 2;
    // Use the snake's actual color instead of hardcoded blue
    const headColor = parseInt(this.snakeData.color.replace('#', ''), 16);
    
    // Draw head body (rounded rectangle)
    segment.beginFill(headColor);
    segment.drawRoundedRect(0, 0, size, size, 4);
    segment.endFill();
    
    // Add border with darker shade
    const borderColor = this.darkenColor(headColor, 0.2);
    segment.lineStyle(1, borderColor);
    segment.drawRoundedRect(0, 0, size, size, 4);
    segment.lineStyle(0);
    
    // Draw eyes based on direction
    const eyeSize = Math.max(2, Math.floor(size * 0.15));
    const eyeColor = 0xffffff;
    const pupilColor = 0x000000;
    
    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
    
    // Position eyes based on snake direction
    const direction = this.snakeData.direction;
    if (direction.x === 1 && direction.y === 0) { // RIGHT
      leftEyeX = size * 0.6; leftEyeY = size * 0.3;
      rightEyeX = size * 0.6; rightEyeY = size * 0.7;
    } else if (direction.x === -1 && direction.y === 0) { // LEFT
      leftEyeX = size * 0.4; leftEyeY = size * 0.3;
      rightEyeX = size * 0.4; rightEyeY = size * 0.7;
    } else if (direction.x === 0 && direction.y === -1) { // UP
      leftEyeX = size * 0.3; leftEyeY = size * 0.4;
      rightEyeX = size * 0.7; rightEyeY = size * 0.4;
    } else { // DOWN
      leftEyeX = size * 0.3; leftEyeY = size * 0.6;
      rightEyeX = size * 0.7; rightEyeY = size * 0.6;
    }
    
    // Draw eyes
    segment.beginFill(eyeColor);
    segment.drawCircle(leftEyeX, leftEyeY, eyeSize);
    segment.drawCircle(rightEyeX, rightEyeY, eyeSize);
    segment.endFill();
    
    // Draw pupils
    const pupilSize = Math.max(1, Math.floor(eyeSize * 0.6));
    segment.beginFill(pupilColor);
    segment.drawCircle(leftEyeX, leftEyeY, pupilSize);
    segment.drawCircle(rightEyeX, rightEyeY, pupilSize);
    segment.endFill();
    
    // Draw mouth
    const mouthColor = borderColor;
    segment.lineStyle(2, mouthColor);
    
    let mouthX, mouthY, mouthEndX, mouthEndY;
    if (direction.x === 1 && direction.y === 0) { // RIGHT
      mouthX = size * 0.8; mouthY = size * 0.5;
      mouthEndX = size * 0.9; mouthEndY = size * 0.5;
    } else if (direction.x === -1 && direction.y === 0) { // LEFT
      mouthX = size * 0.1; mouthY = size * 0.5;
      mouthEndX = size * 0.2; mouthEndY = size * 0.5;
    } else if (direction.x === 0 && direction.y === -1) { // UP
      mouthX = size * 0.5; mouthY = size * 0.1;
      mouthEndX = size * 0.5; mouthEndY = size * 0.2;
    } else { // DOWN
      mouthX = size * 0.5; mouthY = size * 0.8;
      mouthEndX = size * 0.5; mouthEndY = size * 0.9;
    }
    
    segment.moveTo(mouthX, mouthY);
    segment.lineTo(mouthEndX, mouthEndY);
    segment.lineStyle(0);
  }

  private drawBodySegment(segment: PIXI.Graphics): void {
    const size = this.gridSize - 2;
    // Use the snake's actual color with slight transparency for body
    const bodyColor = parseInt(this.snakeData.color.replace('#', ''), 16);
    
    // Draw body segment (rounded rectangle)
    segment.beginFill(bodyColor);
    segment.drawRoundedRect(0, 0, size, size, 2);
    segment.endFill();
    
    // Add subtle border with darker shade
    const borderColor = this.darkenColor(bodyColor, 0.2);
    segment.lineStyle(1, borderColor);
    segment.drawRoundedRect(0, 0, size, size, 2);
    segment.lineStyle(0);
  }

  private drawTail(segment: PIXI.Graphics, segmentIndex: number): void {
    const size = this.gridSize - 2;
    // Use the snake's actual color for tail
    const tailColor = parseInt(this.snakeData.color.replace('#', ''), 16);
    
    // Get direction from previous segment to this one to determine tail direction
    // The tail should point away from the body (opposite of where the body is coming from)
    let tailDirection = { x: 1, y: 0 }; // default RIGHT
    if (segmentIndex > 0 && this.snakeData.segments[segmentIndex - 1]) {
      const prevPos = this.snakeData.segments[segmentIndex - 1].position;
      const currentPos = this.snakeData.segments[segmentIndex].position;
      
      const dx = currentPos.x - prevPos.x;
      const dy = currentPos.y - prevPos.y;
      
      // Tail points in the same direction as the movement from previous to current
      if (dx > 0) tailDirection = { x: 1, y: 0 }; // RIGHT
      else if (dx < 0) tailDirection = { x: -1, y: 0 }; // LEFT
      else if (dy > 0) tailDirection = { x: 0, y: 1 }; // DOWN
      else if (dy < 0) tailDirection = { x: 0, y: -1 }; // UP
    }
    
    segment.beginFill(tailColor);
    
    // Draw pointed tail based on direction
    if (tailDirection.x === 1 && tailDirection.y === 0) { // RIGHT
      // Tail pointing right
      segment.moveTo(0, 0);
      segment.lineTo(size * 0.7, 0);
      segment.lineTo(size, size * 0.5);
      segment.lineTo(size * 0.7, size);
      segment.lineTo(0, size);
      segment.closePath();
    } else if (tailDirection.x === -1 && tailDirection.y === 0) { // LEFT
      // Tail pointing left
      segment.moveTo(size * 0.3, 0);
      segment.lineTo(size, 0);
      segment.lineTo(size, size);
      segment.lineTo(size * 0.3, size);
      segment.lineTo(0, size * 0.5);
      segment.closePath();
    } else if (tailDirection.x === 0 && tailDirection.y === 1) { // DOWN
      // Tail pointing down
      segment.moveTo(0, 0);
      segment.lineTo(size, 0);
      segment.lineTo(size, size * 0.7);
      segment.lineTo(size * 0.5, size);
      segment.lineTo(0, size * 0.7);
      segment.closePath();
    } else { // UP
      // Tail pointing up
      segment.moveTo(0, size * 0.3);
      segment.lineTo(size * 0.5, 0);
      segment.lineTo(size, size * 0.3);
      segment.lineTo(size, size);
      segment.lineTo(0, size);
      segment.closePath();
    }
    
    segment.endFill();
    
    // Add border - redraw the same path for border
    const borderColor = this.darkenColor(tailColor, 0.2);
    segment.lineStyle(1, borderColor);
    if (tailDirection.x === 1 && tailDirection.y === 0) { // RIGHT
      segment.moveTo(0, 0);
      segment.lineTo(size * 0.7, 0);
      segment.lineTo(size, size * 0.5);
      segment.lineTo(size * 0.7, size);
      segment.lineTo(0, size);
      segment.closePath();
    } else if (tailDirection.x === -1 && tailDirection.y === 0) { // LEFT
      segment.moveTo(size * 0.3, 0);
      segment.lineTo(size, 0);
      segment.lineTo(size, size);
      segment.lineTo(size * 0.3, size);
      segment.lineTo(0, size * 0.5);
      segment.closePath();
    } else if (tailDirection.x === 0 && tailDirection.y === 1) { // DOWN
      segment.moveTo(0, 0);
      segment.lineTo(size, 0);
      segment.lineTo(size, size * 0.7);
      segment.lineTo(size * 0.5, size);
      segment.lineTo(0, size * 0.7);
      segment.closePath();
    } else { // UP
      segment.moveTo(0, size * 0.3);
      segment.lineTo(size * 0.5, 0);
      segment.lineTo(size, size * 0.3);
      segment.lineTo(size, size);
      segment.lineTo(0, size);
      segment.closePath();
    }
    segment.lineStyle(0);
  }

  // Helper method to darken a color
  private darkenColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(g * (1 - factor));
    const newB = Math.floor(b * (1 - factor));
    
    return (newR << 16) | (newG << 8) | newB;
  }

  public move(): void {
    if (!this.snakeData.isAlive) return;

    // Apply pending direction change
    if (this.snakeData.nextDirection) {
      this.snakeData.direction = this.snakeData.nextDirection;
      this.snakeData.nextDirection = undefined;
    }

    // Calculate new head position
    const head = this.snakeData.segments[0];
    const newHead: SnakeSegment = {
      id: `segment-${Date.now()}`,
      position: {
        x: head.position.x + this.snakeData.direction.x,
        y: head.position.y + this.snakeData.direction.y
      }
    };

    // Add new head
    this.snakeData.segments.unshift(newHead);

    // Remove tail (unless growing)
    if (!this.isGrowing) {
      this.snakeData.segments.pop();
    } else {
      this.isGrowing = false;
    }

    // Update visual representation
    this.updateVisuals();
  }

  private isGrowing = false;

  public grow(): void {
    this.isGrowing = true;
  }

  public shrink(): void {
    // Remove the tail segment if snake has more than 1 segment
    if (this.snakeData.segments.length > 1) {
      this.snakeData.segments.pop();
      this.updateVisuals();
    }
  }

  public setDirection(direction: Direction): void {
    // Prevent 180-degree turns
    const current = this.snakeData.direction;
    if (
      (current.x !== 0 && direction.x === -current.x) ||
      (current.y !== 0 && direction.y === -current.y)
    ) {
      return;
    }

    this.snakeData.nextDirection = direction;
  }

  private updateVisuals(): void {
    // Don't update visuals if there's no segments data
    if (!this.snakeData?.segments || this.snakeData.segments.length === 0) {
      return;
    }

    // Remove extra segments if snake shrank
    while (this.segments.length > this.snakeData.segments.length) {
      const segment = this.segments.pop();
      if (segment) {
        this.container.removeChild(segment);
      }
    }

    // Add new segments if snake grew
    while (this.segments.length < this.snakeData.segments.length) {
      const segment = new PIXI.Graphics();
      this.segments.push(segment);
      this.container.addChild(segment);
    }

    // Update positions and redraw segments
    this.snakeData.segments.forEach((segmentData, index) => {
      const segment = this.segments[index];
      if (!segment) return; // Skip if segment doesn't exist
      
      // Clear and redraw segment (safely)
      try {
        segment.clear();
        
        if (index === 0) {
          // Draw head with eyes and mouth
          this.drawHead(segment);
        } else if (index === this.snakeData.segments.length - 1) {
          // Draw pointed tail
          this.drawTail(segment, index);
        } else {
          // Draw regular body segment
          this.drawBodySegment(segment);
        }
        
        // Update position
        segment.x = segmentData.position.x * this.gridSize + 1;
        segment.y = segmentData.position.y * this.gridSize + 1;
      } catch (error) {
        console.error('Error updating snake segment:', error);
      }
    });
  }

  public update(): void {
    // Add any frame-based updates here (animations, effects, etc.)
  }

  public getHeadPosition(): Position {
    return this.snakeData.segments[0]?.position || { x: 0, y: 0 };
  }

  public getSegments(): SnakeSegment[] {
    return [...this.snakeData.segments];
  }

  public isAlive(): boolean {
    return this.snakeData.isAlive;
  }

  public setAlive(alive: boolean): void {
    this.snakeData.isAlive = alive;
    
    // Visual feedback for death
    if (!alive) {
      this.segments.forEach(segment => {
        segment.tint = 0xff0000; // Red tint for death
      });
    }
  }

  public getScore(): number {
    return this.snakeData.score;
  }

  public addScore(points: number): void {
    this.snakeData.score += points;
  }

  public getLength(): number {
    return this.snakeData.segments.length;
  }

  public updateFromServerState(serverSnake: Snake): void {
    // Make sure the server snake data is valid
    if (!serverSnake) {
      console.error('Received undefined or null snake data from server');
      return;
    }

    // Ensure segments array exists before updating
    if (!serverSnake.segments || !Array.isArray(serverSnake.segments)) {
      console.error('Invalid segments data in server snake:', serverSnake);
      return;
    }

    // Store previous alive state to detect death
    const wasAlive = this.snakeData?.isAlive;

    // Update the snake data from server (safely create a deep copy)
    this.snakeData = {
      id: serverSnake.id,
      playerId: serverSnake.playerId,
      segments: serverSnake.segments ? [...serverSnake.segments] : [],
      direction: serverSnake.direction,
      nextDirection: serverSnake.nextDirection,
      color: serverSnake.color,
      isAlive: serverSnake.isAlive,
      score: serverSnake.score
    };

    // If snake just died, handle death visualization
    if (wasAlive && !serverSnake.isAlive) {
      this.handleDeath();
    } else {
      // Update visual representation for living or already dead snake
      this.updateVisuals();
    }
  }

  // Handle special death animation/effects
  private handleDeath(): void {
    // Apply red tint to all segments
    this.segments.forEach(segment => {
      if (segment) {
        segment.tint = 0xff0000; // Red tint for death
      }
    });

    // We could add other death effects here (fade out, etc)
  }

  public getSnakeData(): Snake {
    return { ...this.snakeData };
  }
} 