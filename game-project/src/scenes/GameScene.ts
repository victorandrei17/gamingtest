import Phaser from "phaser";
import { TILE_SIZE } from "../config";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed = 80;

  constructor() {
    super("Game");
  }

  create() {
    this.createCheckerboardBackground();

    // Placeholder do personagem: um retângulo, até entrar sprite de verdade.
    this.player = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      TILE_SIZE,
      TILE_SIZE,
      0xffa500
    ) as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.cameras.main.startFollow(this.player, true);
  }

  update() {
    const body = this.player.body;
    body.setVelocity(0);

    if (this.cursors.left.isDown) body.setVelocityX(-this.speed);
    else if (this.cursors.right.isDown) body.setVelocityX(this.speed);

    if (this.cursors.up.isDown) body.setVelocityY(-this.speed);
    else if (this.cursors.down.isDown) body.setVelocityY(this.speed);
  }

  // Fundo xadrez: referência visual pra deixar óbvio quando o personagem está se movendo.
  private createCheckerboardBackground() {
    const cell = TILE_SIZE;
    const textureKey = "checkerboard-tile";

    if (!this.textures.exists(textureKey)) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x2a2a2a, 1);
      graphics.fillRect(0, 0, cell * 2, cell * 2);
      graphics.fillStyle(0x3a3a3a, 1);
      graphics.fillRect(0, 0, cell, cell);
      graphics.fillRect(cell, cell, cell, cell);
      graphics.generateTexture(textureKey, cell * 2, cell * 2);
      graphics.destroy();
    }

    this.add
      .tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, textureKey)
      .setOrigin(0, 0)
      .setDepth(-1);
  }
}
