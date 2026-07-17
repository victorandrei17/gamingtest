import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Placeholder: carregar sprites/tilesets aqui conforme o tema for definido.
    // this.load.spritesheet("player", "assets/sprites/player.png", { frameWidth: 16, frameHeight: 16 });

    // Loading bar simples pra quando entrar asset de verdade
    const { width, height } = this.cameras.main;
    const box = this.add.graphics();
    box.fillStyle(0x222222, 1);
    box.fillRect(width / 2 - 50, height / 2 - 5, 100, 10);

    this.load.on("progress", (value: number) => {
      box.fillStyle(0xffa500, 1);
      box.fillRect(width / 2 - 48, height / 2 - 3, 96 * value, 6);
    });
  }

  create() {
    this.scene.start("Game");
  }
}
