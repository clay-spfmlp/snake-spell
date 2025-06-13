import * as PIXI from 'pixi.js';
import { LetterTile } from '@snake-word-arena/shared-types';

export class LetterTileEntity {
  public container: PIXI.Container;
  private background!: PIXI.Graphics;
  private text!: PIXI.Text;
  private tileData: LetterTile;
  private gridSize: number;
  private animationTime = 0;
  private rarityGlow?: PIXI.Graphics;

  constructor(tileData: LetterTile, gridSize: number) {
    this.tileData = { ...tileData };
    this.gridSize = gridSize;
    this.container = new PIXI.Container();
    
    this.createVisuals();
    this.positionTile();
  }

  private createVisuals(): void {
    // Create background with rarity-based color
    this.background = new PIXI.Graphics();
    const colorHex = this.getRarityColor();
    
    this.background.beginFill(colorHex);
    this.background.drawRoundedRect(2, 2, this.gridSize - 4, this.gridSize - 4, 4);
    this.background.endFill();
    
    // Add border based on rarity
    const borderWidth = this.getBorderWidth();
    this.background.lineStyle(borderWidth, 0xffffff, 0.8);
    this.background.drawRoundedRect(2, 2, this.gridSize - 4, this.gridSize - 4, 4);
    
    this.container.addChild(this.background);

    // Add rarity glow for rare/epic letters
    if (this.tileData.rarity === 'rare' || this.tileData.rarity === 'epic') {
      this.createRarityGlow();
    }

    // Create text for letter
    this.text = new PIXI.Text(this.tileData.letter, {
      fontFamily: 'Arial',
      fontSize: Math.floor(this.gridSize * 0.55),
      fill: 0xffffff,
      fontWeight: 'bold',
      align: 'center',
      stroke: 0x000000,
      strokeThickness: 2
    });
    
    // Center the text
    this.text.anchor.set(0.5);
    this.text.x = this.gridSize / 2;
    this.text.y = this.gridSize / 2;
    
    this.container.addChild(this.text);

    // Add points indicator for valuable letters
    if (this.tileData.points > 1) {
      this.createPointsIndicator();
    }
  }

  private createRarityGlow(): void {
    this.rarityGlow = new PIXI.Graphics();
    const glowColor = this.tileData.rarity === 'epic' ? 0xffd700 : 0x9b59b6;
    
    this.rarityGlow.beginFill(glowColor, 0.3);
    this.rarityGlow.drawRoundedRect(0, 0, this.gridSize, this.gridSize, 6);
    this.rarityGlow.endFill();
    
    // Add to container behind background
    this.container.addChildAt(this.rarityGlow, 0);
  }

  private createPointsIndicator(): void {
    const pointsText = new PIXI.Text(this.tileData.points.toString(), {
      fontFamily: 'Arial',
      fontSize: Math.floor(this.gridSize * 0.25),
      fill: 0xffff00,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 1
    });
    
    pointsText.anchor.set(1, 0);
    pointsText.x = this.gridSize - 3;
    pointsText.y = 3;
    
    this.container.addChild(pointsText);
  }

  private getRarityColor(): number {
    switch (this.tileData.rarity) {
      case 'common':
        return 0x3498db;    // Blue
      case 'uncommon':
        return 0x2ecc71;    // Green
      case 'rare':
        return 0x9b59b6;    // Purple
      case 'epic':
        return 0xf39c12;    // Orange
      default:
        return 0x3498db;
    }
  }

  private getBorderWidth(): number {
    switch (this.tileData.rarity) {
      case 'rare':
        return 3;
      case 'epic':
        return 4;
      default:
        return 2;
    }
  }

  private positionTile(): void {
    this.container.x = this.tileData.position.x * this.gridSize;
    this.container.y = this.tileData.position.y * this.gridSize;
  }

  public update(): void {
    this.animationTime += 0.05;
    
    // Different animations based on rarity
    switch (this.tileData.rarity) {
      case 'epic':
        // Epic letters have a golden pulsing effect
        const epicScale = 1 + Math.sin(this.animationTime * 2) * 0.1;
        this.container.scale.set(epicScale);
        if (this.rarityGlow) {
          this.rarityGlow.alpha = 0.3 + Math.sin(this.animationTime * 3) * 0.2;
        }
        break;
        
      case 'rare':
        // Rare letters have a subtle purple glow pulse
        const rareScale = 1 + Math.sin(this.animationTime * 1.5) * 0.05;
        this.container.scale.set(rareScale);
        if (this.rarityGlow) {
          this.rarityGlow.alpha = 0.2 + Math.sin(this.animationTime * 2) * 0.15;
        }
        break;
        
      case 'uncommon':
        // Uncommon letters have a gentle bob
        this.container.y = (this.tileData.position.y * this.gridSize) + Math.sin(this.animationTime) * 1;
        break;
        
      default:
        // Common letters have minimal animation
        const commonScale = 1 + Math.sin(this.animationTime * 0.8) * 0.02;
        this.container.scale.set(commonScale);
        break;
    }
  }

  public getPosition(): { x: number; y: number } {
    return { ...this.tileData.position };
  }

  public getTileData(): LetterTile {
    return { ...this.tileData };
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }

  public setHighlight(highlighted: boolean): void {
    if (highlighted) {
      this.background.tint = 0xffff88; // Yellow tint
      this.text.style.fill = 0x000000;  // Black text for contrast
    } else {
      this.background.tint = 0xffffff; // Normal tint
      this.text.style.fill = 0xffffff; // White text
    }
  }
} 