import Phaser from "phaser";
import { TILE_SIZE } from "../config";
import {
  ensureTreeTexture,
  TREE_TEXTURE_KEY,
  TREE_TEXTURE_WIDTH,
  TREE_TEXTURE_HEIGHT,
  TREE_CANOPY_CENTER_Y,
  TREE_CANOPY_RADIUS
} from "../textures/treeTexture";

type TreeSprite = Phaser.GameObjects.Image & { body: Phaser.Physics.Arcade.Body };
type TrunkZone = Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.StaticBody };

export class Tree {
  readonly x: number;
  readonly y: number;
  // Copa: área de alcance de ataque (overlap, não bloqueia movimento).
  readonly canopy: TreeSprite;
  // Tronco: corpo sólido e estático, menor que a copa, que impede o jogador de atravessar a árvore.
  readonly trunk: TrunkZone;
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

    // Tronco concêntrico com a copa (mesmo centro, raio menor): assim, seja qual for o lado por
    // onde o jogador se aproxima, ele é bloqueado sempre dentro do alcance de dano da copa.
    const canopyCenterY = y + (TREE_CANOPY_CENTER_Y - TREE_TEXTURE_HEIGHT / 2) * scale;
    const solidRadius = TREE_CANOPY_RADIUS * scale * 0.5;

    this.trunk = scene.add.zone(x, canopyCenterY, solidRadius * 2, solidRadius * 2) as TrunkZone;
    scene.physics.add.existing(this.trunk, true);
    this.trunk.body.setCircle(solidRadius);
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
