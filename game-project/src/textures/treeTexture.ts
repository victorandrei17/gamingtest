import Phaser from "phaser";

// Árvore em pixel art gerada via canvas: copa arredondada em blobs verdes e tronco curvo com raízes.
export const TREE_TEXTURE_KEY = "tree-sprite";
export const TREE_TEXTURE_WIDTH = 40;
export const TREE_TEXTURE_HEIGHT = 46;

// Centro vertical aproximado da copa dentro da textura (usado para posicionar o corpo de física).
export const TREE_CANOPY_CENTER_Y = TREE_TEXTURE_HEIGHT * 0.36;
export const TREE_CANOPY_RADIUS = 13;

export function ensureTreeTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(TREE_TEXTURE_KEY)) return;

  const w = TREE_TEXTURE_WIDTH;
  const h = TREE_TEXTURE_HEIGHT;
  const cx = w / 2;
  const canopyY = TREE_CANOPY_CENTER_Y;

  const canvasTexture = scene.textures.createCanvas(TREE_TEXTURE_KEY, w, h)!;
  const ctx = canvasTexture.getContext();

  // Raízes
  ctx.strokeStyle = "#4a2e12";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6, h - 2);
  ctx.lineTo(cx - 2, h - 8);
  ctx.moveTo(cx + 6, h - 2);
  ctx.lineTo(cx + 2, h - 8);
  ctx.moveTo(cx, h - 1);
  ctx.lineTo(cx, h - 10);
  ctx.stroke();

  // Tronco
  ctx.fillStyle = "#6b4423";
  ctx.strokeStyle = "#3d2712";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 4, h - 3);
  ctx.quadraticCurveTo(cx - 5, h - 16, cx - 2, h - 22);
  ctx.lineTo(cx + 2, h - 22);
  ctx.quadraticCurveTo(cx + 5, h - 16, cx + 4, h - 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#8a5a30";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 1, h - 4);
  ctx.lineTo(cx - 1, h - 20);
  ctx.stroke();

  // Copa: blobs sobrepostos formando o contorno escuro
  const blobs = [
    { dx: -9, dy: 2, r: 11 },
    { dx: 9, dy: 2, r: 11 },
    { dx: 0, dy: -8, r: 12 },
    { dx: -5, dy: 8, r: 9 },
    { dx: 5, dy: 8, r: 9 },
    { dx: 0, dy: 2, r: 10 }
  ];

  ctx.fillStyle = "#1f5c33";
  blobs.forEach((b) => {
    ctx.beginPath();
    ctx.arc(cx + b.dx, canopyY + b.dy, b.r + 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Preenchimento verde médio
  ctx.fillStyle = "#3f9152";
  blobs.forEach((b) => {
    ctx.beginPath();
    ctx.arc(cx + b.dx, canopyY + b.dy, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Realces mais claros no topo/esquerda
  ctx.fillStyle = "#6fc47a";
  [
    { dx: -10, dy: -6, r: 6 },
    { dx: -2, dy: -11, r: 5 },
    { dx: 6, dy: -4, r: 5 }
  ].forEach((b) => {
    ctx.beginPath();
    ctx.arc(cx + b.dx, canopyY + b.dy, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#bfe8c8";
  ctx.beginPath();
  ctx.arc(cx - 9, canopyY - 8, 2.5, 0, Math.PI * 2);
  ctx.fill();

  canvasTexture.refresh();
}
