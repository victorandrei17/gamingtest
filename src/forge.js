// forge.js — interação com o ferreiro. Janela com duas abas:
//   FORJAR — layout de bancada: itens forjáveis (esquerda), grade 3x3 de
//            ingredientes do item selecionado (meio-topo), botão FORJAR +
//            bigorna que martela com faíscas ao forjar (meio-base) e a
//            descrição do item (direita).
//   VENDER — vende coletáveis (>0) por gold.
// A forja em andamento continua rodando mesmo com a janela fechada; só UMA
// forja por vez.
'use strict';

function Forge(world) {
  this.world = world;
  this.open = false;
  this.mode = 'forge';   // 'forge' | 'sell'
  this.selected = 0;
  this.active = null;    // { recipe, total, timeLeft } enquanto forja
  this.smith = null;
  this.denyFlash = 0;
  this.strikeClock = 0;  // relógio das marteladas
  this.sparks = [];      // faíscas (coords relativas ao ponto de impacto)
}

Forge.prototype.nearSmith = function () {
  var p = this.world.player, R = CONFIG.SMITH_INTERACT_RADIUS;
  for (var i = 0; i < this.world.buildings.length; i++) {
    var b = this.world.buildings[i];
    // Só o ferreiro abre a forja — sem isso, qualquer construção 'built'
    // (ex.: a ilha) também dispararia o prompt [E] FORJAR por engano.
    if (b.type !== 'blacksmith' || b.state !== 'built') continue;
    var dx = b.x - p.x, dy = b.y - p.y;
    if (dx * dx + dy * dy <= R * R) return b;
  }
  return null;
};

Forge.prototype.canAfford = function (recipe) {
  for (var item in recipe.cost) {
    if ((this.world.inventory[item] || 0) < recipe.cost[item]) return false;
  }
  return true;
};

// 'forged' | 'busy' | 'insufficient' | 'ready'.
Forge.prototype.recipeState = function (recipe) {
  if (this.world.equipment.owns(recipe.id)) return 'forged';
  if (this.active) return 'busy';
  if (!this.canAfford(recipe)) return 'insufficient';
  return 'ready';
};

Forge.prototype.deny = function () { this.denyFlash = CONFIG.DENY_FLASH_TIME; };
Forge.prototype.setMode = function (m) { if (this.mode !== m) { this.mode = m; this.selected = 0; } };

Forge.prototype.sellList = function () {
  var out = [];
  for (var i = 0; i < INVENTORY_ORDER.length; i++) {
    if ((this.world.inventory[INVENTORY_ORDER[i]] || 0) > 0) out.push(INVENTORY_ORDER[i]);
  }
  return out;
};

Forge.prototype.listLength = function () {
  return this.mode === 'forge' ? RECIPES.length : this.sellList().length;
};

Forge.prototype.confirmSelected = function () {
  if (this.mode === 'forge') this.confirmForge();
  else this.sellSelected();
};

Forge.prototype.confirmForge = function () {
  var recipe = RECIPES[this.selected];
  if (!recipe || this.recipeState(recipe) !== 'ready') { this.deny(); return; }
  for (var item in recipe.cost) this.world.addToInventory(item, -recipe.cost[item]);
  this.active = { recipe: recipe, total: recipe.time, timeLeft: recipe.time };
  this.strikeClock = 0;
};

Forge.prototype.sellSelected = function () {
  var item = this.sellList()[this.selected];
  if (!item || (this.world.inventory[item] || 0) <= 0) { this.deny(); return; }
  this.world.inventory[item] -= 1;
  this.world.gold += CONFIG.GOLD_PER_ITEM;
  HUD.notifyGold();
  var n = this.sellList().length;
  if (this.selected >= n) this.selected = Math.max(0, n - 1);
};

