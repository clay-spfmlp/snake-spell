import { 
  LetterTile, 
  Position,
  GameBounds 
} from '@snake-spell/shared-types';
import { 
  LETTER_FREQUENCIES, 
  LETTER_COLORS,
  LetterFrequency
} from '../../../../packages/shared-types/dist/game/words.js';
import { v4 as uuidv4 } from 'uuid';

export class LetterTileManager {
  private tiles: Map<string, LetterTile> = new Map();
  private bounds: GameBounds;
  private occupiedPositions: Set<string> = new Set();

  constructor(bounds: GameBounds) {
    this.bounds = bounds;
  }

  public spawnLetterTile(excludePositions: Position[] = []): LetterTile | null {
    const availablePositions = this.getAvailablePositions(excludePositions);
    if (availablePositions.length === 0) return null;

    const position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    const letter = this.selectWeightedLetter();
    const letterData = LETTER_FREQUENCIES.find(l => l.letter === letter);
    
    if (!letterData) return null;

    const tile: LetterTile = {
      id: uuidv4(),
      letter,
      position,
      points: letterData.points,
      rarity: letterData.rarity,
      collectTime: Date.now()
    };

    this.tiles.set(tile.id, tile);
    this.occupiedPositions.add(`${position.x},${position.y}`);

    console.log(`📝 Spawned ${letterData.rarity} letter '${letter}' (${letterData.points}pts) at (${position.x}, ${position.y})`);
    
    return tile;
  }

  private selectWeightedLetter(): string {
    // Create weighted selection based on frequency
    const weightedLetters: string[] = [];
    
    LETTER_FREQUENCIES.forEach(letterData => {
      // Convert frequency to spawn weight (higher frequency = more spawns)
      // But also consider rarity for balancing
      let weight = Math.max(1, Math.floor(letterData.frequency));
      
      // Reduce weight for rare letters to make them special
      switch (letterData.rarity) {
        case 'uncommon':
          weight = Math.max(1, Math.floor(weight * 0.7));
          break;
        case 'rare':
          weight = Math.max(1, Math.floor(weight * 0.3));
          break;
        case 'epic':
          weight = 1; // Epic letters are very rare
          break;
      }

      for (let i = 0; i < weight; i++) {
        weightedLetters.push(letterData.letter);
      }
    });

    return weightedLetters[Math.floor(Math.random() * weightedLetters.length)];
  }

  private getAvailablePositions(excludePositions: Position[]): Position[] {
    const excluded = new Set(
      excludePositions.map(pos => `${pos.x},${pos.y}`)
    );

    const available: Position[] = [];
    
    for (let x = this.bounds.minX; x < this.bounds.maxX; x++) {
      for (let y = this.bounds.minY; y < this.bounds.maxY; y++) {
        const posKey = `${x},${y}`;
        if (!this.occupiedPositions.has(posKey) && !excluded.has(posKey)) {
          available.push({ x, y });
        }
      }
    }
    
    return available;
  }

  public removeTile(tileId: string): LetterTile | null {
    const tile = this.tiles.get(tileId);
    if (!tile) return null;

    this.tiles.delete(tileId);
    this.occupiedPositions.delete(`${tile.position.x},${tile.position.y}`);
    
    return tile;
  }

  public getTile(tileId: string): LetterTile | undefined {
    return this.tiles.get(tileId);
  }

  public getTileAtPosition(position: Position): LetterTile | null {
    for (const tile of this.tiles.values()) {
      if (tile.position.x === position.x && tile.position.y === position.y) {
        return tile;
      }
    }
    return null;
  }

  public getAllTiles(): LetterTile[] {
    return Array.from(this.tiles.values());
  }

  public clearAllTiles(): void {
    this.tiles.clear();
    this.occupiedPositions.clear();
  }

  public getTileCount(): number {
    return this.tiles.size;
  }

  public updateOccupiedPositions(newOccupiedPositions: Position[]): void {
    // Clear current occupied positions from tiles
    this.occupiedPositions.clear();
    
    // Re-add tile positions
    this.tiles.forEach(tile => {
      this.occupiedPositions.add(`${tile.position.x},${tile.position.y}`);
    });
    
    // Add new occupied positions (snake segments, etc.)
    newOccupiedPositions.forEach(pos => {
      this.occupiedPositions.add(`${pos.x},${pos.y}`);
    });
  }

  public getLetterDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    this.tiles.forEach(tile => {
      distribution[tile.letter] = (distribution[tile.letter] || 0) + 1;
    });
    
    return distribution;
  }
} 