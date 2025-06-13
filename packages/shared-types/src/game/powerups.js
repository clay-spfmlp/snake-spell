export const POWER_UP_DEFINITIONS = {
    speed_boost: {
        type: 'speed_boost',
        name: 'Speed Boost',
        description: 'Move 50% faster for 8 seconds',
        icon: '⚡',
        rarity: 'common',
        duration: 8000,
        cooldown: 3000,
        color: '#f1c40f',
        spawnWeight: 20
    },
    slow_motion: {
        type: 'slow_motion',
        name: 'Slow Motion',
        description: 'Slows down time for better control',
        icon: '🐌',
        rarity: 'common',
        duration: 6000,
        cooldown: 5000,
        color: '#3498db',
        spawnWeight: 15
    },
    letter_magnet: {
        type: 'letter_magnet',
        name: 'Letter Magnet',
        description: 'Automatically collect nearby letters',
        icon: '🧲',
        rarity: 'common',
        duration: 10000,
        cooldown: 0,
        color: '#e74c3c',
        spawnWeight: 18
    },
    word_multiplier: {
        type: 'word_multiplier',
        name: 'Word Multiplier',
        description: 'Next word scores 2x points',
        icon: '✖️',
        rarity: 'rare',
        duration: 30000,
        cooldown: 0,
        color: '#9b59b6',
        spawnWeight: 8
    },
    shield: {
        type: 'shield',
        name: 'Shield',
        description: 'Protects from one collision',
        icon: '🛡️',
        rarity: 'rare',
        duration: 60000,
        cooldown: 0,
        color: '#2ecc71',
        spawnWeight: 10
    },
    ghost_mode: {
        type: 'ghost_mode',
        name: 'Ghost Mode',
        description: 'Phase through other snakes',
        icon: '👻',
        rarity: 'rare',
        duration: 5000,
        cooldown: 8000,
        color: '#95a5a6',
        spawnWeight: 6
    },
    freeze_others: {
        type: 'freeze_others',
        name: 'Freeze Others',
        description: 'Freezes all other players for 3 seconds',
        icon: '❄️',
        rarity: 'legendary',
        duration: 3000,
        cooldown: 10000,
        color: '#74b9ff',
        spawnWeight: 2
    },
    random_letters: {
        type: 'random_letters',
        name: 'Letter Shower',
        description: 'Spawns 5 random letters around you',
        icon: '🌟',
        rarity: 'rare',
        duration: 0, // Instant effect
        cooldown: 0,
        color: '#fd79a8',
        spawnWeight: 7
    },
    score_steal: {
        type: 'score_steal',
        name: 'Score Steal',
        description: 'Steal 20% score from nearest player',
        icon: '💰',
        rarity: 'legendary',
        duration: 0, // Instant effect
        cooldown: 0,
        color: '#fdcb6e',
        spawnWeight: 1
    },
    teleport: {
        type: 'teleport',
        name: 'Teleport',
        description: 'Instantly move to a random safe location',
        icon: '🌀',
        rarity: 'rare',
        duration: 0, // Instant effect
        cooldown: 2000,
        color: '#6c5ce7',
        spawnWeight: 5
    },
    giant_mode: {
        type: 'giant_mode',
        name: 'Giant Mode',
        description: 'Become 2x larger, others bounce off you',
        icon: '🦣',
        rarity: 'legendary',
        duration: 8000,
        cooldown: 5000,
        color: '#00b894',
        spawnWeight: 3
    },
    letter_vision: {
        type: 'letter_vision',
        name: 'Letter Vision',
        description: 'See letter point values and upcoming spawns',
        icon: '👁️',
        rarity: 'rare',
        duration: 15000,
        cooldown: 0,
        color: '#a29bfe',
        spawnWeight: 9
    }
};
export const POWER_UP_COLORS = {
    common: '#3498db',
    rare: '#9b59b6',
    legendary: '#f39c12'
};
export const POWER_UP_SPAWN_RATES = {
    common: 0.7, // 70% of power-ups
    rare: 0.25, // 25% of power-ups
    legendary: 0.05 // 5% of power-ups
};
