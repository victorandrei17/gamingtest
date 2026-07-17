import Phaser from "phaser";
import { TILE_SIZE } from "../config";
import { Inventory } from "../systems/Inventory";
import { InventoryPanel } from "../ui/InventoryPanel";
import { Tree } from "../entities/Tree";
import { ensureItemTextures, ITEM_TEXTURE_KEYS, ITEM_TEXTURE_SIZE } from "../textures/itemTextures";
import { ensurePlayerTexture, PLAYER_TEXTURE_KEY } from "../textures/playerTexture";
import {
  ensurePlayerAttackTexture,
  PLAYER_ATTACK_TEXTURE_KEY
} from "../textures/playerAttackTexture";

const TREE_HIT_INTERVAL_MS = 1000;
const TREE_HIT_DAMAGE = 1;
const DAMAGE_TEXT_LIFETIME_MS = 800;
const ATTACK_FRAME_RATE = 3; // 3 frames a 3fps = 1 ciclo por segundo, alinhado ao intervalo de dano

type Facing = "down" | "up" | "left" | "right";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed = 80;
  private facing: Facing = "down";
  private inventory = new Inventory();
  private inventoryPanel!: InventoryPanel;
  private inventoryToggleKey!: Phaser.Input.Keyboard.Key;
  private trees: Tree[] = [];

  constructor() {
    super("Game");
  }

  create() {
    this.createCheckerboardBackground();

    ensurePlayerTexture(this);
    this.player = this.physics.add.sprite(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      PLAYER_TEXTURE_KEY,
      "down-idle"
    ) as Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };

    this.player.body.setSize(10, 12).setOffset(3, 7);
    this.player.body.setCollideWorldBounds(true);
    this.player.setDepth(5);

    ensurePlayerAttackTexture(this);
    this.createPlayerAnimations();

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.cameras.main.startFollow(this.player, true);

    this.inventoryPanel = new InventoryPanel(this);
    this.inventoryToggleKey = this.input.keyboard!.addKey("I");

    this.spawnWoodCollectible(
      this.cameras.main.width / 2 + 60,
      this.cameras.main.height / 2 + 40
    );
    this.spawnTree(this.cameras.main.width / 2 - 60, this.cameras.main.height / 2 - 30);
  }

  update() {
    const body = this.player.body;
    body.setVelocity(0);

    let moving = false;

    if (this.cursors.left.isDown) {
      body.setVelocityX(-this.speed);
      this.facing = "left";
      moving = true;
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(this.speed);
      this.facing = "right";
      moving = true;
    }

    if (this.cursors.up.isDown) {
      body.setVelocityY(-this.speed);
      this.facing = "up";
      moving = true;
    } else if (this.cursors.down.isDown) {
      body.setVelocityY(this.speed);
      this.facing = "down";
      moving = true;
    }

    const touchedTree = this.handleTreeContact();

    if (touchedTree) {
      this.playAttackAnimation();
    } else {
      this.updatePlayerAnimation(moving);
    }

    if (Phaser.Input.Keyboard.JustDown(this.inventoryToggleKey)) {
      this.inventoryPanel.toggle();
    }
  }

  // Verifica contato com árvores no frame atual (não depende de collider persistente,
  // já que precisamos saber "está encostando agora" pra decidir a animação de ataque).
  private handleTreeContact(): boolean {
    let touching = false;

    for (const tree of [...this.trees]) {
      if (this.physics.overlap(this.player, tree.canopy)) {
        touching = true;
        this.handleTreeHit(tree);
      }
    }

    return touching;
  }

  private createPlayerAnimations() {
    const walkFrames = (direction: "down" | "up" | "side") => [
      { key: PLAYER_TEXTURE_KEY, frame: `${direction}-a` },
      { key: PLAYER_TEXTURE_KEY, frame: `${direction}-idle` },
      { key: PLAYER_TEXTURE_KEY, frame: `${direction}-b` },
      { key: PLAYER_TEXTURE_KEY, frame: `${direction}-idle` }
    ];

    this.anims.create({ key: "walk-down", frames: walkFrames("down"), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "walk-up", frames: walkFrames("up"), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "walk-side", frames: walkFrames("side"), frameRate: 6, repeat: -1 });

    const attackFrames = (direction: "down" | "up" | "side") => [
      { key: PLAYER_ATTACK_TEXTURE_KEY, frame: `${direction}-windup` },
      { key: PLAYER_ATTACK_TEXTURE_KEY, frame: `${direction}-strike` },
      { key: PLAYER_ATTACK_TEXTURE_KEY, frame: `${direction}-recover` }
    ];

    this.anims.create({
      key: "attack-down",
      frames: attackFrames("down"),
      frameRate: ATTACK_FRAME_RATE,
      repeat: -1
    });
    this.anims.create({
      key: "attack-up",
      frames: attackFrames("up"),
      frameRate: ATTACK_FRAME_RATE,
      repeat: -1
    });
    this.anims.create({
      key: "attack-side",
      frames: attackFrames("side"),
      frameRate: ATTACK_FRAME_RATE,
      repeat: -1
    });
  }

  private playAttackAnimation() {
    const isSide = this.facing === "left" || this.facing === "right";
    this.player.setFlipX(this.facing === "left");
    const animKey = isSide ? "attack-side" : `attack-${this.facing}`;
    this.player.anims.play(animKey, true);
  }

  private updatePlayerAnimation(moving: boolean) {
    const isSide = this.facing === "left" || this.facing === "right";
    this.player.setFlipX(this.facing === "left");

    if (moving) {
      const animKey = isSide ? "walk-side" : `walk-${this.facing}`;
      this.player.anims.play(animKey, true);
    } else {
      this.player.anims.stop();
      const idleFrame = isSide ? "side-idle" : `${this.facing}-idle`;
      this.player.setTexture(PLAYER_TEXTURE_KEY, idleFrame);
    }
  }

  // Item colecionável "madeira": sprite de toco de madeira que entra no inventário ao encostar.
  private spawnWoodCollectible(x: number, y: number) {
    ensureItemTextures(this);

    const wood = this.add.image(x, y, ITEM_TEXTURE_KEYS.madeira) as Phaser.GameObjects.Image & {
      body: Phaser.Physics.Arcade.Body;
    };
    wood.setScale(TILE_SIZE / ITEM_TEXTURE_SIZE);
    wood.setData("itemId", "madeira");

    this.physics.add.existing(wood);
    wood.body.setCircle(ITEM_TEXTURE_SIZE / 2);

    this.physics.add.overlap(this.player, wood, () => this.collectWood(wood));
  }

  private collectWood(wood: Phaser.GameObjects.Image) {
    this.inventory.add("madeira", 1);
    this.inventoryPanel.refresh(this.inventory);
    wood.destroy();
  }

  // Árvore com HP: leva dano enquanto o jogador encosta nela, até morrer e virar madeira.
  private spawnTree(x: number, y: number) {
    const tree = new Tree(this, x, y, 2);
    this.trees.push(tree);
  }

  private handleTreeHit(tree: Tree) {
    const now = this.time.now;
    if (now - tree.lastHitAt < TREE_HIT_INTERVAL_MS) return;
    tree.lastHitAt = now;

    const died = tree.takeDamage(TREE_HIT_DAMAGE);
    this.showDamageNumber(tree.x, tree.y - TILE_SIZE * 1.5, TREE_HIT_DAMAGE);

    if (died) {
      this.trees = this.trees.filter((t) => t !== tree);
      tree.destroy();
      this.spawnWoodCollectible(tree.x, tree.y);
    }
  }

  private showDamageNumber(x: number, y: number, amount: number) {
    const text = this.add
      .text(x, y, `-${amount}`, { fontSize: "10px", color: "#ff3b3b", fontStyle: "bold" })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: text,
      y: y - 10,
      alpha: 0,
      duration: DAMAGE_TEXT_LIFETIME_MS,
      onComplete: () => text.destroy()
    });
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
