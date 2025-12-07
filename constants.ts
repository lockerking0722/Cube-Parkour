




export const GRAVITY = 0.32;
export const FRICTION = 0.8;
export const MOVE_SPEED = 2.2;
export const RUN_SPEED = 4.0;
export const CROUCH_SPEED = 1.0;
export const JUMP_FORCE = -9.2;
export const BOUNCE_FORCE = -15.0;
export const MAX_FALL_SPEED = 8.0;

// Player dimensions
export const PLAYER_SIZE = 32;
export const CROUCH_HEIGHT = 16;

// World
export const TILE_SIZE = 40;
export const MAX_JUMPS = 2;
export const DEFAULT_MAX_HP = 100;

// Modifiers Configuration
export const MODIFIER_CONFIG = {
  energized: {
    speedScale: 1.4,
    scoreMult: 0.8,
    name: "Energized",
    desc: "Move 40% faster. (Score x0.8)"
  },
  lowGravity: {
    gravityScale: 0.6,
    scoreMult: 0.7,
    name: "Moon Gravity",
    desc: "Jump higher, fall slower. (Score x0.7)"
  },
  highGravity: {
    gravityScale: 1.4,
    scoreMult: 1.3,
    name: "Heavyweight",
    desc: "Fall faster, jump lower. (Score x1.3)"
  },
  oldSchool: {
    maxJumps: 1,
    jumpScale: 1.3, // Boost single jump height to make levels possible
    scoreMult: 1.5,
    name: "Old School",
    desc: "Disable double jumping but jump higher. (Score x1.5)"
  },
  hardcore: {
    lives: 1,
    scoreMult: 2.0,
    name: "Hardcore",
    desc: "You only have 1 life. (Score x2.0)"
  },
  tanky: {
    maxHp: 150,
    speedScale: 0.85,
    jumpScale: 0.95,
    gravityScale: 1.1,
    scoreMult: 0.6,
    name: "Tank",
    desc: "150 HP, but slower and heavier. (Score x0.6)"
  }
};

export const ENERGIZED_SPEED_MULTIPLIER = MODIFIER_CONFIG.energized.speedScale;

// Colors
export const COLORS = {
  player: '#3b82f6', // blue-500
  playerCrouch: '#1d4ed8', // blue-700
  platform: '#334155', // slate-700
  platformLight: '#475569', // slate-600 (highlight)
  platformDark: '#1e293b', // slate-800 (shadow)
  spike: '#ef4444', // red-500
  weakSpike: '#fb7185', // rose-400
  lava: '#f97316', // orange-500
  coin: '#eab308', // yellow-500
  finish: '#22c55e', // green-500
  checkpoint: '#6366f1', // indigo-500
  checkpointActive: '#10b981', // emerald-500
  background: '#0f172a', // slate-900
  bouncy: '#d946ef', // fuchsia-500
};

export const PARTICLE_COLORS = {
  dust: ['#94a3b8', '#64748b', '#cbd5e1'], // Grayish for ground
  fire: ['#f97316', '#ef4444', '#fbbf24', '#7c2d12'], // Orange/Red/Yellow for lava
  sparkle: ['#facc15', '#fef08a', '#ffffff'], // Yellow/White for coins
  blood: ['#ef4444', '#b91c1c'], // Red for death
  bouncy: ['#d946ef', '#f0abfc', '#fae8ff'], // Pink for bouncy pads
};

export const INITIAL_LIVES = 3;