// stats.js — atributos do personagem: base (config.js) + modificadores dos
// itens equipados. Recalculado sempre que o equipamento muda.
// Nenhum sistema deve ler dano/velocidade hardcoded: tudo vem de stats.get().
'use strict';

// Rótulos em PT-BR para exibição (painel de atributos, tooltips).
var STAT_LABELS = {
  damage:      'Dano',
  moveSpeed:   'Velocidade',
  attackSpeed: 'Vel. Ataque'
};

function Stats() {
  this.base = {
    damage:      CONFIG.BASE_DAMAGE,
    moveSpeed:   CONFIG.PLAYER_SPEED,
    attackSpeed: CONFIG.BASE_ATTACK_SPEED
  };
  this.mods = []; // lista plana de modificadores { stat, type, value }
}

// Substitui todos os modificadores (chamado por equipment.recompute()).
Stats.prototype.setModifiers = function (mods) {
  this.mods = mods || [];
};

// Valor final: (base + soma dos flat) * (1 + soma dos percent).
Stats.prototype.get = function (stat) {
  var flat = 0, percent = 0;
  for (var i = 0; i < this.mods.length; i++) {
    var m = this.mods[i];
    if (m.stat !== stat) continue;
    if (m.type === 'percent') percent += m.value;
    else flat += m.value;
  }
  return (this.base[stat] + flat) * (1 + percent);
};

// true se algum modificador ativo afeta o atributo (destaque de slot no painel).
Stats.prototype.isModified = function (stat) {
  for (var i = 0; i < this.mods.length; i++) if (this.mods[i].stat === stat) return true;
  return false;
};

// Texto de exibição de cada atributo no painel.
Stats.prototype.display = function (stat) {
  var v = this.get(stat);
  if (stat === 'moveSpeed')  return Math.round(v / this.base.moveSpeed * 100) + '%';
  if (stat === 'attackSpeed') return v.toFixed(1) + 'x';
  return String(Math.round(v));
};

// Texto "base (+bônus)" para a janela de STATUS (só mostra o parêntese se houver bônus).
Stats.prototype.statusText = function (stat) {
  var final = this.get(stat), base = this.base[stat];
  if (stat === 'moveSpeed') {
    var bp = Math.round(final / base * 100) - 100;
    return bp ? '100% (+' + bp + '%)' : '100%';
  }
  if (stat === 'attackSpeed') {
    var d = final - base;
    return d ? base.toFixed(1) + 'x (+' + d.toFixed(1) + ')' : base.toFixed(1) + 'x';
  }
  var db = final - base;
  return db ? Math.round(base) + ' (+' + Math.round(db) + ')' : String(Math.round(base));
};

// Descrição declarativa de um modificador (ex.: "Dano +1", "Velocidade +20%").
Stats.describeMod = function (m) {
  var label = STAT_LABELS[m.stat] || m.stat;
  if (m.type === 'percent') return label + ' +' + Math.round(m.value * 100) + '%';
  return label + ' +' + m.value;
};

Stats.describeMods = function (mods) {
  var out = [];
  for (var i = 0; i < mods.length; i++) out.push(Stats.describeMod(mods[i]));
  return out.join(', ');
};
