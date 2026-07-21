// enemy.js — inimigos (geléia rosa / Poring).
// Ciclo de vida: alive -> destroyed (desaparecendo) -> dead.
// AI: segue o jogador se dentro do raio de visão, para a uma distância mínima
// (não sobrepõe o jogador). Depende de `rectsOverlap` (player.js) e
// `flashCanvasFor`/`_flashScratch` (harvestable.js), carregados antes deste
// arquivo em index.html — não redeclarar aqui.
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

Enemy.prototype.moveAxis = function (dx, dy, solids) {
  this.x += dx; this.y += dy;
  var hb = this.solidBox();
  for (var i = 0; i < solids.length; i++) {
    var s = solids[i];
    if (s.owner === this) continue; // não colide com o próprio sólido
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

  // Inimigos só recebem dano de espada (upgrades da espada só somam no
  // atributo `damage`, não trocam o weaponId — ver player.js).
  if (weaponId !== 'sword') return;

  this.hp -= dmg;
  this.flashTime = 0.08;
  this.healthbarTime = CONFIG.HEALTHBAR_HIDE_TIME;

  if (this.hp <= 0) {
    this.alive = false;
    this.state = 'destroyed';
    // O inimigo só sai de world.enemies (e leva seus deathParticles junto)
    // depois que o fade termina — senão os pedaços somem cedo demais.
    this.timer = CONFIG.ENEMY_DEATH_FADE_TIME;
    world.spawnDrop('geleia_rosa', this.x, this.y);
    this.spawnDeathParticles();
  }
};

// Pedaços de geléia que se despedaçam do corpo, caem no chão por gravidade
// e ficam parados ali sumindo aos poucos (sem explosão radial).
Enemy.prototype.spawnDeathParticles = function () {
  var s = this.sprite();
  var groundY = this.y + 2; // altura aproximada onde o sprite "pisa"
  for (var i = 0; i < 6; i++) {
    var startX = this.x + (Math.random() - 0.5) * s.w * 0.5;
    var startY = this.y - Math.random() * s.h * 0.3;
    var vx = (Math.random() - 0.5) * 40; // espalhamento pequeno, não explosivo
    var vy = -20 - Math.random() * 20;   // pequeno salto ao se despedaçar, depois cai
    var landY = groundY + (Math.random() - 0.5) * 4;
    this.deathParticles.push(new DeathParticle(startX, startY, vx, vy, landY));
  }
};

Enemy.prototype.update = function (dt, world) {
  if (this.state === 'alive') {
    var dist = distanceTo(this.x, this.y, world.player.x, world.player.y);

    // Segue o jogador dentro do raio de visão, mas para a uma distância
    // mínima — sem isso o jogador não é um sólido em world.solids (só
    // harvestables/construções/inimigos são) e o inimigo sobreporia/
    // atravessaria o personagem em vez de "encostar" nele.
    if (dist < CONFIG.ENEMY_VISION_RADIUS && dist > CONFIG.ENEMY_STOP_DISTANCE) {
      var dx = world.player.x - this.x;
      var dy = world.player.y - this.y;
      this.vx = (dx / dist) * CONFIG.ENEMY_SPEED;
      this.vy = (dy / dist) * CONFIG.ENEMY_SPEED;
    } else {
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
  // Corpo só aparece vivo — ao morrer, "vira" os pedaços (deathParticles) e
  // some daqui em diante, senão parece uma explosão em vez de despedaçar.
  if (this.state !== 'alive') return;

  var s = this.sprite();
  var frame = s.idle[Math.floor(this.animTime * CONFIG.ENEMY_IDLE_ANIM_SPEED) % s.idle.length];
  var dx = Math.round(this.x - s.anchorX);
  var dy = Math.round(this.y - s.anchorY);

  ctx.drawImage(frame, dx, dy);

  if (this.flashTime > 0) {
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

// Pedaço de geléia (morte do inimigo): cai por gravidade até `groundY`,
// pousa e fica parado ali sumindo em fade linear pelo tempo total de vida.
function DeathParticle(x, y, vx, vy, groundY) {
  this.x = x;
  this.y = y;
  this.vx = vx;
  this.vy = vy;
  this.groundY = groundY;
  this.landed = false;
  this.size = 2 + Math.round(Math.random() * 2); // fixo por partícula (não pisca)
  this.life = CONFIG.ENEMY_DEATH_FADE_TIME;
  this.maxLife = CONFIG.ENEMY_DEATH_FADE_TIME;
  this.dead = false;
}

DeathParticle.prototype.update = function (dt) {
  this.life -= dt;
  if (this.life <= 0) this.dead = true;

  if (!this.landed) {
    this.vy += 220 * dt; // gravidade
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.landed = true;
      this.vx = 0;
      this.vy = 0;
    }
  }
};

DeathParticle.prototype.draw = function (ctx) {
  var alpha = Math.max(0, this.life / this.maxLife);
  var x = Math.round(this.x);
  var y = Math.round(this.y);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = ASSETS.palette.pink;
  ctx.fillRect(x - this.size / 2, y - this.size / 2, this.size, this.size);
  ctx.globalAlpha = 1.0;
};
