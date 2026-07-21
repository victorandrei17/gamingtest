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
    { type: 'iron_rock',   x: 300, y: 90  },
    { type: 'bronze_rock', x: 250, y: 50  },
    { type: 'stone_rock',  x: 50,  y: 220 }
  ],

  // Construções: type referencia BUILDINGS (data.js).
  // x,y = centro da área de construção. A ilha fica no canto inferior
  // direito, propositalmente encostada/além da borda do mapa.
  buildings: [
    { type: 'blacksmith', x: 170, y: 90  },
    { type: 'island',     x: 310, y: 240 }
  ],

  // Inimigos: type referencia ENEMY_TYPES (data.js). Um de cada tipo.
  // x,y = centro da base (pés) do inimigo.
  enemies: [
    { type: 'poring', x: 230, y: 180 },
    { type: 'coelho_branco', x: 90, y: 190 }
  ]
};
