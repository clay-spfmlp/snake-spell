import { 
  PowerUp, 
  PowerUpType, 
  POWER_UP_DEFINITIONS, 
  POWER_UP_SPAWN_RATES,
  ActivePowerUp 
} from '@snake-spell/shared-types';
import { Position } from '@snake-spell/shared-types';

export class PowerUpManager {
  private activePowerUps: Map<string, PowerUp> = new Map();
  private playerActivePowerUps: Map<string, ActivePowerUp[]> = new Map();
  private lastSpawnTime = 0;
  private spawnInterval = 15000; // 15 seconds between spawns
  
  constructor(private gameSize: { width: number; height: number }) {}

  public update(currentTime: number): void {
    // Remove expired power-ups from the field
    this.removeExpiredPowerUps(currentTime);
    
    // Spawn new power-ups periodically
    if (currentTime - this.lastSpawnTime >= this.spawnInterval) {
      this.trySpawnPowerUp(currentTime);
      this.lastSpawnTime = currentTime;
    }
    
    // Update active player power-ups
    this.updatePlayerPowerUps(currentTime);
  }

  private removeExpiredPowerUps(currentTime: number): void {
    for (const [id, powerUp] of this.activePowerUps) {
      const age = currentTime - powerUp.spawnTime;
      if (age > powerUp.duration) {
        this.activePowerUps.delete(id);
      }
    }
  }

  private trySpawnPowerUp(currentTime: number): void {
    // Don't spawn if too many power-ups are active
    if (this.activePowerUps.size >= 3) return;

    const position = this.findSpawnPosition();
    if (!position) return;

    const powerUpType = this.selectRandomPowerUpType();
    const definition = POWER_UP_DEFINITIONS[powerUpType];
    
    const powerUp: PowerUp = {
      id: `powerup-${currentTime}-${Math.random().toString(36).substr(2, 9)}`,
      type: powerUpType,
      position,
      duration: 30000, // 30 seconds on field
      rarity: definition.rarity,
      spawnTime: currentTime
    };

    this.activePowerUps.set(powerUp.id, powerUp);
    console.log(`💫 Spawned ${definition.name} power-up at ${position.x}, ${position.y}`);
  }

  private findSpawnPosition(): Position | null {
    // In a real implementation, this would avoid snake positions
    // For now, just use random positions
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      const position = {
        x: Math.floor(Math.random() * this.gameSize.width),
        y: Math.floor(Math.random() * this.gameSize.height)
      };
      
      // Check if position is free (simplified)
      if (this.isPositionFree(position)) {
        return position;
      }
    }
    
