// player.js — personagem jogável com máquina de estados explícita.
// Estados: 'idle' | 'walk' | 'attack' | 'pickup'.
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

  // Ferramentas básicas: por padrão o jogador só tem a picareta; o machado
  // precisa ser pego no mundo (ver pickup.js) — sem ele, árvores não reagem
  // a golpes (ver resolução de alvo em update()).
  this.hasAxe = false;
  this.pickupAnimTime = 0;    // >0: tocou um pickup — trava movimento/ataque
  this.pickupIcon = null;     // ícone erguido acima da cabeça durante a animação
  this.stepTimer = 0;         // cadência da poeirinha de passo (fx)
}

// Chamado por Pickup (pickup.js) ao ser tocado: trava o jogador parado por
// CONFIG.PICKUP_ANIM_TIME segundos enquanto ele "ergue" o item pego.
Player.prototype.startPickup = function (iconKey) {
  this.pickupAnimTime = CONFIG.PICKUP_ANIM_TIME;
  this.pickupIcon = iconKey;
  this.setState('pickup');
};

Player.prototype.hitbox = function () {
  return {
    x: this.x - CONFIG.PLAYER_HITBOX_W / 2,
    y: this.y - CONFIG.PLAYER_HITBOX_H,
    w: CONFIG.PLAYER_HITBOX_W,
    h: CONFIG.PLAYER_HITBOX_H
  };
};

// Caixa de alcance do golpe: começa na borda da frente do hitbox (não no
// corpo do personagem) e se estende por `reach` na direção que ele encara —
// um retângulo reach x hb.h, mesmo tamanho nas duas orientações, só girado
// 90° pra vertical (senão sairia maior num eixo que no outro, já que o
// hitbox em si não é quadrado).
Player.prototype.frontBox = function () {
  var hb = this.hitbox();
  var r = CONFIG.PLAYER_REACH;
  var cross = hb.h; // espessura perpendicular (igual nas duas orientações)
  if (this.dir === 'left')  return { x: hb.x - r, y: hb.y, w: r, h: cross };
  if (this.dir === 'right') return { x: hb.x + hb.w, y: hb.y, w: r, h: cross };
  var cx = hb.x + (hb.w - cross) / 2; // centraliza a espessura sob o hitbox
  if (this.dir === 'up')    return { x: cx, y: hb.y - r, w: cross, h: r };
  return { x: cx, y: hb.y + hb.h, w: cross, h: r }; // down
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
  // Animação de pickup em andamento (ver startPickup): trava totalmente —
  // sem movimento, sem ataque — até acabar, mesmo que o jogador aperte algo.
  if (this.pickupAnimTime > 0) {
    this.pickupAnimTime -= dt;
    this.animTime += dt;
    if (this.pickupAnimTime <= 0) { this.pickupIcon = null; this.setState('idle'); }
    return;
  }

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
    // Poeirinha de passo em cadência (decorativo, fx).
    this.stepTimer -= dt;
    if (this.stepTimer <= 0 && typeof FX !== 'undefined') {
      FX.puff(this.x, this.y);
      this.stepTimer = 0.24;
    }
  } else {
    this.stepTimer = 0;
  }

  // Objeto à frente -> arma automática + ataque automático (só de frente,
  // e só quando nenhuma janela de forja está cobrindo a tela)
  this.target = null;
  this.targetIsEnemy = false;
  if (!forgeOpen) {
    var front = this.frontBox();
    // Tenta atingir inimigos primeiro (só com espada equipada)
    if (world.enemies && world.equipment.slots.weapon === 'sword') {
      for (var i = 0; i < world.enemies.length; i++) {
        var e = world.enemies[i];
        if (e.alive && rectsOverlap(front, e.hurtbox())) {
          this.target = e;
          this.targetIsEnemy = true;
          this.weapon = 'sword';
          break;
        }
      }
    }
    // Se não atingiu inimigo, tenta harvestables
    if (!this.target) {
      for (var i = 0; i < world.harvestables.length; i++) {
        var h = world.harvestables[i];
        if (h.alive && rectsOverlap(front, h.hurtbox())) {
          var wpn = WEAPON_FOR_CATEGORY[RESOURCE_TYPES[h.type].category] || null;
          // Sem o machado (ver pickup.js), árvores simplesmente não reagem —
          // nenhum golpe é iniciado contra elas.
          if (wpn !== 'axe' || this.hasAxe) {
            this.target = h;
            this.targetIsEnemy = false;
            this.weapon = wpn;
          }
          break;
        }
      }
    }
  }

  if (this.hitCooldown > 0) this.hitCooldown -= dt;
  if (this.attackAnimTime > 0) this.attackAnimTime -= dt;

  if (this.target && this.weapon) {
    if (this.hitCooldown <= 0) {
      var dmg = world.stats.get('damage');
      if (this.targetIsEnemy) {
        // Inimigos só levam dano de espada
        this.target.takeHit(dmg, 'sword', world);
      } else {
        // Harvestables: dano base + bônus de categoria
        var category = RESOURCE_TYPES[this.target.type].category;
        var bonusStat = CATEGORY_DAMAGE_STAT[category];
        dmg += (bonusStat ? world.stats.get(bonusStat) : 0);
        this.target.takeHit(dmg, world);
      }
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

  // Animação de pickup: sem sprite dedicado (arte procedural) — comunica a
  // ação erguendo o ícone do item pego acima da cabeça, subindo rápido e
  // ficando parado no alto pelo resto da janela travada.
  if (this.state === 'pickup' && this.pickupIcon) {
    var icon = ASSETS.weaponIcons[this.pickupIcon];
    var t = 1 - Math.max(0, this.pickupAnimTime) / CONFIG.PICKUP_ANIM_TIME;
    var lift = Math.min(1, t * 3);
    var iconY = this.y - h - 4 - Math.round(lift * 10);
    ctx.drawImage(icon, Math.round(this.x - icon.width / 2), Math.round(iconY));
  }
};
