// pickup.js — itens fixos no chão que concedem uma ferramenta ao serem
// tocados (ex.: o machado inicial, ver LEVEL.pickups em level.js). Diferente
// de Drop (drops.js): não tem arco nem magnetismo, fica parado no lugar até
// o jogador passar por cima; ao tocar, não entra no inventário — dispara
// Player.startPickup (animação travada) e concede a ferramenta direto.
'use strict';

function Pickup(type, x, y) {
  this.type = type; // por enquanto só 'axe' — chave em ASSETS.weaponIcons
  this.x = x;
  this.y = y;
  this.dead = false;
  this.bob = Math.random() * Math.PI * 2;
}

function pickupRectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

Pickup.prototype.box = function () {
  return { x: this.x - 8, y: this.y - 8, w: 16, h: 16 };
};

Pickup.prototype.update = function (dt, player, world) {
  if (this.dead) return;
  this.bob += dt * 3;
  if (!pickupRectsOverlap(player.hitbox(), this.box())) return;
  this.dead = true;
  if (this.type === 'axe') player.hasAxe = true;
  player.startPickup(this.type);
  world.spawnPop(this.x, this.y);
  Quests.onEvent('PICKUP', { pickupId: this.type }, world);
};

Pickup.prototype.draw = function (ctx) {
  if (this.dead) return;
  var icon = ASSETS.weaponIcons[this.type];
  var bobY = Math.round(Math.sin(this.bob) * 1.5);
  ctx.drawImage(icon, Math.round(this.x - icon.width / 2), Math.round(this.y - icon.height / 2 + bobY));
};
