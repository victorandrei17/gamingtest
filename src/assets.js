// assets.js — TODA a arte do jogo vive aqui, gerada proceduralmente.
// Para usar sprites reais, substitua as funções create* deste arquivo por
// carregamento de imagens mantendo a mesma interface pública (ASSETS.*).
// Dimensões esperadas de cada sprite estão documentadas no README.
'use strict';

var ASSETS = (function () {

  // Paleta de 16 cores — pixel art saturada, estilo cartoon.
  var PAL = {
    black:      '#1a1c2c',
    darkGreen:  '#2e5339',
    green:      '#3a5a40',   // chão tom A
    green2:     '#436a48',   // chão tom B
    leaf:       '#4f9d4f',
    leafLight:  '#7ec850',
    trunk:      '#7a4a2b',
    trunkDark:  '#5c3520',
    gray:       '#8b9bb4',
    grayDark:   '#566c86',
    iron:       '#c0cbdc',
    bronze:     '#e8a04c',
    skin:       '#f0c49a',
    blue:       '#3b7dd8',
    pink:       '#e86ac0',
    white:      '#f4f4f4'
  };

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx: ctx };
  }

  function px(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w === undefined ? 1 : w, h === undefined ? 1 : h);
  }

  // ------------------------------------------------------------------
  // Fonte bitmap 3x5 (sem antialias). drawText desenha na escala pedida.
  // ------------------------------------------------------------------
  var FONT = {
    'A': ['010','101','111','101','101'], 'B': ['110','101','110','101','110'],
    'C': ['011','100','100','100','011'], 'D': ['110','101','101','101','110'],
    'E': ['111','100','110','100','111'], 'F': ['111','100','110','100','100'],
    'G': ['011','100','101','101','011'], 'H': ['101','101','111','101','101'],
    'I': ['111','010','010','010','111'], 'J': ['001','001','001','101','010'],
    'K': ['101','110','100','110','101'], 'L': ['100','100','100','100','111'],
    'M': ['101','111','111','101','101'], 'N': ['101','111','111','111','101'],
    'O': ['010','101','101','101','010'], 'P': ['110','101','110','100','100'],
    'Q': ['010','101','101','110','011'], 'R': ['110','101','110','110','101'],
    'S': ['011','100','010','001','110'], 'T': ['111','010','010','010','010'],
    'U': ['101','101','101','101','111'], 'V': ['101','101','101','101','010'],
    'W': ['101','101','111','111','101'], 'X': ['101','101','010','101','101'],
    'Y': ['101','101','010','010','010'], 'Z': ['111','001','010','100','111'],
    '0': ['010','101','101','101','010'], '1': ['010','110','010','010','111'],
    '2': ['110','001','010','100','111'], '3': ['110','001','010','001','110'],
    '4': ['101','101','111','001','001'], '5': ['111','100','110','001','110'],
    '6': ['011','100','110','101','010'], '7': ['111','001','010','010','010'],
    '8': ['010','101','010','101','010'], '9': ['010','101','011','001','110'],
    '/': ['001','001','010','100','100'], ':': ['000','010','000','010','000'],
    '.': ['000','000','000','000','010'], ',': ['000','000','000','010','100'],
    '-': ['000','000','111','000','000'], '(': ['010','100','100','100','010'],
    ')': ['010','001','001','001','010'], '+': ['000','010','111','010','000'],
    '%': ['101','001','010','100','101'], '>': ['100','010','001','010','100'],
    ' ': ['000','000','000','000','000']
  };

  function drawText(ctx, text, x, y, color, scale) {
    scale = scale || 1;
    text = String(text).toUpperCase();
    ctx.fillStyle = color;
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      var g = FONT[text[i]] || FONT[' '];
      for (var r = 0; r < 5; r++) {
        for (var c = 0; c < 3; c++) {
          if (g[r][c] === '1') {
            ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
          }
        }
      }
      cx += 4 * scale;
    }
    return cx - x; // largura desenhada
  }

  function textWidth(text, scale) {
    return String(text).length * 4 * (scale || 1) - (scale || 1);
  }

  // ------------------------------------------------------------------
  // Chão — xadrez de desenvolvimento. Trocar por tileset real aqui.
  // A faixa a partir de ORIGINAL_MAP_WIDTH nasce como "água" (travada, ver
  // building.js/main.js "ilha") até ser desbloqueada.
  // ------------------------------------------------------------------
  function createGround() {
    var t = CONFIG.TILE_SIZE;
    var g = makeCanvas(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    var lockedFromTx = CONFIG.ORIGINAL_MAP_WIDTH / t;
    for (var ty = 0; ty < CONFIG.GAME_HEIGHT / t; ty++) {
      for (var tx = 0; tx < CONFIG.GAME_WIDTH / t; tx++) {
        var even = (tx + ty) % 2 === 0;
        var color = tx >= lockedFromTx
          ? (even ? '#2f6fa8' : '#3a82c4')   // água (travada)
          : (even ? PAL.green : PAL.green2); // grama (mapa original)
        px(g.ctx, color, tx * t, ty * t, t, t);
      }
    }
    return g.canvas;
  }

  // Textura de grama pra sobrepor só o recorte 5x5 da ilha (BUILDINGS.island)
  // quando ela é desbloqueada — mesmo xadrez do resto do mapa, com a
  // paridade de tile calculada a partir da posição absoluta (coluna 21,
  // linha 11 — ver LEVEL.buildings) pra encaixar sem costura na fronteira.
  function createGroundExtension() {
    var t = CONFIG.TILE_SIZE;
    var w = BUILDINGS.island.width, h = BUILDINGS.island.height;
    var g = makeCanvas(w, h);
    var startTx = CONFIG.ORIGINAL_MAP_WIDTH / t; // 21
    var startTy = 11;                            // linha onde a ilha fica (ver level.js)
    for (var ty = 0; ty < h / t; ty++) {
      for (var tx = 0; tx < w / t; tx++) {
        var atx = startTx + tx, aty = startTy + ty;
        px(g.ctx, (atx + aty) % 2 === 0 ? PAL.green : PAL.green2, tx * t, ty * t, t, t);
      }
    }
    return g.canvas;
  }

  // ------------------------------------------------------------------
  // Jogador — 16x22 px, âncora nos pés (8, 21).
  // Frames: idle 1, walk 4, attack 3 (por arma).
  // Direções: down, up, right (left = espelho de right).
  // ------------------------------------------------------------------
  var PLAYER_W = 16, PLAYER_H = 22;

  function drawWeaponInHand(ctx, weaponId, frame, dir) {
    // Braço estendido com a arma; 3 frames: erguer, golpe, retorno.
    var head = weaponId === 'axe' ? PAL.gray : PAL.iron;
    var angles = [-0.9, 0.5, 0.1]; // pose do golpe por frame
    var a = angles[frame] || 0;
    ctx.save();
    if (dir === 'up') ctx.translate(4, 10); else ctx.translate(12, 10);
    ctx.rotate(dir === 'up' ? -a : a);
    px(ctx, PAL.trunk, -1, -8, 2, 9);            // cabo
    if (weaponId === 'axe') {
      px(ctx, head, -3, -9, 5, 3);               // lâmina do machado
    } else if (weaponId === 'sword') {
      px(ctx, PAL.iron, 0, -13, 1, 6);           // lâmina reta
      px(ctx, PAL.white, 0, -13, 1, 2);          // brilho na ponta
      px(ctx, PAL.trunkDark, -1, -8, 3, 1);      // guarda
    } else {
      px(ctx, head, -4, -9, 7, 2);               // cabeça da picareta
      px(ctx, head, -4, -8, 2, 2);
      px(ctx, head, 1, -8, 2, 2);
    }
    ctx.restore();
  }

  function drawPlayerFrame(shirtColor, dir, pose, frame, weaponId) {
    var m = makeCanvas(PLAYER_W, PLAYER_H);
    var ctx = m.ctx;
    var mirror = dir === 'left';
    var d = mirror ? 'right' : dir;
    if (mirror) { ctx.translate(PLAYER_W, 0); ctx.scale(-1, 1); }

    var bob = 0, legA = 0, legB = 0;
    if (pose === 'walk') {
      var seq = [2, 0, -2, 0];
      legA = seq[frame % 4]; legB = -legA;
      bob = frame % 2 === 0 ? 1 : 0;
    }

    // Pernas
    px(ctx, PAL.black, 5, 17 + Math.max(0, legA / 2), 2, 4 - Math.max(0, legA / 2));
    px(ctx, PAL.black, 9, 17 + Math.max(0, legB / 2), 2, 4 - Math.max(0, legB / 2));
    // Corpo
    px(ctx, shirtColor, 4, 10 + bob, 8, 8);
    // Braços (quando não atacando; o ataque desenha o braço com a arma)
    if (pose !== 'attack') {
      px(ctx, shirtColor, 3, 11 + bob, 1, 5);
      px(ctx, shirtColor, 12, 11 + bob, 1, 5);
    }
    // Cabeça
    px(ctx, PAL.skin, 4, 2 + bob, 8, 8);
    // Cabelo
    px(ctx, shirtColor === PAL.pink ? PAL.trunk : PAL.trunkDark, 4, 2 + bob, 8, 3);
    if (shirtColor === PAL.pink) { // cabelo comprido da menina
      px(ctx, PAL.trunk, 3, 3 + bob, 1, 6);
      px(ctx, PAL.trunk, 12, 3 + bob, 1, 6);
    }
    // Rosto por direção
    if (d === 'down') {
      px(ctx, PAL.black, 6, 6 + bob); px(ctx, PAL.black, 9, 6 + bob);
    } else if (d === 'right') {
      px(ctx, PAL.black, 9, 6 + bob); px(ctx, PAL.black, 11, 6 + bob);
    } // up: sem rosto (nuca)

    if (pose === 'attack') drawWeaponInHand(ctx, weaponId, frame, d);
    return m.canvas;
  }

  // Armas com pose de ataque: as de colheita (WEAPON_TYPES: machado/picareta)
  // + a espada, que é só de combate e não entra em WEAPON_TYPES (não coleta
  // nenhuma categoria de recurso). Toda arma empunhável pelo jogador precisa
  // estar aqui, senão Player.draw quebra ao tentar ler o frame inexistente.
  var PLAYER_ATTACK_WEAPON_IDS = ['axe', 'pickaxe', 'sword'];

  function createPlayerSet(shirtColor) {
    var dirs = ['down', 'up', 'left', 'right'];
    var set = {};
    for (var i = 0; i < dirs.length; i++) {
      var dir = dirs[i];
      var frames = { idle: [], walk: [], attack: {} };
      frames.idle.push(drawPlayerFrame(shirtColor, dir, 'idle', 0, null));
      for (var f = 0; f < 4; f++) frames.walk.push(drawPlayerFrame(shirtColor, dir, 'walk', f, null));
      for (var w = 0; w < PLAYER_ATTACK_WEAPON_IDS.length; w++) {
        var wId = PLAYER_ATTACK_WEAPON_IDS[w];
        frames.attack[wId] = [];
        for (var af = 0; af < 3; af++) {
          frames.attack[wId].push(drawPlayerFrame(shirtColor, dir, 'attack', af, wId));
        }
      }
      set[dir] = frames;
    }
    return set;
  }

  // ------------------------------------------------------------------
  // Objetos atingíveis. Cada entrada: { normal, destroyed, w, h,
  // anchorX, anchorY } — âncora na base (pés) do sprite.
  // Opcionalmente { stages: [c0..cN] } no lugar de `normal`: sprites de
  // dano progressivo (índice 0 = vida cheia, último = 1 de vida).
  // ------------------------------------------------------------------
  // Árvore com estágios de dano: a copa/tronco encolhem a cada hit
  // (5 HP = maior → 1 HP = muda). Frame 24x32 ancorado na base.
  function drawTreeStage(ctx, cw, ch, th) {
    var cx = 12, baseY = 32;
    var tw = th >= 8 ? 4 : (th >= 5 ? 3 : 2);       // tronco encolhe junto
    var tx = cx - Math.floor(tw / 2);
    px(ctx, PAL.trunkDark, tx, baseY - th, tw, th);
    px(ctx, PAL.trunk, tx, baseY - th, Math.max(1, tw - 2), th);
    var cxb = cx - Math.floor(cw / 2);              // copa centrada acima do tronco
    var cyTop = baseY - th - ch + 2;
    px(ctx, PAL.leaf, cxb + 1, cyTop, cw - 2, ch);
    px(ctx, PAL.leaf, cxb, cyTop + Math.floor(ch * 0.25), cw, Math.max(1, Math.floor(ch * 0.55)));
    px(ctx, PAL.leafLight, cxb + 2, cyTop + 2, Math.max(2, Math.floor(cw * 0.3)), Math.max(2, Math.floor(ch * 0.3))); // brilho
    px(ctx, PAL.darkGreen, cxb + cw - Math.max(2, Math.floor(cw * 0.35)), cyTop + Math.floor(ch * 0.5),
       Math.max(2, Math.floor(cw * 0.3)), Math.max(2, Math.floor(ch * 0.35))); // sombra
  }

  function createTreeStages() {
    // Índice 0 = 5 HP (maior) ... índice 4 = 1 HP (menor). [copaW, copaH, tronco]
    var sizes = [[20, 18, 10], [16, 15, 9], [12, 12, 7], [9, 9, 5], [6, 6, 4]];
    var stages = [];
    for (var i = 0; i < sizes.length; i++) {
      var m = makeCanvas(24, 32);
      drawTreeStage(m.ctx, sizes[i][0], sizes[i][1], sizes[i][2]);
      stages.push(m.canvas);
    }
    var d = makeCanvas(24, 32); // árvore caída (destruída)
    px(d.ctx, PAL.trunkDark, 2, 26, 20, 5);
    px(d.ctx, PAL.trunk, 2, 26, 20, 2);
    px(d.ctx, PAL.leaf, 0, 24, 6, 8);
    return { stages: stages, destroyed: d.canvas, w: 24, h: 32, anchorX: 12, anchorY: 31 };
  }

  function createRock(baseColor, fleckColor) {
    var m = makeCanvas(20, 16);
    px(m.ctx, PAL.grayDark, 2, 4, 16, 11);
    px(m.ctx, baseColor, 3, 3, 14, 10);
    px(m.ctx, PAL.white, 5, 4, 4, 2);
    px(m.ctx, fleckColor, 7, 8, 3, 3);
    px(m.ctx, fleckColor, 12, 5, 2, 2);
    px(m.ctx, fleckColor, 11, 10, 2, 2);
    var d = makeCanvas(20, 16); // quebrada
    px(d.ctx, PAL.grayDark, 3, 11, 5, 4);
    px(d.ctx, baseColor, 9, 12, 4, 3);
    px(d.ctx, PAL.grayDark, 14, 11, 4, 4);
    return { normal: m.canvas, destroyed: d.canvas, w: 20, h: 16, anchorX: 10, anchorY: 15 };
  }

  // Rochas com estágios de dano: encolhem a cada hit. Placeholders
  // procedurais 24x20 (todos os frames do mesmo tamanho, ancorados na base).
  // Para arte real, ver REAL_ROCK_FILES + CONFIG.USE_REAL_ROCK_SPRITES.
  function rockGrass(ctx) {
    px(ctx, PAL.darkGreen, 4, 18, 16, 2);   // sombra no chão
    px(ctx, PAL.leaf, 5, 17, 14, 2);
    px(ctx, PAL.leafLight, 6, 16, 2, 1);
    px(ctx, PAL.leafLight, 16, 16, 2, 1);
  }

  function rockBoulder(ctx, bw, bh, col) {
    var cx = 12, baseY = 18;
    var x = cx - Math.floor(bw / 2);
    var y = baseY - bh;
    px(ctx, col.outline, x, y + 1, bw, bh - 1);        // contorno/base escura
    px(ctx, col.outline, x + 1, y, bw - 2, 1);
    px(ctx, col.fill, x + 1, y + 1, bw - 2, bh - 2);   // preenchimento
    var fw = Math.max(1, Math.floor(bw * 0.35));        // faceta sombreada
    var fh = Math.max(1, bh - Math.floor(bh * 0.45) - 1);
    px(ctx, col.dark, x + bw - 1 - fw, y + Math.floor(bh * 0.45), fw, fh);
    px(ctx, col.outline, cx, y + Math.floor(bh * 0.3), 1, Math.max(1, Math.floor(bh * 0.5))); // fresta
    px(ctx, col.hi, x + 1, y + 1, Math.max(1, Math.floor(bw * 0.3)), Math.max(1, Math.floor(bh * 0.22))); // brilho
  }

  // Paleta de cada rocha com estágios. Nova rocha? adicione uma entrada aqui.
  var ROCK_STAGE_COLORS = {
    bronze_rock: { fill: PAL.bronze,   dark: PAL.trunk,    outline: PAL.trunkDark, hi: PAL.skin },
    iron_rock:   { fill: PAL.gray,     dark: PAL.grayDark, outline: PAL.black,     hi: PAL.iron },
    stone_rock:  { fill: PAL.grayDark, dark: PAL.black,    outline: PAL.black,     hi: PAL.gray }
  };

  function createRockStages(col) {
    // Índice 0 = 5 HP (maior) ... índice 4 = 1 HP (menor).
    var sizes = [[20, 16], [16, 13], [13, 10], [9, 7], [6, 5]];
    var stages = [];
    for (var i = 0; i < sizes.length; i++) {
      var m = makeCanvas(24, 20);
      rockGrass(m.ctx);
      rockBoulder(m.ctx, sizes[i][0], sizes[i][1], col);
      stages.push(m.canvas);
    }
    var d = makeCanvas(24, 20); // escombros
    rockGrass(d.ctx);
    px(d.ctx, col.outline, 6, 15, 4, 3);
    px(d.ctx, col.fill, 7, 16, 2, 2);
    px(d.ctx, col.outline, 13, 16, 4, 2);
    px(d.ctx, col.fill, 14, 16, 2, 1);
    return { stages: stages, destroyed: d.canvas, w: 24, h: 20, anchorX: 12, anchorY: 19 };
  }

  // Arte real opcional (assets/). Um arquivo por estágio de dano, do maior
  // (5 HP) ao menor (1 HP). Carregada só com CONFIG.USE_REAL_ROCK_SPRITES.
  var REAL_STAGE_FILES = {
    tree: [
      'assets/Tree_grass_shadow_dark1.png', // 5 HP (maior)
      'assets/Tree_grass_shadow_dark2.png', // 4 HP
      'assets/Tree_grass_shadow_dark3.png', // 3 HP
      'assets/Tree_grass_shadow_dark4.png', // 2 HP
      'assets/Tree_grass_shadow_dark5.png'  // 1 HP (menor)
    ],
    bronze_rock: [
      'assets/Rock2_grass_shadow_dark1.png', // 5 HP (maior)
      'assets/Rock2_grass_shadow_dark2.png', // 4 HP
      'assets/Rock2_grass_shadow_dark3.png', // 3 HP
      'assets/Rock2_grass_shadow_dark4.png', // 2 HP
      'assets/Rock2_grass_shadow_dark5.png'  // 1 HP (menor)
    ],
    iron_rock: [
      'assets/Rock1_grass_shadow_dark1.png', // 5 HP (maior)
      'assets/Rock1_grass_shadow_dark2.png', // 4 HP
      'assets/Rock1_grass_shadow_dark3.png', // 3 HP
      'assets/Rock1_grass_shadow_dark4.png', // 2 HP
      'assets/Rock1_grass_shadow_dark5.png'  // 1 HP (menor)
    ],
    stone_rock: [
      'assets/Rock3_grass_shadow_dark1.png', // 5 HP (maior)
      'assets/Rock3_grass_shadow_dark2.png', // 4 HP
      'assets/Rock3_grass_shadow_dark3.png', // 3 HP
      'assets/Rock3_grass_shadow_dark4.png', // 2 HP
      'assets/Rock3_grass_shadow_dark5.png'  // 1 HP (menor)
    ]
  };

  function loadRealStageSprites() {
    for (var type in REAL_STAGE_FILES) loadStageSprites(type, REAL_STAGE_FILES[type]);
  }

  function loadStageSprites(type, files) {
    var set = api.resources[type];
    files.forEach(function (path, i) {
      var img = new Image();
      img.onload = function () {
        var m = makeCanvas(set.w, set.h);
        var scale = Math.min(1, set.w / img.width, set.h / img.height);
        var dw = Math.max(1, Math.round(img.width * scale));
        var dh = Math.max(1, Math.round(img.height * scale));
        m.ctx.drawImage(img, Math.round((set.w - dw) / 2), set.h - dh, dw, dh);
        set.stages[i] = m.canvas; // troca o placeholder pelo sprite real
      };
      img.src = path; // se o arquivo não existir, o placeholder permanece
    });
  }

  function createResources() {
    return {
      tree:        createTreeStages(),
      iron_rock:   createRockStages(ROCK_STAGE_COLORS.iron_rock),
      bronze_rock: createRockStages(ROCK_STAGE_COLORS.bronze_rock),
      stone_rock:  createRockStages(ROCK_STAGE_COLORS.stone_rock)
    };
  }

  // ------------------------------------------------------------------
  // Itens coletáveis — 8x8 px (também usados como ícones do HUD).
  // ------------------------------------------------------------------
  function createItem(drawFn) {
    var m = makeCanvas(8, 8);
    drawFn(m.ctx);
    return m.canvas;
  }

  function createItems() {
    return {
      wood: createItem(function (ctx) {
        px(ctx, PAL.trunkDark, 0, 2, 8, 4);
        px(ctx, PAL.trunk, 0, 2, 8, 2);
        px(ctx, PAL.skin, 6, 3, 2, 2);
      }),
      iron_ore: createItem(function (ctx) {
        px(ctx, PAL.grayDark, 1, 2, 6, 5);
        px(ctx, PAL.iron, 2, 3, 3, 2);
        px(ctx, PAL.white, 2, 3, 1, 1);
      }),
      bronze_ore: createItem(function (ctx) {
        px(ctx, PAL.grayDark, 1, 2, 6, 5);
        px(ctx, PAL.bronze, 2, 3, 3, 2);
        px(ctx, PAL.white, 2, 3, 1, 1);
      }),
      stone_piece: createItem(function (ctx) {
        px(ctx, PAL.grayDark, 1, 2, 6, 5);
        px(ctx, PAL.gray, 2, 3, 4, 3);
      }),
      geleia_rosa: createItem(function (ctx) {
        px(ctx, PAL.pink, 2, 2, 4, 4);
        px(ctx, '#e06ac0', 1, 3, 6, 4);
        px(ctx, '#f4a8d8', 3, 3, 2, 1);
      }),
      pluma: createItem(function (ctx) {
        px(ctx, '#dcdce4', 2, 1, 4, 5);   // contorno sutil (não sumir no fundo)
        px(ctx, PAL.white, 2, 2, 4, 3);   // corpo da pluma
        px(ctx, PAL.white, 1, 3, 1, 2);   // fiapo esquerdo
        px(ctx, PAL.white, 6, 2, 1, 2);   // fiapo direito
        px(ctx, PAL.white, 4, 0, 1, 1);   // pontinha
      })
    };
  }

  // ------------------------------------------------------------------
  // Ícones de arma — 10x10 px (indicador do HUD).
  // ------------------------------------------------------------------
  function createWeaponIcons() {
    var icons = {};
    var axe = makeCanvas(10, 10);
    px(axe.ctx, PAL.trunk, 4, 2, 2, 8);
    px(axe.ctx, PAL.gray, 2, 1, 5, 3);
    icons.axe = axe.canvas;
    var pick = makeCanvas(10, 10);
    px(pick.ctx, PAL.trunk, 4, 2, 2, 8);
    px(pick.ctx, PAL.iron, 1, 1, 8, 2);
    px(pick.ctx, PAL.iron, 1, 3, 2, 1);
    px(pick.ctx, PAL.iron, 7, 3, 2, 1);
    icons.pickaxe = pick.canvas;
    return icons;
  }

  // ------------------------------------------------------------------
  // Construções — { built, w, h, anchorX, anchorY }.
  // A área de obra (contorno tracejado) é desenhada por drawSiteMarker.
  // ------------------------------------------------------------------
  // Estação do ferreiro: fornalha (esquerda) + bigorna grande com marreta (direita).
  function createBlacksmith() {
    var m = makeCanvas(56, 44), c = m.ctx;

    // Sombra no chão
    px(c, 'rgba(26,28,44,0.35)', 4, 40, 48, 3);

    // ---- Fornalha (esquerda) ----
    px(c, PAL.black, 2, 8, 22, 34);            // contorno
    px(c, PAL.grayDark, 3, 9, 20, 32);         // pedra
    px(c, PAL.gray, 4, 11, 18, 1);             // fiadas de tijolo
    px(c, PAL.gray, 4, 18, 18, 1);
    px(c, PAL.gray, 4, 33, 18, 1);
    px(c, PAL.black, 6, 2, 10, 8);             // chaminé
    px(c, PAL.grayDark, 7, 3, 8, 6);
    px(c, PAL.black, 7, 23, 12, 15);           // boca da fornalha
    px(c, '#e05a2a', 8, 26, 10, 11);           // fogo
    px(c, PAL.bronze, 9, 29, 8, 8);
    px(c, '#f6c84c', 10, 31, 6, 5);
    px(c, PAL.white, 12, 33, 2, 2);
    px(c, '#e05a2a', 8, 21, 10, 2);            // brilho acima da boca
    px(c, PAL.bronze, 9, 0, 3, 2);             // brasa na chaminé

    // ---- Bigorna (direita), sobre um cepo de madeira ----
    px(c, PAL.trunkDark, 33, 34, 17, 9);       // cepo
    px(c, PAL.trunk, 34, 35, 15, 6);
    px(c, PAL.trunkDark, 39, 36, 1, 5);
    px(c, PAL.black, 32, 29, 19, 5);           // pé da bigorna
    px(c, PAL.grayDark, 33, 30, 17, 3);
    px(c, PAL.gray, 33, 30, 17, 1);
    px(c, PAL.black, 38, 24, 9, 6);            // cintura
    px(c, PAL.grayDark, 39, 25, 7, 5);
    px(c, PAL.black, 30, 17, 24, 8);           // mesa (topo) + contorno
    px(c, PAL.grayDark, 31, 18, 22, 6);
    px(c, PAL.gray, 31, 18, 22, 1);            // brilho do topo
    px(c, PAL.grayDark, 53, 19, 3, 3);         // chifre (à direita)
    px(c, PAL.grayDark, 55, 20, 1, 1);

    // ---- Marreta apoiada em cima da bigorna ----
    px(c, PAL.black, 31, 11, 9, 7);            // cabeça (contorno)
    px(c, PAL.grayDark, 32, 12, 7, 5);
    px(c, PAL.gray, 32, 12, 7, 1);
    px(c, PAL.iron, 32, 12, 2, 4);
    px(c, PAL.trunkDark, 39, 11, 2, 3);        // cabo (diagonal p/ cima-direita)
    px(c, PAL.trunk, 40, 8, 2, 3);
    px(c, PAL.trunk, 41, 5, 2, 3);

    return { built: m.canvas, w: 56, h: 44, anchorX: 28, anchorY: 43 };
  }

  function drawSiteMarker(ctx, x, y, w, h, time) {
    // Contorno tracejado animado da área de construção.
    ctx.save();
    ctx.strokeStyle = PAL.white;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.lineDashOffset = -Math.floor(time * 8) % 6;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
  }

  // ------------------------------------------------------------------
  // Ícones de equipamento forjável — 12x12 px (forja, slots, boneco).
  // ------------------------------------------------------------------
  function createForgeIcons() {
    var icons = {};
    var s = makeCanvas(12, 12); // espada
    px(s.ctx, PAL.grayDark, 5, 0, 3, 8);
    px(s.ctx, PAL.iron, 6, 1, 1, 7);
    px(s.ctx, PAL.white, 6, 1, 1, 3);
    px(s.ctx, PAL.trunkDark, 3, 8, 7, 1);   // guarda
    px(s.ctx, PAL.trunk, 6, 9, 1, 3);       // cabo
    icons.sword = s.canvas;
    var b = makeCanvas(12, 12); // bota
    px(b.ctx, PAL.trunkDark, 3, 2, 4, 8);
    px(b.ctx, PAL.trunk, 4, 3, 3, 6);
    px(b.ctx, PAL.trunkDark, 3, 8, 8, 3);   // pé
    px(b.ctx, PAL.trunk, 4, 9, 7, 1);
    px(b.ctx, PAL.skin, 4, 3, 2, 1);        // brilho
    icons.boot = b.canvas;
    var c = makeCanvas(12, 12); // peito (peitoral)
    px(c.ctx, PAL.grayDark, 2, 2, 8, 2);
    px(c.ctx, PAL.gray, 3, 3, 6, 7);
    px(c.ctx, PAL.iron, 4, 4, 4, 5);
    px(c.ctx, PAL.white, 4, 4, 1, 2);
    px(c.ctx, PAL.grayDark, 3, 3, 1, 7); px(c.ctx, PAL.grayDark, 8, 3, 1, 7);
    icons.chest = c.canvas;
    var g = makeCanvas(12, 12); // anel
    px(g.ctx, PAL.bronze, 4, 4, 4, 1);
    px(g.ctx, PAL.bronze, 3, 5, 1, 4); px(g.ctx, PAL.bronze, 8, 5, 1, 4);
    px(g.ctx, PAL.bronze, 4, 9, 4, 1);
    px(g.ctx, '#6ac0e8', 5, 2, 2, 2);       // gema
    px(g.ctx, PAL.white, 5, 2, 1, 1);
    icons.ring = g.canvas;
    var ba = makeCanvas(12, 12); // machado de bronze
    px(ba.ctx, PAL.trunkDark, 5, 3, 2, 9);   // cabo
    px(ba.ctx, PAL.trunk, 5, 3, 1, 9);
    px(ba.ctx, PAL.grayDark, 2, 0, 7, 5);    // lâmina (contorno)
    px(ba.ctx, PAL.bronze, 3, 1, 5, 3);
    px(ba.ctx, '#f6c84c', 3, 1, 2, 1);       // brilho
    icons.bronze_axe = ba.canvas;
    var bp = makeCanvas(12, 12); // picareta de bronze
    px(bp.ctx, PAL.trunkDark, 5, 3, 2, 9);   // cabo
    px(bp.ctx, PAL.trunk, 5, 3, 1, 9);
    px(bp.ctx, PAL.grayDark, 0, 1, 12, 3);   // cabeça (contorno)
    px(bp.ctx, PAL.bronze, 1, 2, 4, 1);
    px(bp.ctx, PAL.bronze, 7, 2, 4, 1);
    px(bp.ctx, '#f6c84c', 1, 2, 2, 1);       // brilho nas duas pontas
    px(bp.ctx, '#f6c84c', 9, 2, 2, 1);
    icons.bronze_pickaxe = bp.canvas;
    return icons;
  }

  // ------------------------------------------------------------------
  // Primitivas de UI em pixel art (painel e slot). Reusadas por hud.js
  // e forge.js para manter a estética consistente e sem antialias.
  // ------------------------------------------------------------------
  function drawPanel(ctx, x, y, w, h) {
    ctx.fillStyle = PAL.black;                       // sombra externa
    ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = '#241f2e';                       // fundo escuro
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PAL.trunkDark;                   // moldura externa (madeira)
    ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillRect(x, y, 3, h); ctx.fillRect(x + w - 3, y, 3, h);
    ctx.fillStyle = PAL.trunk;                        // realce interno da moldura
    ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2);
    ctx.fillStyle = PAL.grayDark;                     // filete de metal interno
    strokeRectPx(ctx, x + 4, y + 4, w - 8, h - 8, PAL.grayDark);
    // cantos ornamentados
    var c = PAL.bronze;
    px(ctx, c, x + 4, y + 4, 2, 2); px(ctx, c, x + w - 6, y + 4, 2, 2);
    px(ctx, c, x + 4, y + h - 6, 2, 2); px(ctx, c, x + w - 6, y + h - 6, 2, 2);
  }

  function strokeRectPx(ctx, x, y, w, h, color) {
    px(ctx, color, x, y, w, 1); px(ctx, color, x, y + h - 1, w, 1);
    px(ctx, color, x, y, 1, h); px(ctx, color, x + w - 1, y, 1, h);
  }

  function drawSlot(ctx, x, y, size, filled) {
    px(ctx, PAL.black, x, y, size, size);
    px(ctx, filled ? '#3a3450' : '#2a2536', x + 1, y + 1, size - 2, size - 2);
    strokeRectPx(ctx, x, y, size, size, PAL.grayDark);
    px(ctx, PAL.trunkDark, x + 1, y + 1, size - 2, 1); // entalhe superior
  }

  // Célula de inventário estilo tabuleiro de madeira: fundo marrom-avermelhado.
  function drawInvCell(ctx, x, y, s) {
    px(ctx, '#3a1f1f', x, y, s, s);              // contorno escuro
    px(ctx, '#5e3131', x + 1, y + 1, s - 2, s - 2); // maroon principal
    px(ctx, '#6b3838', x + 1, y + 1, s - 2, 1);  // realce superior
    px(ctx, '#4a2727', x + 1, y + s - 2, s - 2, 1); // sombra inferior
  }

  // Painel de inventário: uma única moldura de madeira (marrom claro), com
  // faixa de cabeçalho (título) e rodapé (gold) dentro da própria madeira.
  // Devolve os retângulos das células e das faixas para o HUD escrever.
  // headerH/footerH em px (0 = sem faixa). Nova coluna/linha = só mudar args.
  function drawInventoryGrid(ctx, x, y, cols, rows, cell, gap, frame, headerH, footerH) {
    headerH = headerH || 0; footerH = footerH || 0;
    var innerW = cols * cell + (cols + 1) * gap;
    var gridH = rows * cell + (rows + 1) * gap;
    var innerH = headerH + gridH + footerH;
    var w = innerW + frame * 2, h = innerH + frame * 2;

    px(ctx, '#2e1c12', x + 3, y + 4, w, h);      // sombra projetada
    px(ctx, '#b5713f', x, y, w, h);              // corpo da moldura (caramelo)
    strokeRectPx(ctx, x, y, w, h, '#4a2a16');    // contorno externo
    px(ctx, '#d69a5c', x + 1, y + 1, w - 2, 1);  // realce topo
    px(ctx, '#d69a5c', x + 1, y + 1, 1, h - 2);  // realce esquerda
    px(ctx, '#8a5228', x + 1, y + h - 2, w - 2, 1); // sombra base
    px(ctx, '#8a5228', x + w - 2, y + 1, 1, h - 2); // sombra direita

    var ix = x + frame, iy = y + frame;
    px(ctx, '#8a5228', ix, iy, innerW, innerH);  // madeira interna
    strokeRectPx(ctx, ix, iy, innerW, innerH, '#5c3520');
    var gridTop = iy + headerH;
    // linhas separando cabeçalho/rodapé da grade
    if (headerH) px(ctx, '#5c3520', ix, gridTop - 1, innerW, 1);
    if (footerH) px(ctx, '#5c3520', ix, gridTop + gridH, innerW, 1);

    var cells = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cx = ix + gap + c * (cell + gap);
        var cy = gridTop + gap + r * (cell + gap);
        drawInvCell(ctx, cx, cy, cell);
        cells.push({ x: cx, y: cy, size: cell });
      }
    }
    for (var rr = 0; rr <= rows; rr++) {
      for (var cc = 0; cc <= cols; cc++) {
        px(ctx, '#e0a85a', ix + cc * (cell + gap) + Math.floor(gap / 2),
           gridTop + rr * (cell + gap) + Math.floor(gap / 2), 1, 1);
      }
    }
    return {
      cells: cells, x: x, y: y, w: w, h: h,
      header: { x: ix, y: iy, w: innerW, h: headerH },
      footer: { x: ix, y: gridTop + gridH, w: innerW, h: footerH }
    };
  }

  // ------------------------------------------------------------------
  // Inimigos — 16x16 px, âncora no centro (8,8). Animação: 2 frames de
  // movimento oscilante (bob 0/1). Nova espécie = uma função draw* aqui +
  // uma entrada no mapa de createEnemySprites (mesmo tamanho/âncora).
  // ------------------------------------------------------------------
  function drawPoringFrame(ctx, bob) {
    // Corpo principal (blob)
    px(ctx, PAL.pink, 4, 5 + bob, 8, 6);
    px(ctx, '#e06ac0', 3, 6 + bob, 10, 4);
    px(ctx, '#d6589c', 4, 4 + bob, 1, 1);
    px(ctx, '#d6589c', 11, 4 + bob, 1, 1);

    // Brilho (destaque)
    px(ctx, '#f4a8d8', 6, 5 + bob, 2, 1);

    // Olhinhos
    px(ctx, PAL.black, 5, 8 + bob, 1, 1);
    px(ctx, PAL.black, 10, 8 + bob, 1, 1);
  }

  // Coelho Branco — estilo Lunatic (Ragnarok): corpo branco arredondado
  // (mesma silhueta/posição do Poring) + orelhas compridas + laço azul.
  function drawRabbitFrame(ctx, bob) {
    // Corpo (branco, redondo — mesma base do Poring pra manter o hurtbox certo)
    px(ctx, PAL.white, 4, 5 + bob, 8, 6);
    px(ctx, '#dcdce4', 3, 6 + bob, 10, 4);   // sombra sutil
    px(ctx, PAL.white, 4, 6 + bob, 8, 3);

    // Orelhas compridas saindo do topo da cabeça
    px(ctx, PAL.white, 4, 0 + bob, 2, 5);
    px(ctx, '#ffc9dd', 4, 1 + bob, 1, 3);    // interior rosado
    px(ctx, PAL.white, 10, 0 + bob, 2, 5);
    px(ctx, '#ffc9dd', 11, 1 + bob, 1, 3);

    // Laço azul entre as orelhas (referência ao Lunatic)
    px(ctx, PAL.blue, 7, 3 + bob, 2, 2);

    // Olhinhos
    px(ctx, PAL.black, 5, 8 + bob, 1, 1);
    px(ctx, PAL.black, 10, 8 + bob, 1, 1);

    // Nariz rosado
    px(ctx, '#e86ac0', 7, 10 + bob, 2, 1);
  }

  function createEnemyIdleFrames(drawFn) {
    var idle = [];
    for (var i = 0; i < 2; i++) {
      var m = makeCanvas(16, 16);
      drawFn(m.ctx, i === 0 ? 0 : 1);
      idle.push(m.canvas);
    }
    return { idle: idle, w: 16, h: 16, anchorX: 8, anchorY: 8 };
  }

  function createEnemySprites() {
    return {
      poring: createEnemyIdleFrames(drawPoringFrame),
      coelho_branco: createEnemyIdleFrames(drawRabbitFrame)
    };
  }

  // ------------------------------------------------------------------
  // Partículas simples: cor por categoria de recurso.
  // ------------------------------------------------------------------
  var PARTICLE_COLORS = {
    tree: [PAL.leaf, PAL.leafLight, PAL.trunk],
    rock: [PAL.gray, PAL.grayDark, PAL.white],
    island: [PAL.leaf, PAL.leafLight, PAL.white, '#6ac0e8'] // água clareando + grama surgindo
  };

  var api = {
    palette: PAL,
    drawText: drawText,
    textWidth: textWidth,
    drawSiteMarker: drawSiteMarker,
    drawPanel: drawPanel,
    drawSlot: drawSlot,
    drawInventoryGrid: drawInventoryGrid,
    strokeRect: strokeRectPx,
    particleColors: PARTICLE_COLORS,
    playerSize: { w: PLAYER_W, h: PLAYER_H },
    ground: null, groundExtension: null, players: null, resources: null,
    items: null, weaponIcons: null, forgeIcons: null, buildings: null, enemies: null,
    init: function () {
      api.ground = createGround();
      api.groundExtension = createGroundExtension();
      api.players = { boy: createPlayerSet(PAL.blue), girl: createPlayerSet(PAL.pink) };
      api.resources = createResources();
      api.items = createItems();
      api.weaponIcons = createWeaponIcons();
      api.forgeIcons = createForgeIcons();
      api.buildings = { blacksmith: createBlacksmith() };
      api.enemies = createEnemySprites();
      if (CONFIG.USE_REAL_ROCK_SPRITES) loadRealStageSprites();
    }
  };
  return api;
})();
