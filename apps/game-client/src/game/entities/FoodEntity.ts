import * as PIXI from 'pixi.js';
import { Food, Position } from '@shared/game/snake';

export class FoodEntity {
  public container: PIXI.Container;
  private graphic!: PIXI.Graphics;
  private text!: PIXI.Text;
  private foodData: Food;
  private gridSize: number;
  private animationTime = 0;

  constructor(foodData: Food, gridSize: number) {
    this.foodData = { ...foodData };
    this.gridSize = gridSize;
    this.container = new PIXI.Container();
    
    this.createVisuals();
    this.positionFood();
  }

  private createVisuals(): void {
    // Create a subtle background for better visibility (optional)
    this.graphic = new PIXI.Graphics();
    this.graphic.beginFill(0x2c3e50, 0.3); // Dark background with transparency
    this.graphic.drawRoundedRect(2, 2, this.gridSize - 4, this.gridSize - 4, 4);
    this.graphic.endFill();
    
    this.container.addChild(this.graphic);

    // Create text for letter
    if (this.foodData.type === 'letter') {
      this.text = new PIXI.Text(this.foodData.value, {
        fontFamily: 'Arial',
        fontSize: Math.floor(this.gridSize * 0.8), // Increased from 0.6 to 0.8
        fill: 0xffffff, // White text
        fontWeight: 'bold',
        align: 'center',
        stroke: 0x000000, // Black outline for better visibility
        strokeThickness: 2
      });
      
      // Center the text
      this.text.anchor.set(0.5);
      this.text.x = this.gridSize / 2;
      this.text.y = this.gridSize / 2;
      
      this.container.addChild(this.text);
    }
  }

  private positionFood(): void {
    this.container.x = this.foodData.position.x * this.gridSize;
    this.container.y = this.foodData.position.y * this.gridSize;
  }

  public update(): void {
    // Add gentle pulsing animation
    this.animationTime += 0.1;
    const scale = 1 + Math.sin(this.animationTime) * 0.1;
    this.container.scale.set(scale);
  }

  public getPosition(): Position {
    return { ...this.foodData.position };
  }

  public getFoodData(): Food {
    return { ...this.foodData };
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
} 