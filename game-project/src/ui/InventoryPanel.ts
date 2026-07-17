import Phaser from "phaser";
import { Inventory } from "../systems/Inventory";
import { ensureItemTextures, ITEM_TEXTURE_KEYS } from "../textures/itemTextures";

const COLS = 5;
const ROWS = 4;
const SLOT_SIZE = 18;
const SLOT_GAP = 3;
const PADDING = 6;
const TITLE_HEIGHT = 14;
const MARGIN = 4;

export class InventoryPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private slotContents: Phaser.GameObjects.GameObject[] = [];
  private isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    ensureItemTextures(scene);

    const width = PADDING * 2 + COLS * SLOT_SIZE + (COLS - 1) * SLOT_GAP;
    const height = TITLE_HEIGHT + PADDING * 2 + ROWS * SLOT_SIZE + (ROWS - 1) * SLOT_GAP;

    const x = scene.cameras.main.width - width - MARGIN;
    const y = scene.cameras.main.height - height - MARGIN;

    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(200).setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(0x0f1a33, 0.95);
    bg.fillRoundedRect(0, 0, width, height, 4);
    bg.lineStyle(1, 0x4a6fa5, 1);
    bg.strokeRoundedRect(0, 0, width, height, 4);

    const titleBar = scene.add.graphics();
    titleBar.fillStyle(0x1c2f52, 1);
    titleBar.fillRoundedRect(0, 0, width, TITLE_HEIGHT, { tl: 4, tr: 4, bl: 0, br: 0 });

    const title = scene.add.text(4, 2, "Inventory", {
      fontSize: "8px",
      color: "#ffffff",
      fontStyle: "bold"
    });

    const closeBtn = scene.add
      .text(width - 10, 2, "X", { fontSize: "8px", color: "#ffffff" })
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());

    this.container.add([bg, titleBar, title, closeBtn]);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const slotX = PADDING + col * (SLOT_SIZE + SLOT_GAP);
        const slotY = TITLE_HEIGHT + PADDING + row * (SLOT_SIZE + SLOT_GAP);

        const slot = scene.add.graphics();
        slot.fillStyle(0x0a1428, 1);
        slot.fillRoundedRect(slotX, slotY, SLOT_SIZE, SLOT_SIZE, 2);
        slot.lineStyle(1, 0x2c4770, 1);
        slot.strokeRoundedRect(slotX, slotY, SLOT_SIZE, SLOT_SIZE, 2);
        this.container.add(slot);
      }
    }
  }

  refresh(inventory: Inventory) {
    this.slotContents.forEach((obj) => obj.destroy());
    this.slotContents = [];

    const entries = Array.from(inventory.getAll().entries());

    entries.slice(0, COLS * ROWS).forEach(([itemId, amount], index) => {
      const row = Math.floor(index / COLS);
      const col = index % COLS;
      const slotX = PADDING + col * (SLOT_SIZE + SLOT_GAP);
      const slotY = TITLE_HEIGHT + PADDING + row * (SLOT_SIZE + SLOT_GAP);
      const textureKey = ITEM_TEXTURE_KEYS[itemId];
      const icon = this.scene.add.image(slotX + SLOT_SIZE / 2, slotY + SLOT_SIZE / 2, textureKey);
      icon.setDisplaySize(SLOT_SIZE - 4, SLOT_SIZE - 4);

      const countText = this.scene.add
        .text(slotX + SLOT_SIZE - 2, slotY + SLOT_SIZE - 2, String(amount), {
          fontSize: "6px",
          color: "#ffffff"
        })
        .setOrigin(1, 1);

      this.container.add([icon, countText]);
      this.slotContents.push(icon, countText);
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.container.setVisible(this.isOpen);
  }

  open() {
    this.isOpen = true;
    this.container.setVisible(true);
  }

  close() {
    this.isOpen = false;
    this.container.setVisible(false);
  }
}
