// forge.js — interação com o ferreiro e janela de forja.
// A forja em andamento vive aqui (no mundo) e continua rodando mesmo com a
// janela fechada; apenas UMA forja por vez.
'use strict';

function Forge(world) {
  this.world = world;
  this.open = false;
  this.selected = 0;
  this.active = null;    // { recipe, total, timeLeft } enquanto forja
  this.smith = null;     // prédio ferreiro construído próximo (ou null)
  this.denyFlash = 0;    // feedback visual de negação
}

// Ferreiro construído dentro do raio de interação (ou null).
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
  if (this.world.equipment.has(recipe.id)) return 'forged';
  if (this.active) return 'busy';
  if (!this.canAfford(recipe)) return 'insufficient';
  return 'ready';
};

Forge.prototype.confirm = function () {
  var recipe = RECIPES[this.selected];
  if (!recipe || this.recipeState(recipe) !== 'ready') { this.deny(); return; }
  // Debita os recursos imediatamente.
  for (var item in recipe.cost) this.world.addToInventory(item, -recipe.cost[item]);
  this.active = { recipe: recipe, total: recipe.time, timeLeft: recipe.time };
};

Forge.prototype.deny = function () { this.denyFlash = CONFIG.DENY_FLASH_TIME; };

Forge.prototype.move = function (d) {
  this.selected = (this.selected + d + RECIPES.length) % RECIPES.length;
};

// Entrada de teclado/mouse: abrir/fechar e navegar/confirmar.
Forge.prototype.handleInput = function () {
  this.smith = this.nearSmith();

  if (!this.open) {
    if (this.smith && INPUT.wasPressed('KeyE')) { this.open = true; HUD.closePanel(); }
    return;
  }

  if (INPUT.wasPressed('Escape') || !this.smith) { this.open = false; return; }
  if (INPUT.wasPressed('ArrowUp'))   this.move(-1);
  if (INPUT.wasPressed('ArrowDown')) this.move(1);
  if (INPUT.wasPressed('Enter') || INPUT.wasPressed('Space')) this.confirm();

  // Mouse: hover seleciona, clique confirma.
  var lay = this.layout();
  for (var i = 0; i < lay.entries.length; i++) {
    if (pointInRect(INPUT.mouse, lay.entries[i].rect)) {
      this.selected = i;
      if (INPUT.wasClicked()) this.confirm();
    }
  }
};

// Timer da forja (roda sempre, mesmo com a janela fechada).
Forge.prototype.update = function (dt) {
  if (this.denyFlash > 0) this.denyFlash -= dt;
  if (!this.active) return;
  this.active.timeLeft -= dt;
  if (this.active.timeLeft > 0) return;

  var r = this.active.recipe;
  // Captura o "antes" dos atributos afetados para o feedback dourado.
  var before = {};
  for (var i = 0; i < r.modifiers.length; i++) before[r.modifiers[i].stat] = this.world.stats.display(r.modifiers[i].stat);
  this.world.equipment.equip(r.id);            // bônus passa a valer na hora
  for (var stat in before) HUD.flashStat(stat, before[stat], this.world.stats.display(stat));
  this.world.showMessage(r.name.toUpperCase() + ' FORJADA', CONFIG.UNLOCK_MSG_TIME);
  this.active = null;
};

// -------- Layout (compartilhado por desenho e hit-testing do mouse) --------
Forge.prototype.layout = function () {
  var pw = 320, ph = 168;
  var x = Math.round((CONFIG.GAME_WIDTH - pw) / 2);
  var y = Math.round((CONFIG.GAME_HEIGHT - ph) / 2);
  var ex = x + 12, ey = y + 30, ew = pw - 24, eh = 56;
  var entries = [];
  for (var i = 0; i < RECIPES.length; i++) {
    entries.push({ recipe: RECIPES[i], rect: { x: ex, y: ey + i * (eh + 6), w: ew, h: eh } });
  }
  return { x: x, y: y, w: pw, h: ph, entries: entries };
};

