// hud.js — inventário, arma ativa, mensagens e overlays de debug.
// Tudo desenhado no canvas interno (mesma escala de pixel art).
'use strict';

var HUD = (function () {
  var pulse = {}; // itemId -> tempo restante do pulso

  function notifyPulse(itemId) {
    pulse[itemId] = CONFIG.HUD_PULSE_TIME;
  }

  function update(dt) {
    for (var k in pulse) {
      if (pulse[k] > 0) pulse[k] -= dt;
    }
  }

  function draw(ctx, world) {
    // ---- Inventário (canto superior esquerdo) ----
    var x = 4, y = 4;
    for (var i = 0; i < INVENTORY_ORDER.length; i++) {
      var item = INVENTORY_ORDER[i];
      var count = world.inventory[item] || 0;
      var p = pulse[item] > 0 ? pulse[item] / CONFIG.HUD_PULSE_TIME : 0;
      var slotW = 26;
      ctx.fillStyle = 'rgba(26,28,44,0.7)';
      ctx.fillRect(x, y, slotW, 12);
      ctx.drawImage(ASSETS.items[item], x + 2, y + 2);
      var scale = p > 0.5 ? 2 : 1; // contador "pulsa" ao coletar
      ASSETS.drawText(ctx, String(count), x + 12, y + (scale === 2 ? 1 : 3),
        p > 0 ? ASSETS.palette.white : ASSETS.palette.iron, scale);
      x += slotW + 2;
    }

    // ---- Arma ativa (abaixo do inventário) ----
    ctx.fillStyle = 'rgba(26,28,44,0.7)';
    ctx.fillRect(4, 18, 52, 14);
    if (world.player.weapon) {
      ctx.drawImage(ASSETS.weaponIcons[world.player.weapon], 6, 20);
      ASSETS.drawText(ctx, WEAPON_TYPES[world.player.weapon].name, 18, 24, ASSETS.palette.white, 1);
    } else {
      ASSETS.drawText(ctx, '-', 8, 24, ASSETS.palette.grayDark, 1);
    }

    // ---- Mensagem central (ex.: FERREIRO DESBLOQUEADO) ----
    if (world.message && world.messageTime > 0) {
      var alpha = Math.min(1, world.messageTime / 0.5); // fade no fim
      ctx.save();
      ctx.globalAlpha = alpha;
      var s = 2;
      var tw = ASSETS.textWidth(world.message, s);
      var mx = Math.round((CONFIG.GAME_WIDTH - tw) / 2);
      var my = Math.round(CONFIG.GAME_HEIGHT / 2 - 20);
      ctx.fillStyle = 'rgba(26,28,44,0.85)';
      ctx.fillRect(mx - 6, my - 5, tw + 12, 20);
      ASSETS.drawText(ctx, world.message, mx + 1, my + 1, ASSETS.palette.black, s);
      ASSETS.drawText(ctx, world.message, mx, my, ASSETS.palette.bronze, s);
      ctx.restore();
    }
  }

  // ---- Overlays de desenvolvimento (CONFIG.DEBUG) ----
  function drawDebug(ctx, world) {
    var t = CONFIG.TILE_SIZE;
    var cols = CONFIG.GAME_WIDTH / t, rows = CONFIG.GAME_HEIGHT / t;

    // Numeração de colunas/linhas nas bordas
    for (var c = 0; c < cols; c++) {
      ASSETS.drawText(ctx, String(c), c * t + 2, 1, 'rgba(244,244,244,0.5)', 1);
    }
    for (var r = 1; r < rows; r++) {
      ASSETS.drawText(ctx, String(r), 1, r * t + 2, 'rgba(244,244,244,0.5)', 1);
    }

    // Hitboxes sólidas
    ctx.strokeStyle = 'rgba(232,106,192,0.9)';
    ctx.lineWidth = 1;
    for (var i = 0; i < world.solids.length; i++) {
      var s = world.solids[i];
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    }
    var hb = world.player.hitbox();
    ctx.strokeStyle = 'rgba(59,125,216,1)';
    ctx.strokeRect(hb.x + 0.5, hb.y + 0.5, hb.w - 1, hb.h - 1);

    // Caixa de alcance do golpe (à frente do jogador)
    var fb = world.player.frontBox();
    ctx.strokeStyle = 'rgba(232,160,60,0.9)';
    ctx.strokeRect(fb.x + 0.5, fb.y + 0.5, fb.w - 1, fb.h - 1);

    // Raio de coleta
    ctx.strokeStyle = 'rgba(126,200,80,0.6)';
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y - 8, CONFIG.COLLECT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Timers de respawn sobre posições destruídas
    for (var j = 0; j < world.harvestables.length; j++) {
      var h = world.harvestables[j];
      if (h.state === 'respawning') {
        ASSETS.drawText(ctx, h.timer.toFixed(1), Math.round(h.x - 7), Math.round(h.y - 12), ASSETS.palette.white, 1);
      }
    }

    // Coordenada do jogador (tile e pixel), canto inferior esquerdo
    var p = world.player;
    var info = 'T ' + Math.floor(p.x / t) + ',' + Math.floor(p.y / t) +
               '  P ' + Math.round(p.x) + ',' + Math.round(p.y);
    ctx.fillStyle = 'rgba(26,28,44,0.7)';
    ctx.fillRect(2, CONFIG.GAME_HEIGHT - 10, ASSETS.textWidth(info, 1) + 4, 8);
    ASSETS.drawText(ctx, info, 4, CONFIG.GAME_HEIGHT - 9, ASSETS.palette.white, 1);
  }

  return { update: update, draw: draw, drawDebug: drawDebug, notifyPulse: notifyPulse };
})();