// ------------------------------- input -------------------------------
Forge.prototype.handleInput = function () {
  this.smith = this.nearSmith();

  if (!this.open) {
    if (this.smith && INPUT.wasPressed('KeyE')) {
      this.open = true; this.mode = 'forge'; this.selected = 0; HUD.closePanels();
    }
    return;
  }

  if (INPUT.wasPressed('Escape') || !this.smith) { this.open = false; return; }
  if (INPUT.wasPressed('ArrowLeft'))  this.setMode('forge');
  if (INPUT.wasPressed('ArrowRight')) this.setMode('sell');
  var n = this.listLength();
  if (n > 0) {
    if (INPUT.wasPressed('ArrowUp'))   this.selected = (this.selected - 1 + n) % n;
    if (INPUT.wasPressed('ArrowDown')) this.selected = (this.selected + 1) % n;
  }
  if (this.selected >= n) this.selected = Math.max(0, n - 1);
  if (INPUT.wasPressed('Enter') || INPUT.wasPressed('Space')) this.confirmSelected();

  // Mouse.
  var lay = this.layout();
  if (pointInRect(INPUT.mouse, lay.tabForge) && INPUT.wasClicked()) this.setMode('forge');
  if (pointInRect(INPUT.mouse, lay.tabSell) && INPUT.wasClicked()) this.setMode('sell');
  // Clicar numa aba troca this.mode acima — recalcula lay pro modo atual,
  // senão o branch abaixo usa a forma errada (forge tem itemSlots, vender
  // tem entries; cada uma só existe na sua própria layout) e quebra em
  // "undefined.length".
  lay = this.layout();
  if (this.mode === 'forge') {
    for (var i = 0; i < lay.itemSlots.length; i++) {
      var s = lay.itemSlots[i];
      if (s.index != null && pointInRect(INPUT.mouse, s.rect)) {
        this.selected = s.index;
        if (INPUT.wasClicked()) { /* seleciona */ }
      }
    }
    if (pointInRect(INPUT.mouse, lay.forgeButton) && INPUT.wasClicked()) this.confirmForge();
  } else {
    for (var j = 0; j < lay.entries.length; j++) {
      if (pointInRect(INPUT.mouse, lay.entries[j].rect)) {
        this.selected = j;
        if (INPUT.wasClicked()) this.confirmSelected();
      }
    }
  }
};

// ------------------------------- update -------------------------------
Forge.prototype.update = function (dt) {
  if (this.denyFlash > 0) this.denyFlash -= dt;
  this.updateSparks(dt);
  if (!this.active) return;

  this.strikeClock += dt;
  while (this.strikeClock >= CONFIG.FORGE_STRIKE_PERIOD) {
    this.strikeClock -= CONFIG.FORGE_STRIKE_PERIOD;
    if (this.open && this.mode === 'forge') this.spawnSparks(); // faíscas a cada martelada
  }

  this.active.timeLeft -= dt;
  if (this.active.timeLeft > 0) return;
  var r = this.active.recipe;
  var before = {};
  for (var i = 0; i < r.modifiers.length; i++) before[r.modifiers[i].stat] = this.world.stats.display(r.modifiers[i].stat);
  this.world.equipment.equip(r.id);
  for (var stat in before) HUD.flashStat(stat, before[stat], this.world.stats.display(stat));
  this.world.showMessage(r.name.toUpperCase() + ' FORJADA', CONFIG.UNLOCK_MSG_TIME);
  this.active = null;
};

Forge.prototype.spawnSparks = function () {
  for (var i = 0; i < 8; i++) {
    this.sparks.push({
      x: (Math.random() - 0.5) * 6, y: 0,
      vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 55,
      life: 0.25 + Math.random() * 0.25
    });
  }
};