function pointInRect(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// -------- Prompt flutuante [E] FORJAR sobre a casa (espaço do mundo) --------
Forge.prototype.drawPrompt = function (ctx) {
  if (this.open || !this.smith) return;
  var b = this.smith;
  var label = '[E] FORJAR';
  var w = ASSETS.textWidth(label, 1) + 8;
  var bx = Math.round(b.x - w / 2);
  var by = Math.round(b.y - b.def.height / 2 - 14 + Math.sin(Date.now() / 250) * 1);
  ctx.fillStyle = 'rgba(26,28,44,0.85)';
  ctx.fillRect(bx, by, w, 10);
  ASSETS.strokeRect(ctx, bx, by, w, 10, ASSETS.palette.bronze);
  ASSETS.drawText(ctx, label, bx + 4, by + 3, ASSETS.palette.white, 1);
};

// -------- Janela de forja (espaço de tela) --------
Forge.prototype.drawWindow = function (ctx) {
  if (!this.open) return;
  var lay = this.layout();
  ASSETS.drawPanel(ctx, lay.x, lay.y, lay.w, lay.h);

  var title = 'FERREIRO';
  ASSETS.drawText(ctx, title, Math.round(CONFIG.GAME_WIDTH / 2 - ASSETS.textWidth(title, 2) / 2),
    lay.y + 12, ASSETS.palette.bronze, 2);

  for (var i = 0; i < lay.entries.length; i++) {
    this.drawEntry(ctx, lay.entries[i], i === this.selected);
  }

  var hint = 'SETAS/MOUSE - ENTER FORJAR - ESC SAIR';
  ASSETS.drawText(ctx, hint, Math.round(CONFIG.GAME_WIDTH / 2 - ASSETS.textWidth(hint, 1) / 2),
    lay.y + lay.h - 10, ASSETS.palette.gray, 1);
};

Forge.prototype.drawEntry = function (ctx, entry, isSel) {
  var r = entry.recipe, rect = entry.rect, PAL = ASSETS.palette;
  var state = this.recipeState(r);
  var dim = (state === 'insufficient' || state === 'busy');

  // Fundo do item + destaque de seleção.
  ctx.fillStyle = '#1c1830'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ASSETS.strokeRect(ctx, rect.x, rect.y, rect.w, rect.h,
    isSel ? PAL.bronze : PAL.grayDark);
  if (isSel) ASSETS.strokeRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, PAL.trunk);

  ctx.save();
  if (dim) ctx.globalAlpha = 0.5;

  // Ícone (slot).
  ASSETS.drawSlot(ctx, rect.x + 6, rect.y + 6, 20, true);
  var icon = ASSETS.forgeIcons[r.icon];
  ctx.drawImage(icon, rect.x + 10, rect.y + 10);

  // Nome + efeito.
  ASSETS.drawText(ctx, r.name, rect.x + 34, rect.y + 7, PAL.white, 1);
  ASSETS.drawText(ctx, Stats.describeMods(r.modifiers), rect.x + 34, rect.y + 17, PAL.leafLight, 1);

  // Custo: possuído/necessário por recurso (verde ok / vermelho falta).
  var cx = rect.x + 34;
  for (var item in r.cost) {
    var have = this.world.inventory[item] || 0, need = r.cost[item];
    ctx.drawImage(ASSETS.items[item], cx, rect.y + 27);
    var txt = have + '/' + need;
    var col = have >= need ? PAL.leafLight : '#e05a5a';
    ASSETS.drawText(ctx, txt, cx + 10, rect.y + 28, col, 1);
    cx += 10 + ASSETS.textWidth(txt, 1) + 8;
  }
  ctx.restore();

  // Estado (canto direito).
  var label, col;
  if (state === 'forged')       { label = 'JA FORJADO'; col = PAL.bronze; }
  else if (state === 'busy')    { label = 'FORJANDO...'; col = PAL.gray; }
  else if (state === 'insufficient') { label = 'SEM RECURSOS'; col = '#e05a5a'; }
  else                          { label = 'FORJAR'; col = PAL.leafLight; }
  ASSETS.drawText(ctx, label, rect.x + rect.w - ASSETS.textWidth(label, 1) - 6, rect.y + 7,
    this.denyFlash > 0 && isSel ? '#e05a5a' : col, 1);

  // Barra de progresso quando este item está sendo forjado.
  if (this.active && this.active.recipe.id === r.id) {
    var t = 1 - this.active.timeLeft / this.active.total;
    var bw = rect.w - 12, bx = rect.x + 6, by = rect.y + rect.h - 9;
    px(ctx, PAL.black, bx - 1, by - 1, bw + 2, 6);
    px(ctx, PAL.grayDark, bx, by, bw, 4);
    px(ctx, PAL.bronze, bx, by, Math.round(bw * t), 4);
    // Ícone pulsando/brilhando durante a forja.
    if (Math.floor(Date.now() / 120) % 2 === 0) {
      ctx.save(); ctx.globalAlpha = 0.6;
      px(ctx, PAL.white, rect.x + 6, rect.y + 6, 20, 20);
      ctx.restore();
    }
  }
};

// helper local de pixel (px de assets.js é privado do seu closure).
function px(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w === undefined ? 1 : w, h === undefined ? 1 : h);
}
