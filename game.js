(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const Sprites = window.PixelSprites;
  const Sound = window.SoundEngine;
  const { px, pRect } = Sprites;

  // UI Элементы
  const hud = document.getElementById('hud');
  const hudDistance = document.getElementById('hudDistance');
  const hudCoins = document.getElementById('hudCoins');
  const tokenIndicator = document.getElementById('tokenIndicator');
  const activePowerupsEl = document.getElementById('activePowerups');

  const startScreen = document.getElementById('startScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const shopScreen = document.getElementById('shopScreen');
  const rouletteScreen = document.getElementById('rouletteScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');

  const totalCoinsStart = document.getElementById('totalCoinsStart');
  const bestDistStart = document.getElementById('bestDistStart');
  const startShieldBadge = document.getElementById('startShieldBadge');
  const startMissionsList = document.getElementById('startMissionsList');
  const pauseMissionsList = document.getElementById('pauseMissionsList');
  const totalCoinsShop = document.getElementById('totalCoinsShop');
  const shopGrid = document.getElementById('shopGrid');
  const soundMenuBtn = document.getElementById('soundMenuBtn');
  const soundHudBtn = document.getElementById('soundHudBtn');

  function updateSoundButtons() {
    if (soundMenuBtn) {
      soundMenuBtn.textContent = Sound.enabled ? '🔊 ЗВУК: ВКЛ' : '🔇 ЗВУК: ВЫКЛ';
    }
    if (soundHudBtn) {
      soundHudBtn.textContent = Sound.enabled ? '🔊' : '🔇';
    }
  }

  function toggleSound() {
    Sound.enabled = !Sound.enabled;
    if (Sound.enabled) {
      Sound.ensure();
      Sound.uiClick();
    }
    updateSoundButtons();
  }

  if (soundMenuBtn) soundMenuBtn.addEventListener('click', toggleSound);
  if (soundHudBtn) soundHudBtn.addEventListener('click', toggleSound);

  // Логический мир
  const WORLD_HEIGHT = 720;
  const CEILING_Y = 64;
  const FLOOR_Y = 644;
  let worldWidth = 1280;
  let viewScale = 1;
  let canvasDpr = 1;

  function applyCanvasTransform() {
    ctx.setTransform(canvasDpr * viewScale, 0, 0, canvasDpr * viewScale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function resizeCanvas() {
    canvasDpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(320, window.innerHeight);
    canvas.width = Math.floor(w * canvasDpr);
    canvas.height = Math.floor(h * canvasDpr);
    viewScale = h / WORLD_HEIGHT;
    worldWidth = w / viewScale;
    applyCanvasTransform();
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Данные прогрессии и localStorage
  const STORAGE_KEY = 'lab_escape_pixel_modular_v1';

  const JETPACK_SKINS = [
    { id: 'machinegun', name: 'ПУЛЕМЕТНЫЙ', desc: 'Желтые пули и гильзы с отскоком', price: 0, color: '#facc15' },
    { id: 'laser', name: 'ЛАЗЕРНЫЙ', desc: 'Яркие зеленые лазерные импульсы', price: 250, color: '#4ade80' },
    { id: 'rainbow', name: 'РАДУЖНЫЙ', desc: 'Сочный радужный поток и звезды', price: 500, color: '#f472b6' },
    { id: 'plasma', name: 'ПЛАЗМЕННЫЙ', desc: 'Фиолетовые плазменные заряды', price: 850, color: '#c084fc' }
  ];

  const MISSION_POOL = [
    { type: 'coins', target: 50, text: 'Собери 50 монет за забег' },
    { type: 'coins', target: 120, text: 'Собери 120 монет за забег' },
    { type: 'distance', target: 400, text: 'Пролети 400 метров' },
    { type: 'distance', target: 900, text: 'Пролети 900 метров' },
    { type: 'combos', target: 2, text: 'Сделай 2 комбо монет' },
    { type: 'combos', target: 4, text: 'Сделай 4 комбо монет' },
    { type: 'rockets', target: 5, text: 'Увернись от 5 ракет' },
    { type: 'rockets', target: 10, text: 'Увернись от 10 ракет' },
    { type: 'powerups', target: 2, text: 'Подбери 2 бонус-капсулы' }
  ];

  function createRandomMissions() {
    const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
    const picked = [];
    const usedTypes = new Set();
    for (const m of shuffled) {
      if (!usedTypes.has(m.type)) {
        usedTypes.add(m.type);
        picked.push({ ...m, progress: 0, done: false });
      }
      if (picked.length === 3) break;
    }
    return picked;
  }

  let saveData = {
    coins: 0,
    bestDistance: 0,
    unlockedSkins: ['machinegun'],
    equippedSkin: 'machinegun',
    startShield: false,
    missions: createRandomMissions()
  };

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          saveData = {
            coins: Number(parsed.coins) || 0,
            bestDistance: Number(parsed.bestDistance) || 0,
            unlockedSkins: Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length
              ? parsed.unlockedSkins
              : ['machinegun'],
            equippedSkin: typeof parsed.equippedSkin === 'string' ? parsed.equippedSkin : 'machinegun',
            startShield: Boolean(parsed.startShield),
            missions: Array.isArray(parsed.missions) && parsed.missions.length === 3
              ? parsed.missions
              : createRandomMissions()
          };
        }
      }
    } catch (e) {}
  }

  function writeSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    } catch (e) {}
  }

  loadSave();

  // Состояние игры
  let gameState = 'MENU';
  let isThrusting = false;
  let lastTime = 0;

  // Параметры забега
  let distance = 0;
  let runCoins = 0;
  let runCombos = 0;
  let runRocketsDodged = 0;
  let runPowerups = 0;
  let hasLuckToken = false;
  let tokenSpawnedThisRun = false;

  let baseSpeed = 430;
  let currentSpeed = 430;
  let bgScrollFar = 0;
  let bgScrollNear = 0;
  let floorScroll = 0;

  let shakeTime = 0;
  let shakeIntensity = 0;

  function triggerShake(intensity, duration) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeTime = Math.max(shakeTime, duration);
  }

  const player = {
    x: 200,
    y: FLOOR_Y - 56,
    vy: 0,
    width: 44,
    height: 56,
    tilt: 0,
    runCycle: 0,
    fireTimer: 0,
    shield: false,
    magnetTimer: 0,
    boostTimer: 0,
    invulnTimer: 0
  };

  let scientists = [];
  let bullets = [];
  let shells = [];
  let particles = [];
  let wallDebris = [];
  let floatingTexts = [];
  let zappers = [];
  let rockets = [];
  let lasers = [];
  let coins = [];
  let coinGroups = {};
  let nextCoinGroupId = 1;
  let powerups = [];
  let luckToken = null;

  let obstacleTimer = 1.6;
  let coinPatternTimer = 1.6;
  let powerupTimer = 7.5;
  let scientistTimer = 0.3;
  let introWallX = 240;

  function setThrust(active) {
    if (gameState !== 'PLAYING') {
      isThrusting = false;
      return;
    }
    isThrusting = active;
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      Sound.ensure();
      if (gameState === 'PLAYING') {
        setThrust(true);
      } else if (gameState === 'MENU' && !e.repeat && shopScreen.classList.contains('hidden')) {
        startNewRun();
      } else if (gameState === 'GAMEOVER' && !e.repeat) {
        startNewRun();
      } else if (gameState === 'ROULETTE' && !e.repeat && !rouletteSpinning) {
        spinBtn.click();
      }
    } else if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      if (gameState === 'PLAYING') pauseGame();
      else if (gameState === 'PAUSED') resumeGame();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      setThrust(false);
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    Sound.ensure();
    setThrust(true);
  });
  window.addEventListener('pointerup', () => setThrust(false));
  window.addEventListener('pointercancel', () => setThrust(false));
  window.addEventListener('blur', () => {
    isThrusting = false;
  });

  function renderMissions(container) {
    if (!container) return;
    container.innerHTML = '';
    saveData.missions.forEach((m) => {
      const div = document.createElement('div');
      div.className = 'mission-item' + (m.done ? ' done' : '');
      const val = Math.min(m.progress, m.target);
      div.innerHTML = `
        <span>${m.done ? '✅' : '🎯'} ${m.text}</span>
        <span class="mission-progress">${val}/${m.target}</span>
      `;
      container.appendChild(div);
    });
  }

  function updateMenuUI() {
    totalCoinsStart.textContent = saveData.coins;
    bestDistStart.textContent = Math.floor(saveData.bestDistance);
    totalCoinsShop.textContent = saveData.coins;
    if (saveData.startShield) {
      startShieldBadge.classList.remove('hidden');
    } else {
      startShieldBadge.classList.add('hidden');
    }
    renderMissions(startMissionsList);
  }

  function renderShop() {
    totalCoinsShop.textContent = saveData.coins;
    shopGrid.innerHTML = '';
    JETPACK_SKINS.forEach((skin) => {
      const unlocked = saveData.unlockedSkins.includes(skin.id);
      const equipped = saveData.equippedSkin === skin.id;

      const card = document.createElement('div');
      card.className = 'shop-card' + (equipped ? ' equipped' : '');

      let btnText = '';
      let btnClass = 'btn shop-btn ';
      let disabled = false;

      if (equipped) {
        btnText = 'ВЫБРАНО';
        btnClass += 'btn-primary';
        disabled = true;
      } else if (unlocked) {
        btnText = 'ВЫБРАТЬ';
        btnClass += 'btn-secondary';
      } else {
        btnText = `КУПИТЬ (${skin.price})`;
        btnClass += 'btn-secondary';
        if (saveData.coins < skin.price) disabled = true;
      }

      card.innerHTML = `
        <div>
          <div class="shop-card-title" style="color:${skin.color}">${skin.name}</div>
          <div class="shop-card-desc">${skin.desc}</div>
        </div>
        <button class="${btnClass}" type="button" ${disabled ? 'disabled' : ''}>${btnText}</button>
      `;

      const btn = card.querySelector('button');
      btn.addEventListener('click', () => {
        if (equipped) return;
        if (unlocked) {
          saveData.equippedSkin = skin.id;
          Sound.uiClick();
        } else if (saveData.coins >= skin.price) {
          saveData.coins -= skin.price;
          saveData.unlockedSkins.push(skin.id);
          saveData.equippedSkin = skin.id;
          Sound.powerup();
        }
        writeSave();
        renderShop();
        updateMenuUI();
      });

      shopGrid.appendChild(card);
    });
  }

  function updateMissionsProgress() {
    const allDoneBefore = saveData.missions.every((m) => m.done);
    saveData.missions.forEach((m) => {
      if (m.done) return;
      if (m.type === 'coins') m.progress = Math.max(m.progress, runCoins);
      if (m.type === 'distance') m.progress = Math.max(m.progress, Math.floor(distance));
      if (m.type === 'combos') m.progress = Math.max(m.progress, runCombos);
      if (m.type === 'rockets') m.progress = Math.max(m.progress, runRocketsDodged);
      if (m.type === 'powerups') m.progress = Math.max(m.progress, runPowerups);

      if (m.progress >= m.target) {
        m.progress = m.target;
        m.done = true;
        addFloatingText(player.x + 20, player.y - 40, 'МИССИЯ ГОТОВА!', '#4ade80');
        Sound.missionDone();
      }
    });

    const allDoneNow = saveData.missions.every((m) => m.done);
    if (!allDoneBefore && allDoneNow) {
      saveData.coins += 150;
      addFloatingText(player.x + 40, player.y - 75, 'ВСЕ МИССИИ! +150', '#facc15');
      saveData.missions = createRandomMissions();
      Sound.combo();
    }
    writeSave();
  }

  function startNewRun() {
    Sound.ensure();
    Sound.uiClick();
    resizeCanvas();

    gameState = 'PLAYING';
    isThrusting = false;
    lastTime = performance.now();

    distance = 0;
    runCoins = 0;
    runCombos = 0;
    runRocketsDodged = 0;
    runPowerups = 0;
    hasLuckToken = false;
    tokenSpawnedThisRun = false;

    baseSpeed = 430;
    currentSpeed = 430;

    player.x = px(Math.min(210, worldWidth * 0.24));
    player.y = px(FLOOR_Y - player.height - 96);
    player.vy = -140;
    player.tilt = 0.2;
    player.shield = Boolean(saveData.startShield);
    saveData.startShield = false;
    writeSave();

    player.magnetTimer = 0;
    player.boostTimer = 0;
    player.invulnTimer = 0;

    scientists = [];
    bullets = [];
    shells = [];
    particles = [];
    wallDebris = [];
    floatingTexts = [];
    zappers = [];
    rockets = [];
    lasers = [];
    coins = [];
    coinGroups = {};
    nextCoinGroupId = 1;
    powerups = [];
    luckToken = null;

    obstacleTimer = 1.6;
    coinPatternTimer = 1.4;
    powerupTimer = 7.5;
    scientistTimer = 0.2;

    introWallX = player.x + 36;
    breakIntroWall();

    for (let i = 0; i < 6; i++) {
      spawnScientist(player.x + 140 + i * 210);
    }

    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    shopScreen.classList.add('hidden');
    rouletteScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    tokenIndicator.classList.add('hidden');
    hud.classList.remove('hidden');

    hudDistance.textContent = '0';
    hudCoins.textContent = '0';
    updatePowerupsHUD();
    render();
  }

  function breakIntroWall() {
    triggerShake(15, 0.45);
    Sound.wallBreak();
    const palette = ['#64748b', '#94a3b8', '#38bdf8', '#facc15'];
    for (let i = 0; i < 32; i++) {
      wallDebris.push({
        x: introWallX + (Math.random() - 0.5) * 32,
        y: CEILING_Y + Math.random() * (FLOOR_Y - CEILING_Y),
        vx: 150 + Math.random() * 500,
        vy: (Math.random() - 0.6) * 460,
        size: 12 + Math.random() * 16,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 12,
        color: palette[i % palette.length]
      });
    }
    for (let i = 0; i < 24; i++) {
      particles.push({
        x: introWallX,
        y: player.y + 24 + (Math.random() - 0.5) * 80,
        vx: 90 + Math.random() * 260,
        vy: (Math.random() - 0.5) * 200,
        size: 8 + Math.random() * 12,
        alpha: 0.95,
        decay: 1.5,
        color: '#e2e8f0'
      });
    }
  }

  function pauseGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'PAUSED';
    isThrusting = false;
    Sound.uiClick();
    renderMissions(pauseMissionsList);
    pauseScreen.classList.remove('hidden');
  }

  function resumeGame() {
    if (gameState !== 'PAUSED') return;
    gameState = 'PLAYING';
    lastTime = performance.now();
    Sound.uiClick();
    pauseScreen.classList.add('hidden');
  }

  function returnToMenu() {
    gameState = 'MENU';
    isThrusting = false;
    Sound.uiClick();
    hud.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    shopScreen.classList.add('hidden');
    rouletteScreen.classList.add('hidden');
    updateMenuUI();
    startScreen.classList.remove('hidden');
  }

  function handlePlayerHit(obstacleObj) {
    if (player.invulnTimer > 0 || player.boostTimer > 0) return;

    if (player.shield) {
      player.shield = false;
      player.invulnTimer = 1.2;
      triggerShake(12, 0.35);
      Sound.shieldSave();
      addFloatingText(player.x, player.y - 20, 'ЩИТ СПАС!', '#38bdf8');
      spawnExplosion(player.x + 20, player.y + 28, '#38bdf8', 24);
      if (obstacleObj) obstacleObj.destroyed = true;
      return;
    }

    isThrusting = false;
    triggerShake(16, 0.5);
    Sound.crash();
    spawnExplosion(player.x + 20, player.y + 28, '#fb923c', 36);
    updateMissionsProgress();

    if (hasLuckToken) {
      hasLuckToken = false;
      tokenIndicator.classList.add('hidden');
      openRoulette();
    } else {
      finishGameOver();
    }
  }

  function finishGameOver() {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');

    saveData.coins += runCoins;
    if (distance > saveData.bestDistance) {
      saveData.bestDistance = Math.floor(distance);
    }
    writeSave();

    document.getElementById('endDistance').textContent = `${Math.floor(distance)} М`;
    document.getElementById('endBest').textContent = `${Math.floor(saveData.bestDistance)} М`;
    document.getElementById('endCoins').textContent = `+${runCoins}`;
    document.getElementById('endTotalCoins').textContent = `${saveData.coins}`;

    gameOverScreen.classList.remove('hidden');
  }

  // Мини-рулетка за Жетон Удачи
  const ROULETTE_PRIZES = [
    { id: 'coins100', label: '+100 МОНЕТ', apply: () => { runCoins += 100; } },
    { id: 'shield', label: 'ЩИТ НА СТАРТ', apply: () => { saveData.startShield = true; } },
    { id: 'revive', label: 'ВОСКРЕШЕНИЕ', apply: null },
    { id: 'coins250', label: '+250 МОНЕТ', apply: () => { runCoins += 250; } }
  ];

  const rouletteTrack = document.getElementById('rouletteTrack');
  const rouletteResult = document.getElementById('rouletteResult');
  const spinBtn = document.getElementById('spinBtn');
  let rouletteSpinning = false;

  function openRoulette() {
    gameState = 'ROULETTE';
    hud.classList.add('hidden');
    rouletteScreen.classList.remove('hidden');
    rouletteResult.textContent = 'Нажмите «КРУТИТЬ» или ПРОБЕЛ';
    spinBtn.disabled = false;
    rouletteSpinning = false;

    rouletteTrack.style.transition = 'none';
    rouletteTrack.style.transform = 'translateX(0px)';
    rouletteTrack.innerHTML = '';

    for (let i = 0; i < 32; i++) {
      const p = ROULETTE_PRIZES[i % ROULETTE_PRIZES.length];
      const slot = document.createElement('div');
      slot.className = 'roulette-slot';
      slot.textContent = p.label;
      rouletteTrack.appendChild(slot);
    }
  }

  spinBtn.addEventListener('click', () => {
    if (rouletteSpinning) return;
    rouletteSpinning = true;
    spinBtn.disabled = true;
    Sound.rouletteSpin();

    const targetIndex = 24 + Math.floor(Math.random() * 4);
    const prize = ROULETTE_PRIZES[targetIndex % ROULETTE_PRIZES.length];
    const slotWidth = 132;
    const wrapperWidth = rouletteTrack.parentElement.clientWidth || 400;
    const offset = targetIndex * slotWidth - wrapperWidth / 2 + slotWidth / 2;

    rouletteTrack.style.transition = 'transform 3.1s cubic-bezier(0.12, 0.85, 0.22, 1)';
    rouletteTrack.style.transform = `translateX(-${offset}px)`;

    setTimeout(() => {
      rouletteResult.textContent = `ПРИЗ: ${prize.label}`;
      Sound.rouletteWin();
      setTimeout(() => {
        rouletteScreen.classList.add('hidden');
        if (prize.id === 'revive') {
          gameState = 'PLAYING';
          lastTime = performance.now();
          hud.classList.remove('hidden');
          player.y = (CEILING_Y + FLOOR_Y) / 2;
          player.vy = -160;
          player.invulnTimer = 2.5;
          zappers = [];
          rockets = [];
          lasers = [];
          addFloatingText(player.x + 30, player.y - 30, 'ВОСКРЕШЕНИЕ!', '#4ade80');
        } else {
          prize.apply();
          finishGameOver();
        }
      }, 1150);
    }, 3200);
  });

  // Кнопки UI
  document.getElementById('playBtn').addEventListener('click', startNewRun);
  document.getElementById('restartBtn').addEventListener('click', startNewRun);
  document.getElementById('pauseBtn').addEventListener('click', pauseGame);
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('quitBtn').addEventListener('click', returnToMenu);
  document.getElementById('menuBtn').addEventListener('click', returnToMenu);
  document.getElementById('shopBtn').addEventListener('click', () => {
    Sound.uiClick();
    startScreen.classList.add('hidden');
    renderShop();
    shopScreen.classList.remove('hidden');
  });
  document.getElementById('closeShopBtn').addEventListener('click', () => {
    Sound.uiClick();
    shopScreen.classList.add('hidden');
    updateMenuUI();
    startScreen.classList.remove('hidden');
  });

  function addFloatingText(x, y, text, color = '#fff') {
    floatingTexts.push({ x, y, text, color, life: 1.2, vy: -55 });
  }

  function spawnExplosion(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 280;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 6 + Math.random() * 8,
        alpha: 1,
        decay: 1.5 + Math.random(),
        color
      });
    }
  }

  function spawnScientist(xPos) {
    const flaskColors = ['#c084fc', '#22d3ee', '#4ade80', '#f472b6'];
    scientists.push({
      x: xPos,
      y: FLOOR_Y,
      dir: Math.random() < 0.5 ? -1 : 1,
      panic: false,
      anim: Math.random() * 6,
      flaskColor: flaskColors[Math.floor(Math.random() * flaskColors.length)]
    });
  }

  function fireJetpack() {
    const skin = saveData.equippedSkin;
    const nozzleX = player.x + 2;
    const nozzleY = player.y + 42;
    Sound.shot(skin);

    if (skin === 'machinegun') {
      bullets.push({
        x: nozzleX + (Math.random() - 0.5) * 8,
        y: nozzleY,
        vx: -60 + (Math.random() - 0.5) * 70,
        vy: 680 + Math.random() * 120,
        type: 'bullet',
        color: '#facc15'
      });
      shells.push({
        x: nozzleX - 4,
        y: nozzleY - 8,
        vx: -95 - Math.random() * 90,
        vy: -85 - Math.random() * 90,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 22,
        life: 1.8
      });
    } else if (skin === 'laser') {
      bullets.push({
        x: nozzleX,
        y: nozzleY,
        vx: -25 + (Math.random() - 0.5) * 25,
        vy: 840,
        type: 'laser',
        color: '#4ade80'
      });
    } else if (skin === 'rainbow') {
      const rainbowColors = ['#ef4444', '#f97316', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];
      const col = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
      bullets.push({
        x: nozzleX + (Math.random() - 0.5) * 12,
        y: nozzleY,
        vx: -80 + (Math.random() - 0.5) * 80,
        vy: 560,
        type: 'star',
        color: col
      });
    } else if (skin === 'plasma') {
      bullets.push({
        x: nozzleX,
        y: nozzleY,
        vx: -45 + (Math.random() - 0.5) * 45,
        vy: 520,
        type: 'plasma',
        color: '#c084fc'
      });
    }
  }

  function spawnObstacle() {
    const difficulty = Math.min(distance / 1500, 1);
    const spawnX = worldWidth + 140;
    const roll = Math.random();

    if (roll < 0.52) {
      const types = ['horizontal', 'vertical', 'diagonal'];
      if (distance > 180) types.push('rotating');
      const kind = types[Math.floor(Math.random() * types.length)];
      const len = 136 + Math.random() * 72;
      let angle = 0;
      let rotSpeed = 0;

      if (kind === 'vertical') angle = Math.PI / 2;
      else if (kind === 'diagonal') angle = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 4);
      else if (kind === 'rotating') {
        angle = Math.random() * Math.PI;
        rotSpeed = (Math.random() < 0.5 ? 1 : -1) * (1.2 + difficulty * 1.1);
      }

      const margin = len * 0.55 + 24;
      const cy = CEILING_Y + margin + Math.random() * (FLOOR_Y - CEILING_Y - margin * 2);
      zappers.push({
        x: spawnX + 80,
        y: cy,
        len,
        angle,
        rotSpeed,
        destroyed: false
      });
    } else if (roll < 0.82) {
      const count = distance > 500 && Math.random() < 0.45 ? (Math.random() < 0.5 ? 2 : 3) : 1;
      for (let i = 0; i < count; i++) {
        const offsetY = (i - (count - 1) / 2) * 76;
        rockets.push({
          state: 'warning',
          timer: 1.5,
          trackTime: 0.8,
          y: Math.max(CEILING_Y + 40, Math.min(FLOOR_Y - 40, player.y + 28 + offsetY)),
          offsetY,
          x: worldWidth + 80,
          speed: 870 + difficulty * 260,
          passed: false,
          destroyed: false
        });
      }
    } else {
      const y = CEILING_Y + 64 + Math.random() * (FLOOR_Y - CEILING_Y - 128);
      lasers.push({
        y,
        state: 'aiming',
        timer: 1.5,
        destroyed: false
      });
    }
  }

  function spawnCoinPattern() {
    const groupId = nextCoinGroupId++;
    const startX = worldWidth + 80;
    const midY = CEILING_Y + 130 + Math.random() * (FLOOR_Y - CEILING_Y - 260);
    const patternType = Math.floor(Math.random() * 3);
    const coords = [];

    if (patternType === 0) {
      const count = 9;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        coords.push({
          x: startX + i * 38,
          y: midY - Math.sin(t * Math.PI) * 110
        });
      }
    } else if (patternType === 1) {
      const count = 10;
      for (let i = 0; i < count; i++) {
        coords.push({
          x: startX + i * 38,
          y: midY + Math.sin(i * 0.75) * 65
        });
      }
    } else {
      const offsets = [
        [0, -40], [36, -40], [72, -40],
        [0, 0], [36, 0], [72, 0], [108, 0], [144, 0],
        [0, 40], [36, 40], [72, 40],
        [108, -24], [108, 24]
      ];
      for (const [ox, oy] of offsets) {
        coords.push({ x: startX + ox, y: midY + oy });
      }
    }

    coinGroups[groupId] = { total: coords.length, collected: 0, missed: false };
    coords.forEach((c) => {
      coins.push({
        x: c.x,
        y: c.y,
        groupId,
        anim: Math.random() * Math.PI * 2
      });
    });
  }

  function spawnPowerup() {
    const types = ['magnet', 'shield', 'boost'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerups.push({
      x: worldWidth + 60,
      y: CEILING_Y + 90 + Math.random() * (FLOOR_Y - CEILING_Y - 180),
      type,
      bob: Math.random() * Math.PI * 2
    });
  }

  function trySpawnLuckToken() {
    if (tokenSpawnedThisRun || luckToken || hasLuckToken) return;
    if (distance > 180 && Math.random() < 0.005) {
      tokenSpawnedThisRun = true;
      luckToken = {
        x: worldWidth + 60,
        y: CEILING_Y + 100 + Math.random() * (FLOOR_Y - CEILING_Y - 200),
        bob: 0
      };
    }
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  function update(dt) {
    if (gameState !== 'PLAYING') return;

    const difficultySpeed = Math.min(distance * 0.18, 280);
    const boostMult = player.boostTimer > 0 ? 2.15 : 1;
    currentSpeed = (baseSpeed + difficultySpeed) * boostMult;
    distance += (currentSpeed * dt) / 28;

    bgScrollFar += currentSpeed * 0.22 * dt;
    bgScrollNear += currentSpeed * 0.55 * dt;
    floorScroll += currentSpeed * dt;

    if (shakeTime > 0) {
      shakeTime -= dt;
      if (shakeTime <= 0) shakeIntensity = 0;
    }

    if (player.magnetTimer > 0) player.magnetTimer -= dt;
    if (player.boostTimer > 0) {
      player.boostTimer -= dt;
      if (player.boostTimer <= 0) {
        player.invulnTimer = 1.0;
      }
    }
    if (player.invulnTimer > 0) player.invulnTimer -= dt;

    const gravity = 1750;
    const thrustAcc = 3650;

    if (player.boostTimer > 0) {
      const targetY = (CEILING_Y + FLOOR_Y) / 2 - player.height / 2;
      player.vy = (targetY - player.y) * 8;
      player.tilt = 0.25;
    } else if (isThrusting) {
      player.vy -= thrustAcc * dt;
      player.tilt += (0.2 - player.tilt) * 10 * dt;
      player.fireTimer -= dt;
      if (player.fireTimer <= 0) {
        fireJetpack();
        player.fireTimer = saveData.equippedSkin === 'plasma' ? 0.08 : 0.045;
      }
    } else {
      player.vy += gravity * dt;
      player.tilt += (-0.14 - player.tilt) * 7 * dt;
    }

    player.vy = Math.max(-680, Math.min(760, player.vy));
    player.y += player.vy * dt;

    if (player.y < CEILING_Y) {
      player.y = CEILING_Y;
      if (player.vy < 0) player.vy = 0;
    }
    const onFloor = player.y + player.height >= FLOOR_Y;
    if (onFloor) {
      player.y = FLOOR_Y - player.height;
      if (player.vy > 0) player.vy = 0;
      player.tilt = 0;
      player.runCycle += currentSpeed * 0.032 * dt;
    }

    wallDebris.forEach((d) => {
      d.x += (d.vx - currentSpeed * 0.5) * dt;
      d.y += d.vy * dt;
      d.vy += 900 * dt;
      d.rot += d.vrot * dt;
    });
    wallDebris = wallDebris.filter((d) => d.y < WORLD_HEIGHT + 50 && d.x > -100);

    scientistTimer -= dt;
    if (scientistTimer <= 0) {
      spawnScientist(worldWidth + 50);
      scientistTimer = 1.4 + Math.random() * 2.2;
    }

    scientists.forEach((s) => {
      const distToPlayer = Math.abs(s.x - player.x);
      if (distToPlayer < 270) {
        s.panic = true;
        s.dir = s.x >= player.x ? 1 : -1;
      }
      const walkSpeed = s.panic ? 225 : 55;
      s.x += (s.dir * walkSpeed - currentSpeed) * dt;
      s.anim += (s.panic ? 18 : 7) * dt;
    });
    scientists = scientists.filter((s) => s.x > -80);

    bullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y >= FLOOR_Y) {
        b.dead = true;
        particles.push({
          x: b.x,
          y: FLOOR_Y - 4,
          vx: (Math.random() - 0.5) * 140,
          vy: -60 - Math.random() * 80,
          size: 5,
          alpha: 0.9,
          decay: 4,
          color: b.color
        });
      }
    });
    bullets = bullets.filter((b) => !b.dead);

    shells.forEach((sh) => {
      sh.x += (sh.vx - currentSpeed * 0.3) * dt;
      sh.y += sh.vy * dt;
      sh.vy += 1200 * dt;
      sh.rot += sh.vrot * dt;
      sh.life -= dt;
      if (sh.y >= FLOOR_Y - 4) {
        sh.y = FLOOR_Y - 4;
        sh.vy = -Math.abs(sh.vy) * 0.48;
        sh.vx *= 0.7;
        sh.vrot *= 0.6;
      }
    });
    shells = shells.filter((sh) => sh.life > 0 && sh.x > -50);

    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
    });
    particles = particles.filter((p) => p.alpha > 0);

    floatingTexts.forEach((ft) => {
      ft.y += ft.vy * dt;
      ft.life -= dt;
    });
    floatingTexts = floatingTexts.filter((ft) => ft.life > 0);

    obstacleTimer -= dt * (player.boostTimer > 0 ? 1.5 : 1);
    if (obstacleTimer <= 0) {
      spawnObstacle();
      const minGap = Math.max(0.95, 2.1 - distance / 1200);
      obstacleTimer = minGap + Math.random() * 0.7;
    }

    coinPatternTimer -= dt;
    if (coinPatternTimer <= 0) {
      spawnCoinPattern();
      coinPatternTimer = 2.6 + Math.random() * 1.5;
    }

    powerupTimer -= dt;
    if (powerupTimer <= 0) {
      spawnPowerup();
      powerupTimer = 11 + Math.random() * 6;
    }

    trySpawnLuckToken();

    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;
    const playerRadius = 18;

    zappers.forEach((z) => {
      z.x -= currentSpeed * dt;
      z.angle += z.rotSpeed * dt;
      if (!z.destroyed) {
        const hx = Math.cos(z.angle) * (z.len / 2);
        const hy = Math.sin(z.angle) * (z.len / 2);
        const d = distToSegment(pcx, pcy, z.x - hx, z.y - hy, z.x + hx, z.y + hy);
        if (d < playerRadius + 10) {
          handlePlayerHit(z);
        }
      }
    });
    zappers = zappers.filter((z) => z.x > -200 && !z.destroyed);

    rockets.forEach((r) => {
      if (r.state === 'warning') {
        r.timer -= dt;
        if (r.timer > r.trackTime) {
          const desiredY = pcy + r.offsetY;
          r.y += (desiredY - r.y) * 6 * dt;
          r.y = Math.max(CEILING_Y + 35, Math.min(FLOOR_Y - 35, r.y));
        }
        if (r.timer <= 0) {
          r.state = 'flying';
          r.x = worldWidth + 40;
          Sound.rocketLaunch();
        }
      } else if (r.state === 'flying') {
        r.x -= (r.speed + (player.boostTimer > 0 ? 300 : 0)) * dt;
        particles.push({
          x: r.x + 28,
          y: r.y + (Math.random() - 0.5) * 6,
          vx: 90,
          vy: (Math.random() - 0.5) * 30,
          size: 7 + Math.random() * 5,
          alpha: 0.8,
          decay: 2.2,
          color: '#cbd5e1'
        });

        if (!r.destroyed && Math.hypot(pcx - r.x, pcy - r.y) < playerRadius + 14) {
          handlePlayerHit(r);
        }
        if (!r.passed && !r.destroyed && r.x < player.x - 20) {
          r.passed = true;
          runRocketsDodged++;
          updateMissionsProgress();
        }
      }
    });
    rockets = rockets.filter((r) => (r.state === 'warning' || r.x > -100) && !r.destroyed);

    lasers.forEach((l) => {
      l.timer -= dt;
      if (l.state === 'aiming' && l.timer <= 0) {
        l.state = 'firing';
        l.timer = 0.45;
        triggerShake(6, 0.25);
        Sound.laserFire();
      } else if (l.state === 'firing') {
        if (!l.destroyed && Math.abs(pcy - l.y) < playerRadius + 12) {
          handlePlayerHit(l);
        }
        if (l.timer <= 0) {
          l.destroyed = true;
        }
      }
    });
    lasers = lasers.filter((l) => !l.destroyed);

    coins.forEach((c) => {
      c.anim += 6 * dt;
      if (player.magnetTimer > 0) {
        const dist = Math.hypot(pcx - c.x, pcy - c.y);
        if (dist < 340) {
          c.x += ((pcx - c.x) / dist) * 760 * dt;
          c.y += ((pcy - c.y) / dist) * 760 * dt;
        } else {
          c.x -= currentSpeed * dt;
        }
      } else {
        c.x -= currentSpeed * dt;
      }

      if (Math.hypot(pcx - c.x, pcy - c.y) < playerRadius + 18) {
        c.collected = true;
        runCoins++;
        Sound.coin();
        const grp = coinGroups[c.groupId];
        if (grp) {
          grp.collected++;
          if (!grp.missed && grp.collected === grp.total) {
            runCoins += 25;
            runCombos++;
            addFloatingText(pcx + 20, pcy - 30, 'КОМБО! +25', '#facc15');
            Sound.combo();
          }
        }
        updateMissionsProgress();
      } else if (c.x < -30) {
        c.missed = true;
        const grp = coinGroups[c.groupId];
        if (grp) grp.missed = true;
      }
    });
    coins = coins.filter((c) => !c.collected && !c.missed);

    powerups.forEach((p) => {
      p.x -= currentSpeed * dt;
      p.bob += 4 * dt;
      const py = p.y + Math.sin(p.bob) * 14;
      if (Math.hypot(pcx - p.x, pcy - py) < playerRadius + 24) {
        p.collected = true;
        runPowerups++;
        Sound.powerup();
        if (p.type === 'magnet') {
          player.magnetTimer = 10;
          addFloatingText(pcx, pcy - 25, 'МАГНИТ!', '#fb7185');
        } else if (p.type === 'shield') {
          player.shield = true;
          addFloatingText(pcx, pcy - 25, 'ЩИТ!', '#38bdf8');
        } else if (p.type === 'boost') {
          player.boostTimer = 4;
          addFloatingText(pcx, pcy - 25, 'УСКОРЕНИЕ!', '#facc15');
        }
        updateMissionsProgress();
      }
    });
    powerups = powerups.filter((p) => !p.collected && p.x > -60);

    if (luckToken) {
      luckToken.x -= currentSpeed * dt;
      luckToken.bob += 5 * dt;
      const ty = luckToken.y + Math.sin(luckToken.bob) * 16;
      if (Math.hypot(pcx - luckToken.x, pcy - ty) < playerRadius + 24) {
        hasLuckToken = true;
        luckToken = null;
        tokenIndicator.classList.remove('hidden');
        addFloatingText(pcx, pcy - 35, 'ЖЕТОН УДАЧИ!', '#fb923c');
        Sound.token();
      } else if (luckToken.x < -60) {
        luckToken = null;
      }
    }

    hudDistance.textContent = Math.floor(distance);
    hudCoins.textContent = runCoins;
    updatePowerupsHUD();
  }

  function updatePowerupsHUD() {
    let html = '';
    if (player.shield) html += `<div class="powerup-tag" style="border-color:#38bdf8;color:#7dd3fc">🛡️ ЩИТ</div>`;
    if (player.magnetTimer > 0) html += `<div class="powerup-tag" style="border-color:#fb7185;color:#fda4af">🧲 ${player.magnetTimer.toFixed(1)}S</div>`;
    if (player.boostTimer > 0) html += `<div class="powerup-tag" style="border-color:#facc15;color:#fde047">⚡ ${player.boostTimer.toFixed(1)}S</div>`;
    activePowerupsEl.innerHTML = html;
  }

  function drawProjectilesAndEffects() {
    bullets.forEach((b) => {
      if (b.type === 'bullet') {
        pRect(ctx, b.x - 2, b.y - 8, 6, 14, b.color);
      } else if (b.type === 'laser') {
        pRect(ctx, b.x - 2, b.y - 16, 6, 26, b.color);
      } else if (b.type === 'star') {
        pRect(ctx, b.x - 4, b.y - 4, 10, 10, b.color);
      } else if (b.type === 'plasma') {
        pRect(ctx, b.x - 6, b.y - 6, 14, 14, b.color);
        pRect(ctx, b.x - 2, b.y - 2, 6, 6, '#f3e8ff');
      }
    });

    shells.forEach((sh) => {
      ctx.save();
      ctx.translate(px(sh.x), px(sh.y));
      ctx.rotate(sh.rot);
      pRect(ctx, -4, -2, 8, 4, '#facc15');
      ctx.restore();
    });

    wallDebris.forEach((d) => {
      ctx.save();
      ctx.translate(px(d.x), px(d.y));
      ctx.rotate(d.rot);
      pRect(ctx, -d.size / 2, -d.size / 2, d.size, d.size, d.color);
      ctx.restore();
    });

    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.alpha);
      pRect(ctx, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, p.color);
    });
    ctx.globalAlpha = 1;
  }

  function drawObstacles() {
    zappers.forEach((z) => {
      const hx = Math.cos(z.angle) * (z.len / 2);
      const hy = Math.sin(z.angle) * (z.len / 2);
      const x1 = z.x - hx;
      const y1 = z.y - hy;
      const x2 = z.x + hx;
      const y2 = z.y + hy;

      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const t1 = i / steps;
        const t2 = (i + 1) / steps;
        const jx1 = x1 + (x2 - x1) * t1 + (i === 0 ? 0 : (Math.random() - 0.5) * 14);
        const jy1 = y1 + (y2 - y1) * t1 + (i === 0 ? 0 : (Math.random() - 0.5) * 14);
        const jx2 = x1 + (x2 - x1) * t2 + (i === steps - 1 ? 0 : (Math.random() - 0.5) * 14);
        const jy2 = y1 + (y2 - y1) * t2 + (i === steps - 1 ? 0 : (Math.random() - 0.5) * 14);

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(px(jx1), px(jy1));
        ctx.lineTo(px(jx2), px(jy2));
        ctx.stroke();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(px(jx1), px(jy1));
        ctx.lineTo(px(jx2), px(jy2));
        ctx.stroke();
      }

      [[x1, y1], [x2, y2]].forEach(([gx, gy]) => {
        pRect(ctx, gx - 14, gy - 14, 28, 28, '#334155');
        pRect(ctx, gx - 10, gy - 10, 20, 20, '#fbbf24');
        pRect(ctx, gx - 6, gy - 6, 8, 8, '#fef9c3');
      });
    });

    lasers.forEach((l) => {
      if (l.state === 'aiming') {
        pRect(ctx, 0, l.y - 2, worldWidth, 4, '#ef4444');
        pRect(ctx, 0, l.y - 12, 20, 24, '#dc2626');
        pRect(ctx, worldWidth - 20, l.y - 12, 20, 24, '#dc2626');
      } else {
        pRect(ctx, 0, l.y - 20, worldWidth, 40, 'rgba(239, 68, 68, 0.55)');
        pRect(ctx, 0, l.y - 8, worldWidth, 16, '#ffffff');
      }
    });

    rockets.forEach((r) => {
      if (r.state === 'warning') {
        const blink = Math.floor(r.timer * 12) % 2 === 0;
        const wx = worldWidth - 48;
        pRect(ctx, wx - 18, r.y - 18, 36, 36, blink ? '#ef4444' : '#7f1d1d');
        pRect(ctx, wx - 14, r.y - 14, 28, 28, blink ? '#f87171' : '#991b1b');
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 22px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', px(wx), px(r.y + 2));
      } else {
        pRect(ctx, r.x - 24, r.y - 10, 44, 20, '#ef4444');
        pRect(ctx, r.x - 28, r.y - 6, 8, 12, '#f97316');
        pRect(ctx, r.x + 4, r.y - 10, 10, 20, '#facc15');
        pRect(ctx, r.x - 20, r.y - 6, 20, 4, '#fca5a5');
      }
    });
  }

  function drawCollectibles() {
    coins.forEach((c) => {
      const pulse = Math.cos(c.anim) > 0;
      const w = pulse ? 24 : 16;
      pRect(ctx, c.x - w / 2, c.y - 12, w, 24, '#ca8a04');
      pRect(ctx, c.x - w / 2 + 4, c.y - 8, Math.max(4, w - 8), 16, '#facc15');
      pRect(ctx, c.x - 2, c.y - 6, 4, 12, '#fef9c3');
    });

    powerups.forEach((p) => {
      const py = p.y + Math.sin(p.bob) * 14;
      const color = p.type === 'magnet' ? '#fb7185' : p.type === 'shield' ? '#38bdf8' : '#facc15';
      const icon = p.type === 'magnet' ? '🧲' : p.type === 'shield' ? '🛡️' : '⚡';

      pRect(ctx, p.x - 22, py - 22, 44, 44, '#090d16');
      pRect(ctx, p.x - 18, py - 18, 36, 36, color);
      pRect(ctx, p.x - 14, py - 14, 28, 28, '#0f172a');

      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, px(p.x), px(py + 1));
    });

    if (luckToken) {
      const ty = luckToken.y + Math.sin(luckToken.bob) * 16;
      pRect(ctx, luckToken.x - 24, ty - 24, 48, 48, '#fef08a');
      pRect(ctx, luckToken.x - 20, ty - 20, 40, 40, '#f59e0b');
      pRect(ctx, luckToken.x - 14, ty - 14, 28, 28, '#b45309');

      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎰', px(luckToken.x), px(ty + 1));
    }

    floatingTexts.forEach((ft) => {
      ctx.globalAlpha = Math.min(1, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, px(ft.x), px(ft.y));
    });
    ctx.globalAlpha = 1;
  }

  function render() {
    applyCanvasTransform();
    ctx.save();
    if (shakeTime > 0) {
      const sx = px((Math.random() - 0.5) * shakeIntensity * 2);
      const sy = px((Math.random() - 0.5) * shakeIntensity * 2);
      ctx.translate(sx, sy);
    }

    const nowMs = performance.now();
    Sprites.drawLabBackground(ctx, {
      worldWidth,
      ceilingY: CEILING_Y,
      floorY: FLOOR_Y,
      worldHeight: WORLD_HEIGHT,
      bgScrollFar,
      bgScrollNear,
      floorScroll,
      timeMs: nowMs
    });

    scientists.forEach((s) => Sprites.drawScientistSprite(ctx, s));
    drawCollectibles();
    drawObstacles();
    drawProjectilesAndEffects();

    const skinObj = JETPACK_SKINS.find((s) => s.id === saveData.equippedSkin) || JETPACK_SKINS[0];
    Sprites.drawHeroSprite(ctx, {
      player,
      onFloor: player.y + player.height >= FLOOR_Y - 2,
      isThrusting,
      skinColor: skinObj.color,
      timeMs: nowMs
    });

    ctx.restore();
  }

  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(Math.max((timestamp - lastTime) / 1000, 0), 0.05);
    lastTime = timestamp;

    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  updateSoundButtons();
  updateMenuUI();
  render();
  requestAnimationFrame(gameLoop);
})();
