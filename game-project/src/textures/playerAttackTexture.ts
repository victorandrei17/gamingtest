import Phaser from "phaser";
import {
  drawCharacter,
  Direction,
  PLAYER_FRAME_WIDTH,
  PLAYER_FRAME_HEIGHT
} from "./playerTexture";

// Ciclo de ataque com machado gerado via canvas: 3 direções x 3 poses (preparo/golpe/recuo).
export const PLAYER_ATTACK_TEXTURE_KEY = "player-attack-sprite";

const DIRECTIONS: Direction[] = ["down", "up", "side"];
const ATTACK_POSES = ["windup", "strike", "recover"] as const;

// Ângulo do machado em graus (0 = apontando pra cima), por direção e pose.
const AXE_ANGLES: Record<Direction, Record<(typeof ATTACK_POSES)[number], number>> = {
  down: { windup: 40, strike: 170, recover: 100 },
  up: { windup: 40, strike: 170, recover: 100 },
  side: { windup: -80, strike: 60, recover: 20 }
};

const AXE_PIVOT: Record<Direction, { x: number; y: number }> = {
  down: { x: 3, y: 9 },
  up: { x: 3, y: 9 },
  side: { x: 2, y: 8 }
};

const HANDLE_COLOR = "#6b4423";
const HEAD_COLOR = "#8a8f98";
const HEAD_EDGE = "#c9ccd1";
const HEAD_OUTLINE = "#4a4d52";

export function ensurePlayerAttackTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(PLAYER_ATTACK_TEXTURE_KEY)) return;

  const fw = PLAYER_FRAME_WIDTH;
  const fh = PLAYER_FRAME_HEIGHT;
  const canvasTexture = scene.textures.createCanvas(
    PLAYER_ATTACK_TEXTURE_KEY,
    fw * ATTACK_POSES.length,
    fh * DIRECTIONS.length
  )!;
  const ctx = canvasTexture.getContext();

  DIRECTIONS.forEach((direction, row) => {
    ATTACK_POSES.forEach((pose, col) => {
      const originX = col * fw;
      const originY = row * fh;

      drawCharacter(ctx, originX, originY, direction, "idle");

      const pivot = AXE_PIVOT[direction];
      const angle = AXE_ANGLES[direction][pose];
      drawAxe(ctx, originX + fw / 2 + pivot.x, originY + pivot.y, angle);

      canvasTexture.add(`${direction}-${pose}`, 0, originX, originY, fw, fh);
    });
  });

  canvasTexture.refresh();
}

function drawAxe(ctx: CanvasRenderingContext2D, pivotX: number, pivotY: number, angleDeg: number) {
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate((angleDeg * Math.PI) / 180);

  ctx.fillStyle = HANDLE_COLOR;
  ctx.fillRect(-1, -9, 2, 9);

  ctx.fillStyle = HEAD_COLOR;
  ctx.beginPath();
  ctx.moveTo(-1, -8);
  ctx.lineTo(-5, -11);
  ctx.lineTo(-1, -13);
  ctx.lineTo(3, -11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = HEAD_OUTLINE;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  ctx.fillStyle = HEAD_EDGE;
  ctx.fillRect(-4, -11, 1, 1);

  ctx.restore();
}
