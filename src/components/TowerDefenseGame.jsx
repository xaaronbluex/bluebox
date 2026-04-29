import { useEffect, useRef, useState } from "react";

const INITIAL_CASTLE_HP = 1000;
const INITIAL_COINS = 100;
const MONSTER_COST = 1;
const MONSTER_SIZE = 20;
const MONSTER_MAX_HP = 1;
const MONSTER_SPEED = 0.45;
const MONSTER_ATTACK_DAMAGE = 1;
const MONSTER_ATTACK_COOLDOWN_MS = 500;
const ARROW_RADIUS = 3;
const BASE_ARROW_SPEED = 14;
const BASE_ARROW_DAMAGE = 1;
const BASE_FIRE_INTERVAL_MS = 1000;
const MIN_AIM_SPEED = 2.5;
const MAX_AIM_DISTANCE = 320;
const GRAVITY = 0.22;
const LEVEL_COST = 10;
const BOT_SUMMON_INTERVAL_MS = 1700;
const FIRE_DOT_SECONDS = 10;
const ICE_FREEZE_MS = 2000;

/** Canvas fill colors per friendly creature type (Goblin / Orc / Troll). */
const PLAYER_CREATURE_COLORS = {
  Goblin: "#22c55e",
  Orc: "#f97316",
  Troll: "#a855f7",
};

function getPlayerCreatureColor(type) {
  return PLAYER_CREATURE_COLORS[type] ?? "#22c55e";
}

