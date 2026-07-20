// drops.js — itens dropados no chão: arco de ejeção, magnetismo e coleta.
'use strict';

function Drop(itemId, x, y) {
  this.itemId = itemId;
  this.state = 'arc';        // 'arc' -> 'idle' -> 'magnet' -> coletado
  this.t = 0;
  this.startX = x; this.startY = y;
  var ang = Math.random() * Math.PI * 2;
  var dist = 10 + Math.random() * 8;
  this.endX = Math.max(6, Math.min(CONFIG.GAME_WIDTH - 6, x + Math.cos(ang) * dist));
  this.endY = Math.max(6, Math.min(CONFIG.GAME_HEIGHT - 6, y + Math.sin(ang) * dist * 0.5));
  this.x = x; this.y = y;
  this.magnetFromX = 0; this.magnetFromY = 0;
  this.dead = false;
  this.bob = Math.random() * Math.PI * 2;
}

function easeOutQuad(t) { return t * (2 - t); }

Drop.prototype.update = function (dt, player, world) {
  this.t += dt;
  this.bob += dt * 5;

  if (this.state === 'arc') {
    var t = Math.min(1, this.t / CONFIG.DROP_ARC_TIME);
    this.x = this.startX + (this.endX - this.startX) * t;
    // arco: interpola posição + parábola de altura
    var arcH = 12;
    this.y = this.startY + (this.endY - this.startY) * t - Math.sin(t * Math.PI) * arcH;
    if (t >= 1) { this.state = 'idle'; this.t = 0; }
    return;
  }

  if (this.state === 'idle') {
    var dx = player.x - this.x, dy = (player.y - 8) - this.y;
    if (dx * dx + dy * dy <= CONFIG.COLLECT_RADIUS * CONFIG.COLLECT_RADIUS) {
      this.state = 'magnet';
      this.t = 0;
      this.magnetFromX = this.x; this.magnetFromY = this.y;
    }
    return;
  }

  if (this.state === 'magnet') {
    var mt = Math.min(1, this.t / CONFIG.MAGNET_TIME);
    var e = easeOutQuad(mt);
    this.x = this.magnetFromX + (player.x - this.magnetFromX) * e;
    this.y = this.magnetFromY + ((player.y - 10) - this.magnetFromY) * e;
    if (mt >= 1) {
      this.dead = true;
      world.addToInventory(this.itemId, 1);
      world.spawnPop(this.x, this.y); // feedback visual de coleta
    }
  }
};

Drop.prototype.draw = function (ctx) {
  var img = ASSETS.items[this.itemId];
  var bobY = this.state === 'idle' ? Math.round(Math.sin(this.bob) * 1.5) : 0;
  ctx.drawImage(img, Math.round(this.x - 4), Math.round(this.y - 4 + bobY));
};
