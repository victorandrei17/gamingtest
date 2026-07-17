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
}
