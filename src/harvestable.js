// harvestable.js — objetos atingíveis (árvores, rochas...).
// Ciclo de vida: alive -> destroyed (sprite quebrado) -> respawning
// (invisível, timer) -> spawning (animação de surgimento) -> alive.
'use strict';

function Harvestable(type, x, y) {
  this.type = type;             // chave de RESOURCE_TYPES
  this.def = RESOURCE_TYPES[type];
  this.x = x;                   // centro da base (pés)
  this.y = y;
  this.maxHp = this.def.hp;
  this.hp = this.maxHp;
  this.state = 'alive';
  this.timer = 0;
  this.alive = true;            // atacável/colide?
  this.flashTime = 0;
  this.shakeTime = 0;
  this.healthbarTime = 0;       // some após X s sem dano
}

Harvestable.prototype.sprite = function () {
  return ASSETS.resources[this.type];
};

// Sprite "vivo" atual: se o recurso tem estágios de dano, escolhe o frame
// pela vida restante (maxHp -> índice 0/maior, 1 de vida -> último/menor).
Harvestable.prototype.currentNormalImage = function () {
  var s = this.sprite();
  if (s.stages) {
    var idx = this.maxHp - this.hp;
    if (idx < 0) idx = 0;
    if (idx > s.stages.length - 1) idx = s.stages.length - 1;
    return s.stages[idx];
  }
  return s.normal;
};

// Caixa que o jogador precisa tocar para atacar (sprite inteiro na base).
Harvestable.prototype.hurtbox = function () {
  var s = this.sprite();
  return { x: this.x - s.w / 2, y: this.y - s.h + 4, w: s.w, h: s.h - 4 };
};

// Caixa sólida (colisão pelos pés, menor que o sprite).
Harvestable.prototype.solidBox = function () {
  var s = this.sprite();
  var w = Math.max(8, Math.round(s.w * 0.5));
  return { x: this.x - w / 2, y: this.y - 7, w: w, h: 8 };
};

Harvestable.prototype.takeHit = function (dmg, world) {
  if (!this.alive) return;
  this.hp -= dmg;
  this.flashTime = 0.08;
  this.shakeTime = 0.12;
  this.healthbarTime = CONFIG.HEALTHBAR_HIDE_TIME;
  world.spawnParticles(this.x, this.y - 10, this.def.category);
  if (this.hp <= 0) {
    this.alive = false;
    this.state = 'destroyed';
    this.timer = CONFIG.DESTROYED_SPRITE_TIME;
    world.spawnDrop(this.def.drops, this.x, this.y);
  }
};

Harvestable.prototype.update = function (dt) {
  if (this.flashTime > 0) this.flashTime -= dt;
  if (this.shakeTime > 0) this.shakeTime -= dt;
  if (this.healthbarTime > 0) this.healthbarTime -= dt;

  if (this.state === 'destroyed') {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.state = 'respawning';
      this.timer = CONFIG.RESPAWN_TIME;
    }
  } else if (this.state === 'respawning') {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.state = 'spawning';
      this.timer = CONFIG.SPAWN_ANIM_TIME;
      this.hp = this.maxHp;
    }
  } else if (this.state === 'spawning') {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.state = 'alive';
      this.alive = true;
    }
  }
};

// canvas auxiliar para o flash branco do hit
var _flashScratch = null;
function flashCanvasFor(spriteCanvas) {
  if (!_flashScratch) {
    _flashScratch = document.createElement('canvas');
  }
  _flashScratch.width = spriteCanvas.width;
  _flashScratch.height = spriteCanvas.height;
  var c = _flashScratch.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(spriteCanvas, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = ASSETS.palette.white;
  c.fillRect(0, 0, _flashScratch.width, _flashScratch.height);
  c.globalCompositeOperation = 'source-over';
  return _flashScratch;
}

Harvestable.prototype.draw = function (ctx) {
  if (this.state === 'respawning') return;
  var s = this.sprite();
  var img = this.state === 'destroyed' ? s.destroyed : this.currentNormalImage();
  var dx = Math.round(this.x - s.anchorX);
  var dy = Math.round(this.y - s.anchorY);

  if (this.shakeTime > 0) {
    dx += Math.round(Math.sin(this.shakeTime * 60) * 1.5);
  }

  if (this.state === 'spawning') {
    // Animação curta de surgimento: cresce a partir da base.
    var t = 1 - this.timer / CONFIG.SPAWN_ANIM_TIME;
    var sh = Math.max(1, Math.round(s.h * t));
    ctx.drawImage(img, 0, s.h - sh, s.w, sh, dx, Math.round(this.y - s.anchorY + (s.h - sh)), s.w, sh);
    return;
  }

  ctx.drawImage(img, dx, dy);
  if (this.flashTime > 0 && this.state === 'alive') {
    ctx.drawImage(flashCanvasFor(img), dx, dy);
  }
};

// Barra de vida flutuante (desenhada pela camada de HUD do mundo).
Harvestable.prototype.drawHealthbar = function (ctx) {
  if (this.healthbarTime <= 0 || !this.alive) return;
  var s = this.sprite();
  var w = 16, h = 3;
  var x = Math.round(this.x - w / 2);
  var y = Math.round(this.y - s.h - 6);
  ctx.fillStyle = ASSETS.palette.black;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = ASSETS.palette.grayDark;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ASSETS.palette.leafLight;
  ctx.fillRect(x, y, Math.round(w * this.hp / this.maxHp), h);
};
