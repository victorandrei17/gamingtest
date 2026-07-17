import Phaser from "phaser";
import { TILE_SIZE } from "../config";
import {
  ensureTreeTexture,
  TREE_TEXTURE_KEY,
  TREE_TEXTURE_WIDTH,
  TREE_CANOPY_CENTER_Y,
  TREE_CANOPY_RADIUS
} from "../textures/treeTexture";

type TreeSprite = Phaser.GameObjects.Image & { body: Phaser.Physics.Arcade.Body };

export class Tree {
  readonly x: number;
  readonly y: number;
  readonly canopy: TreeSprite;
  private hp: number;
  lastHitAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 2) {
    ensureTreeTexture(scene);

    this.x = x;
    this.y = y;
    this.hp = maxHp;

    const scale = (TILE_SIZE * 2) / TREE_TEXTURE_WIDTH;

    this.canopy = scene.add.image(x, y, TREE_TEXTURE_KEY) as TreeSprite;
    this.canopy.setScale(scale);

    scene.physics.add.existing(this.canopy);
    const offsetX = TREE_TEXTURE_WIDTH / 2 - TREE_CANOPY_RADIUS;
    const offsetY = TREE_CANOPY_CENTER_Y - TREE_CANOPY_RADIUS;
    this.canopy.body.setCircle(TREE_CANOPY_RADIUS, offsetX, offsetY);
  }

  // Retorna true quando o HP acaba (árvore morreu).
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  destroy() {
    this.canopy.destroy();
  }
}
