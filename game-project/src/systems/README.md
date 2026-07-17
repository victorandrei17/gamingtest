# systems/

Cada sistema do jogo vive num arquivo isolado aqui, desacoplado das Scenes.
Ideia: Scenes orquestram, systems têm a lógica.

Sugestão de divisão conforme o jogo crescer:
- `Inventory.ts` — estado do inventário, add/remove item, stack
- `Crafting.ts` — lê receitas de `src/data/recipes.json`, valida e executa
- `Building.ts` — grid de colocação, validação de posição, snap-to-grid
- `SaveLoad.ts` — serialização de estado pro localStorage

Mantenha cada sistema sem depender diretamente do Phaser quando possível
(regras de negócio puras) — facilita testar e trocar de motor gráfico depois.
