// data.js — tabelas de dados que definem tipos de recurso, armas e construções.
// Para adicionar um novo recurso/arma/construção, edite APENAS este arquivo
// (e level.js para posicionar instâncias; assets.js se quiser arte própria).
'use strict';

// Itens coletáveis (o que vai para o inventário / HUD).
// A ordem de INVENTORY_ORDER define a ordem dos slots no HUD.
// startQty (opcional): quantidade inicial no inventário — por padrão usa
// CONFIG.START_INVENTORY_QTY; itens que só vêm de drop (ex.: geléia rosa)
// declaram startQty: 0 para não nascer no inventário.
var ITEM_TYPES = {
  wood:        { name: 'Madeira' },
  iron_ore:    { name: 'Minério de Ferro' },
  bronze_ore:  { name: 'Minério de Bronze' },
  stone_piece: { name: 'Pedra' },
  geleia_rosa: { name: 'Geléia Rosa', startQty: 0 },
  pluma:       { name: 'Pluma', startQty: 0 }
};
var INVENTORY_ORDER = ['wood', 'iron_ore', 'bronze_ore', 'stone_piece', 'geleia_rosa', 'pluma'];

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
  tree:        { name: 'Árvore',          category: 'tree', hp: 5, drops: 'wood' },
  iron_rock:   { name: 'Rocha de Ferro',       category: 'rock', hp: 5, drops: 'iron_ore' },
  bronze_rock: { name: 'Rocha de Bronze',      category: 'rock', hp: 5, drops: 'bronze_ore' },
  stone_rock:  { name: 'Rocha de Pedra',       category: 'rock', hp: 5, drops: 'stone_piece' }
};

// Índice categoria -> arma (derivado de WEAPON_TYPES; não editar à mão).
var WEAPON_FOR_CATEGORY = {};
(function () {
  for (var id in WEAPON_TYPES) {
    WEAPON_FOR_CATEGORY[WEAPON_TYPES[id].targetCategory] = id;
  }
})();

// Categoria de alvo -> atributo de dano bônus (stats.js). Um item forjado com
// esse stat (ex.: Machado de Bronze -> damageTree) só soma dano contra objetos
// daquela categoria. Nova categoria de alvo? adicione a entrada aqui + o
// stat correspondente em Stats() (stats.js).
var CATEGORY_DAMAGE_STAT = {
  tree: 'damageTree',
  rock: 'damageRock'
};

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
    width: 56,   // px do sprite construído (bigorna + fornalha)
    height: 44
  }
};

// Slots de equipamento (declarativo). removable=false: permanente, só recebe
// upgrade (arma/bota/machado/picareta, em linha abaixo do boneco);
// removable=true: pode ser removido (peito/anel, nas laterais).
var EQUIP_SLOTS = {
  weapon:  { label: 'ARMA',     removable: false },
  boot:    { label: 'BOTA',     removable: false },
  axe:     { label: 'MACHADO',  removable: false },
  pickaxe: { label: 'PICARETA', removable: false },
  chest:   { label: 'PEITO',    removable: true },
  ring:    { label: 'ANEL',     removable: true }
};
var EQUIP_SLOT_ORDER = ['weapon', 'boot', 'axe', 'pickaxe', 'chest', 'ring'];

// Inimigos (Milestone 3). drops: itemId dropado ao morrer (data.js ITEM_TYPES);
// color: chave de ASSETS.palette usada nos pedaços de despedaçamento (enemy.js).
// Nova espécie = uma entrada aqui + sprite em ASSETS.enemies (assets.js) +
// instância em level.js — a lógica de dano/morte/respawn não muda.
var ENEMY_TYPES = {
  poring:        { name: 'Poring',        hp: CONFIG.ENEMY_HP, drops: 'geleia_rosa', color: 'pink' },
  coelho_branco: { name: 'Coelho Branco', hp: CONFIG.ENEMY_HP, drops: 'pluma',       color: 'white' }
};
