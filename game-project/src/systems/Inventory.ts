// Estado do inventário, independente do Phaser (regra de negócio pura).
export class Inventory {
  private items = new Map<string, number>();

  add(itemId: string, amount = 1) {
    this.items.set(itemId, this.getAmount(itemId) + amount);
  }

  getAmount(itemId: string): number {
    return this.items.get(itemId) ?? 0;
  }

  getAll(): ReadonlyMap<string, number> {
    return this.items;
  }
}