    return null;
  }

  private isPositionFree(position: Position): boolean {
    // Check if any existing power-up is at this position
    for (const powerUp of this.activePowerUps.values()) {
      if (powerUp.position.x === position.x && powerUp.position.y === position.y) {
        return false;
      }
    }
    return true;
  }

  private selectRandomPowerUpType(): PowerUpType {
    const random = Math.random();
    
    if (random < POWER_UP_SPAWN_RATES.legendary) {
      return this.getRandomPowerUpByRarity('legendary');
    } else if (random < POWER_UP_SPAWN_RATES.legendary + POWER_UP_SPAWN_RATES.rare) {
      return this.getRandomPowerUpByRarity('rare');
    } else {
      return this.getRandomPowerUpByRarity('common');
    }
  }

  private getRandomPowerUpByRarity(rarity: 'common' | 'rare' | 'legendary'): PowerUpType {
    const powerUpsOfRarity = Object.values(POWER_UP_DEFINITIONS)
      .filter(def => def.rarity === rarity);
    
    if (powerUpsOfRarity.length === 0) {
      return 'speed_boost'; // Fallback
    }
    
    const weights = powerUpsOfRarity.map(def => def.spawnWeight);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let randomWeight = Math.random() * totalWeight;
    
    for (let i = 0; i < powerUpsOfRarity.length; i++) {
      randomWeight -= weights[i];
      if (randomWeight <= 0) {
        return powerUpsOfRarity[i].type;
      }
    }
    
    return powerUpsOfRarity[0].type; // Fallback
  }

  public collectPowerUp(powerUpId: string, playerId: string): PowerUp | null {
    const powerUp = this.activePowerUps.get(powerUpId);
    if (!powerUp) return null;

    // Remove from field
    this.activePowerUps.delete(powerUpId);

    // Add to player's inventory (for instant effects) or apply directly
    const definition = POWER_UP_DEFINITIONS[powerUp.type];
    
    if (definition.duration === 0) {
      // Instant effect power-ups
      this.applyInstantPowerUp(powerUp.type, playerId);
    } else {
      // Duration-based power-ups
      this.addActivePowerUp(playerId, powerUp);
    }

    console.log(`⚡ ${playerId} collected ${definition.name}`);
    return powerUp;
  }

  private applyInstantPowerUp(type: PowerUpType, playerId: string): void {
    switch (type) {
      case 'random_letters':
        // Spawn 5 random letters around the player
        // This would be handled by the game engine
        break;
      
      case 'score_steal':
        // Steal score from nearest player
        // This would be handled by the game engine
        break;
      
      case 'teleport':
        // Move player to random safe location
        // This would be handled by the game engine
        break;
    }
  }

  private addActivePowerUp(playerId: string, powerUp: PowerUp): void {
    if (!this.playerActivePowerUps.has(playerId)) {
      this.playerActivePowerUps.set(playerId, []);
    }

    const playerPowerUps = this.playerActivePowerUps.get(playerId)!;
    const definition = POWER_UP_DEFINITIONS[powerUp.type];
    
    // Check if player already has this type of power-up
    const existingIndex = playerPowerUps.findIndex(ap => ap.type === powerUp.type);
    
    if (existingIndex >= 0) {
      // Refresh duration for existing power-up
      playerPowerUps[existingIndex].activatedAt = Date.now();
      playerPowerUps[existingIndex].duration = definition.duration;
    } else {
      // Add new active power-up
      const activePowerUp: ActivePowerUp = {
        id: powerUp.id,
        type: powerUp.type,
        playerId,
        activatedAt: Date.now(),
        duration: definition.duration
      };
      
      playerPowerUps.push(activePowerUp);
    }
  }

  private updatePlayerPowerUps(currentTime: number): void {
    for (const [playerId, powerUps] of this.playerActivePowerUps) {
      // Remove expired power-ups
      const activePowerUps = powerUps.filter(powerUp => {
        const age = currentTime - powerUp.activatedAt;
        return age < powerUp.duration;
      });
      
      if (activePowerUps.length !== powerUps.length) {
        // Some power-ups expired
        this.playerActivePowerUps.set(playerId, activePowerUps);
      }
      
      // Clean up empty arrays
      if (activePowerUps.length === 0) {
        this.playerActivePowerUps.delete(playerId);
      }
    }
  }

  public getActivePowerUps(): PowerUp[] {
    return Array.from(this.activePowerUps.values());
  }

  public getPlayerActivePowerUps(playerId: string): ActivePowerUp[] {
    return this.playerActivePowerUps.get(playerId) || [];
  }

  public hasActivePowerUp(playerId: string, type: PowerUpType): boolean {
    const playerPowerUps = this.playerActivePowerUps.get(playerId) || [];
    return playerPowerUps.some(powerUp => powerUp.type === type);
  }

  public getSpeedMultiplier(playerId: string): number {
    let multiplier = 1.0;
    
    if (this.hasActivePowerUp(playerId, 'speed_boost')) {
      multiplier *= 1.5; // 50% faster
    }
    
    if (this.hasActivePowerUp(playerId, 'slow_motion')) {
      multiplier *= 0.7; // 30% slower for better control
    }
    
    return multiplier;
  }

  public shouldMagnetizeLetters(playerId: string): boolean {
    return this.hasActivePowerUp(playerId, 'letter_magnet');
  }

  public getWordScoreMultiplier(playerId: string): number {
    return this.hasActivePowerUp(playerId, 'word_multiplier') ? 2.0 : 1.0;
  }

  public hasShield(playerId: string): boolean {
    return this.hasActivePowerUp(playerId, 'shield');
  }

  public useShield(playerId: string): void {
    const playerPowerUps = this.playerActivePowerUps.get(playerId);
    if (playerPowerUps) {
      const shieldIndex = playerPowerUps.findIndex(powerUp => powerUp.type === 'shield');
      if (shieldIndex >= 0) {
        playerPowerUps.splice(shieldIndex, 1);
        console.log(`🛡️ ${playerId} used shield protection`);
      }
    }
  }

  public isGhostMode(playerId: string): boolean {
    return this.hasActivePowerUp(playerId, 'ghost_mode');
  }

  public isGiantMode(playerId: string): boolean {
    return this.hasActivePowerUp(playerId, 'giant_mode');
  }

  public hasLetterVision(playerId: string): boolean {
    return this.hasActivePowerUp(playerId, 'letter_vision');
  }

  public removePowerUp(powerUpId: string): void {
    this.activePowerUps.delete(powerUpId);
  }

  public clear(): void {
    this.activePowerUps.clear();
    this.playerActivePowerUps.clear();
  }
} 