Forge.prototype.updateSparks = function (dt) {
  for (var i = this.sparks.length - 1; i >= 0; i--) {
    var s = this.sparks[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt; s.life -= dt;
    if (s.life <= 0) this.sparks.splice(i, 1);
  }
};

// ------------------------------- layout -------------------------------
Forge.prototype.layout = function () {
  var x, y, pw, ph;
  var tab = function (lay) {
    var tabW = Math.floor((lay.w - 24 - 6) / 2), tabY = lay.y + 22;
    lay.tabForge = { x: lay.x + 12, y: tabY, w: tabW, h: 12 };
    lay.tabSell = { x: lay.x + 12 + tabW + 6, y: tabY, w: tabW, h: 12 };
  };

  if (this.mode === 'forge') {
    pw = 304; ph = 178;
    x = Math.round((CONFIG.GAME_WIDTH - pw) / 2);
    y = Math.round((CONFIG.GAME_HEIGHT - ph) / 2);
    var lay = { mode: 'forge', x: x, y: y, w: pw, h: ph, itemSlots: [], ingredients: [] };
    tab(lay);
    var cy = y + 42;
    // Esquerda: grade 2x3 de itens forjáveis.
    var ss = 22, sg = 4;
    for (var r = 0; r < 3; r++) for (var c = 0; c < 2; c++) {
      var idx = r * 2 + c;
      lay.itemSlots.push({
        rect: { x: x + 12 + c * (ss + sg), y: cy + r * (ss + sg), w: ss, h: ss },
        index: idx < RECIPES.length ? idx : null
      });
    }
    // Meio-topo: grade 3x3 de ingredientes.
    var ic = 20, ig = 4, gw = 3 * ic + 2 * ig;
    var gx = x + 68 + Math.round((118 - gw) / 2), gy = cy;
    for (var k = 0; k < 9; k++) {
      lay.ingredients.push({ x: gx + (k % 3) * (ic + ig), y: gy + Math.floor(k / 3) * (ic + ig), size: ic });
    }
    lay.forgeButton = { x: x + 80, y: gy + gw + 8, w: 94, h: 16 };
    lay.anvil = { cx: x + 127, cyTop: lay.forgeButton.y + 28 };
    lay.desc = { x: x + 192, y: cy, w: 104 };
    return lay;
  }

  // Modo VENDER: lista estreita, altura adaptável.
  pw = 230;
  var headerH = 44, footerH = 18, eh = 34, gap = 4;
  var n = this.listLength();
  ph = headerH + Math.max(1, n) * (eh + gap) + footerH;
  x = Math.round((CONFIG.GAME_WIDTH - pw) / 2);
  y = Math.round((CONFIG.GAME_HEIGHT - ph) / 2);
  var s = { mode: 'sell', x: x, y: y, w: pw, h: ph, entries: [] };
  tab(s);
  var ex = x + 12, ey = y + headerH, ew = pw - 24;
  for (var i = 0; i < n; i++) s.entries.push({ rect: { x: ex, y: ey + i * (eh + gap), w: ew, h: eh } });
  return s;
};

function pointInRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
function fill(ctx, color, x, y, w, h) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

// Quebra um texto em linhas que cabem em maxW (px) na escala dada.
function wrapText(text, maxW, scale) {
  var words = String(text).split(' '), lines = [], cur = '';
  for (var i = 0; i < words.length; i++) {
    var test = cur ? cur + ' ' + words[i] : words[i];
    if (ASSETS.textWidth(test, scale) > maxW && cur) { lines.push(cur); cur = words[i]; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// -------------------- prompt [E] sobre a estação (mundo) --------------------
Forge.prototype.drawPrompt = function (ctx) {
  if (this.open || !this.smith) return;
  var b = this.smith, label = '[E] FORJAR';
  var w = ASSETS.textWidth(label, 1) + 8;
  var bx = Math.round(b.x - w / 2);
  var by = Math.round(b.y - b.def.height / 2 - 14 + Math.sin(Date.now() / 250));
  ctx.fillStyle = 'rgba(26,28,44,0.85)';
  ctx.fillRect(bx, by, w, 10);
  ASSETS.strokeRect(ctx, bx, by, w, 10, ASSETS.palette.bronze);
  ASSETS.drawText(ctx, label, bx + 4, by + 3, ASSETS.palette.white, 1);
};

// ------------------------------ janela ------------------------------
Forge.prototype.drawWindow = function (ctx) {
  if (!this.open) return;
  var lay = this.layout(), PAL = ASSETS.palette;
  ASSETS.drawPanel(ctx, lay.x, lay.y, lay.w, lay.h);
  var title = 'FERREIRO';
  ASSETS.drawText(ctx, title, Math.round(CONFIG.GAME_WIDTH / 2 - ASSETS.textWidth(title, 2) / 2), lay.y + 7, PAL.bronze, 2);
  drawTab(ctx, lay.tabForge, 'FORJAR', this.mode === 'forge');
  drawTab(ctx, lay.tabSell, 'VENDER', this.mode === 'sell');

  if (this.mode === 'forge') this.drawCraft(ctx, lay);
  else this.drawSell(ctx, lay);

  ASSETS.drawText(ctx, 'GOLD ' + this.world.gold, lay.x + 12, lay.y + lay.h - 11, '#f6c84c', 1);
  var hint = 'SETAS - ENTER - ESC';
  ASSETS.drawText(ctx, hint, lay.x + lay.w - ASSETS.textWidth(hint, 1) - 12, lay.y + lay.h - 11, PAL.gray, 1);
};

function drawTab(ctx, r, label, active) {
  var PAL = ASSETS.palette;
  ctx.fillStyle = active ? '#3a2c1a' : '#241f2e';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ASSETS.strokeRect(ctx, r.x, r.y, r.w, r.h, active ? PAL.bronze : PAL.grayDark);
  ASSETS.drawText(ctx, label, Math.round(r.x + (r.w - ASSETS.textWidth(label, 1)) / 2), r.y + 4, active ? PAL.white : PAL.gray, 1);
}

// -------- aba FORJAR (bancada de 3 colunas) --------
Forge.prototype.drawCraft = function (ctx, lay) {
  var PAL = ASSETS.palette, recipe = RECIPES[this.selected];
  var state = this.recipeState(recipe);

  // Coluna esquerda: itens forjáveis.
  for (var i = 0; i < lay.itemSlots.length; i++) {
    var sl = lay.itemSlots[i], rc = sl.rect;
    ASSETS.drawSlot(ctx, rc.x, rc.y, rc.w, sl.index != null);
    if (sl.index != null) {
      var rec = RECIPES[sl.index];
      var owned = this.world.equipment.owns(rec.id);
      ctx.save();
      if (owned) ctx.globalAlpha = 0.4;
      ctx.drawImage(ASSETS.forgeIcons[rec.icon], rc.x + (rc.w - 12) / 2, rc.y + (rc.h - 12) / 2);
      ctx.restore();
      if (sl.index === this.selected) ASSETS.strokeRect(ctx, rc.x, rc.y, rc.w, rc.h, PAL.bronze);
    }
  }

  // Meio-topo: ingredientes na grade 3x3.
  var costArr = [];
  for (var item in recipe.cost) costArr.push([item, recipe.cost[item]]);
  for (var g = 0; g < lay.ingredients.length; g++) {
    var cell = lay.ingredients[g], ing = costArr[g];
    ASSETS.drawSlot(ctx, cell.x, cell.y, cell.size, !!ing);
    if (ing) {
      ctx.drawImage(ASSETS.items[ing[0]], cell.x + (cell.size - 8) / 2, cell.y + 2);
      var have = this.world.inventory[ing[0]] || 0, need = ing[1];
      var q = String(need);
      ASSETS.drawText(ctx, q, cell.x + cell.size - ASSETS.textWidth(q, 1) - 2, cell.y + cell.size - 7,
        have >= need ? PAL.leafLight : '#e05a5a', 1);
    }
  }

  // Botão FORJAR.
  var btn = lay.forgeButton;
  var canForge = state === 'ready';
  var btnLabel = state === 'forged' ? 'JA FORJADO' : state === 'busy' ? 'FORJANDO...' :
                 state === 'insufficient' ? 'SEM RECURSOS' : 'FORJAR';
  ctx.fillStyle = canForge ? '#2e5339' : '#241f2e';
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
  ASSETS.strokeRect(ctx, btn.x, btn.y, btn.w, btn.h,
    this.denyFlash > 0 ? '#e05a5a' : (canForge ? PAL.leafLight : PAL.grayDark));
  ASSETS.drawText(ctx, btnLabel, Math.round(btn.x + (btn.w - ASSETS.textWidth(btnLabel, 1)) / 2), btn.y + 5,
    canForge ? PAL.white : PAL.gray, 1);

  // Bigorna + marreta + faíscas + barra de progresso.
  this.drawAnvil(ctx, lay.anvil.cx, lay.anvil.cyTop);
  if (this.active) {
    var t = 1 - this.active.timeLeft / this.active.total;
    var bw = 70, bx = lay.anvil.cx - bw / 2, by = lay.anvil.cyTop + 24;
    fill(ctx, PAL.black, bx - 1, by - 1, bw + 2, 5);
    fill(ctx, PAL.grayDark, bx, by, bw, 3);
    fill(ctx, PAL.bronze, bx, by, Math.round(bw * t), 3);
  }

  // Coluna direita: descrição.
  var d = lay.desc;
  ASSETS.drawText(ctx, 'DESCRICAO', d.x, d.y, PAL.iron, 1);
  ctx.drawImage(ASSETS.forgeIcons[recipe.icon], d.x, d.y + 12, 24, 24);
  ASSETS.drawText(ctx, recipe.name, d.x + 30, d.y + 16, PAL.white, 1);
  ASSETS.drawText(ctx, Stats.describeMods(recipe.modifiers), d.x + 30, d.y + 26, PAL.leafLight, 1);
  var lines = wrapText(recipe.desc || '', d.w, 1);
  for (var l = 0; l < lines.length; l++) ASSETS.drawText(ctx, lines[l], d.x, d.y + 42 + l * 9, PAL.gray, 1);
};

// Bigorna com marreta que martela e solta faíscas quando `this.active`.
Forge.prototype.drawAnvil = function (ctx, cx, topY) {
  var PAL = ASSETS.palette;
  // Bigorna (topo em topY).
  fill(ctx, PAL.black, cx - 12, topY, 24, 4);       // mesa
  fill(ctx, PAL.grayDark, cx - 11, topY + 1, 22, 2);
  fill(ctx, PAL.gray, cx - 11, topY + 1, 22, 1);
  fill(ctx, PAL.grayDark, cx + 11, topY + 1, 3, 1); // chifre
  fill(ctx, PAL.black, cx - 3, topY + 4, 6, 4);      // cintura
  fill(ctx, PAL.grayDark, cx - 2, topY + 4, 4, 4);
  fill(ctx, PAL.black, cx - 8, topY + 8, 16, 4);     // base
  fill(ctx, PAL.grayDark, cx - 7, topY + 8, 14, 3);
  fill(ctx, PAL.trunkDark, cx - 8, topY + 12, 16, 4); // cepo
  fill(ctx, PAL.trunk, cx - 7, topY + 12, 14, 2);

  // Marreta (oscila; em impacto encosta na bigorna).
  var phase = this.active ? this.strikeClock / CONFIG.FORGE_STRIKE_PERIOD : 0;
  var lift = this.active ? Math.sin(phase * Math.PI) : 0.7; // 0=impacto, 1=erguida
  var hx = cx - 2, hy = topY - 3 - Math.round(lift * 11);
  fill(ctx, PAL.trunk, hx + 1, hy + 2, 2, 8);         // cabo
  fill(ctx, PAL.black, hx - 3, hy - 2, 10, 6);        // cabeça
  fill(ctx, PAL.gray, hx - 2, hy - 1, 8, 4);
  fill(ctx, PAL.iron, hx - 2, hy - 1, 2, 4);

  // Faíscas (coords relativas ao ponto de impacto = topo da bigorna).
  for (var i = 0; i < this.sparks.length; i++) {
    var s = this.sparks[i];
    fill(ctx, s.life > 0.2 ? '#fff2a0' : PAL.bronze, Math.round(cx + s.x), Math.round(topY + s.y), 1, 1);
  }
};

// -------- aba VENDER --------
Forge.prototype.drawSell = function (ctx, lay) {
  var PAL = ASSETS.palette, sellList = this.sellList();
  for (var i = 0; i < lay.entries.length; i++) this.drawSellEntry(ctx, lay.entries[i], sellList[i], i === this.selected);
  if (sellList.length === 0) {
    var msg = 'NADA PARA VENDER';
    ASSETS.drawText(ctx, msg, Math.round(CONFIG.GAME_WIDTH / 2 - ASSETS.textWidth(msg, 1) / 2), lay.y + 52, PAL.gray, 1);
  }
};

Forge.prototype.drawSellEntry = function (ctx, entry, item, isSel) {
  var rect = entry.rect, PAL = ASSETS.palette;
  var have = this.world.inventory[item] || 0, empty = have <= 0;
  ctx.fillStyle = '#1c1830'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ASSETS.strokeRect(ctx, rect.x, rect.y, rect.w, rect.h, isSel ? PAL.bronze : PAL.grayDark);
  ctx.save();
  if (empty) ctx.globalAlpha = 0.5;
  ASSETS.drawSlot(ctx, rect.x + 5, rect.y + 6, 22, !empty);
  ctx.drawImage(ASSETS.items[item], rect.x + 12, rect.y + 13);
  ASSETS.drawText(ctx, ITEM_TYPES[item].name, rect.x + 34, rect.y + 8, PAL.white, 1);
  ASSETS.drawText(ctx, 'x' + have, rect.x + 34, rect.y + 19, PAL.iron, 1);
  ctx.restore();
  var price = '+' + CONFIG.GOLD_PER_ITEM + ' GOLD';
  ASSETS.drawText(ctx, price, rect.x + rect.w - ASSETS.textWidth(price, 1) - 60, rect.y + 13, '#f6c84c', 1);
  var label = empty ? 'SEM ITENS' : 'VENDER';
  ASSETS.drawText(ctx, label, rect.x + rect.w - ASSETS.textWidth(label, 1) - 6, rect.y + 13,
    empty ? PAL.grayDark : (this.denyFlash > 0 && isSel ? '#e05a5a' : PAL.leafLight), 1);
};
