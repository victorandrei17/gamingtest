import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, PIXEL_SCALE } from "./config";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  pixelArt: true,
  backgroundColor: "#1a1a1a",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  zoom: PIXEL_SCALE,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);
