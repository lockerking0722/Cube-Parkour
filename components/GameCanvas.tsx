
import React, { useEffect, useRef } from 'react';
import { Entity, LevelData, Vector, GameModifiers } from '../types';
import { 
  GRAVITY, MOVE_SPEED, RUN_SPEED, CROUCH_SPEED, 
  JUMP_FORCE, BOUNCE_FORCE, PLAYER_SIZE, CROUCH_HEIGHT, COLORS, PARTICLE_COLORS,
  MAX_FALL_SPEED, MODIFIER_CONFIG, MAX_JUMPS, DEFAULT_MAX_HP
} from '../constants';
import { playSound } from '../utils/audio';

interface GameCanvasProps {
  level: LevelData;
  modifiers: GameModifiers;
  onCoinCollect: (id: string) => void;
  collectedCoinIds: Set<string>;
  onDeath: () => void;
  onLevelComplete: () => void;
  isPaused: boolean;
  maxHp: number;
  onHealthUpdate: (hp: number) => void;
}

// Particle System Types
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'dust' | 'fire' | 'sparkle' | 'blood' | 'bouncy';
}

// AABB Collision Detection
const checkCollision = (rect1: { pos: Vector, size: Vector }, rect2: { pos: Vector, size: Vector }) => {
  return (
    rect1.pos.x < rect2.pos.x + rect2.size.x &&
    rect1.pos.x + rect1.size.x > rect2.pos.x &&
    rect1.pos.y < rect2.pos.y + rect2.size.y &&
    rect1.pos.y + rect1.size.y > rect2.pos.y
  );
};

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  level, 
  modifiers,
  onCoinCollect, 
  collectedCoinIds,
  onDeath, 
  onLevelComplete,
  isPaused,
  maxHp,
  onHealthUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determine effective constants based on modifiers
  const speedScale = (modifiers.energized ? MODIFIER_CONFIG.energized.speedScale : 1.0) * (modifiers.tanky ? MODIFIER_CONFIG.tanky.speedScale : 1.0);
  const gravityScale = (modifiers.lowGravity ? MODIFIER_CONFIG.lowGravity.gravityScale : (modifiers.highGravity ? MODIFIER_CONFIG.highGravity.gravityScale : 1.0)) * (modifiers.tanky ? MODIFIER_CONFIG.tanky.gravityScale : 1.0);
  const jumpScale = (modifiers.oldSchool ? MODIFIER_CONFIG.oldSchool.jumpScale : 1.0) * (modifiers.tanky ? MODIFIER_CONFIG.tanky.jumpScale : 1.0);
  
  const EFFECTIVE_GRAVITY = GRAVITY * gravityScale;
  const EFFECTIVE_JUMP_FORCE = JUMP_FORCE * jumpScale;
  const EFFECTIVE_MOVE_SPEED = MOVE_SPEED * speedScale;
  const EFFECTIVE_RUN_SPEED = RUN_SPEED * speedScale;
  const EFFECTIVE_CROUCH_SPEED = CROUCH_SPEED * speedScale;
  
  const CURRENT_MAX_JUMPS = modifiers.oldSchool ? MODIFIER_CONFIG.oldSchool.maxJumps : MAX_JUMPS;
  const EFFECTIVE_MAX_FALL = MAX_FALL_SPEED; 

  // Game State Refs (Mutable for performance)
  const playerRef = useRef({
    pos: { ...level.spawnPos },
    vel: { x: 0, y: 0 },
    size: { x: PLAYER_SIZE, y: PLAYER_SIZE },
    isGrounded: false,
    isCrouching: false,
    isDead: false,
    jumpsRemaining: CURRENT_MAX_JUMPS,
    hp: maxHp,
    invulnerableUntil: 0,
    facingRight: true, // For rendering eyes
  });
  
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const jumpRequested = useRef(false); // Track specific jump key presses
  const cameraRef = useRef<Vector>({ x: 0, y: 0 });
  const checkpointRef = useRef<Vector>({ ...level.spawnPos });
  const timeRef = useRef(0);
  const levelCompleteTriggered = useRef(false);
  const shakeRef = useRef(0); // Screen shake intensity
  
  const entitiesRef = useRef<Entity[]>([]);
  
  // Need to reset when level changes
  useEffect(() => {
    playerRef.current.pos = { ...level.spawnPos };
    playerRef.current.vel = { x: 0, y: 0 };
    playerRef.current.isDead = false;
    playerRef.current.jumpsRemaining = CURRENT_MAX_JUMPS;
    playerRef.current.hp = maxHp;
    playerRef.current.invulnerableUntil = 0;
    checkpointRef.current = { ...level.spawnPos };
    levelCompleteTriggered.current = false;
    particlesRef.current = [];
    
    onHealthUpdate(maxHp);
    
    entitiesRef.current = JSON.parse(JSON.stringify(level.entities)).map((e: Entity) => ({
      ...e,
      active: (e.type === 'coin' && collectedCoinIds.has(e.id)) ? false : true,
      collected: (e.type === 'coin' && collectedCoinIds.has(e.id)) ? true : false,
      startPos: { ...e.pos }
    }));
    
    cameraRef.current = { x: 0, y: 0 };
    timeRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, maxHp]); 

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) {
        jumpRequested.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const spawnParticles = (x: number, y: number, count: number, type: 'dust' | 'fire' | 'sparkle' | 'blood' | 'bouncy', speedScale: number = 1.0) => {
    for (let i = 0; i < count; i++) {
      const colors = PARTICLE_COLORS[type];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      let vx = (Math.random() - 0.5) * 2 * speedScale;
      let vy = (Math.random() - 0.5) * 2 * speedScale;
      let size = Math.random() * 4 + 2;
      let life = Math.random() * 30 + 30;

      if (type === 'dust') {
        vy = -Math.random() * 2; // Dust floats up mostly
        size = Math.random() * 3 + 1;
      } else if (type === 'fire') {
        vy = -Math.random() * 3 - 1; // Fire goes up
        vx = (Math.random() - 0.5) * 1;
        size = Math.random() * 5 + 2;
      } else if (type === 'sparkle') {
        life = Math.random() * 20 + 20;
      } else if (type === 'blood') {
        size = Math.random() * 6 + 3;
      } else if (type === 'bouncy') {
        vy = -Math.random() * 4 - 2; // Explode upwards
        vx = (Math.random() - 0.5) * 3;
        life = 40;
      }

      particlesRef.current.push({
        x, y, vx, vy, life, maxLife: life, size, color, type
      });
    }
  };

  // Main Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      if (isPaused) {
        draw();
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      timeRef.current += 1;
      
      // Reduce screen shake
      if (shakeRef.current > 0) shakeRef.current *= 0.9;
      if (shakeRef.current < 0.5) shakeRef.current = 0;

      if (playerRef.current.isDead) {
         spawnParticles(playerRef.current.pos.x + PLAYER_SIZE/2, playerRef.current.pos.y + PLAYER_SIZE/2, 50, 'blood', 4);
         playSound('die');

         playerRef.current.pos = { ...checkpointRef.current };
         playerRef.current.vel = { x: 0, y: 0 };
         playerRef.current.isDead = false;
         playerRef.current.jumpsRemaining = CURRENT_MAX_JUMPS;
         playerRef.current.hp = maxHp;
         playerRef.current.invulnerableUntil = 0;
         onHealthUpdate(maxHp);
         onDeath();
      }

      const player = playerRef.current;
      const keys = keysRef.current;

      // --- Update Particles ---
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life--;
        p.x += p.vx;
        p.y += p.vy;

        if (p.type === 'blood' || p.type === 'dust') {
           p.vy += 0.1; // Gravity for blood/dust
        }

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // --- Update Moving Entities ---
      entitiesRef.current.forEach(entity => {
        if (entity.patrolRange && entity.startPos) {
          const speed = entity.moveSpeed || 0.05;
          const offset = entity.moveOffset || 0;
          const t = timeRef.current * speed + offset;
          
          const offsetX = Math.sin(t) * entity.patrolRange.x;
          const offsetY = Math.sin(t) * entity.patrolRange.y;

          entity.pos.x = entity.startPos.x + offsetX;
          entity.pos.y = entity.startPos.y + offsetY;
        }

        // Spawn ambient lava bubbles
        if (entity.type === 'lava' && Math.random() < 0.05) {
          // Random point on surface
          const bx = entity.pos.x + Math.random() * entity.size.x;
          const by = entity.pos.y + Math.random() * entity.size.y;
          spawnParticles(bx, by, 1, 'fire', 0.5);
        }
      });

      // --- Movement Logic ---
      const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
      const isCrouchingInput = keys['ArrowDown'] || keys['KeyS'];
      
      // Update Crouch State
      if (isCrouchingInput && !player.isCrouching) {
        player.isCrouching = true;
        player.pos.y += (PLAYER_SIZE - CROUCH_HEIGHT); // Push down to floor
        player.size.y = CROUCH_HEIGHT;
        spawnParticles(player.pos.x + PLAYER_SIZE/2, player.pos.y + CROUCH_HEIGHT, 5, 'dust');
      } else if (!isCrouchingInput && player.isCrouching) {
        const testRect = {
          pos: { x: player.pos.x, y: player.pos.y - (PLAYER_SIZE - CROUCH_HEIGHT) },
          size: { x: PLAYER_SIZE, y: PLAYER_SIZE }
        };
        
        let canStand = true;
        for (const entity of entitiesRef.current) {
          if ((entity.type === 'platform' || entity.type === 'bouncy') && checkCollision(testRect, entity)) {
            canStand = false;
            break;
          }
        }

        if (canStand) {
          player.isCrouching = false;
          player.pos.y -= (PLAYER_SIZE - CROUCH_HEIGHT);
          player.size.y = PLAYER_SIZE;
        }
      }

      // X Movement
      let targetSpeed = 0;
      if (keys['ArrowRight'] || keys['KeyD']) {
        targetSpeed = isRunning ? EFFECTIVE_RUN_SPEED : (player.isCrouching ? EFFECTIVE_CROUCH_SPEED : EFFECTIVE_MOVE_SPEED);
        player.facingRight = true;
      } else if (keys['ArrowLeft'] || keys['KeyA']) {
        targetSpeed = -(isRunning ? EFFECTIVE_RUN_SPEED : (player.isCrouching ? EFFECTIVE_CROUCH_SPEED : EFFECTIVE_MOVE_SPEED));
        player.facingRight = false;
      }

      // Smooth acceleration/deceleration
      player.vel.x += (targetSpeed - player.vel.x) * 0.2;

      // Spawn running dust
      if (player.isGrounded && Math.abs(player.vel.x) > 1 && Math.random() < 0.2) {
         spawnParticles(player.pos.x + PLAYER_SIZE/2, player.pos.y + player.size.y, 1, 'dust');
      }

      // Y Movement (Gravity)
      player.vel.y += EFFECTIVE_GRAVITY;
      if (player.vel.y > EFFECTIVE_MAX_FALL) {
        player.vel.y = EFFECTIVE_MAX_FALL;
      }

      // Jump Logic
      if (jumpRequested.current) {
        if (player.jumpsRemaining > 0) {
          player.vel.y = EFFECTIVE_JUMP_FORCE;
          player.isGrounded = false;
          
          if (player.jumpsRemaining === CURRENT_MAX_JUMPS) {
            playSound('jump');
          } else {
            playSound('doubleJump');
          }
          
          player.jumpsRemaining--;
          
          // Jump particles
          spawnParticles(player.pos.x + PLAYER_SIZE/2, player.pos.y + player.size.y, 8, 'dust');
        }
        jumpRequested.current = false;
      }

      // --- Collision Detection & Physics Application ---
      
      // X Axis
      player.pos.x += player.vel.x;
      if (player.pos.x < 0) { player.pos.x = 0; player.vel.x = 0; }
      if (player.pos.x > level.width - player.size.x) { player.pos.x = level.width - player.size.x; player.vel.x = 0; }

      for (const entity of entitiesRef.current) {
        if (entity.type === 'text') continue;
        if ((entity.type === 'platform' || entity.type === 'bouncy') && checkCollision(player, entity)) {
          if (player.vel.x > 0) {
            player.pos.x = entity.pos.x - player.size.x;
          } else if (player.vel.x < 0) {
            player.pos.x = entity.pos.x + entity.size.x;
          }
          player.vel.x = 0;
        }
      }

      // Y Axis
      player.pos.y += player.vel.y;
      
      if (player.pos.y > level.height) {
        player.isDead = true;
      }

      let groundedThisFrame = false;
      for (const entity of entitiesRef.current) {
        if (entity.type === 'text') continue;
        if ((entity.type === 'platform' || entity.type === 'bouncy') && checkCollision(player, entity)) {
           if (player.vel.y > 0) { // Falling
             if (entity.type === 'bouncy') {
               // BOUNCE LOGIC
               player.pos.y = entity.pos.y - player.size.y;
               player.vel.y = BOUNCE_FORCE;
               player.isGrounded = false;
               player.jumpsRemaining = CURRENT_MAX_JUMPS; // Restore double jump? Optional. Let's say yes for fun.
               spawnParticles(player.pos.x + PLAYER_SIZE/2, player.pos.y + player.size.y, 12, 'bouncy');
               playSound('bounce');
             } else {
               // LAND LOGIC
               player.pos.y = entity.pos.y - player.size.y;
               if (!player.isGrounded) {
                 // Just landed
                 spawnParticles(player.pos.x + PLAYER_SIZE/2, player.pos.y + player.size.y, 10, 'dust');
               }
               player.vel.y = 0;
               groundedThisFrame = true;
             }
           } else if (player.vel.y < 0) { // Jumping into ceiling
             player.pos.y = entity.pos.y + entity.size.y;
             player.vel.y = 0;
           }
        }
      }

      player.isGrounded = groundedThisFrame;

      if (player.isGrounded) {
        player.jumpsRemaining = CURRENT_MAX_JUMPS;
      }

      // --- Interaction ---
      for (const entity of entitiesRef.current) {
        if (!entity.active && entity.type !== 'checkpoint') continue;
        if (entity.type === 'text') continue;

        if (checkCollision(player, entity)) {
          if (entity.type === 'coin' && !entity.collected) {
            entity.collected = true;
            entity.active = false;
            // Sparkle effect
            spawnParticles(entity.pos.x + entity.size.x/2, entity.pos.y + entity.size.y/2, 15, 'sparkle');
            playSound('coin');
            onCoinCollect(entity.id);
          } else if (entity.type === 'spike' || entity.type === 'lava') {
            
            // DAMAGE LOGIC
            if (timeRef.current > player.invulnerableUntil) {
              const damage = entity.damage ?? 1000;
              player.hp -= damage;
              onHealthUpdate(player.hp);
              
              shakeRef.current = 10; // Screen shake

              if (player.hp > 0) {
                playSound('hurt');
                player.invulnerableUntil = timeRef.current + 60;
                player.vel.y = -5;
                player.vel.x = -player.vel.x * 1.5;
                spawnParticles(player.pos.x + PLAYER_SIZE/2, player.pos.y + PLAYER_SIZE/2, 10, 'blood');
              } else {
                player.isDead = true;
              }
            }

          } else if (entity.type === 'finish') {
            if (!levelCompleteTriggered.current) {
              levelCompleteTriggered.current = true;
              spawnParticles(player.pos.x, player.pos.y, 50, 'sparkle');
              playSound('win');
              onLevelComplete();
            }
          } else if (entity.type === 'checkpoint') {
            if (checkpointRef.current.x !== entity.pos.x || checkpointRef.current.y !== entity.pos.y) {
               spawnParticles(entity.pos.x + entity.size.x/2, entity.pos.y, 20, 'sparkle');
               playSound('coin'); // Reusing coin sound for checkpoint
            }
            checkpointRef.current = { x: entity.pos.x, y: entity.pos.y };
            entity.active = true; 
          }
        }
      }

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      // Camera Follow
      const player = playerRef.current;
      cameraRef.current.x = player.pos.x - canvas.width / 2 + player.size.x / 2;
      cameraRef.current.y = player.pos.y - canvas.height / 2 + player.size.y / 2;
      
      // Add Shake
      const shakeX = (Math.random() - 0.5) * shakeRef.current;
      const shakeY = (Math.random() - 0.5) * shakeRef.current;
      
      cameraRef.current.x = Math.max(0, Math.min(cameraRef.current.x, level.width - canvas.width)) + shakeX;
      cameraRef.current.y = Math.max(0, Math.min(cameraRef.current.y, level.height - canvas.height)) + shakeY;

      // Clear
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Parallax Background
      drawParallaxBackground(ctx, canvas.width, canvas.height, cameraRef.current.x, cameraRef.current.y);

      ctx.save();
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      // Draw Entities
      entitiesRef.current.forEach(entity => {
        if (!entity.active && entity.type !== 'checkpoint') return;

        // Render Text
        if (entity.type === 'text' && entity.text) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `bold ${entity.fontSize || 20}px 'Segoe UI', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.fillText(entity.text, entity.pos.x + entity.size.x / 2, entity.pos.y);
          ctx.shadowBlur = 0;
          return;
        }

        // --- Render Specific Entity Types ---
        if (entity.type === 'platform') {
          // Draw detailed block
          ctx.fillStyle = COLORS.platform;
          ctx.fillRect(entity.pos.x, entity.pos.y, entity.size.x, entity.size.y);
          
          // Highlight (Top edge)
          ctx.fillStyle = COLORS.platformLight;
          ctx.fillRect(entity.pos.x, entity.pos.y, entity.size.x, 4);
          
          // Shadow (Bottom/Right edge)
          ctx.fillStyle = COLORS.platformDark;
          ctx.fillRect(entity.pos.x, entity.pos.y + entity.size.y - 4, entity.size.x, 4);
          ctx.fillRect(entity.pos.x + entity.size.x - 4, entity.pos.y, 4, entity.size.y);

        } else if (entity.type === 'bouncy') {
          // Bouncy Block
          ctx.fillStyle = COLORS.bouncy;
          ctx.fillRect(entity.pos.x, entity.pos.y, entity.size.x, entity.size.y);
          
          // Gel highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(entity.pos.x, entity.pos.y, entity.size.x, 6);
          ctx.fillRect(entity.pos.x + 4, entity.pos.y + 4, 8, 8); // Shine spot

        } else if (entity.type === 'coin') {
           // Animated Coin
           const cx = entity.pos.x + entity.size.x / 2;
           const cy = entity.pos.y + entity.size.y / 2;
           
           // Bobbing
           const bobOffset = Math.sin(timeRef.current * 0.1) * 5;
           // Spinning (width scaling)
           const spinScale = Math.abs(Math.cos(timeRef.current * 0.15));

           ctx.fillStyle = COLORS.coin;
           ctx.shadowColor = '#fbbf24';
           ctx.shadowBlur = 10;
           ctx.beginPath();
           ctx.ellipse(cx, cy + bobOffset, (entity.size.x / 2) * spinScale, entity.size.y / 2, 0, 0, Math.PI * 2);
           ctx.fill();
           ctx.shadowBlur = 0;
           
           // Shine
           ctx.fillStyle = '#fff';
           ctx.beginPath();
           ctx.ellipse(cx - 2 * spinScale, cy + bobOffset - 4, (entity.size.x / 6) * spinScale, entity.size.y / 6, 0, 0, Math.PI * 2);
           ctx.fill();

        } else if (entity.type === 'spike') {
           // Gradient Spike
           const grad = ctx.createLinearGradient(entity.pos.x, entity.pos.y + entity.size.y, entity.pos.x, entity.pos.y);
           const baseColor = (entity.damage && entity.damage < 100) ? COLORS.weakSpike : COLORS.spike;
           grad.addColorStop(0, '#7f1d1d'); // Dark base
           grad.addColorStop(1, baseColor);  // Bright tip

           ctx.fillStyle = grad;
           ctx.beginPath();
           ctx.moveTo(entity.pos.x, entity.pos.y + entity.size.y);
           ctx.lineTo(entity.pos.x + entity.size.x / 2, entity.pos.y);
           ctx.lineTo(entity.pos.x + entity.size.x, entity.pos.y + entity.size.y);
           ctx.fill();

        } else if (entity.type === 'lava') {
           // Wavy Lava
           ctx.fillStyle = COLORS.lava;
           // Base rect
           ctx.fillRect(entity.pos.x, entity.pos.y + 5, entity.size.x, entity.size.y - 5);
           
           // Wavy top
           ctx.beginPath();
           ctx.moveTo(entity.pos.x, entity.pos.y + 5);
           for (let lx = 0; lx <= entity.size.x; lx += 10) {
              const waveY = Math.sin((lx + entity.pos.x + timeRef.current * 2) * 0.05) * 4;
              ctx.lineTo(entity.pos.x + lx, entity.pos.y + 5 + waveY);
           }
           ctx.lineTo(entity.pos.x + entity.size.x, entity.pos.y + entity.size.y);
           ctx.lineTo(entity.pos.x, entity.pos.y + entity.size.y);
           ctx.fill();

        } else if (entity.type === 'checkpoint') {
           const isCurrent = checkpointRef.current.x === entity.pos.x && checkpointRef.current.y === entity.pos.y;
           const color = isCurrent ? COLORS.checkpointActive : COLORS.checkpoint; 
           
           // Base
           ctx.fillStyle = '#1e293b';
           ctx.fillRect(entity.pos.x, entity.pos.y + entity.size.y - 4, entity.size.x, 4);

           // Pole
           ctx.fillStyle = '#475569';
           ctx.fillRect(entity.pos.x + 4, entity.pos.y, 4, entity.size.y);

           // Flag
           ctx.fillStyle = color;
           if (isCurrent) {
             ctx.shadowColor = color;
             ctx.shadowBlur = 10;
           }
           ctx.beginPath();
           ctx.moveTo(entity.pos.x + 8, entity.pos.y + 4);
           ctx.lineTo(entity.pos.x + 24, entity.pos.y + 12);
           ctx.lineTo(entity.pos.x + 8, entity.pos.y + 20);
           ctx.fill();
           ctx.shadowBlur = 0;

        } else if (entity.type === 'finish') {
           ctx.fillStyle = COLORS.finish;
           ctx.fillRect(entity.pos.x, entity.pos.y, entity.size.x, entity.size.y);
           // Chequerboard pattern inside
           ctx.fillStyle = 'rgba(255,255,255,0.2)';
           const checkSize = 10;
           for(let y=0; y<entity.size.y; y+=checkSize) {
             for(let x=0; x<entity.size.x; x+=checkSize) {
               if ((x/checkSize + y/checkSize) % 2 === 0) {
                 ctx.fillRect(entity.pos.x + x, entity.pos.y + y, checkSize, checkSize);
               }
             }
           }
        }
      });

      // --- Draw Particles ---
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        
        if (p.type === 'sparkle') {
          // Cross shape for sparkles
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y);
          ctx.lineTo(p.x + p.size, p.y);
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Circle for others
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1.0;

      // --- Draw Player ---
      const isInvulnerable = timeRef.current < player.invulnerableUntil;
      if (isInvulnerable && Math.floor(timeRef.current / 4) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(player.pos.x + player.size.x/2, player.pos.y + player.size.y + 2, player.size.x/2, 4, 0, 0, Math.PI*2);
      ctx.fill();

      // Body (Rounded Rect)
      const r = 8; // Radius
      const x = player.pos.x;
      const y = player.pos.y;
      const w = player.size.x;
      const h = player.size.y;

      const playerColor = player.isCrouching ? COLORS.playerCrouch : COLORS.player;
      const gradient = ctx.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, '#60a5fa'); // Lighter blue top
      gradient.addColorStop(1, playerColor);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();

      // Eyes
      ctx.fillStyle = 'white';
      const eyeOffsetX = player.facingRight ? 4 : -4;
      const eyeY = player.isCrouching ? y + 6 : y + 8;
      
      // Eye whites
      ctx.beginPath();
      ctx.arc(x + w/2 + eyeOffsetX - 5, eyeY, 4, 0, Math.PI*2);
      ctx.arc(x + w/2 + eyeOffsetX + 5, eyeY, 4, 0, Math.PI*2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#0f172a';
      const lookDirX = player.vel.x * 0.5;
      const lookDirY = player.vel.y * 0.2;
      ctx.beginPath();
      ctx.arc(x + w/2 + eyeOffsetX - 5 + lookDirX, eyeY + lookDirY, 2, 0, Math.PI*2);
      ctx.arc(x + w/2 + eyeOffsetX + 5 + lookDirX, eyeY + lookDirY, 2, 0, Math.PI*2);
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      ctx.restore();
    };

    // Helper to draw Parallax Background
    const drawParallaxBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, camX: number, camY: number) => {
       // Draw Grid
       ctx.strokeStyle = '#1e293b'; // slate-800
       ctx.lineWidth = 1;
       
       const gridSize = 100;
       const offsetX = -(camX * 0.2) % gridSize;
       const offsetY = -(camY * 0.2) % gridSize;

       ctx.beginPath();
       for (let x = offsetX; x < width; x += gridSize) {
         ctx.moveTo(x, 0);
         ctx.lineTo(x, height);
       }
       for (let y = offsetY; y < height; y += gridSize) {
         ctx.moveTo(0, y);
         ctx.lineTo(width, y);
       }
       ctx.stroke();

       // Draw Stars (Procedural but deterministic based on screen coord)
       ctx.fillStyle = '#cbd5e1';
       for (let i = 0; i < 50; i++) {
         // Create some fake stars that move slowly
         const starX = ((i * 137) + camX * 0.1) % (width + 200);
         const starY = ((i * 243) + camY * 0.1) % (height + 200);
         
         // Wrap logic simply
         const wrapX = starX < 0 ? starX + width : starX % width;
         const wrapY = starY < 0 ? starY + height : starY % height;
         
         const size = (i % 3) + 1;
         ctx.globalAlpha = 0.3;
         ctx.fillRect(wrapX, wrapY, size, size);
       }
       ctx.globalAlpha = 1.0;
    };

    // Resize handling
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Start loop
    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [level, isPaused, onCoinCollect, onDeath, onLevelComplete, modifiers, maxHp, onHealthUpdate, EFFECTIVE_GRAVITY, EFFECTIVE_MOVE_SPEED, EFFECTIVE_RUN_SPEED, EFFECTIVE_CROUCH_SPEED, EFFECTIVE_JUMP_FORCE, CURRENT_MAX_JUMPS, EFFECTIVE_MAX_FALL]);

  return <canvas ref={canvasRef} className="block" />;
};
