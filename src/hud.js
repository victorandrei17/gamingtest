// hud.js — TODO o HUD: faixa mínima de recursos (sempre visível), painel de
// EQUIPAMENTO + janela de STATUS colada (tecla C) e INVENTÁRIO com total de
// gold (tecla I). Sem vida/stamina/orbes. Mantém os overlays de DEBUG.
'use strict';

var HUD = (function () {
  var PAL = null;
  var pulse = {};        // itemId -> tempo do pulso do contador
  var floaters = [];     // { item, t } "+1" flutuante ao coletar
  var statFlash = {};    // stat -> { from, to, t } destaque dourado
  var goldFlash = 0;     // destaque do total de gold ao vender
  var activePanel = null; // null | 'equipment' | 'inventory'

  var STRIP_X = 4, STRIP_Y = 4, SLOT_W = 30;
  function stripSlotX(i) { return STRIP_X + i * SLOT_W; }
  function pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  // ------- API chamada por outros módulos -------
  function notifyPulse(itemId) {
    pulse[itemId] = CONFIG.HUD_PULSE_TIME;
    floaters.push({ item: itemId, t: CONFIG.FLOAT_TEXT_TIME });
  }
  function flashStat(stat, from, to) { statFlash[stat] = { from: from, to: to, t: CONFIG.STAT_FLASH_TIME }; }
  function notifyGold() { goldFlash = CONFIG.STAT_FLASH_TIME; }
  function closePanels() { activePanel = null; }
  function openEquipment() { activePanel = 'equipment'; }
  function openInventory() { activePanel = 'inventory'; }
  function isAnyOpen() { return activePanel !== null; }

  function setPanel(p, world) {
    activePanel = p;
    if (p && world.forge) world.forge.open = false; // exclusivo com a forja
  }

  // ------------------------------- update -------------------------------
  function update(dt, world) {
    var k;
    for (k in pulse) if (pulse[k] > 0) pulse[k] -= dt;
    for (k in statFlash) if (statFlash[k].t > 0) statFlash[k].t -= dt;
    if (goldFlash > 0) goldFlash -= dt;
    for (var i = floaters.length - 1; i >= 0; i--) {
      floaters[i].t -= dt;
      if (floaters[i].t <= 0) floaters.splice(i, 1);
    }
    if (INPUT.wasPressed('KeyC')) setPanel(activePanel === 'equipment' ? null : 'equipment', world);
    if (INPUT.wasPressed('KeyI')) setPanel(activePanel === 'inventory' ? null : 'inventory', world);
    if (INPUT.wasPressed('Escape') && activePanel) activePanel = null;
  }

  // ------------------------------- draw ---------------------------------
  function draw(ctx, world) {
    PAL = ASSETS.palette;
    drawResourceStrip(ctx, world);
    if (activePanel === 'equipment') drawEquipmentPanel(ctx, world);
    else if (activePanel === 'inventory') drawInventoryPanel(ctx, world);
    drawMessage(ctx, world);
  }

  // Faixa mínima de recursos + dicas de tecla.
  function drawResourceStrip(ctx, world) {
    for (var i = 0; i < INVENTORY_ORDER.length; i++) {
      var item = INVENTORY_ORDER[i], x = stripSlotX(i), y = STRIP_Y;
      var p = pulse[item] > 0 ? pulse[item] / CONFIG.HUD_PULSE_TIME : 0;
      ctx.fillStyle = 'rgba(26,28,44,0.6)';
      ctx.fillRect(x, y, SLOT_W - 2, 12);
      ctx.drawImage(ASSETS.items[item], x + 2, y + 2);
      var scale = p > 0.5 ? 2 : 1;
      ASSETS.drawText(ctx, String(world.inventory[item] || 0), x + 12, y + (scale === 2 ? 1 : 3),
        p > 0 ? PAL.white : PAL.iron, scale);
    }
    for (var f = 0; f < floaters.length; f++) {
      var fl = floaters[f], idx = INVENTORY_ORDER.indexOf(fl.item);
      var prog = 1 - fl.t / CONFIG.FLOAT_TEXT_TIME;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - prog);
      ASSETS.drawText(ctx, '+1', stripSlotX(idx) + 12, STRIP_Y + 14 - Math.round(prog * 12), PAL.leafLight, 1);
      ctx.restore();
    }
    ASSETS.drawText(ctx, '[C] EQUIP  [I] INV', STRIP_X, STRIP_Y + 16, PAL.gray, 1);
  }

  function drawMessage(ctx, world) {
    if (!world.message || world.messageTime <= 0) return;
    var alpha = Math.min(1, world.messageTime / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    var s = 2, tw = ASSETS.textWidth(world.message, s);
    var mx = Math.round((CONFIG.GAME_WIDTH - tw) / 2), my = Math.round(CONFIG.GAME_HEIGHT / 2 - 26);
    ctx.fillStyle = 'rgba(26,28,44,0.85)';
    ctx.fillRect(mx - 6, my - 5, tw + 12, 20);
    ASSETS.drawText(ctx, world.message, mx + 1, my + 1, PAL.black, s);
    ASSETS.drawText(ctx, world.message, mx, my, PAL.bronze, s);
    ctx.restore();
  }

  // ------------------ painel de EQUIPAMENTO + STATUS ------------------
  function buildEquipLayout(world, x, y, ew) {
    var eq = world.equipment, p = world.player;
    var dollX = x + Math.round((ew - 32) / 2), dollTop = y + 30;
    var S = 22;
    // Resolve ícone/nome/mods de cada slot.
    function slot(key, rect) {
      var meta = EQUIP_SLOTS[key];
      var equippedId = eq.slots[key];
      var icon = null, dim = false, name = meta.label, mods = [];
      if (equippedId) {
        var rec = RECIPE_BY_ID[equippedId];
        icon = ASSETS.forgeIcons[rec.icon]; name = rec.name; mods = rec.modifiers;
      } else if (key === 'weapon' && p.weapon) {
        icon = ASSETS.weaponIcons[p.weapon]; name = WEAPON_TYPES[p.weapon].name; // arma-base (ferramenta)
      } else {
        // silhueta esmaecida do tipo de item
        icon = key === 'boot' ? ASSETS.forgeIcons.boot
             : key === 'chest' ? ASSETS.forgeIcons.chest
             : key === 'ring' ? ASSETS.forgeIcons.ring
             : (p.weapon ? ASSETS.weaponIcons[p.weapon] : ASSETS.weaponIcons.axe);
        dim = true;
      }
      return { key: key, label: meta.label, removable: meta.removable, rect: rect,
               icon: icon, dim: dim, name: name, mods: mods, filled: !dim };
    }
    return {
      dollX: dollX, dollTop: dollTop,
      slots: [
        slot('chest', { x: dollX - 36, y: dollTop + 6, w: S, h: S }),   // esquerda (removível)
        slot('ring',  { x: dollX + 46, y: dollTop + 6, w: S, h: S }),   // direita (removível)
        slot('weapon', { x: dollX - 8, y: dollTop + 50, w: S, h: S }),  // linha abaixo (permanente)
        slot('boot',   { x: dollX + 18, y: dollTop + 50, w: S, h: S })
      ]
    };
  }

  function drawEquipmentPanel(ctx, world) {
    var ew = 200, sw = 118, eh = 150;
    var x = Math.round((CONFIG.GAME_WIDTH - (ew + sw)) / 2);
    var y = Math.round((CONFIG.GAME_HEIGHT - eh) / 2);
    ASSETS.drawPanel(ctx, x, y, ew, eh);
    var title = 'EQUIPAMENTO';
    ASSETS.drawText(ctx, title, x + Math.round((ew - ASSETS.textWidth(title, 1)) / 2), y + 8, PAL.bronze, 1);

    var lay = buildEquipLayout(world, x, y, ew);
    var dollCX = lay.dollX + 16, dollCY = lay.dollTop + 22;
    var frame = ASSETS.players[world.player.character].down.idle[0];
    ctx.drawImage(frame, lay.dollX, lay.dollTop, 32, 44);
    // itens equipados aparecem no boneco
    if (world.equipment.slots.weapon) ctx.drawImage(ASSETS.forgeIcons.sword, lay.dollX + 22, lay.dollTop + 16);
    if (world.equipment.slots.boot)   ctx.drawImage(ASSETS.forgeIcons.boot, lay.dollX + 8, lay.dollTop + 32);
    if (world.equipment.slots.chest)  ctx.drawImage(ASSETS.forgeIcons.chest, lay.dollX + 10, lay.dollTop + 16);

    var hovered = null;
    for (var i = 0; i < lay.slots.length; i++) {
      var s = lay.slots[i], r = s.rect;
      // linha ligando o slot ao boneco
      ctx.strokeStyle = 'rgba(139,155,180,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x + r.w / 2 + 0.5, s.rect.y < dollCY ? r.y + r.h + 0.5 : r.y + 0.5);
      ctx.lineTo(dollCX + 0.5, dollCY + 0.5);
      ctx.stroke();

      ASSETS.drawSlot(ctx, r.x, r.y, r.w, s.filled);
      if (s.removable) ASSETS.strokeRect(ctx, r.x, r.y, r.w, r.h, s.filled ? PAL.bronze : 'rgba(232,160,60,0.5)');
      if (s.icon) {
        ctx.save();
        if (s.dim) ctx.globalAlpha = 0.35;
        ctx.drawImage(s.icon, r.x + (r.w - s.icon.width) / 2, r.y + (r.h - s.icon.height) / 2);
        ctx.restore();
      }
      ASSETS.drawText(ctx, s.label, r.x + Math.round((r.w - ASSETS.textWidth(s.label, 1)) / 2), r.y + r.h + 1,
        s.filled ? PAL.white : PAL.grayDark, 1);

      if (pointInRect(INPUT.mouse, r)) {
        hovered = s;
        if (INPUT.wasClicked() && s.removable) world.equipment.toggleSlot(s.key);
      }
    }

    drawStatusWindow(ctx, x + ew, y, sw, eh, world, hovered);
    var hint = '[C] FECHAR';
    ASSETS.drawText(ctx, hint, x + ew - ASSETS.textWidth(hint, 1) - 8, y + eh - 10, PAL.gray, 1);
    if (hovered) drawTooltip(ctx, hovered);
  }

  // Janela de STATUS colada à direita do equipamento (compacta).
  function drawStatusWindow(ctx, x, y, w, h, world, hovered) {
    ASSETS.drawPanel(ctx, x, y, w, h);
    var title = 'STATUS';
    ASSETS.drawText(ctx, title, x + Math.round((w - ASSETS.textWidth(title, 1)) / 2), y + 8, PAL.bronze, 1);
    var rows = ['damage', 'moveSpeed', 'attackSpeed'];
    for (var i = 0; i < rows.length; i++) {
      var stat = rows[i], ry = y + 28 + i * 14;
      var affected = hovered && slotAffects(hovered, stat);
      var flash = statFlash[stat] && statFlash[stat].t > 0;
      ASSETS.drawText(ctx, STAT_LABELS[stat].toUpperCase(), x + 10, ry, affected ? PAL.bronze : PAL.gray, 1);
      var txt = flash ? statFlash[stat].from + ' > ' + statFlash[stat].to : world.stats.statusText(stat);
      var col = flash ? '#f6c070' : (affected ? PAL.white : PAL.iron);
      ASSETS.drawText(ctx, txt, x + w - ASSETS.textWidth(txt, 1) - 8, ry + 7, col, 1);
    }
  }

  function slotAffects(slot, stat) {
    for (var i = 0; i < slot.mods.length; i++) if (slot.mods[i].stat === stat) return true;
    return false;
  }

  // -------------------- painel de INVENTÁRIO + gold --------------------
  function drawInventoryPanel(ctx, world) {
    var pw = 224, ph = 156;
    var x = Math.round((CONFIG.GAME_WIDTH - pw) / 2);
    var y = Math.round((CONFIG.GAME_HEIGHT - ph) / 2);
    ASSETS.drawPanel(ctx, x, y, pw, ph);
    var title = 'INVENTARIO';
    ASSETS.drawText(ctx, title, x + Math.round((pw - ASSETS.textWidth(title, 1)) / 2), y + 8, PAL.bronze, 1);

    var cols = 8, rows = 4, cell = 16, gap = 3, frame = 5;
    var gw = cols * cell + (cols + 1) * gap + frame * 2;
    var gx = x + Math.round((pw - gw) / 2), gy = y + 22;
    var cells = ASSETS.drawInventoryGrid(ctx, gx, gy, cols, rows, cell, gap, frame);
    for (var i = 0; i < INVENTORY_ORDER.length && i < cells.length; i++) {
      var item = INVENTORY_ORDER[i], cr = cells[i];
      ctx.drawImage(ASSETS.items[item], cr.x + (cell - 8) / 2, cr.y + 2);
      var count = String(world.inventory[item] || 0);
      ASSETS.drawText(ctx, count, cr.x + cell - ASSETS.textWidth(count, 1) - 1, cr.y + cell - 6, PAL.white, 1);
    }

    // Total de gold no canto inferior do inventário.
    var goldTxt = 'GOLD  ' + world.gold;
    var gcol = goldFlash > 0 ? '#fff2a0' : '#f6c84c';
    ASSETS.drawText(ctx, goldTxt, x + 12, y + ph - 12, gcol, 1);
    var hint = '[I] FECHAR';
    ASSETS.drawText(ctx, hint, x + pw - ASSETS.textWidth(hint, 1) - 12, y + ph - 12, PAL.gray, 1);
  }

  function drawTooltip(ctx, slot) {
    var lines = [slot.name];
    if (slot.mods.length) lines.push(Stats.describeMods(slot.mods));
    else if (slot.removable && !slot.filled) lines.push('(vazio)');
    else if (!slot.removable) lines.push('(so upgrade)');
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

  // ---- Overlays de desenvolvimento (CONFIG.DEBUG) ----
  function drawDebug(ctx, world) {
    var t = CONFIG.TILE_SIZE;
    var cols = CONFIG.GAME_WIDTH / t, rows = CONFIG.GAME_HEIGHT / t;
    for (var c = 0; c < cols; c++) ASSETS.drawText(ctx, String(c), c * t + 2, 1, 'rgba(244,244,244,0.5)', 1);
    for (var r = 1; r < rows; r++) ASSETS.drawText(ctx, String(r), 1, r * t + 2, 'rgba(244,244,244,0.5)', 1);
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
      if (h.state === 'respawning') ASSETS.drawText(ctx, h.timer.toFixed(1), Math.round(h.x - 7), Math.round(h.y - 12), ASSETS.palette.white, 1);
    }
    var p = world.player;
    var info = 'T ' + Math.floor(p.x / t) + ',' + Math.floor(p.y / t) + '  P ' + Math.round(p.x) + ',' + Math.round(p.y);
    ctx.fillStyle = 'rgba(26,28,44,0.7)';
    ctx.fillRect(2, CONFIG.GAME_HEIGHT - 10, ASSETS.textWidth(info, 1) + 4, 8);
    ASSETS.drawText(ctx, info, 4, CONFIG.GAME_HEIGHT - 9, ASSETS.palette.white, 1);
  }

  return {
    update: update, draw: draw, drawDebug: drawDebug,
    notifyPulse: notifyPulse, flashStat: flashStat, notifyGold: notifyGold,
    openEquipment: openEquipment, openInventory: openInventory,
    closePanels: closePanels, isAnyOpen: isAnyOpen
  };
})();
