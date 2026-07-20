// data.js — tabelas de dados que definem tipos de recurso, armas e construções.
// Para adicionar um novo recurso/arma/construção, edite APENAS este arquivo
// (e level.js para posicionar instâncias; assets.js se quiser arte própria).
'use strict';

// Itens coletáveis (o que vai para o inventário / HUD).
// A ordem de INVENTORY_ORDER define a ordem dos slots no HUD.
var ITEM_TYPES = {
  wood:        { name: 'Madeira' },
  iron_ore:    { name: 'Minério de Ferro' },
  bronze_ore:  { name: 'Minério de Bronze' },
  stone_piece: { name: 'Pedra' }
};
var INVENTORY_ORDER = ['wood', 'iron_ore', 'bronze_ore', 'stone_piece'];

// Armas: que categoria de alvo cada uma atinge.
// Para adicionar uma arma nova: nova entrada aqui + sprite em assets.js
// (ASSETS.weapons[id]) e uma categoria de recurso que a use.
var WEAPON_TYPES = {
  axe:     { name: 'Machado',  targetCategory: 'tree' },
  pickaxe: { name: 'Picareta', targetCategory: 'rock' }
};

// Objetos atingíveis do mundo.
// Para adicionar um novo (ex.: rocha de ouro):
//   gold_rock: { name: 'Rocha de Ouro', category: 'rock', hp: 3, drops: 'gold_ore' }
// + entrada em ITEM_TYPES ('gold_ore') e uma instância em level.js.
// A arte cai num placeholder genérico da categoria se assets.js não tiver
// sprite específico.
var RESOURCE_TYPES = {
  tree:        { name: 'Árvore',          category: 'tree', hp: 2, drops: 'wood' },
  iron_rock:   { name: 'Rocha de Ferro',       category: 'rock', hp: 2, drops: 'iron_ore' },
  bronze_rock: { name: 'Rocha de Bronze',      category: 'rock', hp: 2, drops: 'bronze_ore' },
  stone_rock:  { name: 'Rocha de Pedra',       category: 'rock', hp: 2, drops: 'stone_piece' }
};

// Índice categoria -> arma (derivado de WEAPON_TYPES; não editar à mão).
var WEAPON_FOR_CATEGORY = {};
(function () {
  for (var id in WEAPON_TYPES) {
    WEAPON_FOR_CATEGORY[WEAPON_TYPES[id].targetCategory] = id;
  }
})();

// Construções desbloqueáveis.
// Para adicionar outra: nova entrada aqui + instância em level.js.
// cost: { item: quantidade } — aceita múltiplos itens no futuro,
// neste milestone a entrega processa cada item da lista em sequência.
var BUILDINGS = {
  blacksmith: {
    name: 'Ferreiro',
    unlockMessage: 'FERREIRO DESBLOQUEADO',
    cost: { wood: CONFIG.BLACKSMITH_COST },
    buildTime: CONFIG.BUILD_TIME,
    width: 48,   // px do sprite construído
    height: 40
  }
};
