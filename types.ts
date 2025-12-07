
export type Vector = {
  x: number;
  y: number;
};

export type EntityType = 
  | 'player' 
  | 'platform' 
  | 'spike' 
  | 'lava' 
  | 'coin' 
  | 'finish' 
  | 'checkpoint'
  | 'text'
  | 'bouncy';

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector;
  size: Vector;
  vel?: Vector;
  color?: string;
  // Damage properties
  damage?: number; // If undefined, assume instant kill
  // Text specific properties
  text?: string;
  fontSize?: number;
  // State specific properties
  collected?: boolean;
  active?: boolean;
  // Movement properties
  startPos?: Vector; // Initial position for patrolling
  patrolRange?: Vector; // Distance to move {x, y}
  moveSpeed?: number; // Speed multiplier for movement
  moveOffset?: number; // Time offset (0-Math.PI*2)
}

export interface LevelData {
  id: number;
  name: string;
  spawnPos: Vector;
  entities: Entity[];
  width: number;
  height: number;
}

export interface GameModifiers {
  energized: boolean;   // Speed boost
  lowGravity: boolean;  // Moon gravity
  highGravity: boolean; // Heavyweight
  oldSchool: boolean;   // No double jump
  hardcore: boolean;    // 1 Life
  tanky: boolean;       // High HP, slow
}

export interface GameState {
  currentLevelIndex: number;
  lives: number;
  coins: number;
  score: number;
  totalDeaths?: number;
  status: 'menu' | 'playing' | 'gameover' | 'victory' | 'level_transition';
}