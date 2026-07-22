// building.js — áreas de construção desbloqueáveis (Ferreiro etc.).
// Estados: 'site' (recebendo recursos) -> 'building' (obra) -> 'built'.
'use strict';

function Building(type, x, y) {
  this.type = type;            // chave de BUILDINGS
  this.def = BUILDINGS[type];
  this.x = x;                  // centro da área
  this.y = y;
  this.state = 'site';
  this.timer = 0;
  this.deliverTimer = 0;
  this.delivered = {};         // { itemId: quantidade entregue }
  this.flying = [];            // itens voando do jogador até a área
  for (var item in this.def.cost) this.delivered[item] = 0;
}

Building.prototype.areaBox = function () {
  var w = this.def.width + 12, h = this.def.height + 12;
  return { x: this.x - w / 2, y: this.y - h / 2, w: w, h: h };
};

// def.revealQuest (opcional) trava a área de obra escondida até aquela
// quest ser concluída — antes disso não desenha nem aceita entrega.
Building.prototype.isRevealed = function () {
  return !this.def.revealQuest || Quests.isCompleted(this.def.revealQuest);
};

// Colisão sólida apenas depois de construída (pelos "pés" da casa).
// terrainUnlock (ex.: ilha) não tem estrutura própria — quem bloqueia é a
// parede d'água em main.js, então aqui é sempre null.
Building.prototype.solidBox = function () {
  if (this.def.terrainUnlock || this.state !== 'built') return null;
  var w = this.def.width;
  return { x: this.x - w / 2, y: this.y, w: w, h: this.def.height / 2 };
};

// Próximo item da lista de custo que ainda falta entregar.
Building.prototype.nextNeededItem = function () {
  for (var item in this.def.cost) {
    var inFlight = 0;
    for (var i = 0; i < this.flying.length; i++) {
      if (this.flying[i].itemId === item) inFlight++;
    }
    if (this.delivered[item] + inFlight < this.def.cost[item]) return item;
  }
  return null;
};

Building.prototype.totalNeeded = function () {
  var n = 0;
  for (var item in this.def.cost) n += this.def.cost[item];
  return n;
};

Building.prototype.totalDelivered = function () {
  var n = 0;
  for (var item in this.delivered) n += this.delivered[item];
  return n;
};

Building.prototype.update = function (dt, player, world) {
  if (this.state === 'site' && !this.isRevealed()) return;

  for (var i = this.flying.length - 1; i >= 0; i--) {
    var f = this.flying[i];
    f.t += dt;
    if (f.t >= f.dur) {
      this.delivered[f.itemId]++;           // contador atualiza em tempo real
      this.flying.splice(i, 1);
    }
  }

  if (this.state === 'site') {
    this.deliverTimer -= dt;
    var playerInside = rectsOverlap(player.hitbox(), this.areaBox());
    if (playerInside && this.deliverTimer <= 0) {
      var item = this.nextNeededItem();
      if (item && world.inventory[item] > 0) {
        world.addToInventory(item, -1);     // subtrai a cada transferência
        this.flying.push({
          itemId: item, t: 0, dur: 0.3,
          fromX: player.x, fromY: player.y - 12,
          toX: this.x, toY: this.y
        });
        this.deliverTimer = CONFIG.DELIVER_INTERVAL;
      }
    }
    // Se o jogador sair da área, nada é lançado — a transferência pausa
    // e retoma sozinha quando ele voltar (deliverTimer segue contando).

    if (this.flying.length === 0 && this.totalDelivered() >= this.totalNeeded()) {
      this.state = 'building';
      this.timer = this.def.buildTime;
    }
  } else if (this.state === 'building') {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.state = 'built';
      // Construções declaradas com explosionOnBuild "estouram" em vez do
      // reveal padrão (usado pela ilha em vez da casa "subindo" do ferreiro).
      if (this.def.explosionOnBuild) {
        world.spawnParticles(this.x, this.y, this.type, 24);
        if (typeof FX !== 'undefined') FX.addShake(0.9); // estrondo da nova terra surgindo
      } else if (typeof FX !== 'undefined') {
        FX.addShake(0.3); // "toc" da construção assentando
      }
      world.showMessage(this.def.unlockMessage, CONFIG.UNLOCK_MSG_TIME);
      Quests.onEvent('BUILD', { buildingId: this.type }, world);
    }
  }
};

Building.prototype.draw = function (ctx, time) {
  if (this.state === 'site' && !this.isRevealed()) return;

  var area = this.areaBox();
  var sprite = ASSETS.buildings[this.type];

  if (this.state === 'site') {
    ASSETS.drawSiteMarker(ctx, area.x, area.y, area.w, area.h, time);
    // Ícone do recurso pendente + contador (ex.: madeira 0/3)
    var item = null;
    for (var k in this.def.cost) { item = k; break; }
    var label = this.totalDelivered() + '/' + this.totalNeeded();
    var icon = ASSETS.items[item];
    var tw = ASSETS.textWidth(label, 1);
    var cx = Math.round(this.x - (icon.width + 2 + tw) / 2);
    ctx.drawImage(icon, cx, Math.round(this.y - 4));
    ASSETS.drawText(ctx, label, cx + icon.width + 2, Math.round(this.y - 3), ASSETS.palette.white, 1);
  } else if (!this.def.terrainUnlock) {
    // Casa subindo durante a obra; completa quando 'built'.
    var t = this.state === 'built' ? 1 : 1 - this.timer / this.def.buildTime;
    var sh = Math.max(1, Math.round(sprite.h * t));
    var dx = Math.round(this.x - sprite.anchorX);
    var baseY = Math.round(this.y + this.def.height / 2 - 4);
    ctx.drawImage(sprite.built, 0, sprite.h - sh, sprite.w, sh,
      dx, baseY - sh, sprite.w, sh);
    if (this.state === 'building') {
      // Barra de progresso da obra
      var w = 30;
      var bx = Math.round(this.x - w / 2), by = area.y - 6;
      ctx.fillStyle = ASSETS.palette.black;
      ctx.fillRect(bx - 1, by - 1, w + 2, 5);
      ctx.fillStyle = ASSETS.palette.bronze;
      ctx.fillRect(bx, by, Math.round(w * t), 3);
    }
  }
  // terrainUnlock 'building'/'built': nada aqui — a revelação é a troca do
  // chão em main.js (drawWorld), não um sprite desta construção.

  // Itens voando do jogador até a área
  for (var i = 0; i < this.flying.length; i++) {
    var f = this.flying[i];
    var ft = Math.min(1, f.t / f.dur);
    var x = f.fromX + (f.toX - f.fromX) * ft;
    var y = f.fromY + (f.toY - f.fromY) * ft - Math.sin(ft * Math.PI) * 14;
    ctx.drawImage(ASSETS.items[f.itemId], Math.round(x - 4), Math.round(y - 4));
  }
};