export default function TowerDefenseGame() {
  const [playerCastleHp, setPlayerCastleHp] = useState(INITIAL_CASTLE_HP);
  const [botCastleHp, setBotCastleHp] = useState(INITIAL_CASTLE_HP);
  const [coins, setCoins] = useState(INITIAL_COINS);
  const [level, setLevel] = useState(1);
  const [autoFire, setAutoFire] = useState(false);
  const [effectMode, setEffectMode] = useState("none");
  const [monsters, setMonsters] = useState([]);
  const [enemyMonsters, setEnemyMonsters] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [statusMessage, setStatusMessage] = useState("Click canvas to toggle auto-fire");
  const [gameOver, setGameOver] = useState(false);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const autoFireIntervalRef = useRef(null);
  const aimPointRef = useRef({ x: 170, y: 250 });
  const aimAngleRef = useRef(0);
  const nextArrowEffectRef = useRef("fire");

  const monstersRef = useRef([]);
  const enemyMonstersRef = useRef([]);
  const arrowsRef = useRef([]);
  const playerCastleHpRef = useRef(INITIAL_CASTLE_HP);
  const botCastleHpRef = useRef(INITIAL_CASTLE_HP);
  const levelRef = useRef(1);
  const autoFireRef = useRef(false);
  const effectModeRef = useRef("none");
  const lastBotSummonAtRef = useRef(0);
  const gameOverRef = useRef(false);
  const lastArrowSpawnAtRef = useRef(0);

  useEffect(() => {
    monstersRef.current = monsters;
  }, [monsters]);

  useEffect(() => {
    enemyMonstersRef.current = enemyMonsters;
  }, [enemyMonsters]);

  useEffect(() => {
    arrowsRef.current = arrows;
  }, [arrows]);

  useEffect(() => {
    playerCastleHpRef.current = playerCastleHp;
  }, [playerCastleHp]);

  useEffect(() => {
    botCastleHpRef.current = botCastleHp;
  }, [botCastleHp]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    autoFireRef.current = autoFire;
  }, [autoFire]);

  useEffect(() => {
    effectModeRef.current = effectMode;
  }, [effectMode]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  function getArrowDamage() {
    return BASE_ARROW_DAMAGE + (levelRef.current - 1);
  }

  function getArrowSpeed() {
    // Keep max shooting range fixed across all levels.
    return BASE_ARROW_SPEED;
  }

  function getAimLaunchSpeed(canvas) {
    const originX = 80;
    const originY = canvas.height - 144;
    const dx = aimPointRef.current.x - originX;
    const dy = aimPointRef.current.y - originY;
    const distance = Math.hypot(dx, dy);
    const pullRatio = Math.min(1, distance / MAX_AIM_DISTANCE);
    // Short pull = short shot, far pull = far shot.
    return MIN_AIM_SPEED + (getArrowSpeed() - MIN_AIM_SPEED) * pullRatio;
  }

  function getLaunchVectorToAim(canvas) {
    const originX = 80;
    const originY = canvas.height - 144;
    const dx = aimPointRef.current.x - originX;
    const dy = aimPointRef.current.y - originY;
    const distance = Math.hypot(dx, dy);
    // Use a target frame count and solve velocity so the projectile reaches
    // the cursor exactly on that frame under the same gravity update as runtime.
    const framesToAim = Math.max(9, Math.min(42, Math.round(distance / 18)));
    const gravityDisplacement = GRAVITY * framesToAim * (framesToAim + 1) * 0.5;
    const velocityX = dx / framesToAim;
    const velocityY = (dy - gravityDisplacement) / framesToAim;
    return { velocityX, velocityY };
  }

  function getFireIntervalMs() {
    // +50% firing speed per level => interval divided by (1 + 0.5 * (level - 1)).
    const speedMultiplier = 1 + (levelRef.current - 1) * 0.5;
    return BASE_FIRE_INTERVAL_MS / speedMultiplier;
  }

  function stopAutoFireInterval() {
    if (autoFireIntervalRef.current) {
      clearInterval(autoFireIntervalRef.current);
      autoFireIntervalRef.current = null;
    }
  }

  function startAutoFireInterval() {
    stopAutoFireInterval();
    autoFireIntervalRef.current = setInterval(() => {
      if (!gameOverRef.current && autoFireRef.current) createArrow();
    }, getFireIntervalMs());
  }

  function createArrow() {
    const canvas = canvasRef.current;
    if (!canvas || gameOverRef.current) return;
    const originX = 80;
    const originY = canvas.height - 144;

    let effect = "none";
    if (effectModeRef.current === "fire") effect = "fire";
    if (effectModeRef.current === "ice") effect = "ice";
    if (effectModeRef.current === "dual") {
      effect = nextArrowEffectRef.current;
      nextArrowEffectRef.current = nextArrowEffectRef.current === "fire" ? "ice" : "fire";
    }

    const launch = getLaunchVectorToAim(canvas);
    const newArrow = {
      id: `${Date.now()}-${Math.random()}`,
      x: originX,
      y: originY,
      velocityX: launch.velocityX,
      velocityY: launch.velocityY,
      damage: getArrowDamage(),
      effect,
    };

    setArrows((prev) => {
      const next = [...prev, newArrow];
      arrowsRef.current = next;
      return next;
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const render = () => {
      const { width, height } = canvas;
      const now = performance.now();
      const groundY = height - 80;

      const playerCastle = { x: 20, y: groundY - 90, width: 60, height: 90 };
      const botCastle = { x: width - 80, y: groundY - 90, width: 60, height: 90 };
      const arrowOrigin = { x: playerCastle.x + playerCastle.width, y: playerCastle.y + 26 };

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, groundY, width, height - groundY);

      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(playerCastle.x, playerCastle.y, playerCastle.width, playerCastle.height);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(botCastle.x, botCastle.y, botCastle.width, botCastle.height);

      // Aim guide follows mouse trajectory direction.
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = autoFireRef.current ? "#22c55e" : "#ef4444";
      ctx.beginPath();
      ctx.moveTo(arrowOrigin.x, arrowOrigin.y);
      // Predict the exact parabolic arc using current launch speed/angle + gravity.
      let previewX = arrowOrigin.x;
      let previewY = arrowOrigin.y;
      const launch = getLaunchVectorToAim(canvas);
      const previewVX = launch.velocityX;
      let previewVY = launch.velocityY;
      for (let step = 0; step < 260; step += 1) {
        previewVY += GRAVITY;
        previewX += previewVX;
        previewY += previewVY;
        if (previewX < 0 || previewX > width || previewY < 0 || previewY > height) break;
        ctx.lineTo(previewX, previewY);
      }
      ctx.stroke();
      ctx.restore();

      let nextMonsters = [...monstersRef.current];
      let nextEnemyMonsters = [...enemyMonstersRef.current];

      if (!gameOverRef.current && now - lastBotSummonAtRef.current >= BOT_SUMMON_INTERVAL_MS) {
        lastBotSummonAtRef.current = now;
        nextEnemyMonsters.push({
          id: `enemy-${Date.now()}-${Math.random()}`,
          x: botCastle.x - MONSTER_SIZE - 8,
          y: groundY - MONSTER_SIZE,
          hp: MONSTER_MAX_HP,
          speed: MONSTER_SPEED,
          frozenUntil: 0,
          burningUntil: 0,
          lastDotTickAt: 0,
          lastAttackAt: 0,
        });
      }

      nextMonsters = nextMonsters.map((monster) => {
        const frozen = monster.frozenUntil && now < monster.frozenUntil;
        const blocked = nextEnemyMonsters.some(
          (enemy) => Math.abs(monster.x - enemy.x) < MONSTER_SIZE && Math.abs(monster.y - enemy.y) < MONSTER_SIZE
        );
        return { ...monster, x: frozen || blocked ? monster.x : monster.x + monster.speed };
      });

      nextEnemyMonsters = nextEnemyMonsters.map((monster) => {
        const frozen = monster.frozenUntil && now < monster.frozenUntil;
        const blocked = nextMonsters.some(
          (ally) => Math.abs(monster.x - ally.x) < MONSTER_SIZE && Math.abs(monster.y - ally.y) < MONSTER_SIZE
        );
        return { ...monster, x: frozen || blocked ? monster.x : monster.x - monster.speed };
      });

      // Goblin vs goblin combat: each melee hit deals 1 damage.
      nextMonsters = nextMonsters.map((ally) => {
        const enemyIdx = nextEnemyMonsters.findIndex((enemy) => Math.abs(ally.x - enemy.x) < MONSTER_SIZE);
        if (enemyIdx === -1) return ally;
        if (now - (ally.lastAttackAt ?? 0) < MONSTER_ATTACK_COOLDOWN_MS) return ally;
        nextEnemyMonsters[enemyIdx] = { ...nextEnemyMonsters[enemyIdx], hp: nextEnemyMonsters[enemyIdx].hp - MONSTER_ATTACK_DAMAGE };
        return { ...ally, lastAttackAt: now };
      });

      nextEnemyMonsters = nextEnemyMonsters.map((enemy) => {
        const allyIdx = nextMonsters.findIndex((ally) => Math.abs(enemy.x - ally.x) < MONSTER_SIZE);
        if (allyIdx === -1) return enemy;
        if (now - (enemy.lastAttackAt ?? 0) < MONSTER_ATTACK_COOLDOWN_MS) return enemy;
        nextMonsters[allyIdx] = { ...nextMonsters[allyIdx], hp: nextMonsters[allyIdx].hp - MONSTER_ATTACK_DAMAGE };
        return { ...enemy, lastAttackAt: now };
      });

      // Fire DoT: 1 damage per second for 10 seconds.
      nextEnemyMonsters = nextEnemyMonsters.map((enemy) => {
        if (!(enemy.burningUntil && now < enemy.burningUntil)) return enemy;
        if (now - (enemy.lastDotTickAt ?? 0) < 1000) return enemy;
        return { ...enemy, hp: enemy.hp - 1, lastDotTickAt: now };
      });

      nextMonsters = nextMonsters.map((monster) => {
        if (monster.x + MONSTER_SIZE < botCastle.x) return monster;
        if (now - (monster.lastAttackAt ?? 0) < MONSTER_ATTACK_COOLDOWN_MS) return monster;
        const nextHp = Math.max(0, botCastleHpRef.current - MONSTER_ATTACK_DAMAGE);
        botCastleHpRef.current = nextHp;
        setBotCastleHp(nextHp);
        return { ...monster, x: botCastle.x - MONSTER_SIZE, lastAttackAt: now };
      });

      nextEnemyMonsters = nextEnemyMonsters.map((monster) => {
        if (monster.x > playerCastle.x + playerCastle.width) return monster;
        if (now - (monster.lastAttackAt ?? 0) < MONSTER_ATTACK_COOLDOWN_MS) return monster;
        const nextHp = Math.max(0, playerCastleHpRef.current - MONSTER_ATTACK_DAMAGE);
        playerCastleHpRef.current = nextHp;
        setPlayerCastleHp(nextHp);
        return { ...monster, x: playerCastle.x + playerCastle.width, lastAttackAt: now };
      });

      let nextArrows = arrowsRef.current.map((arrow) => {
        // Parabolic projectile motion:
        // - x uses horizontal velocity each frame
        // - y uses vertical velocity and gravity increases vertical velocity continuously.
        const updatedVelocityY = arrow.velocityY + GRAVITY;
        return {
          ...arrow,
          prevX: arrow.x,
          prevY: arrow.y,
          x: arrow.x + arrow.velocityX,
          y: arrow.y + updatedVelocityY,
          velocityY: updatedVelocityY,
        };
      });

      nextArrows.forEach((arrow) => {
        ctx.fillStyle = arrow.effect === "fire" ? "#fb923c" : arrow.effect === "ice" ? "#38bdf8" : "#facc15";
        // Draw a short segment so very fast arrows still look continuous/smooth.
        if (Number.isFinite(arrow.prevX) && Number.isFinite(arrow.prevY)) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(arrow.prevX, arrow.prevY);
          ctx.lineTo(arrow.x, arrow.y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(arrow.x, arrow.y, ARROW_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      nextArrows = nextArrows.filter((arrow) => arrow.x >= 0 && arrow.x <= width && arrow.y >= 0 && arrow.y <= height);

      // Arrow collision with enemy goblins.
      const remainingArrows = [];
      for (const arrow of nextArrows) {
        const hitMonsterIndex = nextEnemyMonsters.findIndex(
          (monster) => {
            const minX = monster.x;
            const maxX = monster.x + MONSTER_SIZE;
            const minY = monster.y;
            const maxY = monster.y + MONSTER_SIZE;

            const steps = 8;
            for (let i = 0; i <= steps; i += 1) {
              const t = i / steps;
              const px = (arrow.prevX ?? arrow.x) + (arrow.x - (arrow.prevX ?? arrow.x)) * t;
              const py = (arrow.prevY ?? arrow.y) + (arrow.y - (arrow.prevY ?? arrow.y)) * t;
              if (px >= minX && px <= maxX && py >= minY && py <= maxY) return true;
            }
            return false;
          }
        );

        if (hitMonsterIndex === -1) {
          remainingArrows.push(arrow);
          continue;
        }

        const hitEnemy = nextEnemyMonsters[hitMonsterIndex];
        const updatedEnemy = { ...hitEnemy, hp: hitEnemy.hp - arrow.damage };
        if (arrow.effect === "fire") {
          updatedEnemy.burningUntil = now + FIRE_DOT_SECONDS * 1000;
          updatedEnemy.lastDotTickAt = now;
        }
        if (arrow.effect === "ice") {
          updatedEnemy.frozenUntil = now + ICE_FREEZE_MS;
        }
        nextEnemyMonsters[hitMonsterIndex] = updatedEnemy;
      }

      nextMonsters = nextMonsters.filter((monster) => monster.hp > 0);
      const enemyCountBeforeCleanup = nextEnemyMonsters.length;
      nextEnemyMonsters = nextEnemyMonsters.filter((monster) => monster.hp > 0);
      const defeatedEnemies = enemyCountBeforeCleanup - nextEnemyMonsters.length;
      if (defeatedEnemies > 0) {
        setCoins((prev) => prev + defeatedEnemies);
      }

      nextMonsters.forEach((monster) => {
        ctx.fillStyle = getPlayerCreatureColor(monster.type);
        ctx.fillRect(monster.x, monster.y, MONSTER_SIZE, MONSTER_SIZE);
      });
      nextEnemyMonsters.forEach((monster) => {
        ctx.fillStyle = monster.frozenUntil && now < monster.frozenUntil ? "#93c5fd" : "#a78bfa";
        ctx.fillRect(monster.x, monster.y, MONSTER_SIZE, MONSTER_SIZE);
      });

      if (!gameOverRef.current && botCastleHpRef.current <= 0) {
        gameOverRef.current = true;
        setGameOver(true);
        setStatusMessage("Victory! Bot castle destroyed.");
      } else if (!gameOverRef.current && playerCastleHpRef.current <= 0) {
        gameOverRef.current = true;
        setGameOver(true);
        setStatusMessage("Defeated! Player castle has fallen.");
      } else if (autoFireRef.current) {
        setStatusMessage(`Auto-fire active | Lvl ${levelRef.current} | Damage ${getArrowDamage()} | Interval ${getFireIntervalMs()}ms`);
      } else {
        setStatusMessage("Click canvas to toggle auto-fire");
      }

      const monstersChanged = nextMonsters.length !== monstersRef.current.length;
      const enemyChanged = nextEnemyMonsters.length !== enemyMonstersRef.current.length;
      const arrowsChanged = remainingArrows.length !== arrowsRef.current.length;

      monstersRef.current = nextMonsters;
      enemyMonstersRef.current = nextEnemyMonsters;
      arrowsRef.current = remainingArrows;

      if (monstersChanged) setMonsters(nextMonsters);
      if (enemyChanged) setEnemyMonsters(nextEnemyMonsters);
      if (arrowsChanged) setArrows(remainingArrows);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopAutoFireInterval();
    };
  }, []);

  function handleSummonMonster(type) {
    if (gameOverRef.current) return;
    setCoins((prevCoins) => {
      if (prevCoins < MONSTER_COST) return prevCoins;
      const laneOffsetByType = {
        Goblin: 0,
        Orc: 6,
        Troll: 12,
      };
      setMonsters((prev) => {
        const canvasHeight = canvasRef.current?.height ?? 500;
        const groundY = canvasHeight - 80;
        const newMonster = {
          id: `${Date.now()}-${Math.random()}`,
          type,
          // Mirror bot spawn logic: spawn near castle edge on ground lane.
          x: 20 + 60 + 8,
          y: groundY - MONSTER_SIZE - (laneOffsetByType[type] ?? 0),
          hp: MONSTER_MAX_HP,
          speed: MONSTER_SPEED,
          frozenUntil: 0,
          burningUntil: 0,
          lastDotTickAt: 0,
          lastAttackAt: 0,
        };
        // Append onto live sim state to avoid snapping existing monsters back.
        const base = monstersRef.current;
        const next = [...base, newMonster];
        monstersRef.current = next;
        return next;
      });
      return prevCoins - MONSTER_COST;
    });
  }

  function handleLevelUp() {
    if (gameOverRef.current) return;
    setCoins((prev) => {
      if (prev < LEVEL_COST) return prev;
      setLevel((lv) => lv + 1);
      return prev - LEVEL_COST;
    });
  }

  function handleMouseMove(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    aimPointRef.current = { x, y };
    const originX = 80;
    const originY = canvas.height - 144;
    aimAngleRef.current = Math.atan2(y - originY, x - originX);
  }

  function toggleAutoFire() {
    if (gameOverRef.current) return;
    setAutoFire((prev) => {
      const next = !prev;
      if (next) {
        lastArrowSpawnAtRef.current = 0;
        startAutoFireInterval();
      } else {
        lastArrowSpawnAtRef.current = 0;
        stopAutoFireInterval();
      }
      return next;
    });
  }

  function handleRestart() {
    setPlayerCastleHp(INITIAL_CASTLE_HP);
    setBotCastleHp(INITIAL_CASTLE_HP);
    setCoins(INITIAL_COINS);
    setLevel(1);
    setAutoFire(false);
    setEffectMode("none");
    setMonsters([]);
    setEnemyMonsters([]);
    setArrows([]);
    setGameOver(false);
    setStatusMessage("Click canvas to toggle auto-fire");

    monstersRef.current = [];
    enemyMonstersRef.current = [];
    arrowsRef.current = [];
    playerCastleHpRef.current = INITIAL_CASTLE_HP;
    botCastleHpRef.current = INITIAL_CASTLE_HP;
    levelRef.current = 1;
    autoFireRef.current = false;
    effectModeRef.current = "none";
    gameOverRef.current = false;
    lastBotSummonAtRef.current = 0;
    lastArrowSpawnAtRef.current = 0;
    nextArrowEffectRef.current = "fire";
    stopAutoFireInterval();
  }

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center justify-between bg-slate-800 p-4 text-white">
        <div className="flex flex-col gap-1 text-left">
          <span className="text-xs uppercase tracking-wide text-slate-300">Player HP</span>
          <span className="text-lg font-bold">{playerCastleHp} / {INITIAL_CASTLE_HP}</span>
        </div>
        <div className="text-center">
          <span className="text-xs uppercase tracking-wide text-slate-300">Coins</span>
          <p className="text-2xl font-extrabold text-amber-300">{coins}</p>
          <p className="text-xs text-slate-300">Level {level}</p>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="text-xs uppercase tracking-wide text-slate-300">Bot HP</span>
          <span className="text-lg font-bold">{botCastleHp} / {INITIAL_CASTLE_HP}</span>
        </div>
      </div>

      <div className="bg-slate-900 px-3 py-2 text-center text-xs text-slate-200">{statusMessage}</div>

      <div className="relative w-full bg-zinc-900 p-2">
        <canvas
          ref={canvasRef}
          className="h-[500px] w-full rounded-md bg-zinc-900"
          onMouseMove={handleMouseMove}
          onClick={toggleAutoFire}
        />
        {gameOver ? (
          <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-md bg-black/55">
            <p className="text-3xl font-black text-white">{botCastleHp <= 0 ? "Victory!" : "Defeated"}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-700 p-4">
        <button
          onClick={() => handleSummonMonster("Goblin")}
          className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500"
        >
          Goblin (Cost: 1 Coin)
        </button>
        <button
          onClick={() => handleSummonMonster("Orc")}
          className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500"
        >
          Orc (Cost: 1 Coin)
        </button>
        <button
          onClick={() => handleSummonMonster("Troll")}
          className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500"
        >
          Troll (Cost: 1 Coin)
        </button>
        <button
          onClick={handleLevelUp}
          className="rounded bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-500"
        >
          Level Up (Cost: 10 Coins)
        </button>
        <button
          onClick={() => setEffectMode("fire")}
          className={`rounded px-4 py-2 font-bold text-white ${effectMode === "fire" ? "bg-orange-500" : "bg-slate-600 hover:bg-slate-500"}`}
        >
          Fire Arrows
        </button>
        <button
          onClick={() => setEffectMode("ice")}
          className={`rounded px-4 py-2 font-bold text-white ${effectMode === "ice" ? "bg-cyan-500" : "bg-slate-600 hover:bg-slate-500"}`}
        >
          Ice Arrows
        </button>
        <button
          onClick={() => setEffectMode("dual")}
          className={`rounded px-4 py-2 font-bold text-white ${effectMode === "dual" ? "bg-purple-500" : "bg-slate-600 hover:bg-slate-500"}`}
        >
          Dual (Fire + Ice)
        </button>
        <button
          onClick={handleRestart}
          className="rounded bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500"
        >
          Restart
        </button>
      </div>
    </div>
  );
}
