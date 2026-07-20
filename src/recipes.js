// recipes.js — receitas forjáveis, 100% declarativas.
// Adicionar uma nova forja = uma nova entrada nesta lista (nada mais).
//   id         chave única / referência do equipamento
//   name       nome exibido (a mensagem de conclusão usa NAME em maiúsculas)
//   slot       slot de equipamento que ocupa (equipment.js)
//   icon       chave em ASSETS.forgeIcons
//   cost       { itemId: quantidade } — debitado do inventário ao forjar
//   time       segundos de forja
//   modifiers  lista de { stat, type, value } aplicada ao equipar
'use strict';

var RECIPES = [
  {
    id: 'sword',
    name: 'Espada',
    slot: 'sword',
    icon: 'sword',
    cost: { wood: 2, iron_ore: 2 },
    time: CONFIG.FORGE_TIME,
    modifiers: [{ stat: 'damage', type: 'flat', value: 1 }]
  },
  {
    id: 'boot',
    name: 'Bota',
    slot: 'boot',
    icon: 'boot',
    cost: { wood: 3 },
    time: CONFIG.FORGE_TIME,
    modifiers: [{ stat: 'moveSpeed', type: 'percent', value: 0.20 }]
  }
];

var RECIPE_BY_ID = {};
(function () {
  for (var i = 0; i < RECIPES.length; i++) RECIPE_BY_ID[RECIPES[i].id] = RECIPES[i];
})();
