// effects.js — partículas de hit e "pop" de coleta.
'use strict';

function Particle(x, y, color) {
  this.x = x; this.y = y;
  var ang = Math.random() * Math.PI * 2;
  var spd = 20 + Math.random() * 40;
  this.vx = Math.cos(ang) * spd;
  this.vy = Math.sin(ang) * spd - 30;
  this.life = 0.35 + Math.random() * 0.2;
  this.color = color;
  this.dead = false;
}

Particle.prototype.update = function (dt) {
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  this.vy += 160 * dt; // gravidade
  this.life -= dt;
  if (this.life <= 0) this.dead = true;
};

Particle.prototype.draw = function (ctx) {
  ctx.fillStyle = this.color;
  ctx.fillRect(Math.round(this.x), Math.round(this.y), 1, 1);
};

// Pop de coleta: anel branco que expande e some.
function Pop(x, y) {
  this.x = x; this.y = y;
  this.t = 0;
  this.dead = false;
}

Pop.prototype.update = function (dt) {
  this.t += dt;
  if (this.t >= 0.2) this.dead = true;
};

Pop.prototype.draw = function (ctx) {
  var r = 2 + this.t * 30;
  ctx.strokeStyle = ASSETS.palette.white;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(Math.round(this.x), Math.round(this.y), r, 0, Math.PI * 2);
  ctx.stroke();
};
