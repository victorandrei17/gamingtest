// level.js — layout declarativo do mapa.
// Posições em pixels da resolução interna. O mapa original vai de x=0 até
// CONFIG.ORIGINAL_MAP_WIDTH (336); daí até CONFIG.GAME_WIDTH (496) é a faixa
// de água travada que a "ilha" desbloqueia (ver main.js/building.js). Origem
// no canto superior esquerdo. Para adicionar um objeto, uma linha nova em
// LEVEL.objects.
'use strict';

var LEVEL = {
  // Ponto inicial do jogador
  playerStart: { x: 168, y: 140 },

  // Objetos atingíveis: type referencia RESOURCE_TYPES (data.js).
  // x,y = centro da base (pés) do objeto. Um de cada tipo.
  objects: [
    { type: 'tree',        x: 50,  y: 60  },
    { type: 'iron_rock',   x: 280, y: 90  },
    { type: 'bronze_rock', x: 250, y: 50  },
    { type: 'stone_rock',  x: 50,  y: 220 }
  ],

  // Construções: type referencia BUILDINGS (data.js).
  // x,y = centro da área de construção. A "ilha" é um recorte de 80x80 (5x5
  // tiles, ver BUILDINGS.island) dentro da faixa de água, encostado na
  // fronteira verde/azul (borda esquerda = ORIGINAL_MAP_WIDTH) e alinhado à
  // parte inferior do mapa nas linhas de tile 11-16 (176px a 256px — o
  // resto, até 270px, é a última fileira parcial de água, sempre bloqueada).
  buildings: [
    { type: 'blacksmith', x: 170, y: 90  },
    { type: 'island',     x: CONFIG.ORIGINAL_MAP_WIDTH + 40, y: 216 }
  ],

  // Inimigos: type referencia ENEMY_TYPES (data.js). Um de cada tipo.
  // x,y = centro da base (pés) do inimigo.
  enemies: [
    { type: 'poring', x: 230, y: 180 },
    { type: 'coelho_branco', x: 90, y: 190 }
  ]
};
