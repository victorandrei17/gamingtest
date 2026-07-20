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
    ')': ['010','001','001','001','010'], ' ': ['000','000','000','000','000']
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
  // ------------------------------------------------------------------
  function createGround() {
    var t = CONFIG.TILE_SIZE;
    var g = makeCanvas(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    for (var ty = 0; ty < CONFIG.GAME_HEIGHT / t; ty++) {
      for (var tx = 0; tx < CONFIG.GAME_WIDTH / t; tx++) {
        px(g.ctx, (tx + ty) % 2 === 0 ? PAL.green : PAL.green2, tx * t, ty * t, t, t);
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

  function createPlayerSet(shirtColor) {
    var dirs = ['down', 'up', 'left', 'right'];
    var set = {};
    for (var i = 0; i < dirs.length; i++) {
      var dir = dirs[i];
      var frames = { idle: [], walk: [], attack: {} };
      frames.idle.push(drawPlayerFrame(shirtColor, dir, 'idle', 0, null));
      for (var f = 0; f < 4; f++) frames.walk.push(drawPlayerFrame(shirtColor, dir, 'walk', f, null));
      for (var wId in WEAPON_TYPES) {
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
  function createBlacksmith() {
    var m = makeCanvas(48, 40);
    px(m.ctx, PAL.grayDark, 4, 14, 40, 25);   // parede
    px(m.ctx, PAL.gray, 6, 16, 36, 21);
    px(m.ctx, PAL.trunkDark, 0, 4, 48, 12);   // telhado
    px(m.ctx, PAL.trunk, 2, 6, 44, 8);
    px(m.ctx, PAL.black, 20, 26, 8, 13);      // porta
    px(m.ctx, PAL.blue, 9, 20, 6, 6);         // janela
    px(m.ctx, PAL.blue, 33, 20, 6, 6);
    px(m.ctx, PAL.black, 36, 0, 5, 8);        // chaminé
    return { built: m.canvas, w: 48, h: 40, anchorX: 24, anchorY: 39 };
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
  // Partículas simples: cor por categoria de recurso.
  // ------------------------------------------------------------------
  var PARTICLE_COLORS = {
    tree: [PAL.leaf, PAL.leafLight, PAL.trunk],
    rock: [PAL.gray, PAL.grayDark, PAL.white]
  };

  var api = {
    palette: PAL,
    drawText: drawText,
    textWidth: textWidth,
    drawSiteMarker: drawSiteMarker,
    particleColors: PARTICLE_COLORS,
    playerSize: { w: PLAYER_W, h: PLAYER_H },
    ground: null, players: null, resources: null,
    items: null, weaponIcons: null, buildings: null,
    init: function () {
      api.ground = createGround();
      api.players = { boy: createPlayerSet(PAL.blue), girl: createPlayerSet(PAL.pink) };
      api.resources = createResources();
      api.items = createItems();
      api.weaponIcons = createWeaponIcons();
      api.buildings = { blacksmith: createBlacksmith() };
      if (CONFIG.USE_REAL_ROCK_SPRITES) loadRealStageSprites();
    }
  };
  return api;
})();
