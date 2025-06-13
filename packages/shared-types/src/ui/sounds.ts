export type SoundEffect = 
  | 'collect_letter'
  | 'form_word'
  | 'invalid_word'
  | 'powerup_spawn'
  | 'powerup_collect'
  | 'powerup_activate'
  | 'collision'
  | 'death'
  | 'respawn'
  | 'game_start'
  | 'game_end'
  | 'victory'
  | 'defeat'
  | 'countdown'
  | 'notification'
  | 'ui_click'
  | 'ui_hover'
  | 'chat_message';

export interface SoundConfig {
  id: SoundEffect;
  file: string;
  volume: number; // 0.0 to 1.0
  loop: boolean;
  category: 'sfx' | 'music' | 'ui';
}

export const SOUND_EFFECTS: Record<SoundEffect, SoundConfig> = {
  collect_letter: {
    id: 'collect_letter',
    file: '/sounds/collect_letter.mp3',
    volume: 0.6,
    loop: false,
    category: 'sfx'
  },
  
  form_word: {
    id: 'form_word',
    file: '/sounds/form_word.mp3',
    volume: 0.8,
    loop: false,
    category: 'sfx'
  },
  
  invalid_word: {
    id: 'invalid_word',
    file: '/sounds/invalid_word.mp3',
    volume: 0.5,
    loop: false,
    category: 'sfx'
  },
  
  powerup_spawn: {
    id: 'powerup_spawn',
    file: '/sounds/powerup_spawn.mp3',
    volume: 0.4,
    loop: false,
    category: 'sfx'
  },
  
  powerup_collect: {
    id: 'powerup_collect',
    file: '/sounds/powerup_collect.mp3',
    volume: 0.7,
    loop: false,
    category: 'sfx'
  },
  
  powerup_activate: {
    id: 'powerup_activate',
    file: '/sounds/powerup_activate.mp3',
    volume: 0.6,
    loop: false,
    category: 'sfx'
  },
  
  collision: {
    id: 'collision',
    file: '/sounds/collision.mp3',
    volume: 0.8,
    loop: false,
    category: 'sfx'
  },
  
  death: {
    id: 'death',
    file: '/sounds/death.mp3',
    volume: 0.7,
    loop: false,
    category: 'sfx'
  },
  
  respawn: {
    id: 'respawn',
    file: '/sounds/respawn.mp3',
    volume: 0.6,
    loop: false,
    category: 'sfx'
  },
  
  game_start: {
    id: 'game_start',
    file: '/sounds/game_start.mp3',
    volume: 0.8,
    loop: false,
    category: 'sfx'
  },
  
  game_end: {
    id: 'game_end',
    file: '/sounds/game_end.mp3',
    volume: 0.8,
    loop: false,
    category: 'sfx'
  },
  
  victory: {
    id: 'victory',
    file: '/sounds/victory.mp3',
    volume: 0.9,
    loop: false,
    category: 'music'
  },
  
  defeat: {
    id: 'defeat',
    file: '/sounds/defeat.mp3',
    volume: 0.7,
    loop: false,
    category: 'music'
  },
  
  countdown: {
    id: 'countdown',
    file: '/sounds/countdown.mp3',
    volume: 0.8,
    loop: false,
    category: 'sfx'
  },
  
  notification: {
    id: 'notification',
    file: '/sounds/notification.mp3',
    volume: 0.5,
    loop: false,
    category: 'ui'
  },
  
  ui_click: {
    id: 'ui_click',
    file: '/sounds/ui_click.mp3',
    volume: 0.3,
    loop: false,
    category: 'ui'
  },
  
  ui_hover: {
    id: 'ui_hover',
    file: '/sounds/ui_hover.mp3',
    volume: 0.2,
    loop: false,
    category: 'ui'
  },
  
  chat_message: {
    id: 'chat_message',
    file: '/sounds/chat_message.mp3',
    volume: 0.4,
    loop: false,
    category: 'ui'
  }
};

export interface SoundSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  uiVolume: number;
  enabled: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.7,
  musicVolume: 0.5,
  uiVolume: 0.6,
  enabled: true
}; 