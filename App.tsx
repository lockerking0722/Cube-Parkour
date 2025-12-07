
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState, GameModifiers } from './types';
import { INITIAL_LIVES, MODIFIER_CONFIG, DEFAULT_MAX_HP } from './constants';
import { levels } from './utils/levels';
import { Heart, Coins, Trophy, RefreshCw, Play, Map, Sliders, Zap, Award, Moon, Weight, ShieldAlert, Footprints, Shield, Share2, Check } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    currentLevelIndex: 0,
    lives: INITIAL_LIVES,
    coins: 0,
    score: 0,
    status: 'menu'
  });
  
  // Health State
  const [maxHp, setMaxHp] = useState(DEFAULT_MAX_HP);
  const [currentHp, setCurrentHp] = useState(DEFAULT_MAX_HP);

  const [modifiers, setModifiers] = useState<GameModifiers>({
    energized: false,
    lowGravity: false,
    highGravity: false,
    hardcore: false,
    oldSchool: false,
    tanky: false,
  });
  const [showModifiers, setShowModifiers] = useState(false);

  const [resetKey, setResetKey] = useState(0); // Used to force-remount GameCanvas
  const [isPaused, setIsPaused] = useState(false);
  
  // Coin Persistence
  const [collectedCoinIds, setCollectedCoinIds] = useState<Set<string>>(new Set());
  
  // Level Stats and Snapshot for Restart logic
  const [levelDeaths, setLevelDeaths] = useState(0);
  const [levelRestarts, setLevelRestarts] = useState(0);
  
  // Snapshot of state at the beginning of the level
  const [savedGameState, setSavedGameState] = useState<{
    coins: number;
    collectedCoinIds: Set<string>;
  }>({ coins: 0, collectedCoinIds: new Set() });

  // Share Feedback State
  const [showCopied, setShowCopied] = useState(false);

  const currentLevel = levels[gameState.currentLevelIndex];

  // Update Max HP based on modifiers
  useEffect(() => {
    const newMax = modifiers.tanky ? MODIFIER_CONFIG.tanky.maxHp : DEFAULT_MAX_HP;
    setMaxHp(newMax);
    // Don't auto-heal, but ensure hp doesn't exceed max if toggling off
    setCurrentHp(curr => Math.min(curr, newMax));
  }, [modifiers.tanky]);

  // Calculate total coins available in the game for ranking
  const totalCoinsAvailable = useMemo(() => {
    return levels.reduce((acc, lvl) => {
      return acc + lvl.entities.filter(e => e.type === 'coin').length;
    }, 0);
  }, []);

  const getRank = (coins: number, total: number) => {
    const percentage = total > 0 ? (coins / total) * 100 : 0;
    
    if (percentage >= 100) return { title: 'SUPREME', color: 'text-purple-500' };
    if (percentage >= 80) return { title: 'AMAZING', color: 'text-red-500' };
    if (percentage >= 60) return { title: 'OKAY', color: 'text-blue-500' };
    if (percentage >= 40) return { title: 'MEH', color: 'text-green-500' };
    if (percentage > 0) return { title: 'BAD', color: 'text-slate-600' };
    return { title: 'FAILED', color: 'text-black drop-shadow-[0_1.2px_1.2px_rgba(255,255,255,0.8)]' };
  };

  // Helper to calculate score multiplier based on active modifiers
  const calculateScoreMultiplier = useCallback(() => {
    let multiplier = 1.0;
    if (modifiers.energized) multiplier *= MODIFIER_CONFIG.energized.scoreMult;
    if (modifiers.lowGravity) multiplier *= MODIFIER_CONFIG.lowGravity.scoreMult;
    if (modifiers.highGravity) multiplier *= MODIFIER_CONFIG.highGravity.scoreMult;
    if (modifiers.hardcore) multiplier *= MODIFIER_CONFIG.hardcore.scoreMult;
    if (modifiers.oldSchool) multiplier *= MODIFIER_CONFIG.oldSchool.scoreMult;
    if (modifiers.tanky) multiplier *= MODIFIER_CONFIG.tanky.scoreMult;
    return multiplier;
  }, [modifiers]);

  const initLevel = (index: number, startCoins: number, startCollectedIds: Set<string>) => {
    // Snapshot the state
    setSavedGameState({
      coins: startCoins,
      collectedCoinIds: new Set(startCollectedIds)
    });
    
    // Reset stats for the new level
    setLevelDeaths(0);
    setLevelRestarts(0);
  };

  const handleStartGame = () => {
    const startLives = modifiers.hardcore ? MODIFIER_CONFIG.hardcore.lives : INITIAL_LIVES;
    setGameState({ 
      status: 'playing', 
      lives: startLives, 
      coins: 0, 
      score: 0,
      currentLevelIndex: 0,
      totalDeaths: 0
    });
    setCollectedCoinIds(new Set());
    // Reset HP
    const startHp = modifiers.tanky ? MODIFIER_CONFIG.tanky.maxHp : DEFAULT_MAX_HP;
    setCurrentHp(startHp);
    
    initLevel(0, 0, new Set());
    setResetKey(0);
    setShowModifiers(false);
  };

  const handleSelectLevel = (index: number) => {
    const startLives = modifiers.hardcore ? MODIFIER_CONFIG.hardcore.lives : INITIAL_LIVES;
    setGameState({
      currentLevelIndex: index,
      lives: startLives,
      coins: 0, 
      score: 0,
      totalDeaths: 0,
      status: 'playing'
    });
    setCollectedCoinIds(new Set());
    // Reset HP
    const startHp = modifiers.tanky ? MODIFIER_CONFIG.tanky.maxHp : DEFAULT_MAX_HP;
    setCurrentHp(startHp);

    initLevel(index, 0, new Set());
    setResetKey(0);
    setShowModifiers(false);
  };

  const handleCoinCollect = useCallback((id: string) => {
    setCollectedCoinIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setGameState(prev => ({ ...prev, coins: prev.coins + 1 }));
  }, []);

  const handleDeath = useCallback(() => {
    setLevelDeaths(d => d + 1);
    
    setGameState(prev => {
      const newLives = prev.lives - 1;
      const newTotalDeaths = (prev.totalDeaths || 0) + 1;

      if (newLives <= 0) {
        // LEVEL RESET Logic
        // Revert coins to what they were at start of level
        setCollectedCoinIds(new Set(savedGameState.collectedCoinIds));
        
        setLevelRestarts(r => r + 1);
        setResetKey(k => k + 1);
        
        return { 
          ...prev, 
          // Respect hardcore mode max lives on reset
          lives: modifiers.hardcore ? MODIFIER_CONFIG.hardcore.lives : INITIAL_LIVES, 
          coins: savedGameState.coins, // Revert coin count
          totalDeaths: newTotalDeaths
        };
      }
      
      return { ...prev, lives: newLives, totalDeaths: newTotalDeaths };
    });
  }, [savedGameState, modifiers.hardcore]);

  const handleLevelComplete = useCallback(() => {
    setGameState(prev => {
      // Calculate Points
      let points = 0;
      if (levelRestarts > 1) {
        points = 0;
      } else if (levelRestarts === 1) {
        points = 25;
      } else {
        // No restarts
        if (levelDeaths === 0) points = 100;
        else if (levelDeaths <= 2) points = 50;
        else points = 10; // Fallback for many deaths but no restart
      }

      // Apply Modifiers Scores
      const multiplier = calculateScoreMultiplier();
      points = Math.floor(points * multiplier);

      const nextLevelIdx = prev.currentLevelIndex + 1;
      if (nextLevelIdx >= levels.length) {
        return { ...prev, score: prev.score + points, status: 'victory' };
      }
      
      // Update snapshot for the NEXT level
      setSavedGameState({
        coins: prev.coins,
        collectedCoinIds: new Set(collectedCoinIds)
      });
      setLevelDeaths(0);
      setLevelRestarts(0);

      return { 
        ...prev, 
        score: prev.score + points,
        currentLevelIndex: nextLevelIdx, 
        status: 'level_transition' 
      };
    });
    
    // Auto transition after short delay
    setTimeout(() => {
      setGameState(prev => {
        if (prev.status === 'level_transition') {
          return { ...prev, status: 'playing' };
        }
        return prev;
      });
    }, 2000);
  }, [levelDeaths, levelRestarts, calculateScoreMultiplier, collectedCoinIds]);

  const handleRestart = () => {
    handleStartGame();
  };

  const handleShare = (textToShare: string) => {
    navigator.clipboard.writeText(textToShare).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  const toggleModifier = (key: keyof GameModifiers) => {
    setModifiers(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Mutual Exclusivity logic
      if (key === 'lowGravity' && next.lowGravity) next.highGravity = false;
      if (key === 'highGravity' && next.highGravity) {
         next.lowGravity = false;
         next.oldSchool = false; // Heavy + Old School is impossible
      }
      if (key === 'oldSchool' && next.oldSchool) {
         next.highGravity = false;
      }
      return next;
    });
  };

  const renderModifierToggle = (key: keyof GameModifiers, icon: React.ReactNode) => {
    const config = MODIFIER_CONFIG[key];
    const isActive = modifiers[key];
    return (
       <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex items-center justify-between mb-3 last:mb-0">
          <div>
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isActive ? 'text-emerald-400' : 'text-slate-300'}`}>
              {icon} {config.name}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {config.desc}
            </p>
          </div>
          
          <button 
            onClick={() => toggleModifier(key)}
            className={`w-14 h-8 rounded-full transition-colors relative ${isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
    );
  };

  // Input for Pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-900 overflow-hidden flex flex-col font-sans text-white select-none">
      
      {/* HUD */}
      {gameState.status !== 'menu' && (
        <div className="absolute top-0 left-0 w-full p-4 flex flex-col gap-2 pointer-events-none z-10">
          <div className="flex justify-between items-start w-full">
            <div className="flex gap-4">
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex items-center gap-2 shadow-lg">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                <span className="text-xl font-bold">
                  {gameState.lives}
                </span>
              </div>
              
              {/* Health Bar */}
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex flex-col justify-center gap-1 shadow-lg w-48">
                <div className="flex justify-between text-xs font-bold text-slate-300 uppercase">
                   <span>HP</span>
                   <span>{Math.max(0, currentHp)} / {maxHp}</span>
                </div>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 ease-out"
                     style={{ width: `${(Math.max(0, currentHp) / maxHp) * 100}%` }}
                   />
                </div>
              </div>

              <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex items-center gap-2 shadow-lg">
                <Coins className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                <span className="text-xl font-bold">{gameState.coins}</span>
              </div>
               <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex items-center gap-2 shadow-lg">
                <Award className="w-6 h-6 text-purple-400" />
                <span className="text-xl font-bold">{gameState.score}</span>
              </div>
            </div>
            
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-3 shadow-lg flex flex-col items-end gap-1">
              <h2 className="text-lg font-bold text-slate-200">{currentLevel.name}</h2>
              <div className="flex gap-2 flex-wrap justify-end">
                {modifiers.energized && <span className="text-[10px] font-bold bg-yellow-900 text-yellow-400 px-2 py-0.5 rounded">ENERGIZED</span>}
                {modifiers.lowGravity && <span className="text-[10px] font-bold bg-blue-900 text-blue-400 px-2 py-0.5 rounded">LOW GRAV</span>}
                {modifiers.highGravity && <span className="text-[10px] font-bold bg-orange-900 text-orange-400 px-2 py-0.5 rounded">HEAVY</span>}
                {modifiers.oldSchool && <span className="text-[10px] font-bold bg-purple-900 text-purple-400 px-2 py-0.5 rounded">OLD SCHOOL</span>}
                {modifiers.hardcore && <span className="text-[10px] font-bold bg-red-900 text-red-400 px-2 py-0.5 rounded">HARDCORE</span>}
                {modifiers.tanky && <span className="text-[10px] font-bold bg-teal-900 text-teal-400 px-2 py-0.5 rounded">TANK</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Layer */}
      {gameState.status !== 'menu' && gameState.status !== 'victory' && gameState.status !== 'gameover' && (
        <div className="flex-1 relative">
           {gameState.status === 'level_transition' && (
            <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-300">
               <h1 className="text-4xl font-bold text-emerald-400 mb-4">Level Complete!</h1>
               <div className="text-slate-400">Total Score: <span className="text-white font-bold">{gameState.score}</span></div>
            </div>
           )}
           <GameCanvas 
             // Combining level ID and resetKey ensures the component remounts fully
             // when the level changes OR when the player runs out of lives
             key={`${gameState.currentLevelIndex}-${resetKey}`}
             level={currentLevel}
             modifiers={modifiers}
             maxHp={maxHp}
             onHealthUpdate={setCurrentHp}
             collectedCoinIds={collectedCoinIds}
             onCoinCollect={handleCoinCollect}
             onDeath={handleDeath}
             onLevelComplete={handleLevelComplete}
             isPaused={isPaused || gameState.status === 'level_transition'}
           />
        </div>
      )}

      {/* Menus / Overlays */}
      {gameState.status === 'menu' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950">
          <div className="max-w-xl w-full p-8 text-center space-y-8 relative">
            <div className="space-y-2">
              <h1 className="text-6xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">
                Cube Parkour
              </h1>
              <p className="text-slate-400 text-lg">Master the movement. Dodge the hazards.</p>
            </div>

            {/* Main Menu Buttons */}
            {!showModifiers ? (
              <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button 
                  onClick={handleStartGame}
                  className="group w-full max-w-xs relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-500 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 focus:ring-offset-slate-900 shadow-lg shadow-blue-500/30"
                >
                  <Play className="w-6 h-6 mr-2 fill-current" />
                  Start Game
                </button>

                <div className="w-full max-w-xs">
                  <div className="flex items-center justify-center gap-2 mb-3 text-slate-500">
                    <Map className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">Level Select</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {levels.map((lvl, idx) => (
                      <button
                        key={lvl.id}
                        onClick={() => handleSelectLevel(idx)}
                        className="px-2 py-3 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:border-blue-500 transition-colors text-slate-300 font-bold text-sm"
                      >
                        {idx === 0 ? "Tut" : idx}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowModifiers(true)}
                    className="flex items-center text-slate-400 hover:text-white transition-colors gap-2"
                  >
                    <Sliders className="w-5 h-5" />
                    <span className="font-bold">Modifiers</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Modifiers Panel */
              <div className="bg-slate-800/90 backdrop-blur border border-slate-700 p-6 rounded-2xl animate-in zoom-in-95 duration-200 shadow-2xl max-w-lg mx-auto w-full">
                 <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold flex items-center gap-2">
                     <Sliders className="w-5 h-5 text-emerald-400" />
                     Game Modifiers
                   </h2>
                   <button onClick={() => setShowModifiers(false)} className="text-slate-400 hover:text-white font-bold text-sm">Close</button>
                 </div>
                 
                 <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {renderModifierToggle('energized', <Zap className="w-5 h-5 text-yellow-400" />)}
                    {renderModifierToggle('lowGravity', <Moon className="w-5 h-5 text-blue-400" />)}
                    {renderModifierToggle('highGravity', <Weight className="w-5 h-5 text-orange-400" />)}
                    {renderModifierToggle('oldSchool', <Footprints className="w-5 h-5 text-purple-400" />)}
                    {renderModifierToggle('hardcore', <ShieldAlert className="w-5 h-5 text-red-500" />)}
                    {renderModifierToggle('tanky', <Shield className="w-5 h-5 text-teal-400" />)}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState.status === 'gameover' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <h2 className="text-5xl font-black text-red-500 mb-2">GAME OVER</h2>
          <p className="text-slate-300 mb-8">You ran out of lives!</p>
          <button 
            onClick={handleRestart}
            className="flex items-center px-6 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </button>
        </div>
      )}

      {gameState.status === 'victory' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <Trophy className="w-24 h-24 text-yellow-400 mb-6 drop-shadow-lg" />
          <h2 className="text-5xl font-black text-white mb-2">VICTORY!</h2>
          
          <div className="my-8 text-center grid grid-cols-2 gap-8 w-full max-w-2xl px-4">
            {/* Left Column: Stats */}
            <div className="flex flex-col gap-4 text-right border-r border-slate-700 pr-8">
               <div>
                  <p className="text-slate-400 text-sm uppercase tracking-wider">Final Score</p>
                  <p className="text-4xl font-black text-purple-400">{gameState.score}</p>
               </div>
               <div>
                  <p className="text-slate-400 text-sm uppercase tracking-wider">Total Deaths</p>
                  <p className="text-3xl font-bold text-red-400">{gameState.totalDeaths || 0}</p>
               </div>
               <div>
                  <p className="text-slate-400 text-sm uppercase tracking-wider">Coins</p>
                  <p className="text-3xl font-bold text-yellow-400">{gameState.coins} <span className="text-xl text-slate-600">/ {totalCoinsAvailable}</span></p>
               </div>
            </div>

            {/* Right Column: Ranks */}
            <div className="flex flex-col gap-4 text-left pl-2">
               <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 font-bold text-xs uppercase w-20">Coin Rank</span>
                  {(() => {
                    const rank = getRank(gameState.coins, totalCoinsAvailable);
                    return <span className={`text-2xl font-black ${rank.color}`}>{rank.title}</span>;
                  })()}
               </div>
               
               <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 font-bold text-xs uppercase w-20">Skill Rank</span>
                  {(() => {
                    // Estimate max possible points per level ~100.
                    // Score depends on modifiers, so we divide by multiplier to normalize skill.
                    const multiplier = calculateScoreMultiplier();
                    const rawScore = gameState.score / multiplier;
                    const maxRawScore = levels.length * 100; 
                    const rank = getRank(rawScore, maxRawScore);
                    return <span className={`text-2xl font-black ${rank.color}`}>{rank.title}</span>;
                  })()}
               </div>

               <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-xl">
                  <span className="text-white font-bold text-xs uppercase w-20">Overall</span>
                  {(() => {
                    // Average percentage of Coins and Skill
                    const multiplier = calculateScoreMultiplier();
                    const rawScore = gameState.score / multiplier;
                    const maxRawScore = levels.length * 100;
                    
                    const coinPct = totalCoinsAvailable > 0 ? gameState.coins / totalCoinsAvailable : 0;
                    const skillPct = maxRawScore > 0 ? rawScore / maxRawScore : 0;
                    
                    const avgPct = (coinPct + skillPct) / 2;
                    // Mock 'getRank' call with effective 'coins' as avg * 100 and total as 100
                    const rank = getRank(avgPct * 100, 100);
                    
                    return <span className={`text-3xl font-black ${rank.color}`}>{rank.title}</span>;
                  })()}
               </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setGameState(prev => ({ ...prev, status: 'menu' }))}
              className="flex items-center px-8 py-4 bg-emerald-500 text-white rounded-full font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 text-lg"
            >
              Main Menu
            </button>
            <button 
              onClick={() => handleShare(`I scored ${gameState.score} points in Cube Parkour! 🏆 Can you beat my high score?`)}
              className="flex items-center px-8 py-4 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20 text-lg"
            >
              {showCopied ? <Check className="w-5 h-5 mr-2" /> : <Share2 className="w-5 h-5 mr-2" />}
              {showCopied ? "Copied!" : "Share Score"}
            </button>
          </div>
        </div>
      )}

      {/* Pause Menu Overlay */}
      {isPaused && gameState.status === 'playing' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <h2 className="text-4xl font-bold text-white mb-8">PAUSED</h2>
          <div className="flex gap-4">
             <button 
              onClick={() => setIsPaused(false)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors"
            >
              Resume
            </button>
            <button 
              onClick={() => setGameState(prev => ({ ...prev, status: 'menu' }))}
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold transition-colors"
            >
              Menu
            </button>
          </div>
         
        </div>
      )}
    </div>
  );
}
