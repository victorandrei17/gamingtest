// fx.js — camada de "juice" e atmosfera do jogo, 100% Canvas 2D. Não altera
// nenhuma regra de gameplay: só melhora a apresentação (água animada, sombras
// suaves, pólen flutuante, vento balançando vegetação, screen shake, vinheta
// e brilho de coletáveis). Singleton global no mesmo estilo de HUD/ASSETS,
// carregado antes de main.js. Tudo aqui é decorativo e tolerante a ausência
// (os hooks nos outros sistemas checam `typeof FX`).
'use strict';

var FX = (function () {
  var clock = 0;          // relógio próprio (s) — independente do `time` de main
  var trauma = 0;         // 0..1, decai; a intensidade do shake é trauma²
  var seed = 0;
  var pollen = [];        // partículas ambientes flutuando sobre a grama
  var grassDetail = [];   // tufos/flores espalhados na grama (posições fixas)
  var puffs = [];         // poeirinha dos passos do jogador
  var atmosphere = null;  // canvas pré-renderizado: vinheta + brilho quente

  var PAL = null;

  // RNG determinístico pra decoração estável entre sessões.
  function rng() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  // Offset de vento compartilhado por árvores e grama — tudo balança junto.
  function wind(x, y) {
    return Math.sin(clock * 1.6 + x * 0.035 + y * 0.02) * 1.4
         + Math.sin(clock * 0.7 + x * 0.08) * 0.6;
  }

  function init() {
    PAL = ASSETS.palette;
    seed = 1337;
    buildGrassDetail();
    buildPollen();
    buildAtmosphere();
  }

  // -------------------------------------------------------------------------
  // Decoração de grama: tufos e florzinhas espalhados pela metade "terra" do
  // mapa (x < ORIGINAL_MAP_WIDTH). Posições sorteadas uma vez; o topo do tufo
  // balança com o vento no draw. Evita a faixa do HUD (y < 20).
  // -------------------------------------------------------------------------
  function buildGrassDetail() {
    grassDetail.length = 0;
    var land = CONFIG.ORIGINAL_MAP_WIDTH;
    var flowerCols = ['#f4d35e', '#e86ac0', '#f4f4f4', '#f28b3c'];
    for (var i = 0; i < 70; i++) {
      var x = 6 + rng() * (land - 12);
      var y = 22 + rng() * (CONFIG.GAME_HEIGHT - 34);
      var isFlower = rng() < 0.28;
      grassDetail.push({
        x: x, y: y, flower: isFlower,
        h: isFlower ? 4 : (2 + Math.floor(rng() * 3)),
        col: isFlower ? flowerCols[Math.floor(rng() * flowerCols.length)] : null,
        phase: rng() * Math.PI * 2,
        shade: rng() < 0.5
      });
    }
    // ordena por y pra decoração "de baixo" não cobrir a "de cima" feio
    grassDetail.sort(function (a, b) { return a.y - b.y; });
  }

  function buildPollen() {
    pollen.length = 0;
    var land = CONFIG.ORIGINAL_MAP_WIDTH;
    for (var i = 0; i < 26; i++) {
      pollen.push({
        x: rng() * land,
        y: 16 + rng() * (CONFIG.GAME_HEIGHT - 24),
        vx: (rng() - 0.5) * 6,
        vy: -2 - rng() * 5,
        phase: rng() * Math.PI * 2,
        size: rng() < 0.3 ? 2 : 1,
        warm: rng() < 0.5
      });
    }
  }

  // Vinheta + leve brilho quente no topo, pré-renderizado num canvas do
  // tamanho da tela interna (barato de blitar todo frame).
  function buildAtmosphere() {
    var c = document.createElement('canvas');
    c.width = CONFIG.GAME_WIDTH; c.height = CONFIG.GAME_HEIGHT;
    var g = c.getContext('2d');
    // brilho quente difuso (sol) vindo do canto superior
    var warm = g.createRadialGradient(
      CONFIG.GAME_WIDTH * 0.32, -40, 20,
      CONFIG.GAME_WIDTH * 0.32, -40, CONFIG.GAME_HEIGHT * 1.5);
    warm.addColorStop(0, 'rgba(255,236,180,0.18)');
    warm.addColorStop(0.5, 'rgba(255,220,150,0.05)');
    warm.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = warm;
    g.fillRect(0, 0, c.width, c.height);
    // vinheta escura nas bordas
    var vg = g.createRadialGradient(
      CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2, CONFIG.GAME_HEIGHT * 0.35,
      CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2, CONFIG.GAME_HEIGHT * 0.85);
    vg.addColorStop(0, 'rgba(12,10,26,0)');
    vg.addColorStop(1, 'rgba(12,10,26,0.42)');
    g.fillStyle = vg;
    g.fillRect(0, 0, c.width, c.height);
    atmosphere = c;
  }

  // -------------------------------------------------------------------------
  // Atualização por frame
  // -------------------------------------------------------------------------
  function update(dt) {
    clock += dt;
    if (trauma > 0) trauma = Math.max(0, trauma - dt * 1.6);
    for (var d = puffs.length - 1; d >= 0; d--) {
      puffs[d].t += dt;
      if (puffs[d].t >= puffs[d].life) puffs.splice(d, 1);
    }
    var land = CONFIG.ORIGINAL_MAP_WIDTH;
    for (var i = 0; i < pollen.length; i++) {
      var p = pollen[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.phase += dt * 2;
      // reciclagem: sobe e sai → renasce embaixo, em x aleatório
      if (p.y < -4 || p.x < -4 || p.x > land + 4) {
        p.x = rng() * land;
        p.y = CONFIG.GAME_HEIGHT + 2;
        p.vx = (rng() - 0.5) * 6;
        p.vy = -2 - rng() * 5;
      }
    }
  }

  // Tremor de tela: `amount` acumula trauma (clampado). Chamado nos impactos.
  function addShake(amount) { trauma = Math.min(1, trauma + amount); }

  // Offset atual do shake (aplicado só ao mundo, não ao HUD). Usa trauma² pra
  // um decaimento com "peso", com direção pseudo-aleatória por frame.
  function shakeOffset() {
    if (trauma <= 0) return { x: 0, y: 0 };
    var mag = trauma * trauma * 4.5;
    return {
      x: (Math.sin(clock * 53.1) + Math.sin(clock * 97.7)) * 0.5 * mag,
      y: (Math.sin(clock * 61.3) + Math.sin(clock * 89.1)) * 0.5 * mag
    };
  }

  // -------------------------------------------------------------------------
  // Água animada — desenhada fresca todo frame sobre a faixa a leste
  // (ORIGINAL_MAP_WIDTH..GAME_WIDTH). Gradiente de profundidade + cáusticas
  // rolando + brilhos cintilantes + espuma ondulando na praia oeste (e ao
  // redor da ilha, quando construída).
  // -------------------------------------------------------------------------
  function drawWater(ctx, world) {
    var WX = CONFIG.ORIGINAL_MAP_WIDTH;
    var WW = CONFIG.GAME_WIDTH - WX;
    var WH = CONFIG.GAME_HEIGHT;

    ctx.save();
    ctx.beginPath();
    ctx.rect(WX, 0, WW, WH);
    ctx.clip();

    // profundidade (topo mais claro, fundo mais escuro)
    var grad = ctx.createLinearGradient(0, 0, 0, WH);
    grad.addColorStop(0, '#3f93cf');
    grad.addColorStop(0.55, '#2f7bb8');
    grad.addColorStop(1, '#215784');
    ctx.fillStyle = grad;
    ctx.fillRect(WX, 0, WW, WH);

    // cáusticas: 4 faixas onduladas de luz rolando pra cima e reciclando
    ctx.globalCompositeOperation = 'lighter';
    for (var b = 0; b < 4; b++) {
      var period = WH + 60;
      var baseY = ((clock * (10 + b * 4) + b * 70) % period);
      baseY = WH + 30 - baseY; // rola de baixo pra cima
      ctx.beginPath();
      for (var x = WX; x <= CONFIG.GAME_WIDTH; x += 4) {
        var wy = baseY + Math.sin(x * 0.09 + clock * 1.3 + b) * 5
                       + Math.sin(x * 0.21 + clock * 0.8) * 2;
        if (x === WX) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(150,205,240,0.10)';
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // cintilância: pontos especulares que piscam em posições fixas
    for (var s = 0; s < 22; s++) {
      var sx = WX + 6 + ((s * 53) % (WW - 12));
      var sy = 10 + ((s * 89) % (WH - 20));
      var tw = Math.sin(clock * 3 + s * 1.7);
      if (tw > 0.55) {
        ctx.fillStyle = 'rgba(240,250,255,' + ((tw - 0.55) * 1.4).toFixed(3) + ')';
        var sz = tw > 0.85 ? 2 : 1;
        ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
      }
    }

    // espuma na praia oeste (fronteira grama/água em x = WX)
    drawFoamLine(ctx, WX, 0, WX, WH, true);

    // espuma ao redor da ilha revelada (ondas lambendo a nova terra)
    if (world && world.islandBuilding && world.islandBuilding.state === 'built') {
      var ib = world.islandBuilding, idef = ib.def;
      var ix = ib.x - idef.width / 2, iy = ib.y - idef.height / 2;
      ctx.strokeStyle = 'rgba(230,245,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      var pad = 1 + Math.sin(clock * 2) * 0.6;
      ctx.rect(ix - pad, iy - pad, idef.width + pad * 2, idef.height + pad * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Linha de espuma ondulante vertical (praia). vertical=true: onda em x.
  function drawFoamLine(ctx, x1, y1, x2, y2, vertical) {
    ctx.strokeStyle = 'rgba(235,248,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (vertical) {
      for (var y = y1; y <= y2; y += 3) {
        var xx = x1 + Math.sin(y * 0.18 + clock * 2.4) * 1.6 + Math.sin(y * 0.4 - clock * 1.5) * 0.8;
        if (y === y1) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
      }
    }
    ctx.stroke();
    // segunda linha mais tênue, defasada
    ctx.strokeStyle = 'rgba(200,232,255,0.25)';
    ctx.beginPath();
    for (var y2b = y1; y2b <= y2; y2b += 3) {
      var xx2 = x1 + 2 + Math.sin(y2b * 0.15 - clock * 2) * 1.4;
      if (y2b === y1) ctx.moveTo(xx2, y2b); else ctx.lineTo(xx2, y2b);
    }
    ctx.stroke();
  }

  // -------------------------------------------------------------------------
  // Decoração de grama (tufos + flores) com leve sway de vento.
  // -------------------------------------------------------------------------
  function drawGrassDetail(ctx) {
    for (var i = 0; i < grassDetail.length; i++) {
      var d = grassDetail[i];
      var sway = wind(d.x, d.y) * 0.5 + Math.sin(clock * 2 + d.phase) * 0.4;
      var bx = Math.round(d.x), by = Math.round(d.y);
      if (d.flower) {
        // caule + pétala
        ctx.fillStyle = '#3a6b3a';
        ctx.fillRect(bx, by - 2, 1, 3);
        ctx.fillStyle = d.col;
        ctx.fillRect(Math.round(d.x + sway), by - 4, 2, 2);
        ctx.fillStyle = '#fff6c0';
        ctx.fillRect(Math.round(d.x + sway), by - 4, 1, 1);
      } else {
        var col = d.shade ? '#4f8a44' : '#68b04c';
        for (var l = 0; l < 3; l++) {
          var lx = bx - 1 + l;
          var topSway = (l - 1) * 1 + sway;
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(lx + topSway * 0.6), by - d.h, 1, d.h);
        }
      }
    }
  }

  // Poeirinha de passo: baforada clara que expande e some no chão.
  function puff(x, y) {
    puffs.push({ x: x + (Math.random() - 0.5) * 3, y: y, t: 0, life: 0.4 });
  }

  function drawPuffs(ctx) {
    for (var i = 0; i < puffs.length; i++) {
      var d = puffs[i];
      var k = d.t / d.life;
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.fillStyle = '#d8e6c8';
      var r = 1 + k * 3;
      ctx.fillRect(Math.round(d.x - r), Math.round(d.y - r * 0.5), Math.round(r * 2), Math.round(r));
      ctx.globalAlpha = 1;
    }
  }

  function drawPollen(ctx) {
    for (var i = 0; i < pollen.length; i++) {
      var p = pollen[i];
      var a = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(p.phase));
      var wob = Math.sin(p.phase) * 1.5;
      ctx.fillStyle = (p.warm ? 'rgba(255,244,190,' : 'rgba(224,255,236,') + a.toFixed(3) + ')';
      ctx.fillRect(Math.round(p.x + wob), Math.round(p.y), p.size, p.size);
    }
  }

  // -------------------------------------------------------------------------
  // Sombra elíptica suave sob uma entidade (chão nos "pés").
  // -------------------------------------------------------------------------
  function shadow(ctx, cx, cy, rw, rh, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, rh / rw);
    ctx.beginPath();
    ctx.arc(0, 0, rw, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,14,30,' + (alpha == null ? 0.28 : alpha) + ')';
    ctx.fill();
    ctx.restore();
  }

  // Brilho radial suave (usado atrás de coletáveis pra chamarem atenção).
  function glow(ctx, cx, cy, radius, color) {
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  function drawVignette(ctx) {
    if (atmosphere) ctx.drawImage(atmosphere, 0, 0);
  }

  return {
    init: init,
    update: update,
    wind: wind,
    addShake: addShake,
    shakeOffset: shakeOffset,
    puff: puff,
    drawPuffs: drawPuffs,
    drawWater: drawWater,
    drawGrassDetail: drawGrassDetail,
    drawPollen: drawPollen,
    shadow: shadow,
    glow: glow,
    drawVignette: drawVignette,
    clock: function () { return clock; }
  };
})();
