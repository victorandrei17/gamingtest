import Phaser from "phaser";
import { TILE_SIZE } from "../config";
import { Inventory } from "../systems/Inventory";
import { InventoryPanel } from "../ui/InventoryPanel";
import { Tree } from "../entities/Tree";
import { ensureItemTextures, ITEM_TEXTURE_KEYS, ITEM_TEXTURE_SIZE } from "../textures/itemTextures";

const TREE_HIT_INTERVAL_MS = 1000;
const TREE_HIT_DAMAGE = 1;
const DAMAGE_TEXT_LIFETIME_MS = 800;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed = 80;
  private inventory = new Inventory();
  private inventoryPanel!: InventoryPanel;
  private inventoryToggleKey!: Phaser.Input.Keyboard.Key;
  private trees: Tree[] = [];

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

    if (this.cursors.left.isDown) body.setVelocityX(-this.speed);
    else if (this.cursors.right.isDown) body.setVelocityX(this.speed);

    if (this.cursors.up.isDown) body.setVelocityY(-this.speed);
    else if (this.cursors.down.isDown) body.setVelocityY(this.speed);

    if (Phaser.Input.Keyboard.JustDown(this.inventoryToggleKey)) {
      this.inventoryPanel.toggle();
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
    const collider = this.physics.add.overlap(this.player, tree.canopy, () =>
      this.handleTreeHit(tree, collider)
    );
    this.trees.push(tree);
  }

  private handleTreeHit(tree: Tree, collider: Phaser.Physics.Arcade.Collider) {
    const now = this.time.now;
    if (now - tree.lastHitAt < TREE_HIT_INTERVAL_MS) return;
    tree.lastHitAt = now;

    const died = tree.takeDamage(TREE_HIT_DAMAGE);
    this.showDamageNumber(tree.x, tree.y - TILE_SIZE * 1.5, TREE_HIT_DAMAGE);

    if (died) {
      collider.destroy();
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
