// forge.js — interação com o ferreiro: janela com duas abas.
//   FORJAR  — forja de equipamentos (receitas de recipes.js)
//   VENDER  — vende coletáveis por gold (CONFIG.GOLD_PER_ITEM cada)
// A forja em andamento continua rodando mesmo com a janela fechada; só UMA
// forja por vez.
'use strict';

function Forge(world) {
  this.world = world;
  this.open = false;
  this.mode = 'forge';   // 'forge' | 'sell'
  this.selected = 0;
  this.active = null;    // { recipe, total, timeLeft } enquanto forja
  this.smith = null;     // ferreiro construído próximo (ou null)
  this.denyFlash = 0;
}

Forge.prototype.nearSmith = function () {
  var p = this.world.player, R = CONFIG.SMITH_INTERACT_RADIUS;
  for (var i = 0; i < this.world.buildings.length; i++) {
    var b = this.world.buildings[i];
    if (b.state !== 'built') continue;
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

// Estado de uma receita: 'forged' | 'busy' | 'insufficient' | 'ready'.
Forge.prototype.recipeState = function (recipe) {
  if (this.world.equipment.owns(recipe.id)) return 'forged';
  if (this.active) return 'busy';
  if (!this.canAfford(recipe)) return 'insufficient';
  return 'ready';
};

Forge.prototype.deny = function () { this.denyFlash = CONFIG.DENY_FLASH_TIME; };

Forge.prototype.setMode = function (m) {
  if (this.mode !== m) { this.mode = m; this.selected = 0; }
};

Forge.prototype.listLength = function () {
  return this.mode === 'forge' ? RECIPES.length : INVENTORY_ORDER.length;
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
};

Forge.prototype.sellSelected = function () {
  var item = INVENTORY_ORDER[this.selected];
  if ((this.world.inventory[item] || 0) <= 0) { this.deny(); return; }
  this.world.inventory[item] -= 1;
  this.world.gold += CONFIG.GOLD_PER_ITEM;
  HUD.notifyGold();
};

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
  if (INPUT.wasPressed('ArrowUp'))   this.selected = (this.selected - 1 + n) % n;
  if (INPUT.wasPressed('ArrowDown')) this.selected = (this.selected + 1) % n;
  if (INPUT.wasPressed('Enter') || INPUT.wasPressed('Space')) this.confirmSelected();

  // Mouse: abas + entradas.
  var lay = this.layout();
  if (pointInRect(INPUT.mouse, lay.tabForge) && INPUT.wasClicked()) this.setMode('forge');
  if (pointInRect(INPUT.mouse, lay.tabSell) && INPUT.wasClicked()) this.setMode('sell');
  for (var i = 0; i < lay.entries.length; i++) {
    if (pointInRect(INPUT.mouse, lay.entries[i].rect)) {
      this.selected = i;
      if (INPUT.wasClicked()) this.confirmSelected();
    }
  }
};

Forge.prototype.update = function (dt) {
  if (this.denyFlash > 0) this.denyFlash -= dt;
  if (!this.active) return;
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

// -------------------------------- layout --------------------------------
Forge.prototype.layout = function () {
  var pw = 330, ph = 214;
  var x = Math.round((CONFIG.GAME_WIDTH - pw) / 2);
  var y = Math.round((CONFIG.GAME_HEIGHT - ph) / 2);
  var tabW = 90, tabH = 12, tabY = y + 24;
  var lay = {
    x: x, y: y, w: pw, h: ph,
    tabForge: { x: x + 12, y: tabY, w: tabW, h: tabH },
    tabSell: { x: x + 12 + tabW + 6, y: tabY, w: tabW, h: tabH },
    entries: []
  };
  var ex = x + 12, ey = y + 44, ew = pw - 24, eh = 34, gap = 4;
  var n = this.listLength();
  for (var i = 0; i < n; i++) {
    lay.entries.push({ rect: { x: ex, y: ey + i * (eh + gap), w: ew, h: eh } });
  }
  return lay;
};

function pointInRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// ---------------- Prompt [E] FORJAR sobre a casa (mundo) ----------------
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

// ---------------------------- janela (tela) ----------------------------
Forge.prototype.drawWindow = function (ctx) {
  if (!this.open) return;
  var lay = this.layout(), PAL = ASSETS.palette;
  ASSETS.drawPanel(ctx, lay.x, lay.y, lay.w, lay.h);

  var title = 'FERREIRO';
  ASSETS.drawText(ctx, title, Math.round(CONFIG.GAME_WIDTH / 2 - ASSETS.textWidth(title, 2) / 2),
    lay.y + 8, PAL.bronze, 2);

  drawTab(ctx, lay.tabForge, 'FORJAR', this.mode === 'forge');
  drawTab(ctx, lay.tabSell, 'VENDER', this.mode === 'sell');

  for (var i = 0; i < lay.entries.length; i++) {
    if (this.mode === 'forge') this.drawForgeEntry(ctx, lay.entries[i], RECIPES[i], i === this.selected);
    else this.drawSellEntry(ctx, lay.entries[i], INVENTORY_ORDER[i], i === this.selected);
  }

  // Rodapé: gold + dica de controles.
  ASSETS.drawText(ctx, 'GOLD ' + this.world.gold, lay.x + 12, lay.y + lay.h - 11, '#f6c84c', 1);
  var hint = 'SETAS - ENTER - ESC';
  ASSETS.drawText(ctx, hint, lay.x + lay.w - ASSETS.textWidth(hint, 1) - 12, lay.y + lay.h - 11, PAL.gray, 1);
};

function drawTab(ctx, r, label, active) {
  var PAL = ASSETS.palette;
  ctx.fillStyle = active ? '#3a2c1a' : '#241f2e';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ASSETS.strokeRect(ctx, r.x, r.y, r.w, r.h, active ? PAL.bronze : PAL.grayDark);
  ASSETS.drawText(ctx, label, Math.round(r.x + (r.w - ASSETS.textWidth(label, 1)) / 2), r.y + 4,
    active ? PAL.white : PAL.gray, 1);
}

Forge.prototype.drawForgeEntry = function (ctx, entry, r, isSel) {
  var rect = entry.rect, PAL = ASSETS.palette;
  var state = this.recipeState(r);
  var dim = (state === 'insufficient' || state === 'busy');

  ctx.fillStyle = '#1c1830'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ASSETS.strokeRect(ctx, rect.x, rect.y, rect.w, rect.h, isSel ? PAL.bronze : PAL.grayDark);

  ctx.save();
  if (dim) ctx.globalAlpha = 0.5;
  ASSETS.drawSlot(ctx, rect.x + 5, rect.y + 6, 22, true);
  ctx.drawImage(ASSETS.forgeIcons[r.icon], rect.x + 10, rect.y + 11);
  ASSETS.drawText(ctx, r.name, rect.x + 34, rect.y + 4, PAL.white, 1);
  ASSETS.drawText(ctx, Stats.describeMods(r.modifiers), rect.x + 34, rect.y + 13, PAL.leafLight, 1);
  var cx = rect.x + 34;
  for (var item in r.cost) {
    var have = this.world.inventory[item] || 0, need = r.cost[item];
    ctx.drawImage(ASSETS.items[item], cx, rect.y + 23);
    var txt = have + '/' + need;
    ASSETS.drawText(ctx, txt, cx + 10, rect.y + 24, have >= need ? PAL.leafLight : '#e05a5a', 1);
    cx += 10 + ASSETS.textWidth(txt, 1) + 8;
  }
  ctx.restore();

  var label, col;
  if (state === 'forged')            { label = 'JA FORJADO'; col = PAL.bronze; }
  else if (state === 'busy')         { label = 'FORJANDO...'; col = PAL.gray; }
  else if (state === 'insufficient') { label = 'SEM RECURSOS'; col = '#e05a5a'; }
  else                               { label = 'FORJAR'; col = PAL.leafLight; }
  ASSETS.drawText(ctx, label, rect.x + rect.w - ASSETS.textWidth(label, 1) - 6, rect.y + 4,
    this.denyFlash > 0 && isSel ? '#e05a5a' : col, 1);

  if (this.active && this.active.recipe.id === r.id) {
    var t = 1 - this.active.timeLeft / this.active.total;
    var bw = rect.w - 12, bx = rect.x + 6, by = rect.y + rect.h - 5;
    fill(ctx, PAL.black, bx - 1, by - 1, bw + 2, 5);
    fill(ctx, PAL.grayDark, bx, by, bw, 3);
    fill(ctx, PAL.bronze, bx, by, Math.round(bw * t), 3);
  }
};

Forge.prototype.drawSellEntry = function (ctx, entry, item, isSel) {
  var rect = entry.rect, PAL = ASSETS.palette;
  var have = this.world.inventory[item] || 0;
  var empty = have <= 0;

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

function fill(ctx, color, x, y, w, h) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
