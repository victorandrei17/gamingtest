// level.js — layout declarativo do mapa.
// Posições em pixels da resolução interna (336x270). Origem no canto
// superior esquerdo. Para adicionar um objeto, basta acrescentar uma
// linha em LEVEL.objects.
'use strict';

var LEVEL = {
  // Ponto inicial do jogador
  playerStart: { x: 168, y: 140 },

  // Objetos atingíveis: type referencia RESOURCE_TYPES (data.js).
  // x,y = centro da base (pés) do objeto. Um de cada tipo.
  objects: [
    { type: 'tree',        x: 50,  y: 60  },
    { type: 'iron_rock',   x: 286, y: 70  },
    { type: 'bronze_rock', x: 170, y: 50  },
    { type: 'stone_rock',  x: 50,  y: 220 }
  ],

  // Construções: type referencia BUILDINGS (data.js).
  // x,y = centro da área de construção.
  buildings: [
    { type: 'blacksmith', x: 280, y: 220 }
  ],

  // Inimigos: type referencia ENEMY_TYPES (data.js). Um de cada tipo.
  // x,y = centro da base (pés) do inimigo.
  enemies: [
    { type: 'poring', x: 250, y: 150 },
    { type: 'coelho_branco', x: 100, y: 180 }
  ]
};
