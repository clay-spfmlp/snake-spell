import * as PIXI from 'pixi.js';
import { PowerUp, POWER_UP_DEFINITIONS, POWER_UP_COLORS } from '@shared/game/powerups';
import { Position } from '@shared/game/snake';

export class PowerUpEntity {
  public container: PIXI.Container;
  private background!: PIXI.Graphics;
  private icon!: PIXI.Text;
  private glow!: PIXI.Graphics;
  private particles!: PIXI.Container;
  private powerUpData: PowerUp;
  private gridSize: number;
  private animationTime = 0;
  private glowIntensity = 0;

  constructor(powerUpData: PowerUp, gridSize: number) {
    this.powerUpData = { ...powerUpData };
    this.gridSize = gridSize;
    this.container = new PIXI.Container();
    
    this.createVisuals();
    this.positionPowerUp();
    this.createParticles();
  }

  private createVisuals(): void {
    const definition = POWER_UP_DEFINITIONS[this.powerUpData.type];
    const rarityColor = POWER_UP_COLORS[this.powerUpData.rarity];
    
    // Create glow effect
    this.glow = new PIXI.Graphics();
    this.container.addChild(this.glow);
    
    // Create background with rarity-based color
    this.background = new PIXI.Graphics();
    this.background.beginFill(parseInt(rarityColor.replace('#', '0x')));
    this.background.drawRoundedRect(2, 2, this.gridSize - 4, this.gridSize - 4, 8);
    this.background.endFill();
    
    // Add rarity border
    const borderColor = this.getRarityBorderColor(this.powerUpData.rarity);
    this.background.lineStyle(3, borderColor, 1);
    this.background.drawRoundedRect(2, 2, this.gridSize - 4, this.gridSize - 4, 8);
    
    this.container.addChild(this.background);

    // Create icon text
    this.icon = new PIXI.Text(definition.icon, {
      fontFamily: 'Arial',
      fontSize: Math.floor(this.gridSize * 0.5),
      align: 'center'
    });
    
    // Center the icon
    this.icon.anchor.set(0.5);
    this.icon.x = this.gridSize / 2;
    this.icon.y = this.gridSize / 2;
    
    this.container.addChild(this.icon);
  }

  private getRarityBorderColor(rarity: 'common' | 'rare' | 'legendary'): number {
    switch (rarity) {
      case 'common': return 0x74b9ff;
      case 'rare': return 0xfdcb6e;
      case 'legendary': return 0xfd79a8;
    }
  }

  private createParticles(): void {
    this.particles = new PIXI.Container();
    this.container.addChild(this.particles);

    // Create floating particles for legendary power-ups
    if (this.powerUpData.rarity === 'legendary') {
      for (let i = 0; i < 5; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(0xffffff, 0.8);
        particle.drawCircle(0, 0, 2);
        particle.endFill();
        
        particle.x = Math.random() * this.gridSize;
        particle.y = Math.random() * this.gridSize;
        
        this.particles.addChild(particle);
      }
    }
  }

  private positionPowerUp(): void {
    this.container.x = this.powerUpData.position.x * this.gridSize;
    this.container.y = this.powerUpData.position.y * this.gridSize;
  }

  public update(): void {
    this.animationTime += 0.08;
    
    // Pulsing animation based on rarity
    const baseScale = this.getRarityScale(this.powerUpData.rarity);
    const pulseIntensity = this.getRarityPulse(this.powerUpData.rarity);
    const scale = baseScale + Math.sin(this.animationTime) * pulseIntensity;
    this.container.scale.set(scale);

    // Glow effect
    this.updateGlow();
    
    // Rotate legendary power-ups
    if (this.powerUpData.rarity === 'legendary') {
      this.container.rotation = Math.sin(this.animationTime * 0.5) * 0.1;
    }

    // Animate particles
    if (this.particles && this.powerUpData.rarity === 'legendary') {
      this.animateParticles();
    }

    // Check if power-up should despawn
    this.checkDespawn();
  }

  private getRarityScale(rarity: 'common' | 'rare' | 'legendary'): number {
    switch (rarity) {
      case 'common': return 1.0;
      case 'rare': return 1.1;
      case 'legendary': return 1.2;
    }
  }

  private getRarityPulse(rarity: 'common' | 'rare' | 'legendary'): number {
    switch (rarity) {
      case 'common': return 0.05;
      case 'rare': return 0.1;
      case 'legendary': return 0.15;
    }
  }

  private updateGlow(): void {
    this.glowIntensity = (Math.sin(this.animationTime * 2) + 1) * 0.5;
    
    this.glow.clear();
    
    if (this.powerUpData.rarity !== 'common') {
      const glowColor = this.getRarityBorderColor(this.powerUpData.rarity);
      const glowSize = this.gridSize * 0.6 + this.glowIntensity * 10;
      
      this.glow.beginFill(glowColor, 0.2 * this.glowIntensity);
      this.glow.drawCircle(this.gridSize / 2, this.gridSize / 2, glowSize);
      this.glow.endFill();
    }
  }

  private animateParticles(): void {
    this.particles.children.forEach((particle, index) => {
      const speed = 0.5 + Math.sin(this.animationTime + index) * 0.3;
      particle.y -= speed;
      particle.alpha = 0.8 - (particle.y / this.gridSize) * 0.8;
      
      // Reset particle when it goes off screen
      if (particle.y < -5) {
        particle.y = this.gridSize + 5;
        particle.x = Math.random() * this.gridSize;
        particle.alpha = 0.8;
      }
    });
  }

  private checkDespawn(): void {
    const currentTime = Date.now();
    const age = currentTime - this.powerUpData.spawnTime;
    
    // Power-ups last for their duration + 5 seconds grace period
    if (age > this.powerUpData.duration + 5000) {
      // Fade out animation
      this.container.alpha = Math.max(0, 1 - (age - this.powerUpData.duration - 5000) / 2000);
    }
  }

  public startCollectionAnimation(): void {
    // Scale up and fade out animation when collected
    const scaleAnimation = {
      from: this.container.scale.x,
      to: this.container.scale.x * 1.5,
      duration: 300
    };
    
    const fadeAnimation = {
      from: this.container.alpha,
      to: 0,
      duration: 300
    };

    // Simple animation (could be replaced with a proper tween library)
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 300, 1);
      
      this.container.scale.set(scaleAnimation.from + (scaleAnimation.to - scaleAnimation.from) * progress);
      this.container.alpha = fadeAnimation.from + (fadeAnimation.to - fadeAnimation.from) * progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  public getPosition(): Position {
    return { ...this.powerUpData.position };
  }

  public getPowerUpData(): PowerUp {
    return { ...this.powerUpData };
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
} 