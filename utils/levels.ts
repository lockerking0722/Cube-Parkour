
import { LevelData, Entity, EntityType } from '../types';
import { TILE_SIZE } from '../constants';

const createEntity = (
  type: EntityType,
  x: number,
  y: number,
  w: number = 1,
  h: number = 1,
  props: Partial<Entity> = {}
): Entity => ({
  id: `${type}-${x}-${y}-${Math.random()}`,
  type,
  pos: { x: x * TILE_SIZE, y: y * TILE_SIZE },
  size: { x: w * TILE_SIZE, y: h * TILE_SIZE },
  active: true,
  ...props
});

const createText = (x: number, y: number, text: string, fontSize: number = 24) => ({
  id: `text-${x}-${y}-${Math.random()}`,
  type: 'text' as EntityType,
  pos: { x: x * TILE_SIZE, y: y * TILE_SIZE },
  size: { x: 0, y: 0 },
  active: true,
  text,
  fontSize
});

// Helper to quickly build platforms
const createPlatform = (x: number, y: number, w: number, h: number) => 
  createEntity('platform', x, y, w, h);

const createBouncyBlock = (x: number, y: number, w: number = 1, h: number = 1) =>
  createEntity('bouncy', x, y, w, h);

const createMovingHazard = (
  type: 'spike' | 'lava',
  x: number,
  y: number,
  w: number,
  h: number,
  rangeX: number,
  rangeY: number,
  speed: number = 0.02
) => createEntity(type, x, y, w, h, {
  patrolRange: { x: rangeX * TILE_SIZE, y: rangeY * TILE_SIZE },
  moveSpeed: speed,
  moveOffset: Math.random() * Math.PI * 2
});

const createWeakSpike = (x: number, y: number) => 
  createEntity('spike', x, y, 1, 1, { damage: 25 });

