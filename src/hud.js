// hud.js — TODO o HUD: faixa mínima de recursos (sempre visível), painel de
// EQUIPAMENTO + janela de STATUS colada (tecla C) e INVENTÁRIO com total de
// gold (tecla I). Sem vida/stamina/orbes. Mantém os overlays de DEBUG, com um
// botão no canto superior direito (só existe com CONFIG.DEBUG=true) pra
// esconder/mostrar as linhas de colisão etc. sem precisar editar config.js.
'use strict';

var HUD = (function () {
  var PAL = null;
  var pulse = {};        // itemId -> tempo do pulso do contador
  var floaters = [];     // { item, t } "+1" flutuante ao coletar
  var statFlash = {};    // stat -> { from, to, t } destaque dourado
  var goldFlash = 0;     // destaque do total de gold ao vender/receber recompensa
  var goldFloaters = []; // { amount, t } "+N" flutuante ao ganhar gold
  var activePanel = null; // null | 'equipment' | 'inventory'
  var debugVisible = true; // toggle em runtime do overlay de DEBUG (botão)

  var STRIP_X = 4, STRIP_Y = 4, SLOT_W = 30;
  function stripSlotX(i) { return STRIP_X + i * SLOT_W; }
  function pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  // Botão [DEBUG] no canto superior direito — liga/desliga o overlay em runtime.
  var DEBUG_BTN_LABEL = 'DEBUG';
  function debugBtnRect() {
    var w = ASSETS.textWidth(DEBUG_BTN_LABEL, 1) + 8;
    return { x: CONFIG.GAME_WIDTH - w - 4, y: 4, w: w, h: 10 };
  }
  // Itens com quantidade > 0 — itens zerados (ex.: drops de inimigo antes do
  // primeiro kill) não ocupam slot nem contam "0" na faixa/inventário.
  function ownedItems(world) {
    var out = [];
    for (var i = 0; i < INVENTORY_ORDER.length; i++) {
      if ((world.inventory[INVENTORY_ORDER[i]] || 0) > 0) out.push(INVENTORY_ORDER[i]);
    }
    return out;
  }

  // ------- API chamada por outros módulos -------
  function notifyPulse(itemId) {
    pulse[itemId] = CONFIG.HUD_PULSE_TIME;
    floaters.push({ item: itemId, t: CONFIG.FLOAT_TEXT_TIME });
  }
  function flashStat(stat, from, to) { statFlash[stat] = { from: from, to: to, t: CONFIG.STAT_FLASH_TIME }; }
  function notifyGold(amount) {
    goldFlash = CONFIG.STAT_FLASH_TIME;
    if (amount) goldFloaters.push({ amount: amount, t: CONFIG.FLOAT_TEXT_TIME });
  }
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
    for (var g = goldFloaters.length - 1; g >= 0; g--) {
      goldFloaters[g].t -= dt;
      if (goldFloaters[g].t <= 0) goldFloaters.splice(g, 1);
    }
    if (INPUT.wasPressed('KeyC')) setPanel(activePanel === 'equipment' ? null : 'equipment', world);
    if (INPUT.wasPressed('KeyI')) setPanel(activePanel === 'inventory' ? null : 'inventory', world);
    if (INPUT.wasPressed('KeyQ')) setPanel(activePanel === 'quests' ? null : 'quests', world);
    if (INPUT.wasPressed('Escape') && activePanel) activePanel = null;
    if (CONFIG.DEBUG && INPUT.wasClicked() && pointInRect(INPUT.mouse, debugBtnRect())) {
      debugVisible = !debugVisible;
    }
    // Quest pronta pra coletar: só conclui (aplica reward + avança a cadeia)
    // quando o jogador clica no tracker — ver Quests.claim.
    if (Quests.isReady() && INPUT.wasClicked()) {
      var lay = trackerLayout(world);
      if (lay && pointInRect(INPUT.mouse, lay)) Quests.claim(world);
    }
  }

  // ------------------------------- draw ---------------------------------
  function draw(ctx, world) {
    PAL = ASSETS.palette;
    drawResourceStrip(ctx, world);
    drawQuestTracker(ctx, world);
    drawQuestMarker(ctx, world);
    if (activePanel === 'equipment') drawEquipmentPanel(ctx, world);
    else if (activePanel === 'inventory') drawInventoryPanel(ctx, world);
    else if (activePanel === 'quests') drawQuestLog(ctx, world);
    drawMessage(ctx, world);
  }

  // Faixa mínima de recursos + dicas de tecla.
  function drawResourceStrip(ctx, world) {
    var items = ownedItems(world);
    for (var i = 0; i < items.length; i++) {
      var item = items[i], x = stripSlotX(i), y = STRIP_Y;
      var p = pulse[item] > 0 ? pulse[item] / CONFIG.HUD_PULSE_TIME : 0;
      ctx.fillStyle = 'rgba(26,28,44,0.6)';
      ctx.fillRect(x, y, SLOT_W - 2, 12);
      ctx.drawImage(ASSETS.items[item], x + 2, y + 2);
      var scale = p > 0.5 ? 2 : 1;
      ASSETS.drawText(ctx, String(world.inventory[item] || 0), x + 12, y + (scale === 2 ? 1 : 3),
        p > 0 ? PAL.white : PAL.iron, scale);
    }
    for (var f = 0; f < floaters.length; f++) {
      var fl = floaters[f], idx = items.indexOf(fl.item);
      if (idx < 0) continue; // item foi todo consumido no mesmo instante (ex.: forja)
      var prog = 1 - fl.t / CONFIG.FLOAT_TEXT_TIME;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - prog);
      ASSETS.drawText(ctx, '+1', stripSlotX(idx) + 12, STRIP_Y + 14 - Math.round(prog * 12), PAL.leafLight, 1);
      ctx.restore();
    }

    // Moedinha + total de gold — sempre visível, mesmo padrão de pulso/
    // "+N" flutuante dos itens acima, pra dar feedback visual de recompensas
    // (venda, reward de quest) sem precisar abrir inventário/forja.
    var gx = stripSlotX(items.length), gy = STRIP_Y;
    ctx.fillStyle = 'rgba(26,28,44,0.6)';
    ctx.fillRect(gx, gy, SLOT_W - 2, 12);
    ctx.fillStyle = '#f6c84c';
    ctx.beginPath(); ctx.arc(gx + 6, gy + 6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c98a2c';
    ctx.beginPath(); ctx.arc(gx + 6, gy + 6, 1, 0, Math.PI * 2); ctx.fill();
    var goldScale = goldFlash > 0 ? 2 : 1;
    ASSETS.drawText(ctx, String(world.gold), gx + 12, gy + (goldScale === 2 ? 1 : 3),
      goldFlash > 0 ? '#fff2a0' : PAL.iron, goldScale);
    for (var gf = 0; gf < goldFloaters.length; gf++) {
      var gfl = goldFloaters[gf];
      var gprog = 1 - gfl.t / CONFIG.FLOAT_TEXT_TIME;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - gprog);
      ASSETS.drawText(ctx, '+' + gfl.amount, gx + 12, gy + 14 - Math.round(gprog * 12), '#f6c84c', 1);
      ctx.restore();
    }

    ASSETS.drawText(ctx, '[C] EQUIP  [I] INV  [Q] QUESTS', STRIP_X, STRIP_Y + 16, PAL.gray, 1);
  }

  // -------------------------- tracker de quest (4.1) --------------------------
  // Canto superior direito, discreto: título + uma linha por objetivo
  // (Quests.progressLines — nos objetivos com vários itens, ex. COLLECT_SET,
  // uma linha por item em vez de uma fração agregada). Quando o objetivo é
  // atingido, a quest não conclui sozinha: o tracker pulsa convidando o
  // clique (Quests.isReady()) e só aplica a reward quando o jogador clica
  // nele (ver o handler em `update`) — Quests.claim faz o destaque dourado
  // breve de conclusão (CONFIG.UNLOCK_MSG_TIME).
  var TRACKER_MAX_W = 132;
  function trackerLayout(world) {
    var q = Quests.activeQuest();
    if (!q) return null;
    var ready = Quests.isReady();
    var lines;
    if (ready) {
      lines = wrapText('CONCLUIDA! CLIQUE PARA COLETAR', TRACKER_MAX_W, 1);
    } else {
      lines = [];
      var raw = Quests.progressLines(world);
      for (var r = 0; r < raw.length; r++) {
        var wrapped = wrapText(raw[r], TRACKER_MAX_W, 1);
        for (var w2 = 0; w2 < wrapped.length; w2++) lines.push(wrapped[w2]);
      }
    }
    var w = TRACKER_MAX_W + 8, h = 12 + lines.length * 8 + 3;
    return { x: CONFIG.GAME_WIDTH - w - 4, y: 16, w: w, h: h, lines: lines, title: q.title, ready: ready };
  }

  function drawQuestTracker(ctx, world) {
    var lay = trackerLayout(world);
    if (!lay) return;
    var flashing = Quests.flashTime() > 0;
    var blink = lay.ready && Math.floor(Date.now() / 300) % 2 === 0;
    var gold = lay.ready || flashing;
    ctx.fillStyle = blink ? 'rgba(90,68,20,0.95)' : gold ? 'rgba(58,44,26,0.9)' : 'rgba(26,28,44,0.7)';
    ctx.fillRect(lay.x, lay.y, lay.w, lay.h);
    ASSETS.strokeRect(ctx, lay.x, lay.y, lay.w, lay.h, gold ? '#f6c84c' : 'rgba(139,155,180,0.35)');
    ASSETS.drawText(ctx, lay.title, lay.x + 4, lay.y + 3, gold ? '#f6c84c' : PAL.bronze, 1);
    for (var i = 0; i < lay.lines.length; i++) {
      ASSETS.drawText(ctx, lay.lines[i], lay.x + 4, lay.y + 13 + i * 8, gold ? '#fff2a0' : PAL.white, 1);
    }
  }

  // -------------------------- marcador de objetivo (4.3) --------------------------
  // Mapa é uma única tela, então basta um ícone pulsante sobre o alvo da
  // quest ativa. Dois casos: uma construção (some quando ela já está
  // construída) ou uma posição fixa (ex.: um Pickup — some quando ele já
  // foi coletado, ou seja, quando world.pickups fica vazio).
  function drawObjectiveArrow(ctx, mx, my) {
    var bob = Math.round(Math.sin(Date.now() / 200) * 2);
    mx = Math.round(mx); my = Math.round(my + bob);
    ASSETS.drawText(ctx, '!', mx - 1, my, '#f6c84c', 2);
    ctx.fillStyle = '#f6c84c';
    ctx.beginPath();
    ctx.moveTo(mx - 3, my + 12); ctx.lineTo(mx + 3, my + 12); ctx.lineTo(mx, my + 16);
    ctx.closePath(); ctx.fill();
  }

  function drawQuestMarker(ctx, world) {
    var buildingId = Quests.markerBuildingId();
    if (buildingId) {
      var target = null;
      for (var i = 0; i < world.buildings.length; i++) {
        if (world.buildings[i].type === buildingId) { target = world.buildings[i]; break; }
      }
      if (!target || target.state === 'built') return;
      drawObjectiveArrow(ctx, target.x, target.y - target.def.height / 2 - 20);
      return;
    }
    var pos = Quests.markerPos();
    if (pos && world.pickups && world.pickups.length > 0) {
      drawObjectiveArrow(ctx, pos.x, pos.y - 16);
    }
  }

  // -------------------------- log de quests (4.2, tecla Q) --------------------------
  // Mesma moldura de ASSETS.drawPanel usada no equipamento/forja. Lista a
  // cadeia inteira na ordem de `next`: concluídas marcadas, a ativa com
  // progresso, as futuras esmaecidas mostrando só o título (sem objetivo).
  function drawQuestLog(ctx, world) {
    var ids = Quests.chainOrder(), activeQ = Quests.activeQuest();
    var activeLines = activeQ ? Quests.progressLines(world) : [];
    var w = 168, rowH = 13, headerH = 18, footerH = 12, descH = 9;
    var h = headerH + ids.length * rowH + activeLines.length * descH + footerH;
    var x = Math.round((CONFIG.GAME_WIDTH - w) / 2);
    var y = Math.round((CONFIG.GAME_HEIGHT - h) / 2);
    ASSETS.drawPanel(ctx, x, y, w, h);
    var title = 'QUESTS';
    ASSETS.drawText(ctx, title, x + Math.round((w - ASSETS.textWidth(title, 1)) / 2), y + 8, PAL.bronze, 1);

    var ry = y + headerH;
    for (var i = 0; i < ids.length; i++) {
      var q = Quests.byId(ids[i]);
      var done = Quests.isCompleted(q.id);
      var active = !done && activeQ && ids[i] === activeQ.id;
      var mark = done ? '[X] ' : active ? '[>] ' : '[ ] ';
      var color = done ? PAL.leafLight : active ? PAL.white : PAL.grayDark;
      ASSETS.drawText(ctx, mark + q.title, x + 8, ry + 3, color, 1);
      ry += rowH;
      if (active) {
        for (var l = 0; l < activeLines.length; l++) {
          ASSETS.drawText(ctx, activeLines[l], x + 16, ry + 3, PAL.gray, 1);
          ry += descH;
        }
      }
    }
    var hint = '[Q]';
    ASSETS.drawText(ctx, hint, x + w - ASSETS.textWidth(hint, 1) - 6, y + h - 10, PAL.gray, 1);
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
  // Slots das laterais (peito/anel, removíveis) + linha inferior com 4 slots
  // permanentes (espada, machado, picareta, bota).
  function buildEquipLayout(world, x, y, ew) {
    var eq = world.equipment, p = world.player;
    var dollX = x + Math.round((ew - 32) / 2), dollTop = y + 28, dollCX = dollX + 16;
    var Ss = 20, Sr = 18; // tamanho dos slots laterais / da linha

    // Slot removível (peito/anel) a partir de EQUIP_SLOTS.
    function removableSlot(key, rect) {
      var meta = EQUIP_SLOTS[key], id = eq.slots[key];
      if (id) {
        var rec = RECIPE_BY_ID[id];
        return { key: key, rect: rect, icon: ASSETS.forgeIcons[rec.icon], dim: false,
                 name: rec.name, mods: rec.modifiers, filled: true, removable: true, note: null };
      }
      return { key: key, rect: rect, icon: ASSETS.forgeIcons[key], dim: true,
               name: meta.label, mods: [], filled: false, removable: true, note: '(vazio)' };
    }
    // Slot de item forjado (espada, bota, machado/picareta de bronze):
    // permanente, só recebe upgrade. Por convenção recipe.id === recipe.icon,
    // então "on" é simplesmente o slot apontar pra esse item.
    // `baseWeaponKey` (opcional): ferramenta comum já em uso (machado/picareta)
    // que aparece nítida no slot enquanto o upgrade de bronze não foi forjado —
    // ao forjar, o slot atualiza sozinho para o ícone de bronze. `lockedNote`
    // (opcional): mensagem do slot vazio quando não há baseWeaponKey ainda
    // disponível (ex.: o machado antes de ser pego no mundo — ver pickup.js).
    function forgedSlot(slotKey, iconKey, label, rect, baseWeaponKey, lockedNote) {
      var on = eq.slots[slotKey] === iconKey;
      var rec = RECIPE_BY_ID[eq.slots[slotKey]];
      if (on) {
        return { key: slotKey, rect: rect, icon: ASSETS.forgeIcons[iconKey], dim: false,
                 name: rec.name, mods: rec.modifiers, filled: true, removable: false, note: null };
      }
      if (baseWeaponKey) {
        return { key: slotKey, rect: rect, icon: ASSETS.weaponIcons[baseWeaponKey], dim: false,
                 name: WEAPON_TYPES[baseWeaponKey].name, mods: [], filled: true, removable: false,
                 note: '(ferramenta basica)' };
      }
      return { key: slotKey, rect: rect, icon: ASSETS.forgeIcons[iconKey], dim: true,
               name: label, mods: [], filled: false, removable: false, note: lockedNote || '(nao forjada)' };
    }

    var rowY = dollTop + 50;
    var total = 4 * Sr + 3 * 3, sx = Math.round(dollCX - total / 2);
    function rowRect(i) { return { x: sx + i * (Sr + 3), y: rowY, w: Sr, h: Sr }; }

    return {
      dollX: dollX, dollTop: dollTop, dollCX: dollCX,
      slots: [
        removableSlot('chest', { x: dollX - 30, y: dollTop + 8, w: Ss, h: Ss }),
        removableSlot('ring',  { x: dollX + 42, y: dollTop + 8, w: Ss, h: Ss }),
        forgedSlot('weapon', 'sword', 'Espada', rowRect(0)),
        forgedSlot('axe', 'bronze_axe', 'Machado', rowRect(1), world.player.hasAxe ? 'axe' : null, '(nao encontrado)'),
        forgedSlot('pickaxe', 'bronze_pickaxe', 'Picareta', rowRect(2), 'pickaxe'),
        forgedSlot('boot', 'boot', 'Bota', rowRect(3))
      ]
    };
  }

  function drawEquipmentPanel(ctx, world) {
    var ew = 124, sw = 68, eh = 150; // ~40% mais estreito que antes
    var x = Math.round((CONFIG.GAME_WIDTH - (ew + sw)) / 2);
    var y = Math.round((CONFIG.GAME_HEIGHT - eh) / 2);
    ASSETS.drawPanel(ctx, x, y, ew, eh);
    var title = 'EQUIPAMENTO';
    ASSETS.drawText(ctx, title, x + Math.round((ew - ASSETS.textWidth(title, 1)) / 2), y + 8, PAL.bronze, 1);

    var lay = buildEquipLayout(world, x, y, ew);
    var dollCX = lay.dollCX, dollCY = lay.dollTop + 22;
    var frame = ASSETS.players[world.player.character].down.idle[0];
    ctx.drawImage(frame, lay.dollX, lay.dollTop, 32, 44);
    if (world.equipment.slots.weapon) ctx.drawImage(ASSETS.forgeIcons.sword, lay.dollX + 22, lay.dollTop + 16);
    if (world.equipment.slots.boot)   ctx.drawImage(ASSETS.forgeIcons.boot, lay.dollX + 8, lay.dollTop + 32);
    if (world.equipment.slots.chest)  ctx.drawImage(ASSETS.forgeIcons.chest, lay.dollX + 10, lay.dollTop + 16);

    var hovered = null;
    for (var i = 0; i < lay.slots.length; i++) {
      var s = lay.slots[i], r = s.rect;
      ctx.strokeStyle = 'rgba(139,155,180,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x + r.w / 2 + 0.5, r.y < dollCY ? r.y + r.h + 0.5 : r.y + 0.5);
      ctx.lineTo(dollCX + 0.5, dollCY + 0.5);
      ctx.stroke();

      ASSETS.drawSlot(ctx, r.x, r.y, r.w, s.filled);
      if (s.removable) ASSETS.strokeRect(ctx, r.x, r.y, r.w, r.h, s.filled ? PAL.bronze : 'rgba(232,160,60,0.5)');
      if (s.icon) {
        ctx.save();
        if (s.dim) ctx.globalAlpha = 0.32;
        ctx.drawImage(s.icon, r.x + (r.w - s.icon.width) / 2, r.y + (r.h - s.icon.height) / 2);
        ctx.restore();
      }
      if (pointInRect(INPUT.mouse, r)) {
        hovered = s;
        if (INPUT.wasClicked() && s.removable) world.equipment.toggleSlot(s.key);
      }
    }

    drawStatusWindow(ctx, x + ew, y, sw, eh, world, hovered);
    var hint = '[C]';
    ASSETS.drawText(ctx, hint, x + ew - ASSETS.textWidth(hint, 1) - 6, y + eh - 10, PAL.gray, 1);
    if (hovered) drawTooltip(ctx, hovered);
  }

  // Janela de STATUS colada à direita (estreita): rótulo em cima, valor embaixo.
  function drawStatusWindow(ctx, x, y, w, h, world, hovered) {
    ASSETS.drawPanel(ctx, x, y, w, h);
    var title = 'STATUS';
    ASSETS.drawText(ctx, title, x + Math.round((w - ASSETS.textWidth(title, 1)) / 2), y + 8, PAL.bronze, 1);
    var rows = ['damage', 'moveSpeed', 'attackSpeed'];
    for (var i = 0; i < rows.length; i++) {
      var stat = rows[i], ry = y + 26 + i * 26;
      var affected = hovered && slotAffects(hovered, stat);
      var flash = statFlash[stat] && statFlash[stat].t > 0;
      ASSETS.drawText(ctx, STAT_LABELS[stat].toUpperCase(), x + 6, ry, affected ? PAL.bronze : PAL.gray, 1);
      var txt = flash ? statFlash[stat].from + ' > ' + statFlash[stat].to : world.stats.statusText(stat);
      var col = flash ? '#f6c070' : (affected ? PAL.white : PAL.iron);
      ASSETS.drawText(ctx, txt, x + w - ASSETS.textWidth(txt, 1) - 6, ry + 10, col, 1);
    }
  }

  function slotAffects(slot, stat) {
    for (var i = 0; i < slot.mods.length; i++) if (slot.mods[i].stat === stat) return true;
    return false;
  }

  // -------------------- INVENTÁRIO (só madeira) + gold --------------------
  // Uma única moldura de madeira: faixa superior com o título e faixa inferior
  // com o total de gold; sem box escura em volta.
  function drawInventoryPanel(ctx, world) {
    var cols = 8, rows = 4, cell = 16, gap = 3, frame = 6, headerH = 13, footerH = 13;
    var w = cols * cell + (cols + 1) * gap + frame * 2;
    var h = (headerH + rows * cell + (rows + 1) * gap + footerH) + frame * 2;
    var x = Math.round((CONFIG.GAME_WIDTH - w) / 2);
    var y = Math.round((CONFIG.GAME_HEIGHT - h) / 2);
    var g = ASSETS.drawInventoryGrid(ctx, x, y, cols, rows, cell, gap, frame, headerH, footerH);

    // Cabeçalho: título centralizado na madeira.
    var title = 'INVENTARIO';
    ASSETS.drawText(ctx, title, g.header.x + Math.round((g.header.w - ASSETS.textWidth(title, 1)) / 2),
      g.header.y + 4, '#f2e2c0', 1);

    // Células — só itens com quantidade > 0 (nada de slot "0" ocupando espaço).
    var items = ownedItems(world);
    for (var i = 0; i < items.length && i < g.cells.length; i++) {
      var item = items[i], cr = g.cells[i];
      ctx.drawImage(ASSETS.items[item], cr.x + (cell - 8) / 2, cr.y + 2);
      var count = String(world.inventory[item] || 0);
      ASSETS.drawText(ctx, count, cr.x + cell - ASSETS.textWidth(count, 1) - 1, cr.y + cell - 6, PAL.white, 1);
    }

    // Rodapé: total de gold.
    var goldTxt = 'GOLD  ' + world.gold;
    ASSETS.drawText(ctx, goldTxt, g.footer.x + 4, g.footer.y + 4, goldFlash > 0 ? '#fff2a0' : '#ffe06a', 1);
    ASSETS.drawText(ctx, '[I]', g.footer.x + g.footer.w - ASSETS.textWidth('[I]', 1) - 4, g.footer.y + 4, '#3a2416', 1);
  }

  function drawTooltip(ctx, slot) {
    var lines = [slot.name];
    if (slot.mods.length) lines.push(Stats.describeMods(slot.mods));
    else if (slot.note) lines.push(slot.note);
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

  function drawDebugToggleButton(ctx) {
    var r = debugBtnRect();
    ctx.fillStyle = debugVisible ? 'rgba(126,200,80,0.25)' : 'rgba(26,28,44,0.6)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ASSETS.strokeRect(ctx, r.x, r.y, r.w, r.h, debugVisible ? PAL.leafLight : PAL.grayDark);
    ASSETS.drawText(ctx, DEBUG_BTN_LABEL, r.x + 4, r.y + 3, debugVisible ? PAL.leafLight : PAL.gray, 1);
  }

  // ---- Overlays de desenvolvimento (CONFIG.DEBUG) ----
  function drawDebug(ctx, world) {
    drawDebugToggleButton(ctx);
    if (!debugVisible) return;

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
    // Hurtbox dos objetos atingíveis: mesma cor laranja da frontBox — quando
    // as duas se sobrepõem é exatamente o instante em que o ataque dispara.
    for (var m = 0; m < world.harvestables.length; m++) {
      if (!world.harvestables[m].alive) continue;
      var hhb = world.harvestables[m].hurtbox();
      ctx.strokeRect(hhb.x + 0.5, hhb.y + 0.5, hhb.w - 1, hhb.h - 1);
    }
    for (var n = 0; n < world.enemies.length; n++) {
      if (!world.enemies[n].alive) continue;
      var ehb = world.enemies[n].hurtbox();
      ctx.strokeRect(ehb.x + 0.5, ehb.y + 0.5, ehb.w - 1, ehb.h - 1);
    }
    ctx.strokeStyle = 'rgba(126,200,80,0.6)';
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y - 8, CONFIG.COLLECT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    for (var j = 0; j < world.harvestables.length; j++) {
      var h = world.harvestables[j];
      if (h.state === 'respawning') ASSETS.drawText(ctx, h.timer.toFixed(1), Math.round(h.x - 7), Math.round(h.y - 12), ASSETS.palette.white, 1);
    }
    for (var k = 0; k < world.enemies.length; k++) {
      var en = world.enemies[k];
      if (en.state === 'respawning') ASSETS.drawText(ctx, en.timer.toFixed(1), Math.round(en.x - 7), Math.round(en.y - 12), ASSETS.palette.white, 1);
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
