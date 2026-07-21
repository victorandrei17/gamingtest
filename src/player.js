// player.js — personagem jogável com máquina de estados explícita.
// Estados: 'idle' | 'walk' | 'attack'.
'use strict';

function Player(character, x, y) {
  this.character = character; // 'boy' | 'girl'
  this.x = x;                 // posição dos pés (centro)
  this.y = y;
  this.dir = 'down';
  this.state = 'idle';
  this.animTime = 0;
  this.weapon = null;         // arma ativa (auto-selecionada pelo alvo)
  this.target = null;         // harvestable em contato
  this.hitCooldown = 0;       // tempo até o próximo hit
  this.attackAnimTime = 0;    // tempo restante da animação de golpe
}

Player.prototype.hitbox = function () {
  return {
    x: this.x - CONFIG.PLAYER_HITBOX_W / 2,
    y: this.y - CONFIG.PLAYER_HITBOX_H,
    w: CONFIG.PLAYER_HITBOX_W,
    h: CONFIG.PLAYER_HITBOX_H
  };
};

// Caixa de alcance do golpe: estende a hitbox SÓ na direção que o jogador
// encara. Assim o ataque só acontece quando ele está de frente para o objeto.
Player.prototype.frontBox = function () {
  var hb = this.hitbox();
  var r = CONFIG.PLAYER_REACH;
  var b = { x: hb.x, y: hb.y, w: hb.w, h: hb.h };
  if (this.dir === 'left')       { b.x -= r; b.w += r; }
  else if (this.dir === 'right') { b.w += r; }
  else if (this.dir === 'up')    { b.y -= r; b.h += r; }
  else                           { b.h += r; } // down
  return b;
};

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

Player.prototype.setState = function (state) {
  if (this.state !== state) {
    this.state = state;
    this.animTime = 0;
  }
};

// move um eixo por vez e resolve contra os sólidos + bordas do mapa
Player.prototype.moveAxis = function (dx, dy, solids) {
  this.x += dx; this.y += dy;
  var hb = this.hitbox();
  for (var i = 0; i < solids.length; i++) {
    var s = solids[i];
    if (!rectsOverlap(hb, s)) continue;
    if (dx > 0) this.x = s.x - hb.w / 2;
    else if (dx < 0) this.x = s.x + s.w + hb.w / 2;
    if (dy > 0) this.y = s.y;
    else if (dy < 0) this.y = s.y + s.h + hb.h;
    hb = this.hitbox();
  }
  // Bordas do mapa
  this.x = Math.max(hb.w / 2, Math.min(CONFIG.GAME_WIDTH - hb.w / 2, this.x));
  this.y = Math.max(hb.h + 8, Math.min(CONFIG.GAME_HEIGHT, this.y));
};

Player.prototype.update = function (dt, world) {
  // Janela de forja aberta: o jogador continua podendo se mover — é assim que
  // "afastar-se fecha" funciona (a proximidade com o ferreiro é reavaliada a
  // cada frame em Forge.handleInput). Só o ataque automático fica suspenso,
  // para não coletar/atacar nada por engano com o menu na tela.
  var forgeOpen = !!(world.forge && world.forge.open);

  var speed = world.stats.get('moveSpeed');
  var mv = INPUT.getMoveVector();
  var moving = mv.x !== 0 || mv.y !== 0;

  if (moving) {
    // Direção dominante define o sprite; diagonais usam a horizontal.
    if (mv.x !== 0) this.dir = mv.x > 0 ? 'right' : 'left';
    else this.dir = mv.y > 0 ? 'down' : 'up';
    this.moveAxis(mv.x * speed * dt, 0, world.solids);
    this.moveAxis(0, mv.y * speed * dt, world.solids);
  }

  // Objeto à frente -> arma automática + ataque automático (só de frente,
  // e só quando nenhuma janela de forja está cobrindo a tela)
  this.target = null;
  if (!forgeOpen) {
    var front = this.frontBox();
    for (var i = 0; i < world.harvestables.length; i++) {
      var h = world.harvestables[i];
      if (h.alive && rectsOverlap(front, h.hurtbox())) {
        this.target = h;
        this.weapon = WEAPON_FOR_CATEGORY[RESOURCE_TYPES[h.type].category] || null;
        break;
      }
    }
  }

  if (this.hitCooldown > 0) this.hitCooldown -= dt;
  if (this.attackAnimTime > 0) this.attackAnimTime -= dt;

  if (this.target && this.weapon) {
    if (this.hitCooldown <= 0) {
      this.target.takeHit(world.stats.get('damage'), world);
      this.hitCooldown = CONFIG.HIT_COOLDOWN / world.stats.get('attackSpeed');
      this.attackAnimTime = CONFIG.ATTACK_ANIM_TIME;
    }
  }

  // Máquina de estados
  if (this.attackAnimTime > 0) this.setState('attack');
  else if (moving) this.setState('walk');
  else this.setState('idle');

  this.animTime += dt;
};

Player.prototype.draw = function (ctx) {
  var set = ASSETS.players[this.character][this.dir];
  var frame;
  if (this.state === 'attack' && this.weapon) {
    var t = 1 - this.attackAnimTime / CONFIG.ATTACK_ANIM_TIME;
    var idx = Math.min(2, Math.floor(t * 3));
    frame = set.attack[this.weapon][idx];
  } else if (this.state === 'walk') {
    frame = set.walk[Math.floor(this.animTime * 8) % set.walk.length];
  } else {
    frame = set.idle[0];
  }
  var w = ASSETS.playerSize.w, h = ASSETS.playerSize.h;
  ctx.drawImage(frame, Math.round(this.x - w / 2), Math.round(this.y - h + 1));
};