export const levels: LevelData[] = [
  {
    id: 0,
    name: "Tutorial",
    spawnPos: { x: 50, y: 550 },
    width: 3500,
    height: 800,
    entities: [
      // Start Area
      createPlatform(0, 16, 12, 4),
      createText(6, 10, "Use Arrows or WASD to Move"),
      
      // Jump Test
      createPlatform(14, 16, 4, 4),
      createText(16, 10, "Press Space to Jump"),

      // Double Jump Test
      createPlatform(21, 13, 6, 1),
      createPlatform(21, 14, 1, 6), // Wall
      createText(24, 8, "Double Jump in Mid-Air!"),

      // Crouch Test
      createPlatform(29, 13, 10, 1), // Floor
      createPlatform(29, 11, 10, 1), // Ceiling
      createText(34, 8, "Hold Down/S to Crouch"),

      // Hazard Intro
      createPlatform(42, 13, 3, 1),
      createText(46, 8, "Red Spikes = INSTANT DEATH"),
      createPlatform(46, 13, 5, 1),
      createEntity('spike', 48, 12, 1, 1), 
      
      // Weak Spike Intro
      createPlatform(52, 13, 10, 1), // Extended platform to create separation
      createText(54, 8, "Pink Spikes = 25 Damage"),
      createWeakSpike(54, 12),
      
      // Lava Intro (Shifted right to avoid text overlap)
      createText(68, 8, "Avoid Orange Lava"),
      createPlatform(65, 13, 3, 1),
      createEntity('lava', 68, 15, 4, 1), // Pit
      createPlatform(73, 13, 3, 1),

      // Finish
      createEntity('coin', 34, 12, 0.5, 0.5), // In crouch tunnel
      createEntity('coin', 48, 10, 0.5, 0.5), // Over spike
      createPlatform(78, 13, 5, 1),
      createEntity('finish', 80, 10, 2, 3),
    ]
  },
  {
    id: 1,
    name: "Level 1: The Beginning",
    spawnPos: { x: 100, y: 400 },
    width: 2000,
    height: 800,
    entities: [
      // Floor
      createPlatform(0, 15, 20, 2),
      createPlatform(24, 14, 10, 2),
      createPlatform(38, 12, 10, 5),
      
      // Floating platforms
      createPlatform(8, 11, 3, 1),
      createPlatform(14, 9, 3, 1),
      createPlatform(20, 7, 3, 1),
      
      // Hazards
      createWeakSpike(12, 14), // Weak spike to be forgiving
      createEntity('spike', 13, 14, 1, 1), // Real spike
      createEntity('lava', 20, 16, 4, 1),
      
      // Coins - Adjusted for better accessibility
      createEntity('coin', 9, 8, 0.5, 0.5),
      createEntity('coin', 15, 6, 0.5, 0.5),
      createEntity('coin', 26, 11, 0.5, 0.5),
      
      // Checkpoint
      createEntity('checkpoint', 24, 12, 1, 2),
      
      // Finish
      createEntity('finish', 45, 9, 2, 3),
    ],
  },
  {
    id: 2,
    name: "Level 2: Heat Wave",
    spawnPos: { x: 50, y: 500 },
    width: 2500,
    height: 1000,
    entities: [
      // Starting Area
      createPlatform(0, 18, 10, 5),
      
      // Parkour Section
      createPlatform(13, 17, 2, 1),
      createPlatform(18, 15, 2, 1),
      createPlatform(24, 13, 2, 1),
      
      // Crouch Section (Low ceiling)
      createPlatform(30, 15, 12, 1), // Floor
      createPlatform(30, 13, 12, 1), // Ceiling
      
      // Lava Pit
      createPlatform(42, 15, 2, 8),
      createEntity('lava', 44, 20, 10, 2),
      createPlatform(46, 17, 2, 1),
      createPlatform(50, 15, 2, 1),
      createPlatform(54, 13, 2, 1),
      createPlatform(58, 15, 5, 5),

      // Moving Spikes - Sliding on ground now
      createPlatform(14, 14, 5, 1),
      // Platform x=14, w=5 (14 to 19). Center 16.5. Range 2.
      createMovingHazard('spike', 16, 13, 1, 1, 2, 0, 0.03),

      // Coins
      createEntity('coin', 19, 12, 0.5, 0.5),
      createEntity('coin', 36, 14.2, 0.5, 0.5), 
      createEntity('coin', 50, 12, 0.5, 0.5),
      
      // Checkpoint
      createEntity('checkpoint', 24, 11, 1, 2),

      // Finish
      createEntity('finish', 60, 12, 2, 3),
    ]
  },
  {
    id: 3,
    name: "Level 3: Verticality",
    spawnPos: { x: 50, y: 700 },
    width: 1500,
    height: 1200,
    entities: [
       createPlatform(0, 20, 12, 2),
       // Steps up - Widened for easier jumping
       createPlatform(10, 18, 3, 1), 
       createPlatform(14, 16, 3, 1),
       createPlatform(18, 14, 3, 1),
       createPlatform(14, 10, 3, 1),
       createPlatform(10, 6, 3, 1),
       
       // Big fall risk
       createEntity('lava', 0, 22, 50, 2),

       // Moving platforms - Widened and slowed
       createPlatform(11, 12, 7, 1), 
       // Platform 11, w=7 (11-18). Center 14.5. 
       createMovingHazard('spike', 14.5, 11, 1, 1, 2, 0, 0.02),

       createPlatform(11, 8, 7, 1),
       createMovingHazard('spike', 14.5, 7, 1, 1, -2, 0, 0.02),

       // Checkpoint
       createEntity('checkpoint', 10, 4, 1, 2),

       // Coins
       createEntity('coin', 15, 13, 0.5, 0.5),
       createEntity('coin', 11, 3, 0.5, 0.5),

       // Finish
       createEntity('finish', 25, 18, 2, 3),
    ]
  },
  {
    id: 4,
    name: "Level 4: Moving Danger",
    spawnPos: { x: 50, y: 400 },
    width: 3000,
    height: 1000,
    entities: [
      createPlatform(0, 15, 5, 1),
      
      // Platform 1: x=8, w=5 (8 to 13). 
      // Safe Range for 1-wide spike: 8 to 12. Center 10. Range 2.
      createPlatform(8, 15, 5, 1),
      createMovingHazard('spike', 10, 14, 1, 1, 2, 0, 0.03),
      
      // Platform 2: x=16, w=5 (16 to 21).
      // Safe Range: 16 to 20. Center 18. Range 2.
      createPlatform(16, 13, 5, 1),
      createMovingHazard('spike', 18, 12, 1, 1, 2, 0, 0.03),

      createPlatform(24, 15, 3, 1),
      // Checkpoint stands here at 24.

      // Moving lava platform. x=27, w=4 (27 to 31).
      // Safe Range for 1-wide lava: 27 to 30. Center 28.5. Range 1.5.
      // NOTE: Range must strictly not hit 24. Min x = 27. Safe.
      createPlatform(27, 15, 4, 1), 
      createMovingHazard('lava', 28.5, 14, 1, 1, 1.5, 0, 0.02),

      createPlatform(34, 12, 3, 1),
      
      // Moving lava sea below
      createMovingHazard('lava', 30, 20, 5, 2, 5, 0, 0.02),
      createPlatform(38, 14, 2, 1),
      createPlatform(44, 12, 2, 1),
      createPlatform(50, 14, 2, 1),

      // Coins
      createEntity('coin', 10, 12, 0.5, 0.5),
      createEntity('coin', 28, 12, 0.5, 0.5),
      createEntity('coin', 44, 9, 0.5, 0.5),

      // Checkpoint
      createEntity('checkpoint', 24, 13, 1, 2),

      createPlatform(56, 15, 10, 2),
      createEntity('finish', 61, 12, 2, 3),
    ]
  },
  {
    id: 5,
    name: "Level 5: The Gauntlet",
    spawnPos: { x: 50, y: 600 },
    width: 3500,
    height: 1200,
    entities: [
      createPlatform(0, 18, 6, 1), // Safer start

      // Platform 1: Widened for safety
      createPlatform(8, 18, 5, 1),
      createMovingHazard('spike', 10, 17, 1, 1, 1.5, 0, 0.03), // Slower

      // Platform 2: Widened
      createPlatform(16, 18, 5, 1),
      createMovingHazard('spike', 18, 17, 1, 1, -1.5, 0, 0.03), // Slower
      
      // SAFE ZONE
      createPlatform(24, 16, 3, 1),

      // Lava falls removed. Now just jumps over a pit.
      // Pit floor (lava)
      createEntity('lava', 28, 24, 12, 2),

      createPlatform(30, 14, 3, 1),
      createPlatform(36, 12, 3, 1),

      // SAFE ZONE & Checkpoint
      createPlatform(42, 12, 6, 1),
      createEntity('checkpoint', 45, 10, 1, 2),
      createEntity('coin', 45, 8, 0.5, 0.5), // Reward coin

      // The descent
      createPlatform(52, 14, 4, 1),
      createPlatform(58, 16, 4, 1),
      
      // Ground hazard section
      createPlatform(48, 20, 20, 1), // Floor
      createMovingHazard('spike', 58, 19, 1, 1, 4, 0, 0.03),

      // Final Coins
      createEntity('coin', 10, 15, 0.5, 0.5),
      createEntity('coin', 30, 10, 0.5, 0.5),
      createEntity('coin', 62, 14, 0.5, 0.5),

      createPlatform(68, 16, 10, 2),
      createEntity('finish', 73, 13, 2, 3),
    ]
  },
  {
    id: 6,
    name: "Level 6: Precision",
    spawnPos: { x: 100, y: 500 },
    width: 3500,
    height: 1000,
    entities: [
      createPlatform(0, 15, 10, 2),
      
      // Tiny platforms sequence
      createPlatform(12, 13, 2, 1),
      createPlatform(16, 11, 2, 1),
      createPlatform(20, 11, 2, 1),
      
      // Spike trap
      createPlatform(24, 13, 6, 1),
      createEntity('spike', 26, 12, 1, 1),
      createEntity('spike', 27, 12, 1, 1),
      
      // Moving platform jump
      createPlatform(32, 11, 4, 1),
      createMovingHazard('spike', 34, 10, 1, 1, 1.5, 0, 0.04),

      // Checkpoint
      createPlatform(40, 10, 5, 1),
      createEntity('checkpoint', 42, 8, 1, 2),

      // High Road vs Low Road
      createPlatform(48, 8, 3, 1), // High
      createPlatform(48, 14, 3, 1), // Low
      createEntity('lava', 48, 15, 3, 1), // Low road danger
      
      // Convergence
      createPlatform(54, 10, 4, 1),
      
      // Final Stretch
      createPlatform(60, 12, 2, 1),
      createPlatform(64, 10, 2, 1),
      createPlatform(68, 12, 2, 1),
      createEntity('lava', 58, 20, 20, 2), // Pit below

      // Coins
      createEntity('coin', 16, 9, 0.5, 0.5),
      createEntity('coin', 26, 10, 0.5, 0.5), // Risky coin above spikes
      createEntity('coin', 48, 6, 0.5, 0.5), // High road coin

      createPlatform(72, 10, 10, 2),
      createEntity('finish', 78, 7, 2, 3),
    ]
  },
  {
    id: 7,
    name: "Level 7: The Climb",
    spawnPos: { x: 150, y: 1400 }, // Start at bottom
    width: 1200,
    height: 1600,
    entities: [
      createPlatform(0, 36, 15, 2), // Base floor
      
      // The ascent begins
      createPlatform(10, 32, 4, 1),
      createPlatform(4, 29, 4, 1),
      createPlatform(12, 26, 4, 1),
      createPlatform(2, 23, 4, 1),

      // Hazard Layer 1
      createPlatform(10, 20, 8, 1),
      createMovingHazard('spike', 14, 19, 1, 1, 3, 0, 0.03),

      // Checkpoint
      createPlatform(2, 17, 6, 1),
      createEntity('checkpoint', 4, 15, 1, 2),

      // Narrow vertical jumps
      createPlatform(12, 15, 3, 1),
      createPlatform(16, 12, 3, 1),
      createPlatform(12, 9, 3, 1),
      
      // Moving vertical hazard logic? (Using x-movement for now)
      createPlatform(4, 9, 6, 1),
      createMovingHazard('spike', 7, 8, 1, 1, 2, 0, 0.04),

      // Final Climb
      createPlatform(10, 6, 3, 1),
      createPlatform(15, 4, 3, 1),
      createPlatform(20, 4, 3, 1), // Top right

      // Coins
      createEntity('coin', 4, 27, 0.5, 0.5),
      createEntity('coin', 17, 18, 0.5, 0.5), // Risky coin near spike
      createEntity('coin', 12, 7, 0.5, 0.5),

      // Finish at top
      createPlatform(2, 4, 6, 2),
      createEntity('finish', 4, 1, 2, 3),
    ]
  },
  {
    id: 8,
    name: "Level 8: Dimension Drift",
    spawnPos: { x: 100, y: 600 },
    width: 4000,
    height: 1200,
    entities: [
      createPlatform(0, 15, 8, 2),
      
      // Long jump over lava
      createEntity('lava', 8, 18, 10, 2),
      createPlatform(10, 12, 2, 1),
      createPlatform(14, 10, 2, 1),
      
      // Safe island
      createPlatform(18, 12, 6, 1),
      createMovingHazard('spike', 21, 11, 1, 1, 2, 0, 0.03),

      // Tunnel
      createPlatform(26, 14, 10, 1), // Floor
      createPlatform(26, 10, 10, 1), // Ceiling
      createMovingHazard('spike', 31, 13, 1, 1, 2.5, 0, 0.035), // Slower, less range

      // Checkpoint 1
      createPlatform(38, 12, 4, 1),
      createEntity('checkpoint', 39, 10, 1, 2),

      // The moving lava sea
      createPlatform(44, 14, 3, 1),
      createPlatform(50, 12, 3, 1),
      createPlatform(56, 14, 3, 1),
      createMovingHazard('lava', 50, 16, 4, 2, 6, 0, 0.02), // Patrols below

      // Checkpoint 2
      createPlatform(62, 12, 6, 1),
      createEntity('checkpoint', 64, 10, 1, 2),

      // Final Sprint
      createPlatform(70, 14, 15, 1),
      createMovingHazard('spike', 72, 13, 1, 1, 0, 0, 0), // Static blocking
      createPlatform(72, 11, 2, 1), // Jump over
      
      createMovingHazard('spike', 78, 13, 1, 1, 1, 0, 0.05), // Slower

      // Coins
      createEntity('coin', 14, 8, 0.5, 0.5),
      createEntity('coin', 31, 12, 0.5, 0.5), // In tunnel
      createEntity('coin', 50, 10, 0.5, 0.5), // Over lava
      createEntity('coin', 72, 9, 0.5, 0.5), // Jump over spike

      createPlatform(88, 14, 10, 2),
      createEntity('finish', 93, 11, 2, 3),
    ]
  },
  {
    id: 9,
    name: "Level 9: Bounce House",
    spawnPos: { x: 50, y: 600 },
    width: 2500,
    height: 800,
    entities: [
      createPlatform(0, 18, 8, 2),
      
      // Intro Bounce
      createText(12, 12, "Jump on Pink Blocks!"),
      createBouncyBlock(10, 18, 4, 1),
      createPlatform(16, 12, 4, 1), // Target 1

      // Gap Bounce
      createBouncyBlock(22, 14, 2, 1),
      createPlatform(26, 10, 4, 1), // Target 2

      // Checkpoint
      createEntity('checkpoint', 28, 8, 1, 2),

      // High Wall Bounce
      createPlatform(34, 14, 2, 8), // Wall
      createBouncyBlock(32, 16, 2, 1), // Launcher
      createPlatform(34, 6, 6, 1), // Top of wall

      // Hazard Bounce
      createEntity('lava', 42, 18, 10, 2), // Pit
      createBouncyBlock(44, 14, 2, 1), // Mid-air bounce pad
      createBouncyBlock(48, 12, 2, 1), // Second bounce pad

      // Coins
      createEntity('coin', 12, 15, 0.5, 0.5), // Above first bounce
      createEntity('coin', 32, 12, 0.5, 0.5), // High jump
      createEntity('coin', 48, 9, 0.5, 0.5), // Risky bounce

      createPlatform(54, 12, 8, 2),
      createEntity('finish', 58, 9, 2, 3),
    ]
  },
  {
    id: 10,
    name: "Level 10: Sky High",
    spawnPos: { x: 50, y: 1000 },
    width: 2500,
    height: 1200,
    entities: [
      createPlatform(0, 25, 10, 2),

      // Vertical Bounce Climb
      createBouncyBlock(12, 23, 4, 1), // Widened
      createPlatform(18, 18, 5, 1), // Widened
      
      // Safety net for the bounce section below
      createPlatform(10, 15, 8, 1), 
      
      createBouncyBlock(12, 13, 4, 1), // Widened
      createPlatform(18, 8, 6, 1), // Widened landing

      // Checkpoint 1
      createEntity('checkpoint', 20, 6, 1, 2),

      // Moving Platform + Bouncy
      createPlatform(26, 10, 4, 1),
      // Slowed down spike from 0.03 to 0.02
      createMovingHazard('spike', 28, 9, 1, 1, 1, 0, 0.02),
      
      createBouncyBlock(34, 12, 2, 1),
      createEntity('lava', 30, 28, 20, 2), // Far below

      createPlatform(40, 8, 4, 1), // Widened

      // The Big Leap
      createBouncyBlock(46, 8, 2, 1),
      // Slowed down vertical spike and moved it slightly to be less punishing
      createMovingHazard('spike', 47, 4, 1, 1, 0, 1.5, 0.025), 
      
      // Coins
      createEntity('coin', 12, 20, 0.5, 0.5),
      createEntity('coin', 34, 9, 0.5, 0.5),
      createEntity('coin', 47, 10, 0.5, 0.5), // Under the spike

      createPlatform(52, 6, 8, 2),
      createEntity('finish', 56, 3, 2, 3),
    ]
  }
];
