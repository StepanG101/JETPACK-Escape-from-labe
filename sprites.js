(() => {
  const PIXEL = 4;

  function px(val) {
    return Math.round(val / PIXEL) * PIXEL;
  }

  function pRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(px(x), px(y), Math.max(PIXEL, px(w)), Math.max(PIXEL, px(h)));
  }

  function drawHazardStripe(ctx, x, y, w, h, scroll) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(px(x), px(y), px(w), px(h));
    ctx.clip();

    pRect(ctx, x, y, w, h, '#facc15');
    const stripeW = 32;
    const offset = -(scroll % (stripeW * 2));
    for (let sx = offset - stripeW * 2; sx < w + stripeW * 2; sx += stripeW * 2) {
      ctx.fillStyle = '#18181b';
      for (let row = 0; row < h; row += PIXEL) {
        const shift = Math.floor(row / PIXEL) * PIXEL;
        ctx.fillRect(px(sx + shift), px(y + row), stripeW, PIXEL);
      }
    }
    ctx.restore();
  }

  function drawLabBackground(ctx, opts) {
    const { worldWidth, ceilingY, floorY, worldHeight, bgScrollFar, bgScrollNear, floorScroll, timeMs } = opts;

    // Основная стена лаборатории
    pRect(ctx, 0, ceilingY, worldWidth, floorY - ceilingY, '#1a253a');

    // Дальний слой: панели и резервуары с колбами/пузырьками
    const farStep = 360;
    const farOffset = -(bgScrollFar % farStep);
    for (let x = farOffset; x < worldWidth + farStep; x += farStep) {
      pRect(ctx, x, ceilingY, 20, floorY - ceilingY, '#111827');
      pRect(ctx, x + 20, ceilingY, 8, floorY - ceilingY, '#27354f');

      // Резервуар с жидкостью
      pRect(ctx, x + 76, ceilingY + 72, 168, 256, '#0b1120');
      pRect(ctx, x + 76, ceilingY + 72, 168, 8, '#475569');
      pRect(ctx, x + 76, ceilingY + 320, 168, 8, '#475569');
      pRect(ctx, x + 76, ceilingY + 72, 8, 256, '#475569');
      pRect(ctx, x + 236, ceilingY + 72, 8, 256, '#475569');

      pRect(ctx, x + 84, ceilingY + 128, 152, 192, '#0284c7');
      pRect(ctx, x + 84, ceilingY + 128, 152, 8, '#38bdf8');

      // Декоративные колбы внутри резервуара
      pRect(ctx, x + 108, ceilingY + 188, 20, 112, 'rgba(15, 23, 42, 0.35)');
      pRect(ctx, x + 112, ceilingY + 216, 12, 80, '#4ade80');
      pRect(ctx, x + 184, ceilingY + 172, 24, 128, 'rgba(15, 23, 42, 0.35)');
      pRect(ctx, x + 188, ceilingY + 204, 16, 92, '#c084fc');

      const bob = Math.floor(Math.sin(timeMs * 0.004 + x) * 8);
      pRect(ctx, x + 114, ceilingY + 236 + bob, 8, 8, '#dcfce7');
      pRect(ctx, x + 190, ceilingY + 188 - bob, 12, 12, '#f3e8ff');
      pRect(ctx, x + 150, ceilingY + 272 + bob, 8, 8, '#bae6fd');
    }

    // Ближний слой: промышленные трубы и мониторы
    const nearStep = 520;
    const nearOffset = -(bgScrollNear % nearStep);
    for (let x = nearOffset; x < worldWidth + nearStep; x += nearStep) {
      pRect(ctx, x + 44, ceilingY, 24, 156, '#334155');
      pRect(ctx, x + 44, ceilingY + 136, 136, 24, '#475569');
      pRect(ctx, x + 40, ceilingY + 68, 32, 12, '#64748b');

      // Экран мониторинга
      pRect(ctx, x + 280, floorY - 148, 112, 76, '#090d16');
      pRect(ctx, x + 280, floorY - 148, 112, 8, '#64748b');
      pRect(ctx, x + 280, floorY - 80, 112, 8, '#64748b');
      pRect(ctx, x + 292, floorY - 132, 48, 8, '#4ade80');
      pRect(ctx, x + 292, floorY - 116, 76, 8, '#38bdf8');
      pRect(ctx, x + 292, floorY - 100, 32, 8, '#facc15');
    }

    // Потолок и пол
    pRect(ctx, 0, 0, worldWidth, ceilingY, '#090d16');
    pRect(ctx, 0, floorY, worldWidth, worldHeight - floorY, '#090d16');

    drawHazardStripe(ctx, 0, ceilingY - 20, worldWidth, 20, floorScroll);
    drawHazardStripe(ctx, 0, floorY, worldWidth, 20, floorScroll);
  }

  function drawScientistSprite(ctx, s) {
    ctx.save();
    ctx.translate(px(s.x), px(s.y));
    ctx.scale(s.dir, 1);

    const step = Math.sin(s.anim) > 0 ? 4 : -4;

    // Ноги
    pRect(ctx, -8, -12, 6, 12, '#0f172a');
    pRect(ctx, 2, -12, 6, 12, '#0f172a');
    pRect(ctx, -8 + step, -12, 6, 8, '#1e293b');
    pRect(ctx, 2 - step, -12, 6, 8, '#1e293b');

    // Белый халат
    pRect(ctx, -12, -32, 24, 20, '#f8fafc');
    pRect(ctx, 8, -32, 4, 20, '#cbd5e1');

    // Голова, очки и растрепанные волосы
    pRect(ctx, -8, -46, 16, 14, '#fed7aa');
    pRect(ctx, -10, -48, 16, 4, '#94a3b8');
    pRect(ctx, 2, -42, 8, 6, '#0f172a');
    pRect(ctx, 4, -40, 4, 2, '#38bdf8');

    if (s.panic) {
      pRect(ctx, -14, -44 + step, 4, 14, '#f8fafc');
      pRect(ctx, 10, -46 - step, 4, 14, '#f8fafc');
    } else {
      pRect(ctx, 8, -28, 6, 6, '#f8fafc');
      pRect(ctx, 12, -24, 8, 8, s.flaskColor);
    }

    ctx.restore();
  }

  function drawHeroSprite(ctx, opts) {
    const { player, onFloor, isThrusting, skinColor, timeMs } = opts;
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer * 16) % 2 === 0) {
      return;
    }

    ctx.save();
    const cx = px(player.x + player.width / 2);
    const cy = px(player.y + player.height / 2);
    ctx.translate(cx, cy);
    ctx.rotate(player.tilt);

    const legShift = onFloor ? Math.round(Math.sin(player.runCycle) * 6) : -4;

    // 1. Пулеметный ранец за спиной
    pRect(ctx, -26, -14, 16, 28, '#334155');
    pRect(ctx, -22, -10, 10, 10, skinColor);
    pRect(ctx, -22, 4, 10, 8, '#64748b');
    pRect(ctx, -22, 14, 10, 6, '#0f172a');

    if (isThrusting || player.boostTimer > 0) {
      const flameH = 12 + Math.floor(Math.random() * 14);
      pRect(ctx, -22, 20, 10, flameH, '#f97316');
      pRect(ctx, -20, 20, 6, flameH - 4, '#fde047');
    }

    // 2. Ноги и кроссовки
    pRect(ctx, -8 + legShift, 12, 8, 14, '#1d4ed8');
    pRect(ctx, 2 - legShift, 12, 8, 14, '#1e3a8a');
    pRect(ctx, -8 + legShift, 22, 10, 4, '#ef4444');
    pRect(ctx, 2 - legShift, 22, 10, 4, '#ef4444');

    // 3. Синяя куртка
    pRect(ctx, -12, -12, 24, 24, '#2563eb');
    pRect(ctx, -12, -12, 24, 4, '#60a5fa');
    pRect(ctx, 2, -12, 4, 24, '#93c5fd');

    // 4. Голова и темные очки
    pRect(ctx, -8, -28, 18, 16, '#fed7aa');
    pRect(ctx, 0, -24, 12, 6, '#090d16');
    pRect(ctx, 2, -22, 4, 2, '#38bdf8');
    pRect(ctx, 8, -22, 2, 2, '#38bdf8');

    // 5. Кепка задом наперед (козырек назад влево)
    pRect(ctx, -10, -34, 20, 8, '#ef4444');
    pRect(ctx, -10, -34, 20, 4, '#fca5a5');
    pRect(ctx, -20, -30, 10, 4, '#b91c1c');

    // Энергетический щит
    if (player.shield) {
      const pulse = Math.sin(timeMs * 0.01) * 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(-36 - pulse, -38 - pulse, 72 + pulse * 2, 72 + pulse * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.fillRect(-36 - pulse, -38 - pulse, 72 + pulse * 2, 72 + pulse * 2);
    }

    // Эффект ускорения
    if (player.boostTimer > 0) {
      pRect(ctx, 24, -24, 8, 48, '#facc15');
      pRect(ctx, 32, -16, 8, 32, '#f97316');
    }

    ctx.restore();
  }

  window.PixelSprites = {
    PIXEL,
    px,
    pRect,
    drawLabBackground,
    drawScientistSprite,
    drawHeroSprite
  };
})();
