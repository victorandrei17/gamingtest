// equipment.js — itens equipados do jogador.
// Slots vêm de EQUIP_SLOTS (data.js): arma/bota são permanentes (só upgrade),
// peito/anel são removíveis. `owned` registra tudo que já foi forjado, para que
// um item removido possa ser reequipado depois.
'use strict';

function Equipment(stats) {
  this.stats = stats;
  this.slots = {};   // slotKey -> recipeId equipado (ou null)
  this.owned = {};   // recipeId -> true (já forjado)
  for (var i = 0; i < EQUIP_SLOT_ORDER.length; i++) this.slots[EQUIP_SLOT_ORDER[i]] = null;
  this.recompute();
}

Equipment.prototype.equip = function (recipeId) {
  var r = RECIPE_BY_ID[recipeId];
  if (!r) return;
  this.owned[recipeId] = true;
  this.slots[r.slot] = recipeId;
  this.recompute();
};

// Remove um item de um slot removível (arma/bota não podem ser removidos).
Equipment.prototype.unequip = function (slotKey) {
  var meta = EQUIP_SLOTS[slotKey];
  if (!meta || !meta.removable) return;
  this.slots[slotKey] = null;
  this.recompute();
};

// Clique num slot removível: tira se estiver equipado, ou recoloca o item já
// possuído daquele slot se estiver vazio.
Equipment.prototype.toggleSlot = function (slotKey) {
  var meta = EQUIP_SLOTS[slotKey];
  if (!meta || !meta.removable) return;
  if (this.slots[slotKey]) { this.unequip(slotKey); return; }
  for (var id in this.owned) {
    if (RECIPE_BY_ID[id] && RECIPE_BY_ID[id].slot === slotKey) { this.equip(id); return; }
  }
};

Equipment.prototype.owns = function (recipeId) { return !!this.owned[recipeId]; };

// Reconstrói os modificadores a partir dos itens equipados.
Equipment.prototype.recompute = function () {
  var mods = [];
  for (var s in this.slots) {
    var id = this.slots[s];
    if (id && RECIPE_BY_ID[id]) mods = mods.concat(RECIPE_BY_ID[id].modifiers);
  }
  this.stats.setModifiers(mods);
};
