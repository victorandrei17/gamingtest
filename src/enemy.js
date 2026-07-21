// enemy.js — inimigos (geléia rosa / Poring).
// Ciclo de vida: alive -> destroyed (desaparecendo) -> dead.
// AI: segue o jogador se dentro do raio de visão.
'use strict';

function Enemy(type, x, y) {
  this.type = type;             // 'poring' ou similar
  this.def = ENEMY_TYPES[type];
  this.x = x;                   // centro da base (pés)
  this.y = y;
  this.maxHp = this.def.hp;
  this.hp = this.maxHp;
  this.state = 'alive';         // 'alive' | 'destroyed' | 'dead'
  this.timer = 0;
  this.alive = true;            // atacável?
  this.animTime = 0;
  this.flashTime = 0;
  this.healthbarTime = 0;
  this.vx = 0;                  // velocidade de movimento
  this.vy = 0;
  this.deathParticles = [];     // partículas do despedaçamento
}

Enemy.prototype.sprite = function () {
  return ASSETS.enemies[this.type];
};

Enemy.prototype.hurtbox = function () {
  var s = this.sprite();
  return { x: this.x - s.w / 2, y: this.y - s.h + 4, w: s.w, h: s.h - 4 };
};

Enemy.prototype.solidBox = function () {
  var s = this.sprite();
  var w = Math.max(8, Math.round(s.w * 0.6));
  return { x: this.x - w / 2, y: this.y - 7, w: w, h: 8 };
};

function distanceTo(x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

Enemy.prototype.moveAxis = function (dx, dy, solids) {
  this.x += dx; this.y += dy;
  var hb = this.solidBox();
  for (var i = 0; i < solids.length; i++) {
    var s = solids[i];
    if (!rectsOverlap(hb, s)) continue;
    if (dx > 0) this.x = s.x - hb.w / 2;
    else if (dx < 0) this.x = s.x + s.w + hb.w / 2;
    if (dy > 0) this.y = s.y;
    else if (dy < 0) this.y = s.y + s.h + hb.h;
    hb = this.solidBox();
  }
  // Bordas do mapa
  this.x = Math.max(hb.w / 2, Math.min(CONFIG.GAME_WIDTH - hb.w / 2, this.x));
  this.y = Math.max(hb.h + 8, Math.min(CONFIG.GAME_HEIGHT, this.y));
};

Enemy.prototype.takeHit = function (dmg, weaponId, world) {
  if (!this.alive) return;

  // Inimigos só recebem dano de espada / upgrades de espada
  if (weaponId !== 'sword' && weaponId !== 'sword_upgrade') return;

  this.hp -= dmg;
  this.flashTime = 0.08;
  this.healthbarTime = CONFIG.HEALTHBAR_HIDE_TIME;

  if (this.hp <= 0) {
    this.alive = false;
    this.state = 'destroyed';
    this.timer = 0.4; // duração da animação de despedaçamento
    world.spawnDrop('geleia_rosa', this.x, this.y);
    // Spawna partículas de despedaçamento
    this.spawnDeathParticles(world);
  }
};

Enemy.prototype.spawnDeathParticles = function (world) {
  for (var i = 0; i < 8; i++) {
    var angle = (Math.PI * 2 * i) / 8;
    var speed = 60 + Math.random() * 40;
    var p = new DeathParticle(
      this.x, this.y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 30
    );
    this.deathParticles.push(p);
  }
};

Enemy.prototype.update = function (dt, world) {
  if (this.state === 'alive') {
    var dist = distanceTo(this.x, this.y, world.player.x, world.player.y);

    if (dist < CONFIG.ENEMY_VISION_RADIUS) {
      // Segue o jogador
      var dx = world.player.x - this.x;
      var dy = world.player.y - this.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) {
        this.vx = (dx / len) * CONFIG.ENEMY_SPEED;
        this.vy = (dy / len) * CONFIG.ENEMY_SPEED;
      }
    } else {
      // Para de se mover
      this.vx = 0;
      this.vy = 0;
    }

    this.moveAxis(this.vx * dt, 0, world.solids);
    this.moveAxis(0, this.vy * dt, world.solids);
  }

  if (this.flashTime > 0) this.flashTime -= dt;
  if (this.healthbarTime > 0) this.healthbarTime -= dt;

  if (this.state === 'destroyed') {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.state = 'dead';
    }
  }

  // Atualiza partículas de despedaçamento
  for (var i = this.deathParticles.length - 1; i >= 0; i--) {
    this.deathParticles[i].update(dt);
    if (this.deathParticles[i].dead) {
      this.deathParticles.splice(i, 1);
    }
  }

  this.animTime += dt;
};

Enemy.prototype.draw = function (ctx) {
  if (this.state === 'dead') return;

  var s = this.sprite();
  var frame = s.idle[Math.floor(this.animTime * CONFIG.ENEMY_IDLE_ANIM_SPEED) % s.idle.length];
  var dx = Math.round(this.x - s.anchorX);
  var dy = Math.round(this.y - s.anchorY);

  ctx.drawImage(frame, dx, dy);

  if (this.flashTime > 0 && this.state === 'alive') {
    ctx.drawImage(flashCanvasFor(frame), dx, dy);
  }
};

Enemy.prototype.drawDeathParticles = function (ctx) {
  for (var i = 0; i < this.deathParticles.length; i++) {
    this.deathParticles[i].draw(ctx);
  }
};

Enemy.prototype.drawHealthbar = function (ctx) {
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

// Partícula de despedaçamento (morte do inimigo)
function DeathParticle(x, y, vx, vy) {
  this.x = x;
  this.y = y;
  this.vx = vx;
  this.vy = vy;
  this.life = 0.8;
  this.maxLife = 0.8;
  this.dead = false;
}

DeathParticle.prototype.update = function (dt) {
  this.life -= dt;
  this.vy += 80 * dt; // gravidade
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  if (this.life <= 0) this.dead = true;
};

DeathParticle.prototype.draw = function (ctx) {
  var alpha = this.life / this.maxLife;
  var size = 4 + Math.random() * 2;
  var x = Math.round(this.x);
  var y = Math.round(this.y);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = ASSETS.palette.pink;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = 1.0;
};

// Reutiliza a função de flash branco de harvestable.js (ou cria se não existir)
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
