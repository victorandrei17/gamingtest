import Phaser from "phaser";
import { TILE_SIZE } from "../config";

type CanopyBody = Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };

export class Tree {
  readonly x: number;
  readonly y: number;
  readonly canopy: CanopyBody;
  private trunk: Phaser.GameObjects.Rectangle;
  private hp: number;
  lastHitAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 2) {
    this.x = x;
    this.y = y;
    this.hp = maxHp;

    this.trunk = scene.add.rectangle(x, y + TILE_SIZE * 0.5, TILE_SIZE / 3, TILE_SIZE, 0x8b5a2b);

    this.canopy = scene.add.circle(x, y - TILE_SIZE * 0.25, TILE_SIZE, 0x2e8b57) as CanopyBody;
    scene.physics.add.existing(this.canopy);
    this.canopy.body.setCircle(TILE_SIZE);
  }

  // Retorna true quando o HP acaba (árvore morreu).
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  destroy() {
    this.canopy.destroy();
    this.trunk.destroy();
  }
}
