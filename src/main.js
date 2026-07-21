// main.js — bootstrap, cena de seleção, mundo e game loop (delta time).
'use strict';

(function () {
  var canvas = document.getElementById('game');
  canvas.width = CONFIG.GAME_WIDTH;
  canvas.height = CONFIG.GAME_HEIGHT;
  canvas.style.width = (CONFIG.GAME_WIDTH * CONFIG.SCALE) + 'px';
  canvas.style.height = (CONFIG.GAME_HEIGHT * CONFIG.SCALE) + 'px';
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  INPUT.attachMouse(canvas);
  ASSETS.init();

  var scene = 'select'; // 'select' | 'game'
  var selectIndex = 0;  // 0 = menino, 1 = menina
  var world = null;
  var time = 0;

  // ----------------------------------------------------------------
  // Mundo
  // ----------------------------------------------------------------
  function createWorld(character) {
    var w = {
      player: new Player(character, LEVEL.playerStart.x, LEVEL.playerStart.y),
      harvestables: [],
      buildings: [],
      enemies: [],
      drops: [],
      particles: [],
      pops: [],
      inventory: {},
      gold: 0,
      solids: [],
      message: null,
      messageTime: 0
    };
    // Atributos + equipamento do personagem (Milestone 2).
    w.stats = new Stats();
    w.equipment = new Equipment(w.stats);

    var i;
    // Inicializa inventário com recursos coletáveis (exclui drops de inimigos)
    var collectibles = ['wood', 'iron_ore', 'bronze_ore', 'stone_piece'];
    for (i = 0; i < collectibles.length; i++) w.inventory[collectibles[i]] = CONFIG.START_INVENTORY_QTY;
    for (i = 0; i < INVENTORY_ORDER.length; i++) {
      if (!w.inventory[INVENTORY_ORDER[i]]) w.inventory[INVENTORY_ORDER[i]] = 0;
    }
    for (i = 0; i < LEVEL.objects.length; i++) {
      var o = LEVEL.objects[i];
      w.harvestables.push(new Harvestable(o.type, o.x, o.y));
    }
    for (i = 0; i < LEVEL.buildings.length; i++) {
      var b = LEVEL.buildings[i];
      w.buildings.push(new Building(b.type, b.x, b.y));
    }
    for (i = 0; i < LEVEL.enemies.length; i++) {
      var e = LEVEL.enemies[i];
      w.enemies.push(new Enemy(e.type, e.x, e.y));
    }
    w.forge = new Forge(w); // interação com o ferreiro + janela de forja

    w.addToInventory = function (itemId, n) {
      w.inventory[itemId] = (w.inventory[itemId] || 0) + n;
      if (n > 0) HUD.notifyPulse(itemId);
    };
    w.spawnDrop = function (itemId, x, y) {
      w.drops.push(new Drop(itemId, x, y));
    };
    w.spawnParticles = function (x, y, category) {
      var colors = ASSETS.particleColors[category] || [ASSETS.palette.white];
      for (var p = 0; p < 6; p++) {
        w.particles.push(new Particle(x, y, colors[p % colors.length]));
      }
    };
    w.spawnPop = function (x, y) { w.pops.push(new Pop(x, y)); };
    w.showMessage = function (text, secs) { w.message = text; w.messageTime = secs; };

    w.rebuildSolids = function () {
      w.solids.length = 0;
      var j;
      for (j = 0; j < w.harvestables.length; j++) {
        if (w.harvestables[j].alive) w.solids.push(w.harvestables[j].solidBox());
      }
      for (j = 0; j < w.buildings.length; j++) {
        var sb = w.buildings[j].solidBox();
        if (sb) w.solids.push(sb);
      }
      for (j = 0; j < w.enemies.length; j++) {
        if (w.enemies[j].alive) w.solids.push(w.enemies[j].solidBox());
      }
    };
    return w;
  }

  function updateWorld(dt) {
    world.rebuildSolids();
    world.forge.handleInput();      // abrir/fechar forja + navegação (proximidade)
    world.player.update(dt, world); // ataque suspenso com a forja aberta; movimento livre (afastar-se fecha a janela)

    var i;
    for (i = 0; i < world.harvestables.length; i++) world.harvestables[i].update(dt);
    for (i = 0; i < world.buildings.length; i++) world.buildings[i].update(dt, world.player, world);
    for (i = world.enemies.length - 1; i >= 0; i--) {
      world.enemies[i].update(dt, world);
      if (world.enemies[i].state === 'dead') world.enemies.splice(i, 1);
    }
    for (i = world.drops.length - 1; i >= 0; i--) {
      world.drops[i].update(dt, world.player, world);
      if (world.drops[i].dead) world.drops.splice(i, 1);
    }
    for (i = world.particles.length - 1; i >= 0; i--) {
      world.particles[i].update(dt);
      if (world.particles[i].dead) world.particles.splice(i, 1);
    }
    for (i = world.pops.length - 1; i >= 0; i--) {
      world.pops[i].update(dt);
      if (world.pops[i].dead) world.pops.splice(i, 1);
    }
    if (world.messageTime > 0) {
      world.messageTime -= dt;
      if (world.messageTime <= 0) world.message = null;
    }
    world.forge.update(dt); // timer da forja: roda mesmo com a janela fechada
    HUD.update(dt, world);
  }

  function drawWorld() {
    ctx.drawImage(ASSETS.ground, 0, 0);

    var i;
    for (i = 0; i < world.drops.length; i++) world.drops[i].draw(ctx);

    // Ordenação por Y (pés) para profundidade top-down correta.
    var entities = [];
    for (i = 0; i < world.harvestables.length; i++) {
      entities.push({ y: world.harvestables[i].y, e: world.harvestables[i] });
    }
    for (i = 0; i < world.buildings.length; i++) {
      var b = world.buildings[i];
      entities.push({ y: b.y + b.def.height / 2, e: b });
    }
    for (i = 0; i < world.enemies.length; i++) {
      entities.push({ y: world.enemies[i].y, e: world.enemies[i] });
    }
    entities.push({ y: world.player.y, e: world.player });
    entities.sort(function (a, b2) { return a.y - b2.y; });
    for (i = 0; i < entities.length; i++) {
      var e = entities[i].e;
      if (e instanceof Building) e.draw(ctx, time);
      else if (e instanceof Enemy) e.draw(ctx);
      else e.draw(ctx);
    }

    for (i = 0; i < world.particles.length; i++) world.particles[i].draw(ctx);
    for (i = 0; i < world.pops.length; i++) world.pops[i].draw(ctx);
    for (i = 0; i < world.harvestables.length; i++) world.harvestables[i].drawHealthbar(ctx);
    for (i = 0; i < world.enemies.length; i++) {
      world.enemies[i].drawHealthbar(ctx);
      world.enemies[i].drawDeathParticles(ctx);
    }
    world.forge.drawPrompt(ctx);   // [E] FORJAR sobre a casa (espaço do mundo)

    HUD.draw(ctx, world);
    world.forge.drawWindow(ctx);   // janela de forja por cima do HUD
    if (CONFIG.DEBUG) HUD.drawDebug(ctx, world);
  }

  // ----------------------------------------------------------------
  // Cena de seleção de personagem
  // ----------------------------------------------------------------
  function updateSelect() {
    if (INPUT.wasPressed('KeyA') || INPUT.wasPressed('ArrowLeft')) selectIndex = 0;
    if (INPUT.wasPressed('KeyD') || INPUT.wasPressed('ArrowRight')) selectIndex = 1;
    if (INPUT.wasPressed('Enter') || INPUT.wasPressed('Space')) {
      world = createWorld(selectIndex === 0 ? 'boy' : 'girl');
      scene = 'game';
    }
  }

  function drawSelect() {
    ctx.fillStyle = ASSETS.palette.darkGreen;
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    var title = 'ESCOLHA SEU PERSONAGEM';
    ASSETS.drawText(ctx, title,
      Math.round((CONFIG.GAME_WIDTH - ASSETS.textWidth(title, 2)) / 2), 50,
      ASSETS.palette.white, 2);

    var opts = [
      { id: 'boy', label: 'MENINO', x: 180 },
      { id: 'girl', label: 'MENINA', x: 300 }
    ];
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var frame = ASSETS.players[o.id].down.idle[0];
      var selected = selectIndex === i;
      if (selected) {
        ctx.strokeStyle = ASSETS.palette.white;
        ctx.lineWidth = 1;
        var pulse = Math.sin(time * 6) > 0 ? 1 : 0;
        ctx.strokeRect(o.x - 20.5 - pulse, 110.5 - pulse, 40 + pulse * 2, 60 + pulse * 2);
      }
      ctx.drawImage(frame, o.x - 16, 118, 32, 44); // sprite em 2x

      ASSETS.drawText(ctx, o.label,
        Math.round(o.x - ASSETS.textWidth(o.label, 1) / 2), 160,
        selected ? ASSETS.palette.white : ASSETS.palette.gray, 1);
    }

    var hint = 'SETAS PARA ESCOLHER - ENTER PARA COMECAR';
    ASSETS.drawText(ctx, hint,
      Math.round((CONFIG.GAME_WIDTH - ASSETS.textWidth(hint, 1)) / 2), 200,
      ASSETS.palette.gray, 1);
  }

  // Handle de inspeção no console do navegador (só em modo DEBUG).
  if (CONFIG.DEBUG) {
    window.GAME = {
      get scene() { return scene; },
      get world() { return world; }
    };
  }

  // ----------------------------------------------------------------
  // Game loop com delta time
  // ----------------------------------------------------------------
  var lastTime = performance.now();
  function frame(now) {
    var dt = Math.min(0.1, (now - lastTime) / 1000); // clamp contra abas em background
    lastTime = now;
    time += dt;

    if (scene === 'select') {
      updateSelect();
      drawSelect();
    } else {
      updateWorld(dt);
      drawWorld();
    }

    INPUT.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
