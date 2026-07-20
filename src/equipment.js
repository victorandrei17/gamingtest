// equipment.js — itens equipados do jogador. Cada slot guarda o id de uma
// receita; ao mudar, recalcula e injeta os modificadores em stats.
// O slot 'weapon' (machado/picareta) é contextual e vem de player.weapon —
// não é gerenciado aqui (não tem modificadores neste milestone).
'use strict';

// Slots geridos pela forja (ordem = ordem de exibição no painel).
var EQUIP_SLOTS = ['sword', 'boot'];

function Equipment(stats) {
  this.stats = stats;
  this.slots = {};
  for (var i = 0; i < EQUIP_SLOTS.length; i++) this.slots[EQUIP_SLOTS[i]] = null;
  this.recompute();
}

Equipment.prototype.equip = function (recipeId) {
  var r = RECIPE_BY_ID[recipeId];
  if (!r) return;
  this.slots[r.slot] = recipeId;
  this.recompute();
};

// Item único: já forjado/equipado?
Equipment.prototype.has = function (recipeId) {
  for (var s in this.slots) if (this.slots[s] === recipeId) return true;
  return false;
};

// Reconstrói a lista de modificadores a partir dos itens equipados.
Equipment.prototype.recompute = function () {
  var mods = [];
  for (var s in this.slots) {
    var id = this.slots[s];
    if (id && RECIPE_BY_ID[id]) mods = mods.concat(RECIPE_BY_ID[id].modifiers);
  }
  this.stats.setModifiers(mods);
};
