import Phaser from "phaser";

// Personagem chibi top-down gerado via canvas: 3 direções (down/up/side) x 3 poses (a/idle/b).
export const PLAYER_TEXTURE_KEY = "player-sprite";
export const PLAYER_FRAME_WIDTH = 16;
export const PLAYER_FRAME_HEIGHT = 20;

const DIRECTIONS = ["down", "up", "side"] as const;
const POSES = ["a", "idle", "b"] as const;

type Direction = (typeof DIRECTIONS)[number];
type Pose = (typeof POSES)[number];

const SKIN = "#e8b382";
const HAIR = "#4a2e12";
const SHIRT = "#ffa500";
const SHIRT_OUTLINE = "#b36f00";
const PANTS = "#6b4423";
const SHOES = "#3d2712";
const EYE = "#2b1608";

export function ensurePlayerTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(PLAYER_TEXTURE_KEY)) return;

  const fw = PLAYER_FRAME_WIDTH;
  const fh = PLAYER_FRAME_HEIGHT;
  const canvasTexture = scene.textures.createCanvas(
    PLAYER_TEXTURE_KEY,
    fw * POSES.length,
    fh * DIRECTIONS.length
  )!;
  const ctx = canvasTexture.getContext();

  DIRECTIONS.forEach((direction, row) => {
    POSES.forEach((pose, col) => {
      const originX = col * fw;
      const originY = row * fh;
      drawCharacter(ctx, originX, originY, direction, pose);
      canvasTexture.add(`${direction}-${pose}`, 0, originX, originY, fw, fh);
    });
  });

  canvasTexture.refresh();
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  direction: Direction,
  pose: Pose
) {
  const cx = originX + PLAYER_FRAME_WIDTH / 2;
  const headY = originY + 5;
  const torsoTopY = originY + 8;
  const torsoBottomY = originY + 14;

  if (direction === "down") {
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.arc(cx, headY - 1, 4, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(cx, headY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = EYE;
    ctx.fillRect(cx - 2, headY, 1, 1);
    ctx.fillRect(cx + 1, headY, 1, 1);

    drawTorso(ctx, cx, torsoTopY, torsoBottomY, 10);
  } else if (direction === "up") {
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.arc(cx, headY, 4, 0, Math.PI * 2);
    ctx.fill();

    drawTorso(ctx, cx, torsoTopY, torsoBottomY, 10);

    ctx.strokeStyle = SHIRT_OUTLINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 2, torsoTopY);
    ctx.lineTo(cx - 2, torsoTopY + 3);
    ctx.moveTo(cx + 2, torsoTopY);
    ctx.lineTo(cx + 2, torsoTopY + 3);
    ctx.stroke();
  } else {
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.arc(cx - 1, headY - 1, 4, Math.PI * 1.1, Math.PI * 2.2);
    ctx.fill();

    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(cx, headY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx + 3, headY - 1, 1, 2);

    ctx.fillStyle = EYE;
    ctx.fillRect(cx + 2, headY, 1, 1);

    drawTorso(ctx, cx, torsoTopY, torsoBottomY, 8);

    ctx.fillStyle = SKIN;
    ctx.fillRect(cx + 3, torsoTopY + 1, 2, 3);
  }

  drawLegs(ctx, cx, torsoBottomY, pose);
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  bottomY: number,
  width: number
) {
  ctx.fillStyle = SHIRT;
  ctx.fillRect(cx - width / 2, topY, width, bottomY - topY);
  ctx.strokeStyle = SHIRT_OUTLINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - width / 2, topY, width, bottomY - topY);
}

function drawLegs(ctx: CanvasRenderingContext2D, cx: number, topY: number, pose: Pose) {
  const legW = 3;
  const legH = 5;
  let leftOffset = 0;
  let rightOffset = 0;

  if (pose === "a") {
    leftOffset = 1;
    rightOffset = -1;
  } else if (pose === "b") {
    leftOffset = -1;
    rightOffset = 1;
  }

  ctx.fillStyle = PANTS;
  ctx.fillRect(cx - 4, topY + leftOffset, legW, legH);
  ctx.fillRect(cx + 1, topY + rightOffset, legW, legH);

  ctx.fillStyle = SHOES;
  ctx.fillRect(cx - 4, topY + leftOffset + legH - 1, legW, 2);
  ctx.fillRect(cx + 1, topY + rightOffset + legH - 1, legW, 2);
}
