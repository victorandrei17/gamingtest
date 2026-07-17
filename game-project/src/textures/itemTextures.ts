import Phaser from "phaser";

// Texturas de itens geradas em pixel art via canvas, sem depender de assets externos.
export const ITEM_TEXTURE_SIZE = 32;

const WOOD_TEXTURE_KEY = "item-wood";

export const ITEM_TEXTURE_KEYS: Record<string, string> = {
  madeira: WOOD_TEXTURE_KEY
};

export function ensureItemTextures(scene: Phaser.Scene) {
  createWoodTexture(scene);
}

// Toco de madeira diagonal com casca escura, sombreado bicolor e uma ponta cortada mais clara.
function createWoodTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(WOOD_TEXTURE_KEY)) return;

  const size = ITEM_TEXTURE_SIZE;
  const canvasTexture = scene.textures.createCanvas(WOOD_TEXTURE_KEY, size, size)!;
  const ctx = canvasTexture.getContext();

  const ax = 7;
  const ay = 25;
  const bx = 24;
  const by = 7;
  const radius = 5;

  const darkOutline = "#2b1608";
  const barkMid = "#6b3a17";
  const barkLight = "#8b4a1f";
  const cutOuter = "#b98354";
  const cutInner = "#dcb08c";

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const cx = ax + t * dx;
      const cy = ay + t * dy;
      const ddx = px - cx;
      const ddy = py - cy;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      const perp = dx * ddy - dy * ddx;

      if (dist <= radius) {
        if (t > 0.82) {
          ctx.fillStyle = dist < radius * 0.55 ? cutInner : cutOuter;
        } else {
          ctx.fillStyle = perp > 0 ? barkLight : barkMid;
        }
        ctx.fillRect(x, y, 1, 1);
      } else if (dist <= radius + 1.3) {
        ctx.fillStyle = darkOutline;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  canvasTexture.refresh();
}
