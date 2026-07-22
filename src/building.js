// building.js — áreas de construção desbloqueáveis (Ferreiro etc.).
// Estados: 'site' (recebendo recursos) -> 'building' (obra) -> 'built'.
// A fase 'building' das construções físicas (não-terrainUnlock) é uma
// animação de "montagem mágica": o sprite final é fatiado em blocos que
// voam de todas as direções e se encaixam de baixo pra cima (ver
// buildAssembly + o ramo de desenho da obra).
'use strict';

// easeOutBack: chega ao alvo passando um pouco e recuando — dá o "snap" de
// encaixe dos blocos. e(0)=0, e(1)=1, com overshoot perto do fim.
function easeOutBack(t) {
  var c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

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
  this.blocks = null;          // blocos da animação de montagem (lazy)
  this.buildFlash = 0;         // clarão ao concluir a obra
  for (var item in this.def.cost) this.delivered[item] = 0;
}

// Fatia o sprite final numa grade de blocos (só células com pixel opaco) e
// sorteia, por bloco, de onde ele voa (ângulo/distância), o quanto arqueia no
// caminho e quando começa — quanto mais baixo no sprite, mais cedo chega
// (fundação primeiro). Roda uma vez, ao entrar em 'building'.
Building.prototype.buildAssembly = function () {
  var spr = ASSETS.buildings[this.type];
  var tmp = document.createElement('canvas');
  tmp.width = spr.w; tmp.height = spr.h;
  var tctx = tmp.getContext('2d');
  tctx.drawImage(spr.built, 0, 0);
  var data = tctx.getImageData(0, 0, spr.w, spr.h).data;
  var CELL = 4, blocks = [];
  for (var cy = 0; cy < spr.h; cy += CELL) {
    for (var cx = 0; cx < spr.w; cx += CELL) {
      var cw = Math.min(CELL, spr.w - cx), ch = Math.min(CELL, spr.h - cy);
      var opaque = false;
      for (var py = cy; py < cy + ch && !opaque; py++) {
        for (var px = cx; px < cx + cw; px++) {
          if (data[(py * spr.w + px) * 4 + 3] > 24) { opaque = true; break; }
        }
      }
      if (!opaque) continue;
      var normY = (cy + ch / 2) / spr.h; // 0 = topo, 1 = base
      blocks.push({
        sx: cx, sy: cy, cw: cw, ch: ch,
        ang: Math.random() * Math.PI * 2,
        dist: 46 + Math.random() * 64,
        curve: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.7),
        delay: (1 - normY) * 0.55 + Math.random() * 0.12,
        arrive: 0.32 + Math.random() * 0.12,
        landClock: -1
      });
    }
  }
  this.blocks = blocks;
};

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
  if (this.buildFlash > 0) this.buildFlash -= dt;

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
      this.buildAssembly(); // gera os blocos da animação de montagem
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
      } else {
        // Assentamento da estrutura: baque, poeira e clarão de conclusão.
        world.spawnParticles(this.x, this.y - 10, 'rock', 18);
        this.buildFlash = 0.35;
        if (typeof FX !== 'undefined') FX.addShake(0.55);
      }
      world.showMessage(this.def.unlockMessage, CONFIG.UNLOCK_MSG_TIME);
      Quests.onEvent('BUILD', { buildingId: this.type }, world);
    }
  }
};

