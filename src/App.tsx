import { useState, useEffect, useCallback, useRef } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 5;
const MIN_SPEED = 50;

function App() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved) : 0;
  });
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [foodPulse, setFoodPulse] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);

  const directionRef = useRef(direction);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsPlaying(true);
    setShowStartScreen(false);
  }, [generateFood]);

  const checkCollision = useCallback((head: Position, body: Position[]): boolean => {
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    return body.some(segment => segment.x === head.x && segment.y === head.y);
  }, []);

  const moveSnake = useCallback(() => {
    if (!isPlaying || gameOver) return;

    setSnake(currentSnake => {
      const head = { ...currentSnake[0] };
      const currentDirection = directionRef.current;

      switch (currentDirection) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      if (checkCollision(head, currentSnake)) {
        setGameOver(true);
        setIsPlaying(false);
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('snakeHighScore', score.toString());
        }
        return currentSnake;
      }

      const newSnake = [head, ...currentSnake];

      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10);
        setFood(generateFood(newSnake));
        setFoodPulse(true);
        setTimeout(() => setFoodPulse(false), 200);
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREASE));
        return newSnake;
      }

      newSnake.pop();
      return newSnake;
    });
  }, [isPlaying, gameOver, food, generateFood, checkCollision, score, highScore]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [isPlaying, speed, moveSnake]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showStartScreen && (e.key === ' ' || e.key === 'Enter')) {
      resetGame();
      return;
    }

    if (gameOver && (e.key === ' ' || e.key === 'Enter')) {
      resetGame();
      return;
    }

    const keyDirections: Record<string, Direction> = {
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      w: 'UP',
      s: 'DOWN',
      a: 'LEFT',
      d: 'RIGHT',
      W: 'UP',
      S: 'DOWN',
      A: 'LEFT',
      D: 'RIGHT',
    };

    const newDirection = keyDirections[e.key];
    if (!newDirection) return;

    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };

    if (opposites[newDirection] !== directionRef.current) {
      directionRef.current = newDirection;
      setDirection(newDirection);
    }
  }, [gameOver, showStartScreen, resetGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Touch controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    const minSwipe = 30;

    if (Math.abs(deltaX) < minSwipe && Math.abs(deltaY) < minSwipe) {
      if (showStartScreen || gameOver) {
        resetGame();
      }
      return;
    }

    let newDirection: Direction;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      newDirection = deltaX > 0 ? 'RIGHT' : 'LEFT';
    } else {
      newDirection = deltaY > 0 ? 'DOWN' : 'UP';
    }

    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };

    if (opposites[newDirection] !== directionRef.current) {
      directionRef.current = newDirection;
      setDirection(newDirection);
    }

    touchStartRef.current = null;
  };

  const DirectionButton = ({ dir, label, className }: { dir: Direction; label: string; className: string }) => (
    <button
      className={`w-14 h-14 md:w-16 md:h-16 bg-black/60 border-2 border-[#00ff00]/40 rounded-lg
        text-[#00ff00] text-2xl font-bold active:bg-[#00ff00]/20 active:border-[#00ff00]
        transition-all duration-100 flex items-center justify-center ${className}`}
      onClick={() => {
        const opposites: Record<Direction, Direction> = {
          UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
        };
        if (opposites[dir] !== directionRef.current) {
          directionRef.current = dir;
          setDirection(dir);
        }
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-3 md:p-6 relative overflow-hidden">
      {/* CRT Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
      </div>

      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00ff00]/5 rounded-full blur-[100px]" />
      <div className="absolute top-1/4 right-1/4 w-[200px] h-[200px] bg-[#ff0066]/5 rounded-full blur-[80px]" />

      {/* Header */}
      <div className="text-center mb-3 md:mb-6 relative z-10">
        <h1 className="font-['Press_Start_2P'] text-2xl md:text-4xl text-[#00ff00] drop-shadow-[0_0_20px_rgba(0,255,0,0.8)] mb-2">
          SNAKE
        </h1>
        <div className="flex gap-4 md:gap-8 justify-center font-['Press_Start_2P'] text-xs md:text-sm">
          <div className="text-[#00ff00]/70">
            SCORE: <span className="text-[#00ff00]">{score.toString().padStart(4, '0')}</span>
          </div>
          <div className="text-[#ff0066]/70">
            HIGH: <span className="text-[#ff0066]">{highScore.toString().padStart(4, '0')}</span>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative z-10">
        {/* CRT Monitor Frame */}
        <div className="bg-gradient-to-b from-[#2a2a35] to-[#1a1a22] p-2 md:p-4 rounded-2xl shadow-[0_0_60px_rgba(0,255,0,0.2),inset_0_2px_10px_rgba(255,255,255,0.1)]">
          <div className="bg-gradient-to-b from-[#15151d] to-[#0d0d12] p-2 md:p-3 rounded-xl">
            {/* Game Area */}
            <div
              ref={gameAreaRef}
              className="relative bg-[#0a0a0f] rounded-lg overflow-hidden"
              style={{
                width: 'min(calc(100vw - 48px), 400px)',
                height: 'min(calc(100vw - 48px), 400px)',
                boxShadow: 'inset 0 0 60px rgba(0,255,0,0.1), 0 0 2px rgba(0,255,0,0.5)',
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Grid Lines */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #00ff00 1px, transparent 1px),
                    linear-gradient(to bottom, #00ff00 1px, transparent 1px)
                  `,
                  backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`,
                }}
              />

              {/* Snake */}
              {snake.map((segment, index) => (
                <div
                  key={index}
                  className="absolute transition-all duration-75"
                  style={{
                    left: `${(segment.x / GRID_SIZE) * 100}%`,
                    top: `${(segment.y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    padding: '1px',
                  }}
                >
                  <div
                    className={`w-full h-full rounded-sm ${
                      index === 0
                        ? 'bg-[#00ff00] shadow-[0_0_15px_#00ff00,0_0_30px_#00ff00]'
                        : 'bg-[#00cc00]'
                    }`}
                    style={{
                      opacity: 1 - (index * 0.03),
                      boxShadow: index === 0
                        ? '0 0 15px #00ff00, 0 0 30px #00ff00'
                        : `0 0 ${10 - index * 0.5}px rgba(0,255,0,${0.5 - index * 0.02})`,
                    }}
                  />
                </div>
              ))}

              {/* Food */}
              <div
                className={`absolute transition-all duration-100 ${foodPulse ? 'scale-150' : 'scale-100'}`}
                style={{
                  left: `${(food.x / GRID_SIZE) * 100}%`,
                  top: `${(food.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  padding: '2px',
                }}
              >
                <div
                  className="w-full h-full rounded-full bg-[#ff0066] animate-pulse"
                  style={{
                    boxShadow: '0 0 15px #ff0066, 0 0 30px #ff0066, 0 0 45px #ff0066',
                  }}
                />
              </div>

              {/* Start Screen */}
              {showStartScreen && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 p-4">
                  <div className="font-['Press_Start_2P'] text-[#00ff00] text-center">
                    <div className="text-lg md:text-2xl mb-4 md:mb-6 animate-pulse">READY?</div>
                    <div className="text-[8px] md:text-xs text-[#00ff00]/70 mb-3 md:mb-4 leading-relaxed">
                      <p className="hidden md:block">WASD OR ARROWS</p>
                      <p className="hidden md:block">TO MOVE</p>
                      <p className="md:hidden">SWIPE TO MOVE</p>
                      <p className="md:hidden">OR USE D-PAD</p>
                    </div>
                    <button
                      onClick={resetGame}
                      className="px-4 md:px-6 py-2 md:py-3 bg-[#00ff00] text-black text-xs md:text-sm rounded hover:bg-[#00cc00] transition-colors shadow-[0_0_20px_rgba(0,255,0,0.5)]"
                    >
                      START
                    </button>
                  </div>
                </div>
              )}

              {/* Game Over Screen */}
              {gameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 p-4">
                  <div className="font-['Press_Start_2P'] text-center">
                    <div className="text-xl md:text-3xl text-[#ff0066] mb-3 md:mb-4 drop-shadow-[0_0_20px_rgba(255,0,102,0.8)]">
                      GAME OVER
                    </div>
                    <div className="text-xs md:text-sm text-[#00ff00] mb-1 md:mb-2">
                      SCORE: {score}
                    </div>
                    {score >= highScore && score > 0 && (
                      <div className="text-[10px] md:text-xs text-[#ffff00] mb-3 md:mb-4 animate-pulse">
                        NEW HIGH SCORE!
                      </div>
                    )}
                    <button
                      onClick={resetGame}
                      className="px-4 md:px-6 py-2 md:py-3 bg-[#ff0066] text-white text-xs md:text-sm rounded hover:bg-[#cc0052] transition-colors shadow-[0_0_20px_rgba(255,0,102,0.5)]"
                    >
                      PLAY AGAIN
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Power LED */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#00ff00] shadow-[0_0_10px_#00ff00]' : 'bg-[#ff0066] shadow-[0_0_10px_#ff0066]'}`} />
          <span className="font-['Press_Start_2P'] text-[8px] text-white/40">
            {isPlaying ? 'PLAYING' : gameOver ? 'GAME OVER' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Mobile D-Pad Controls */}
      <div className="md:hidden mt-6 relative z-10">
        <div className="flex flex-col items-center gap-1">
          <DirectionButton dir="UP" label="▲" className="" />
          <div className="flex gap-1">
            <DirectionButton dir="LEFT" label="◀" className="" />
            <div className="w-14 h-14" /> {/* Spacer */}
            <DirectionButton dir="RIGHT" label="▶" className="" />
          </div>
          <DirectionButton dir="DOWN" label="▼" className="" />
        </div>
      </div>

      {/* Instructions (Desktop) */}
      <div className="hidden md:block mt-6 font-['Press_Start_2P'] text-[10px] text-white/30 text-center relative z-10">
        <p>USE WASD OR ARROW KEYS TO MOVE</p>
        <p className="mt-1">PRESS SPACE TO {showStartScreen ? 'START' : gameOver ? 'RESTART' : 'PLAY'}</p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-3 md:bottom-4 left-0 right-0 text-center z-10">
        <p className="font-['Press_Start_2P'] text-[6px] md:text-[8px] text-white/20 tracking-wider">
          Requested by @Oyaaayves · Built by @clonkbot
        </p>
      </footer>
    </div>
  );
}

export default App;
