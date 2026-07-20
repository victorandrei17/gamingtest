// input.js — estado do teclado (WASD + setas + teclas de UI) e do mouse.
'use strict';

var INPUT = (function () {
  var keys = {};
  var pressedThisFrame = {};
  var mouse = { x: 0, y: 0, down: false };
  var clickedThisFrame = false;

  // Teclas cujo comportamento padrão do navegador queremos suprimir.
  var PREVENT = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];

  window.addEventListener('keydown', function (e) {
    if (!keys[e.code]) pressedThisFrame[e.code] = true;
    keys[e.code] = true;
    if (PREVENT.indexOf(e.code) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });

  // Mouse em coordenadas internas (480x270), convertidas da escala de exibição.
  function attachMouse(canvas) {
    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width * CONFIG.GAME_WIDTH;
      mouse.y = (e.clientY - rect.top) / rect.height * CONFIG.GAME_HEIGHT;
    });
    canvas.addEventListener('mousedown', function (e) {
      if (e.button === 0) { mouse.down = true; clickedThisFrame = true; }
    });
    window.addEventListener('mouseup', function (e) {
      if (e.button === 0) mouse.down = false;
    });
  }

  return {
    attachMouse: attachMouse,
    mouse: mouse,
    // Vetor de movimento normalizado (diagonais não são mais rápidas).
    getMoveVector: function () {
      var x = 0, y = 0;
      if (keys.KeyA || keys.ArrowLeft) x -= 1;
      if (keys.KeyD || keys.ArrowRight) x += 1;
      if (keys.KeyW || keys.ArrowUp) y -= 1;
      if (keys.KeyS || keys.ArrowDown) y += 1;
      if (x !== 0 && y !== 0) {
        var inv = 1 / Math.sqrt(2);
        x *= inv; y *= inv;
      }
      return { x: x, y: y };
    },
    // true apenas no frame em que a tecla foi pressionada.
    wasPressed: function (code) { return !!pressedThisFrame[code]; },
    // true apenas no frame em que houve clique do botão esquerdo.
    wasClicked: function () { return clickedThisFrame; },
    endFrame: function () { pressedThisFrame = {}; clickedThisFrame = false; }
  };
})();
