// input.js — estado do teclado (WASD + setas).
'use strict';

var INPUT = (function () {
  var keys = {};
  var pressedThisFrame = {};

  window.addEventListener('keydown', function (e) {
    if (!keys[e.code]) pressedThisFrame[e.code] = true;
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });

  return {
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
    endFrame: function () { pressedThisFrame = {}; }
  };
})();
