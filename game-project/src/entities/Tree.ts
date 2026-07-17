import Phaser from "phaser";
import { TILE_SIZE } from "../config";
import { ensureTreeTexture, TREE_TEXTURE_KEY, TREE_TEXTURE_WIDTH, TREE_CANOPY_RADIUS } from "../textures/treeTexture";

type HitZone = Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body };
type TrunkZone = Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.StaticBody };

export class Tree {
  readonly x: number;
  readonly y: number;
  // Área de alcance de ataque (overlap, não bloqueia movimento), centrada no tronco.
  readonly hitArea: HitZone;
  // Tronco: corpo sólido e estático, pequeno, que impede o jogador de atravessar a árvore.
  readonly trunk: TrunkZone;
  private canopyImage: Phaser.GameObjects.Image;
  private hp: number;
  lastHitAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 2) {
    ensureTreeTexture(scene);

    this.x = x;
    this.y = y;
    this.hp = maxHp;

    const scale = (TILE_SIZE * 2) / TREE_TEXTURE_WIDTH;

    this.canopyImage = scene.add.image(x, y, TREE_TEXTURE_KEY);
    this.canopyImage.setScale(scale);

    // Ambos concêntricos na base do tronco (posição visual real do tronco): o alcance de ataque
    // é bem maior que o bloqueio sólido, então não importa de que lado o jogador se aproxima,
    // ele fica sempre dentro do alcance de dano ao ser bloqueado pelo tronco.
    const trunkY = y + TILE_SIZE * 0.4;
    const hitRadius = TREE_CANOPY_RADIUS * scale;
    const solidRadius = TILE_SIZE * 0.3;

    this.hitArea = scene.add.zone(x, trunkY, hitRadius * 2, hitRadius * 2) as HitZone;
    scene.physics.add.existing(this.hitArea);
    this.hitArea.body.setCircle(hitRadius);

    this.trunk = scene.add.zone(x, trunkY, solidRadius * 2, solidRadius * 2) as TrunkZone;
    scene.physics.add.existing(this.trunk, true);
    this.trunk.body.setCircle(solidRadius);
  }

  // Retorna true quando o HP acaba (árvore morreu).
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  destroy() {
    this.canopyImage.destroy();
    this.hitArea.destroy();
    this.trunk.destroy();
  }
}
