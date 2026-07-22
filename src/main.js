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
  FX.init();

  var scene = 'select'; // 'select' | 'game'
  var selectIndex = 0;  // 0 = menino, 1 = menina
  var world = null;
  var time = 0;

  // Opções da cena de seleção — compartilhado entre updateSelect (clique/
  // toque) e drawSelect (desenho), pra não duplicar as posições.
  var SELECT_OPTIONS = [
    { id: 'boy', label: 'MENINO', x: 180 },
    { id: 'girl', label: 'MENINA', x: 300 }
  ];
  function selectOptionRect(o) { return { x: o.x - 20, y: 108, w: 40, h: 64 }; }
  function pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  // ----------------------------------------------------------------
  // Mundo
  // ----------------------------------------------------------------
  function createWorld(character) {
    var w = {
      player: new Player(character, LEVEL.playerStart.x, LEVEL.playerStart.y),
      harvestables: [],
      buildings: [],
      enemies: [],
      pickups: [],
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
    for (i = 0; i < INVENTORY_ORDER.length; i++) {
      var itemDef = ITEM_TYPES[INVENTORY_ORDER[i]];
      var startQty = itemDef.startQty != null ? itemDef.startQty : CONFIG.START_INVENTORY_QTY;
      w.inventory[INVENTORY_ORDER[i]] = startQty;
    }
    for (i = 0; i < LEVEL.objects.length; i++) {
      var o = LEVEL.objects[i];
      w.harvestables.push(new Harvestable(o.type, o.x, o.y));
    }
    for (i = 0; i < LEVEL.buildings.length; i++) {
      var b = LEVEL.buildings[i];
      var built = new Building(b.type, b.x, b.y);
      w.buildings.push(built);
      if (b.type === 'island') w.islandBuilding = built; // referência rápida p/ a parede d'água
    }
    if (LEVEL.enemies) {
      for (i = 0; i < LEVEL.enemies.length; i++) {
        var e = LEVEL.enemies[i];
        w.enemies.push(new Enemy(e.type, e.x, e.y));
      }
    }
    if (LEVEL.pickups) {
      for (i = 0; i < LEVEL.pickups.length; i++) {
        var pk = LEVEL.pickups[i];
        w.pickups.push(new Pickup(pk.type, pk.x, pk.y));
      }
    }
    w.forge = new Forge(w); // interação com o ferreiro + janela de forja
    Quests.reset();
    if (QUESTS.length) Quests.start(QUESTS[0].id); // ativa a primeira quest da cadeia

    w.addToInventory = function (itemId, n) {
      w.inventory[itemId] = (w.inventory[itemId] || 0) + n;
      if (n > 0) HUD.notifyPulse(itemId);
    };
    w.spawnDrop = function (itemId, x, y) {
      w.drops.push(new Drop(itemId, x, y));
    };
    w.spawnParticles = function (x, y, category, count) {
      var colors = ASSETS.particleColors[category] || [ASSETS.palette.white];
      var n = count || 6;
      for (var p = 0; p < n; p++) {
        w.particles.push(new Particle(x, y, colors[p % colors.length]));
      }
    };
    w.spawnPop = function (x, y) { w.pops.push(new Pop(x, y)); };
    w.showMessage = function (text, secs) { w.message = text; w.messageTime = secs; };

    // owner: referência à entidade dona do sólido — permite que uma entidade
    // que se move (Enemy) ignore seu próprio sólido ao resolver colisão
    // contra world.solids (senão ela se auto-empurra a cada frame).
    w.rebuildSolids = function () {
      w.solids.length = 0;
      var j, sb;
      for (j = 0; j < w.harvestables.length; j++) {
        if (w.harvestables[j].alive) {
          sb = w.harvestables[j].solidBox();
          sb.owner = w.harvestables[j];
          w.solids.push(sb);
        }
      }
      for (j = 0; j < w.buildings.length; j++) {
        sb = w.buildings[j].solidBox();
        if (sb) { sb.owner = w.buildings[j]; w.solids.push(sb); }
      }
      for (j = 0; j < w.enemies.length; j++) {
        if (w.enemies[j].alive) {
          sb = w.enemies[j].solidBox();
          sb.owner = w.enemies[j];
          w.solids.push(sb);
        }
      }
      // Água: só o retângulo 5x5 da ilha (BUILDINGS.island.width/height) é
      // desbloqueável — o resto da faixa continua bloqueado pra sempre, três
      // sólidos permanentes "cercando" esse retângulo (acima, à direita,
      // abaixo). O retângulo da ilha em si só é sólido enquanto não construída.
      if (w.islandBuilding) {
        var ib = w.islandBuilding, idef = ib.def;
        var ix = ib.x - idef.width / 2, iy = ib.y - idef.height / 2;
        var waterX = CONFIG.ORIGINAL_MAP_WIDTH, waterW = CONFIG.GAME_WIDTH - CONFIG.ORIGINAL_MAP_WIDTH;
        w.solids.push({ x: waterX, y: 0, w: waterW, h: iy, owner: null }); // acima
        w.solids.push({ x: ix + idef.width, y: iy, w: CONFIG.GAME_WIDTH - (ix + idef.width), h: idef.height, owner: null }); // à direita
        w.solids.push({ x: waterX, y: iy + idef.height, w: waterW, h: CONFIG.GAME_HEIGHT - (iy + idef.height), owner: null }); // abaixo
        if (ib.state !== 'built') {
          w.solids.push({ x: ix, y: iy, w: idef.width, h: idef.height, owner: null }); // a própria ilha, antes de desbloquear
        }
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
    for (i = 0; i < world.enemies.length; i++) world.enemies[i].update(dt, world);
    for (i = world.pickups.length - 1; i >= 0; i--) {
      world.pickups[i].update(dt, world.player, world);
      if (world.pickups[i].dead) world.pickups.splice(i, 1);
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
    Quests.update(dt, world);
    HUD.update(dt, world);
  }

  function drawWorld() {
    // Fundo preto por baixo de tudo: cobre a franja de 1-2px que o screen
    // shake expõe nas bordas (combina com a vinheta).
    ctx.fillStyle = ASSETS.palette.black;
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    // O mundo inteiro treme junto (o HUD e a vinheta ficam fora do shake).
    var sh = FX.shakeOffset();
    ctx.save();
    ctx.translate(Math.round(sh.x), Math.round(sh.y));

    ctx.drawImage(ASSETS.ground, 0, 0);
    FX.drawWater(ctx, world);       // água viva sobre a faixa a leste
    FX.drawGrassDetail(ctx);        // tufos + flores balançando ao vento
    // Ilha desbloqueada: só o recorte 5x5 dela vira grama, mesmo xadrez do
    // resto do mapa — o resto da faixa d'água continua água.
    if (world.islandBuilding && world.islandBuilding.state === 'built') {
      var ib = world.islandBuilding, idef = ib.def;
      ctx.drawImage(ASSETS.groundExtension, ib.x - idef.width / 2, ib.y - idef.height / 2);
    }

    var i;
    drawGroundShadows();            // sombras suaves + brilho de coletáveis
    FX.drawPuffs(ctx);              // poeirinha dos passos

    for (i = 0; i < world.pickups.length; i++) world.pickups[i].draw(ctx);
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
      else e.draw(ctx);
    }

    for (i = 0; i < world.particles.length; i++) world.particles[i].draw(ctx);
    for (i = 0; i < world.pops.length; i++) world.pops[i].draw(ctx);
    for (i = 0; i < world.harvestables.length; i++) world.harvestables[i].drawHealthbar(ctx);
    for (i = 0; i < world.enemies.length; i++) {
      world.enemies[i].drawHealthbar(ctx);
      world.enemies[i].drawDeathParticles(ctx);
    }
    FX.drawPollen(ctx);            // pólen/vaga-lumes flutuando (atmosfera)
    world.forge.drawPrompt(ctx);   // [E] FORJAR sobre a casa (espaço do mundo)

    ctx.restore();                 // fim do screen shake

    FX.drawVignette(ctx);          // vinheta + brilho quente (tela toda, sem shake)
    HUD.draw(ctx, world);
    world.forge.drawWindow(ctx);   // janela de forja por cima do HUD
    if (CONFIG.DEBUG) HUD.drawDebug(ctx, world);
  }

  // Passe de sombras no chão (antes das entidades) + brilho atrás de itens
  // coletáveis pra eles "chamarem" o olhar. Puramente decorativo.
  function drawGroundShadows() {
    var i;
    // brilho + sombra dos coletáveis do chão
    for (i = 0; i < world.pickups.length; i++) {
      var pk = world.pickups[i];
      if (pk.dead) continue;
      var pulse = 8 + Math.sin(FX.clock() * 3 + i) * 2;
      FX.glow(ctx, pk.x, pk.y, pulse, 'rgba(246,200,76,0.35)'); // dourado, atrai
      FX.shadow(ctx, pk.x, pk.y + 4, 4, 1.6, 0.22);
    }
    for (i = 0; i < world.drops.length; i++) {
      var dr = world.drops[i];
      if (dr.state === 'arc') continue; // ainda voando pelo arco
      FX.glow(ctx, dr.x, dr.y, 6, 'rgba(255,246,200,0.22)');
      FX.shadow(ctx, dr.x, dr.y + 3, 3.5, 1.4, 0.2);
    }
    // sombras das entidades
    for (i = 0; i < world.harvestables.length; i++) {
      var h = world.harvestables[i];
      if (h.state === 'respawning') continue;
      var hs = h.sprite();
      FX.shadow(ctx, h.x, h.y - 1, hs.w * 0.36, hs.w * 0.15, 0.26);
    }
    for (i = 0; i < world.enemies.length; i++) {
      var en = world.enemies[i];
      if (!en.alive) continue;
      var es = en.sprite();
      FX.shadow(ctx, en.x, en.y - 1, es.w * 0.4, es.w * 0.18, 0.28);
    }
    for (i = 0; i < world.buildings.length; i++) {
      var bl = world.buildings[i];
      if (bl.def.terrainUnlock || bl.state !== 'built') continue;
      FX.shadow(ctx, bl.x, bl.y + bl.def.height / 2 - 4, bl.def.width * 0.42, bl.def.width * 0.12, 0.3);
    }
    FX.shadow(ctx, world.player.x, world.player.y, 6, 2.4, 0.28);
  }

  // ----------------------------------------------------------------
  // Cena de seleção de personagem
  // ----------------------------------------------------------------
  function updateSelect() {
    if (INPUT.wasPressed('KeyA') || INPUT.wasPressed('ArrowLeft')) selectIndex = 0;
    if (INPUT.wasPressed('KeyD') || INPUT.wasPressed('ArrowRight')) selectIndex = 1;
    if (INPUT.wasPressed('Enter') || INPUT.wasPressed('Space')) {
      world = createWorld(SELECT_OPTIONS[selectIndex].id);
      scene = 'game';
    }

    // Mouse/touch: passar por cima destaca (equivalente às setas) e
    // clicar/tocar já escolhe e começa — sem isso não dá pra jogar só
    // com toque no celular, já que não existe teclado.
    for (var i = 0; i < SELECT_OPTIONS.length; i++) {
      if (pointInRect(INPUT.mouse, selectOptionRect(SELECT_OPTIONS[i]))) {
        selectIndex = i;
        if (INPUT.wasClicked()) {
          world = createWorld(SELECT_OPTIONS[i].id);
          scene = 'game';
        }
      }
    }
  }

  // Colina ondulada preenchida (silhueta de parallax na cena de seleção).
  function drawHill(baseY, amp, freq, phase, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.GAME_HEIGHT);
    for (var x = 0; x <= CONFIG.GAME_WIDTH; x += 6) {
      ctx.lineTo(x, baseY + Math.sin(x * freq + phase) * amp);
    }
    ctx.lineTo(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  function drawSelect() {
    var W = CONFIG.GAME_WIDTH, H = CONFIG.GAME_HEIGHT, PAL = ASSETS.palette;
    var GROUND = 178; // linha onde os personagens pisam

    // --- Céu: gradiente de meadow ensolarado ---
    var sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#5ea8d8');
    sky.addColorStop(0.6, '#9ed6ea');
    sky.addColorStop(1, '#dff0ee');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND);

    // --- Sol: brilho radial + raios girando lentamente ---
    var sunX = 96, sunY = 44;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(sunX, sunY);
    ctx.rotate(time * 0.12);
    for (var r = 0; r < 14; r++) {
      ctx.rotate(Math.PI * 2 / 14);
      var rl = 60 + Math.sin(time * 1.5 + r) * 8;
      ctx.fillStyle = 'rgba(255,240,180,0.06)';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-4, -rl); ctx.lineTo(4, -rl); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    FX.glow(ctx, sunX, sunY, 46, 'rgba(255,246,200,0.9)');
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath(); ctx.arc(sunX, sunY, 13, 0, Math.PI * 2); ctx.fill();

    // --- Nuvens macias derivando ---
    function cloud(cx, cy, s, a) {
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.beginPath();
      ctx.arc(cx, cy, 6 * s, 0, Math.PI * 2);
      ctx.arc(cx + 8 * s, cy + 1, 8 * s, 0, Math.PI * 2);
      ctx.arc(cx + 18 * s, cy, 6 * s, 0, Math.PI * 2);
      ctx.arc(cx + 9 * s, cy - 4 * s, 6 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    var cd = (time * 6) % (W + 80);
    cloud(((cd) % (W + 80)) - 40, 34, 1.1, 0.85);
    cloud(((cd + 180) % (W + 80)) - 40, 58, 0.8, 0.6);
    cloud(((cd + 330) % (W + 80)) - 40, 26, 0.9, 0.7);

    // --- Colinas em parallax (fundo → frente) ---
    drawHill(150, 10, 0.012, 0.6, '#5b9e56');
    drawHill(164, 8, 0.02, 2.1, '#48853f');
    // Chão da frente onde os personagens ficam
    ctx.fillStyle = '#3e7538';
    ctx.fillRect(0, GROUND - 4, W, H - GROUND + 4);
    ctx.fillStyle = '#4f9145';
    ctx.fillRect(0, GROUND - 4, W, 3);

    // Tufos de grama + florzinhas ao longo do gramado da frente
    for (var t = 0; t < 34; t++) {
      var gx = (t * 15 + 7) % W;
      var sway = Math.sin(time * 2 + gx * 0.1) * 1.2;
      if (t % 5 === 0) {
        ctx.fillStyle = ['#f4d35e', '#e86ac0', '#f4f4f4'][t % 3];
        ctx.fillRect(Math.round(gx + sway), GROUND - 3, 2, 2);
      } else {
        ctx.fillStyle = t % 2 ? '#6fb04c' : '#57964a';
        ctx.fillRect(Math.round(gx + sway * 0.6), GROUND - 4, 1, 4);
      }
    }

    // --- Título em banner de madeira, com leve flutuação ---
    var title = 'ESCOLHA SEU HEROI';
    var ts = 2, tw = ASSETS.textWidth(title, ts);
    var bw = tw + 28, bx = Math.round((W - bw) / 2);
    var by = 14 + Math.round(Math.sin(time * 1.5) * 1.5);
    ASSETS.drawPanel(ctx, bx, by, bw, 24);
    ASSETS.drawText(ctx, title, Math.round((W - tw) / 2) + 1, by + 9, PAL.black, ts);
    ASSETS.drawText(ctx, title, Math.round((W - tw) / 2), by + 8, '#ffe6a0', ts);

    // --- Personagens em pódios, com brilho/seleção animada ---
    var opts = SELECT_OPTIONS;
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var selected = selectIndex === i;
      var bob = Math.round(Math.sin(time * 2.2 + i * 1.3) * 2);
      var frame = ASSETS.players[o.id].down.idle[0];
      var feetY = GROUND - 2;
      var topY = feetY - 44 + bob;

      // halo dourado pulsante atrás do selecionado
      if (selected) {
        var glowR = 30 + Math.sin(time * 4) * 4;
        FX.glow(ctx, o.x, feetY - 20, glowR, 'rgba(255,214,110,0.55)');
      }
      // sombra no chão (encolhe conforme o bob "levanta")
      FX.shadow(ctx, o.x, feetY + 1, 13 - bob * 0.5, 4, selected ? 0.35 : 0.25);

      // pódio de pedra
      ctx.fillStyle = selected ? '#c9a24a' : '#6b7a8a';
      ctx.fillRect(o.x - 15, feetY, 30, 5);
      ctx.fillStyle = selected ? '#e8c060' : '#8b9bb4';
      ctx.fillRect(o.x - 15, feetY, 30, 2);

      ctx.drawImage(frame, o.x - 16, topY, 32, 44); // sprite em 2x

      // anel de seleção pulsante + faíscas subindo
      if (selected) {
        ctx.strokeStyle = '#ffe6a0';
        ctx.lineWidth = 1;
        var pad = 2 + (Math.sin(time * 5) > 0 ? 1 : 0);
        ctx.strokeRect(o.x - 20 - pad + 0.5, topY - 4 - pad + 0.5, 40 + pad * 2, 52 + pad * 2);
        for (var sp = 0; sp < 3; sp++) {
          var spT = (time * 0.8 + sp / 3) % 1;
          var spa = 1 - spT;
          ctx.fillStyle = 'rgba(255,240,180,' + spa.toFixed(2) + ')';
          var spx = o.x - 14 + ((sp * 53) % 28);
          ctx.fillRect(spx, Math.round(feetY - spT * 44), 1, 2);
        }
      }

      // placa de nome
      var nlw = ASSETS.textWidth(o.label, 1) + 8;
      var nlx = Math.round(o.x - nlw / 2);
      ctx.fillStyle = selected ? 'rgba(58,44,26,0.92)' : 'rgba(26,28,44,0.75)';
      ctx.fillRect(nlx, feetY + 8, nlw, 11);
      ASSETS.strokeRect(ctx, nlx, feetY + 8, nlw, 11, selected ? '#ffe6a0' : PAL.grayDark);
      ASSETS.drawText(ctx, o.label, nlx + 4, feetY + 11, selected ? '#ffe6a0' : PAL.gray, 1);
    }

    // pólen atmosférico sobre a cena
    FX.drawPollen(ctx);
    FX.drawVignette(ctx);

    // --- Instrução com pulso suave ---
    var hint = 'SETAS + ENTER OU CLIQUE PARA COMECAR';
    var ha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 3));
    ctx.save();
    ctx.globalAlpha = ha;
    ASSETS.drawText(ctx, hint, Math.round((W - ASSETS.textWidth(hint, 1)) / 2), 250, PAL.white, 1);
    ctx.restore();
  }

  // Handle de inspeção no console do navegador (só em modo DEBUG).
  if (CONFIG.DEBUG) {
    window.GAME = {
      get scene() { return scene; },
      get world() { return world; },
      get quests() { return Quests.debugState(); }
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
    FX.update(dt); // atmosfera/pólen/shake avançam nas duas cenas

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