// Animação de montagem (fase 'building'): blueprint fantasma + aura de
// energia + motes orbitando sendo sugados pra base + os blocos do sprite
// voando de todas as direções e se encaixando de baixo pra cima, com rastro
// e um brilho branco no instante do encaixe.
Building.prototype.drawAssembly = function (ctx, time, sprite, topLeftX, topLeftY, baseY, area) {
  if (!this.blocks) this.buildAssembly();
  var progress = 1 - this.timer / this.def.buildTime;
  var hasFX = typeof FX !== 'undefined';

  // Aura de construção pulsando na base (energia fria + calor por dentro).
  if (hasFX) {
    var auraR = 20 + Math.sin(time * 6) * 3 + progress * 6;
    FX.glow(ctx, this.x, baseY - 2, auraR, 'rgba(120,180,255,0.28)');
    FX.glow(ctx, this.x, baseY - 2, auraR * 0.55, 'rgba(255,228,150,0.24)');
  }

  // Blueprint fantasma do resultado final, pulsando de leve.
  ctx.save();
  ctx.globalAlpha = 0.10 + 0.05 * Math.sin(time * 5);
  ctx.drawImage(sprite.built, topLeftX, topLeftY);
  ctx.restore();

  // Motes de energia orbitando e fechando o cerco conforme a obra avança.
  for (var m = 0; m < 7; m++) {
    var mo = time * 2 + m * (Math.PI * 2 / 7);
    var mr = (34 - progress * 22) + Math.sin(time * 3 + m) * 3;
    var mx = this.x + Math.cos(mo) * mr;
    var my = baseY - 8 + Math.sin(mo) * mr * 0.4;
    ctx.fillStyle = m % 2 ? 'rgba(190,224,255,0.9)' : 'rgba(255,235,170,0.9)';
    ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
  }

  // Blocos montando.
  for (var i = 0; i < this.blocks.length; i++) {
    var bk = this.blocks[i];
    var local = (progress - bk.delay) / bk.arrive;
    if (local <= 0) continue;
    var tx = topLeftX + bk.sx, ty = topLeftY + bk.sy;

    if (local >= 1) {
      // Encaixado: desenha no lugar + brilho branco breve ao pousar.
      if (bk.landClock < 0) {
        bk.landClock = time;
        if (hasFX) FX.puff(tx + bk.cw / 2, ty + bk.ch + 1);
      }
      ctx.drawImage(sprite.built, bk.sx, bk.sy, bk.cw, bk.ch, tx, ty, bk.cw, bk.ch);
      var g = time - bk.landClock;
      if (g < 0.16) {
        ctx.globalAlpha = 1 - g / 0.16;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx, ty, bk.cw, bk.ch);
        ctx.globalAlpha = 1;
      }
      continue;
    }

    // Em voo: parte de um ponto ao redor do alvo e converge com overshoot,
    // arqueando no meio do caminho (swoosh) e surgindo em fade.
    var e = easeOutBack(local);
    var sx0 = tx + Math.cos(bk.ang) * bk.dist;
    var sy0 = ty + Math.sin(bk.ang) * bk.dist;
    var cx = sx0 + (tx - sx0) * e;
    var cy = sy0 + (ty - sy0) * e;
    var arc = Math.sin(local * Math.PI) * bk.curve * bk.dist * 0.22;
    cx += -Math.sin(bk.ang) * arc;
    cy += Math.cos(bk.ang) * arc;
    var fade = Math.min(1, local * 5);

    // Rastro tênue atrás do bloco.
    if (local < 0.85) {
      var e2 = easeOutBack(Math.max(0, local - 0.09));
      var tcx = sx0 + (tx - sx0) * e2, tcy = sy0 + (ty - sy0) * e2;
      ctx.globalAlpha = fade * 0.3;
      ctx.drawImage(sprite.built, bk.sx, bk.sy, bk.cw, bk.ch, Math.round(tcx), Math.round(tcy), bk.cw, bk.ch);
    }
    ctx.globalAlpha = fade;
    ctx.drawImage(sprite.built, bk.sx, bk.sy, bk.cw, bk.ch, Math.round(cx), Math.round(cy), bk.cw, bk.ch);
    ctx.globalAlpha = 1;
  }

  // Barra de progresso com ponta brilhante.
  var w = 30, bx = Math.round(this.x - w / 2), by = area.y - 6;
  ctx.fillStyle = 'rgba(26,28,44,0.7)';
  ctx.fillRect(bx - 1, by - 1, w + 2, 5);
  ctx.fillStyle = ASSETS.palette.bronze;
  var pw = Math.round(w * progress);
  ctx.fillRect(bx, by, pw, 3);
  ctx.fillStyle = 'rgba(255,238,160,0.9)';
  ctx.fillRect(bx + Math.max(0, pw - 1), by, 2, 3);
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
    var baseY = Math.round(this.y + this.def.height / 2 - 4);
    var topLeftX = Math.round(this.x - sprite.anchorX);
    var topLeftY = baseY - sprite.h;

    if (this.state === 'building') {
      this.drawAssembly(ctx, time, sprite, topLeftX, topLeftY, baseY, area);
    } else {
      // Construída: sprite completo + clarão de conclusão que some.
      ctx.drawImage(sprite.built, topLeftX, topLeftY);
      if (this.buildFlash > 0 && typeof FX !== 'undefined') {
        FX.glow(ctx, this.x, baseY - sprite.h * 0.4, 44,
          'rgba(255,255,255,' + (this.buildFlash / 0.35 * 0.75).toFixed(3) + ')');
      }
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
