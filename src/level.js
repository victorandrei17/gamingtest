// level.js — layout declarativo do mapa.
// Posições em pixels da resolução interna (480x270). Origem no canto
// superior esquerdo. Para adicionar um 9º objeto, basta acrescentar uma
// linha em LEVEL.objects.
'use strict';

var LEVEL = {
  // Ponto inicial do jogador
  playerStart: { x: 240, y: 150 },

  // Objetos atingíveis: type referencia RESOURCE_TYPES (data.js).
  // x,y = centro da base (pés) do objeto.
  objects: [
    { type: 'tree',        x: 70,  y: 70  },
    { type: 'tree',        x: 120, y: 210 },
    { type: 'iron_rock',   x: 390, y: 80  },
    { type: 'iron_rock',   x: 430, y: 180 },
    { type: 'bronze_rock', x: 250, y: 60  },
    { type: 'bronze_rock', x: 330, y: 230 },
    { type: 'stone_rock',  x: 60,  y: 150 },
    { type: 'stone_rock',  x: 200, y: 240 }
  ],

  // Construções: type referencia BUILDINGS (data.js).
  // x,y = centro da área de construção.
  buildings: [
    { type: 'blacksmith', x: 400, y: 40 }
  ],

  // Inimigos: type referencia ENEMY_TYPES (data.js).
  // x,y = centro da base (pés) do inimigo.
  enemies: [
    { type: 'poring', x: 350, y: 150 },
    { type: 'poring', x: 150, y: 100 }
  ]
};
