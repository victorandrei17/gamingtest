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

// Pop de coleta: anel duplo que expande + faíscas douradas subindo — dá um
// "brilho" de recompensa na hora que o item entra no inventário.
function Pop(x, y) {
  this.x = x; this.y = y;
  this.t = 0;
  this.dur = 0.32;
  this.dead = false;
  this.sparks = [];
  for (var i = 0; i < 5; i++) {
    var a = Math.random() * Math.PI * 2;
    this.sparks.push({
      ox: Math.cos(a) * (3 + Math.random() * 4),
      oy: Math.sin(a) * (3 + Math.random() * 4) - 4,
      vy: -12 - Math.random() * 12
    });
  }
}

Pop.prototype.update = function (dt) {
  this.t += dt;
  if (this.t >= this.dur) this.dead = true;
};

Pop.prototype.draw = function (ctx) {
  var k = this.t / this.dur, fade = 1 - k;
  // anel externo branco
  ctx.strokeStyle = 'rgba(244,244,244,' + fade.toFixed(2) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(Math.round(this.x), Math.round(this.y), 2 + k * 26, 0, Math.PI * 2);
  ctx.stroke();
  // anel interno dourado, defasado
  ctx.strokeStyle = 'rgba(255,224,120,' + (fade * 0.8).toFixed(2) + ')';
  ctx.beginPath();
  ctx.arc(Math.round(this.x), Math.round(this.y), 1 + k * 16, 0, Math.PI * 2);
  ctx.stroke();
  // faíscas subindo
  ctx.fillStyle = 'rgba(255,240,180,' + fade.toFixed(2) + ')';
  for (var i = 0; i < this.sparks.length; i++) {
    var s = this.sparks[i];
    ctx.fillRect(Math.round(this.x + s.ox), Math.round(this.y + s.oy + s.vy * this.t), 1, 1);
  }
};
