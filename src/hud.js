// hud.js — TODO o HUD do jogo: faixa mínima de recursos (sempre visível) +
// painel de personagem sob demanda (I/TAB). Sem vida/stamina/orbes.
// Nenhum outro módulo desenha HUD. Mantém também os overlays de DEBUG.
'use strict';

var HUD = (function () {
  var PAL = null; // preenchido no primeiro draw (ASSETS já inicializado)
  var pulse = {};       // itemId -> tempo restante do pulso do contador
  var floaters = [];    // { item, t } "+1" flutuante ao coletar
  var statFlash = {};   // stat -> { from, to, t } destaque dourado
  var panelOpen = false;

  var STRIP_X = 4, STRIP_Y = 4, SLOT_W = 30;

  function stripSlotX(i) { return STRIP_X + i * SLOT_W; }

  // ------- API chamada por outros módulos (via eventos do mundo) -------
  function notifyPulse(itemId) {
    pulse[itemId] = CONFIG.HUD_PULSE_TIME;
    floaters.push({ item: itemId, t: CONFIG.FLOAT_TEXT_TIME });
  }
  function flashStat(stat, from, to) {
    statFlash[stat] = { from: from, to: to, t: CONFIG.STAT_FLASH_TIME };
  }
  function openPanel() { panelOpen = true; }
  function closePanel() { panelOpen = false; }
  function isPanelOpen() { return panelOpen; }

  function pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  // ------------------------------- update -------------------------------
  function update(dt, world) {
    var k;
    for (k in pulse) if (pulse[k] > 0) pulse[k] -= dt;
    for (k in statFlash) if (statFlash[k].t > 0) statFlash[k].t -= dt;
    for (var i = floaters.length - 1; i >= 0; i--) {
      floaters[i].t -= dt;
      if (floaters[i].t <= 0) floaters.splice(i, 1);
    }
    // Abrir/fechar painel (I ou TAB). Abrir painel fecha a forja.
    if (INPUT.wasPressed('KeyI') || INPUT.wasPressed('Tab')) {
      panelOpen = !panelOpen;
      if (panelOpen && world.forge) world.forge.open = false;
    }
  }

  // ------------------------------- draw ---------------------------------
  function draw(ctx, world) {
    PAL = ASSETS.palette;
    drawResourceStrip(ctx, world);
    if (panelOpen) drawCharacterPanel(ctx, world);
    drawMessage(ctx, world);
  }

  // Faixa mínima de recursos + dica de tecla.
  function drawResourceStrip(ctx, world) {
    for (var i = 0; i < INVENTORY_ORDER.length; i++) {
      var item = INVENTORY_ORDER[i];
      var count = world.inventory[item] || 0;
      var x = stripSlotX(i), y = STRIP_Y;
      var p = pulse[item] > 0 ? pulse[item] / CONFIG.HUD_PULSE_TIME : 0;
      ctx.fillStyle = 'rgba(26,28,44,0.6)';
      ctx.fillRect(x, y, SLOT_W - 2, 12);
      ctx.drawImage(ASSETS.items[item], x + 2, y + 2);
      var scale = p > 0.5 ? 2 : 1; // pulsa ao coletar
      ASSETS.drawText(ctx, String(count), x + 12, y + (scale === 2 ? 1 : 3),
        p > 0 ? PAL.white : PAL.iron, scale);
    }
    // "+1" flutuante subindo sobre o slot do recurso coletado.
    for (var f = 0; f < floaters.length; f++) {
      var fl = floaters[f];
      var idx = INVENTORY_ORDER.indexOf(fl.item);
      var prog = 1 - fl.t / CONFIG.FLOAT_TEXT_TIME;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - prog);
      ASSETS.drawText(ctx, '+1', stripSlotX(idx) + 12, STRIP_Y + 14 - Math.round(prog * 12),
        PAL.leafLight, 1);
      ctx.restore();
    }
    var hint = '[I] PERSONAGEM';
    ASSETS.drawText(ctx, hint, STRIP_X, STRIP_Y + 16, PAL.gray, 1);
  }

  // Mensagem central (FERREIRO DESBLOQUEADO / ESPADA FORJADA / ...).
  function drawMessage(ctx, world) {
    if (!world.message || world.messageTime <= 0) return;
    var alpha = Math.min(1, world.messageTime / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    var s = 2;
    var tw = ASSETS.textWidth(world.message, s);
    var mx = Math.round((CONFIG.GAME_WIDTH - tw) / 2);
    var my = Math.round(CONFIG.GAME_HEIGHT / 2 - 26);
    ctx.fillStyle = 'rgba(26,28,44,0.85)';
    ctx.fillRect(mx - 6, my - 5, tw + 12, 20);
    ASSETS.drawText(ctx, world.message, mx + 1, my + 1, PAL.black, s);
    ASSETS.drawText(ctx, world.message, mx, my, PAL.bronze, s);
    ctx.restore();
  }

  // ------------------------- painel de personagem -----------------------
  function drawCharacterPanel(ctx, world) {
    var pw = 400, ph = 232;
    var x = Math.round((CONFIG.GAME_WIDTH - pw) / 2);
    var y = Math.round((CONFIG.GAME_HEIGHT - ph) / 2);
    ASSETS.drawPanel(ctx, x, y, pw, ph);

    var title = 'PERSONAGEM';
    ASSETS.drawText(ctx, title, Math.round(CONFIG.GAME_WIDTH / 2 - ASSETS.textWidth(title, 2) / 2),
      y + 10, PAL.bronze, 2);

    var slots = buildEquipSlots(world, x, y);
    var hovered = hoveredSlot(slots);

    drawPaperDoll(ctx, world, x, y, slots);
    drawAttributes(ctx, world, x + 200, y + 30, hovered);
    drawInventoryGrid(ctx, world, x, y + 120, pw);

    var hint = '[I]/[TAB] FECHAR';
    ASSETS.drawText(ctx, hint, x + pw - ASSETS.textWidth(hint, 1) - 8, y + ph - 10, PAL.gray, 1);

    if (hovered) drawTooltip(ctx, hovered);
  }

  // Bloco 1 — boneco + slots ARMA / ESPADA / BOTA ligados por linhas.
  function buildEquipSlots(world, x, y) {
    var eq = world.equipment, p = world.player;
    var sx = x + 20, S = 20;
    return [
      { key: 'weapon', label: 'ARMA', rect: { x: sx, y: y + 40, w: S, h: S },
        icon: p.weapon ? ASSETS.weaponIcons[p.weapon] : null,
        name: p.weapon ? WEAPON_TYPES[p.weapon].name : null, mods: [] },
      { key: 'sword', label: 'ESPADA', rect: { x: sx, y: y + 68, w: S, h: S },
        icon: eq.slots.sword ? ASSETS.forgeIcons[RECIPE_BY_ID[eq.slots.sword].icon] : null,
        name: eq.slots.sword ? RECIPE_BY_ID[eq.slots.sword].name : null,
        mods: eq.slots.sword ? RECIPE_BY_ID[eq.slots.sword].modifiers : [] },
      { key: 'boot', label: 'BOTA', rect: { x: sx, y: y + 96, w: S, h: S },
        icon: eq.slots.boot ? ASSETS.forgeIcons[RECIPE_BY_ID[eq.slots.boot].icon] : null,
        name: eq.slots.boot ? RECIPE_BY_ID[eq.slots.boot].name : null,
        mods: eq.slots.boot ? RECIPE_BY_ID[eq.slots.boot].modifiers : [] }
    ];
  }

  function hoveredSlot(slots) {
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].icon && pointInRect(INPUT.mouse, slots[i].rect)) return slots[i];
    }
    return null;
  }

  function drawPaperDoll(ctx, world, x, y, slots) {
    var dollX = x + 96, dollTop = y + 40;
    // Boneco (sprite frontal 2x).
    var frame = ASSETS.players[world.player.character].down.idle[0];
    ctx.drawImage(frame, dollX, dollTop, 32, 44);

    var dollCX = dollX + 16, dollCY = dollTop + 22;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i], r = s.rect;
      // Linha fina ligando o slot ao boneco.
      ctx.strokeStyle = 'rgba(139,155,180,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x + r.w + 0.5, r.y + r.h / 2 + 0.5);
      ctx.lineTo(dollCX - 8 + 0.5, dollCY + 0.5);
      ctx.stroke();

      var filled = !!s.icon;
      ASSETS.drawSlot(ctx, r.x, r.y, r.w, filled);
      if (filled) {
        ctx.drawImage(s.icon, r.x + (r.w - s.icon.width) / 2, r.y + (r.h - s.icon.height) / 2);
      } else {
        ASSETS.strokeRect(ctx, r.x, r.y, r.w, r.h, 'rgba(139,155,180,0.4)'); // borda tracejada simplificada
      }
      ASSETS.drawText(ctx, s.label, r.x, r.y + r.h + 1, filled ? PAL.white : PAL.grayDark, 1);
    }

    // Itens equipados aparecem sobre o boneco.
    if (world.equipment.slots.sword) ctx.drawImage(ASSETS.forgeIcons.sword, dollX + 22, dollTop + 18);
    if (world.equipment.slots.boot)  ctx.drawImage(ASSETS.forgeIcons.boot, dollX + 8, dollTop + 32);
  }

  // Bloco 2 — atributos finais (com destaque dourado e transição).
  function drawAttributes(ctx, world, x, y, hovered) {
    ASSETS.drawText(ctx, 'ATRIBUTOS', x, y, PAL.iron, 1);
    var stats = world.stats;
    var rows = ['damage', 'moveSpeed', 'attackSpeed'];
    for (var i = 0; i < rows.length; i++) {
      var stat = rows[i], ry = y + 14 + i * 12;
      var affected = hovered && slotAffects(hovered, stat);
      var flash = statFlash[stat] && statFlash[stat].t > 0;
      var labelCol = affected ? PAL.bronze : PAL.gray;
      ASSETS.drawText(ctx, STAT_LABELS[stat].toUpperCase(), x, ry, labelCol, 1);
      var val = stats.display(stat);
      var col = flash ? '#f6c070' : (affected ? PAL.white : PAL.iron);
      if (flash) val = statFlash[stat].from + ' > ' + statFlash[stat].to;
      ASSETS.drawText(ctx, val, x + 110, ry, col, 1);
    }
  }

  function slotAffects(slot, stat) {
    for (var i = 0; i < slot.mods.length; i++) if (slot.mods[i].stat === stat) return true;
    return false;
  }

  // Bloco 3 — grade de inventário estilo tabuleiro de madeira (só leitura).
  // Layout 8x4 como na referência; recursos preenchem os primeiros slots.
  function drawInventoryGrid(ctx, world, panelX, topY, panelW) {
    var cols = 8, rows = 4, cell = 16, gap = 3, frame = 5;
    var gw = cols * cell + (cols + 1) * gap + frame * 2;
    var gx = panelX + Math.round((panelW - gw) / 2);
    var gy = topY + 12;
    ASSETS.drawText(ctx, 'INVENTARIO', gx, topY, PAL.iron, 1);
    var cells = ASSETS.drawInventoryGrid(ctx, gx, gy, cols, rows, cell, gap, frame);
    for (var i = 0; i < INVENTORY_ORDER.length && i < cells.length; i++) {
      var item = INVENTORY_ORDER[i], cr = cells[i];
      ctx.drawImage(ASSETS.items[item], cr.x + (cell - 8) / 2, cr.y + 2);
      var count = String(world.inventory[item] || 0);
      ASSETS.drawText(ctx, count, cr.x + cell - ASSETS.textWidth(count, 1) - 1, cr.y + cell - 6, PAL.white, 1);
    }
  }

  function drawTooltip(ctx, slot) {
    var lines = [slot.name];
    if (slot.mods.length) lines.push(Stats.describeMods(slot.mods));
    var w = 0, i;
    for (i = 0; i < lines.length; i++) w = Math.max(w, ASSETS.textWidth(lines[i], 1));
    w += 8;
    var h = 4 + lines.length * 8;
    var tx = Math.min(INPUT.mouse.x + 6, CONFIG.GAME_WIDTH - w - 2);
    var ty = Math.min(INPUT.mouse.y + 6, CONFIG.GAME_HEIGHT - h - 2);
    ctx.fillStyle = 'rgba(26,28,44,0.95)';
    ctx.fillRect(tx, ty, w, h);
    ASSETS.strokeRect(ctx, tx, ty, w, h, PAL.bronze);
    for (i = 0; i < lines.length; i++) {
      ASSETS.drawText(ctx, lines[i], tx + 4, ty + 3 + i * 8, i === 0 ? PAL.white : PAL.leafLight, 1);
    }
  }

  // ---- Overlays de desenvolvimento (CONFIG.DEBUG) — inalterado do M1 ----
  function drawDebug(ctx, world) {
    var t = CONFIG.TILE_SIZE;
    var cols = CONFIG.GAME_WIDTH / t, rows = CONFIG.GAME_HEIGHT / t;
    for (var c = 0; c < cols; c++) {
      ASSETS.drawText(ctx, String(c), c * t + 2, 1, 'rgba(244,244,244,0.5)', 1);
    }
    for (var r = 1; r < rows; r++) {
      ASSETS.drawText(ctx, String(r), 1, r * t + 2, 'rgba(244,244,244,0.5)', 1);
    }
    ctx.strokeStyle = 'rgba(232,106,192,0.9)';
    ctx.lineWidth = 1;
    for (var i = 0; i < world.solids.length; i++) {
      var s = world.solids[i];
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    }
    var hb = world.player.hitbox();
    ctx.strokeStyle = 'rgba(59,125,216,1)';
    ctx.strokeRect(hb.x + 0.5, hb.y + 0.5, hb.w - 1, hb.h - 1);
    var fb = world.player.frontBox();
    ctx.strokeStyle = 'rgba(232,160,60,0.9)';
    ctx.strokeRect(fb.x + 0.5, fb.y + 0.5, fb.w - 1, fb.h - 1);
    ctx.strokeStyle = 'rgba(126,200,80,0.6)';
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y - 8, CONFIG.COLLECT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    for (var j = 0; j < world.harvestables.length; j++) {
      var h = world.harvestables[j];
      if (h.state === 'respawning') {
        ASSETS.drawText(ctx, h.timer.toFixed(1), Math.round(h.x - 7), Math.round(h.y - 12), ASSETS.palette.white, 1);
      }
    }
    var p = world.player;
    var info = 'T ' + Math.floor(p.x / t) + ',' + Math.floor(p.y / t) +
               '  P ' + Math.round(p.x) + ',' + Math.round(p.y);
    ctx.fillStyle = 'rgba(26,28,44,0.7)';
    ctx.fillRect(2, CONFIG.GAME_HEIGHT - 10, ASSETS.textWidth(info, 1) + 4, 8);
    ASSETS.drawText(ctx, info, 4, CONFIG.GAME_HEIGHT - 9, ASSETS.palette.white, 1);
  }

  return {
    update: update, draw: draw, drawDebug: drawDebug,
    notifyPulse: notifyPulse, flashStat: flashStat,
    openPanel: openPanel, closePanel: closePanel, isPanelOpen: isPanelOpen
  };
})();
