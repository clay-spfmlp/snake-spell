import { SoundEffect, SOUND_EFFECTS, SoundSettings, DEFAULT_SOUND_SETTINGS } from '@shared/ui/sounds';

export class SoundManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private settings: SoundSettings = { ...DEFAULT_SOUND_SETTINGS };
  private preloadPromises: Map<SoundEffect, Promise<void>> = new Map();

  constructor() {
    this.loadSettings();
  }

  public async initialize(): Promise<void> {
    console.log('🔊 Initializing Sound Manager...');
    
    // Preload all sound effects
    const preloadPromises = Object.values(SOUND_EFFECTS).map(config => 
      this.preloadSound(config.id)
    );
    
    await Promise.all(preloadPromises);
    console.log(`🎵 Loaded ${preloadPromises.length} sound effects`);
  }

  private async preloadSound(soundId: SoundEffect): Promise<void> {
    if (this.preloadPromises.has(soundId)) {
      return this.preloadPromises.get(soundId)!;
    }

    const promise = new Promise<void>((resolve) => {
      const config = SOUND_EFFECTS[soundId];
      const audio = new Audio();
      
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      audio.addEventListener('error', () => resolve(), { once: true });
      
      audio.preload = 'auto';
      audio.src = config.file;
      audio.volume = this.calculateVolume(config);
      audio.loop = config.loop;
      
      this.sounds.set(soundId, audio);
    });

    this.preloadPromises.set(soundId, promise);
    return promise;
  }

  public async play(soundId: SoundEffect): Promise<void> {
    if (!this.settings.enabled) return;

    try {
      const audio = this.sounds.get(soundId);
      if (!audio) {
        // Try to load on demand
        await this.preloadSound(soundId);
        return this.play(soundId);
      }

      // Clone audio for overlapping sounds
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = this.calculateVolume(SOUND_EFFECTS[soundId]);
      
      // Play the sound
      const playPromise = audioClone.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }

      // Clean up after playback
      audioClone.addEventListener('ended', () => {
        audioClone.remove();
      });

    } catch (error) {
      // Ignore play errors (common in testing environments)
      console.debug(`Sound play failed for ${soundId}:`, error);
    }
  }

  public playWithDelay(soundId: SoundEffect, delay: number): void {
    setTimeout(() => this.play(soundId), delay);
  }

  public stop(soundId: SoundEffect): void {
    const audio = this.sounds.get(soundId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  public stopAll(): void {
    this.sounds.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  private calculateVolume(config: { volume: number; category: 'sfx' | 'music' | 'ui' }): number {
    const categoryVolume = this.getCategoryVolume(config.category);
    return this.settings.masterVolume * categoryVolume * config.volume;
  }

  private getCategoryVolume(category: 'sfx' | 'music' | 'ui'): number {
    switch (category) {
      case 'sfx': return this.settings.sfxVolume;
      case 'music': return this.settings.musicVolume;
      case 'ui': return this.settings.uiVolume;
    }
  }

  public updateSettings(newSettings: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Update volumes for existing sounds
    this.sounds.forEach((audio, soundId) => {
      const config = SOUND_EFFECTS[soundId];
      audio.volume = this.calculateVolume(config);
    });
  }

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('snake-word-arena-sound-settings');
      if (saved) {
        this.settings = { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load sound settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('snake-word-arena-sound-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save sound settings:', error);
    }
  }

  public async testSound(soundId: SoundEffect): Promise<void> {
    await this.play(soundId);
  }

  // Convenience methods for common sound patterns
  public playUIClick(): void {
    this.play('ui_click');
  }

  public playUIHover(): void {
    this.play('ui_hover');
  }

  public playSuccess(): void {
    this.play('form_word');
  }

  public playError(): void {
    this.play('invalid_word');
  }

  public playCollect(): void {
    this.play('collect_letter');
  }

  public playNotification(): void {
    this.play('notification');
  }

  public playPowerUp(): void {
    this.play('powerup_collect');
  }

  public destroy(): void {
    this.stopAll();
    this.sounds.clear();
    this.preloadPromises.clear();
  }
}

// Global sound manager instance
export const soundManager = new SoundManager(); 