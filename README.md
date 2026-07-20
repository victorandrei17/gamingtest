# Crafting 2D — Milestone 1

Protótipo top-down de coleta/crafting inspirado em My Little Universe e XP Hero.
Loop central: coletar recursos batendo em árvores/rochas e desbloquear a primeira
construção (Ferreiro).

## Engine

**Canvas 2D puro com game loop próprio.** Sem dependência de CDN/rede, o jogo abre
via `file://` sem nenhum pré-requisito; e para um mapa de uma tela com ~20 entidades,
um loop com `dt` dá controle pixel-perfect total sem o peso de um framework.

## Como rodar

Abra `index.html` direto no navegador — não há build step nem dependências.

Opcionalmente, sirva por HTTP:

```
python -m http.server
# http://localhost:8000
```

**Controles:** WASD ou setas para andar (8 direções). Na tela inicial, setas para
escolher o personagem e Enter/Espaço para começar. O ataque é automático ao encostar
em um objeto atingível (a arma correta é selecionada sozinha).

## Constantes (`src/config.js`)

Todos os números de balanceamento vivem em `CONFIG` — nenhum valor mágico no código.

| Constante | Padrão | Efeito |
|---|---|---|
| `DEBUG` | `true` | Overlays de desenvolvimento (grade numerada, hitboxes, raio de coleta, coordenadas do jogador, timers de respawn) |
| `GAME_WIDTH` / `GAME_HEIGHT` | 480 / 270 | Resolução interna |
| `SCALE` | 4 | Escala inteira de exibição (1920×1080) |
| `TILE_SIZE` | 16 | Grid base em px |
| `PLAYER_SPEED` | 90 | Velocidade do jogador (px/s) |
| `PLAYER_HITBOX_W` / `_H` | 10 / 6 | Hitbox de colisão pelos pés |
| `PLAYER_REACH` | 6 | Alcance do golpe à frente do jogador (px) — o ataque só ocorre de frente para o objeto |
| `BASE_DAMAGE` | 1 | Atributo base `damage` (dano por hit) |
| `BASE_ATTACK_SPEED` | 1.0 | Atributo base `attackSpeed` (multiplicador do cooldown) |
| `HIT_COOLDOWN` | 0.5 | Segundos entre golpes (dividido por `attackSpeed`) |
| `ATTACK_ANIM_TIME` | 0.25 | Duração da animação de golpe |
| `RESPAWN_TIME` | 5 | Segundos para o objeto reaparecer |
| `DESTROYED_SPRITE_TIME` | 0.3 | Tempo exibindo o sprite destruído |
| `SPAWN_ANIM_TIME` | 0.4 | Duração da animação de surgimento |
| `HEALTHBAR_HIDE_TIME` | 3 | Segundos sem dano até esconder a barra de vida |
| `COLLECT_RADIUS` | 20 | Raio de atração dos drops (px) |
| `DROP_ARC_TIME` | 0.35 | Duração do arco de ejeção do drop |
| `MAGNET_TIME` | 0.25 | Duração do tween de magnetismo até o jogador |
| `BUILD_TIME` | 3 | Segundos de construção |
| `BLACKSMITH_COST` | 3 | Madeiras para o Ferreiro |
| `DELIVER_INTERVAL` | 0.2 | Intervalo entre cada madeira voando até a área |
| `UNLOCK_MSG_TIME` | 2 | Duração das mensagens de destaque (desbloqueio/forja) |
| `FORGE_TIME` | 3 | Segundos de forja (padrão; cada receita pode sobrescrever) |
| `SMITH_INTERACT_RADIUS` | 34 | Proximidade (px) para exibir `[E] FORJAR` |
| `DENY_FLASH_TIME` | 0.3 | Feedback de negação ao tentar forjar sem recursos |
| `HUD_PULSE_TIME` | 0.25 | Duração do pulso do contador do HUD ao coletar |
| `FLOAT_TEXT_TIME` | 0.8 | Duração do `+1` flutuante ao coletar |
| `STAT_FLASH_TIME` | 1.5 | Duração do destaque dourado ao ganhar um bônus |

## Arquitetura

Scripts clássicos carregados em ordem no `index.html` (sem ES modules, para
funcionar via `file://`):

```
src/config.js       constantes de balanceamento + DEBUG
src/data.js         tabelas ITEM_TYPES, RESOURCE_TYPES, WEAPON_TYPES, BUILDINGS
src/level.js        posições declarativas dos objetos e construções
src/stats.js        atributos base + modificadores + valor final (stats.get)
src/recipes.js      receitas forjáveis declarativas (RECIPES)
src/equipment.js    itens equipados → injeta modificadores em stats
src/assets.js       TODA a arte (procedural) — única camada a trocar por sprites reais
src/input.js        teclado (vetor normalizado nas diagonais) + mouse
src/effects.js      partículas de hit e pop de coleta
src/player.js       máquina de estados idle/walk/attack, colisão; lê dano/velocidade de stats
src/harvestable.js  ciclo alive → destroyed → respawning → spawning
src/drops.js        arco de ejeção, magnetismo, coleta
src/building.js     área de obra: entrega item a item → obra → construído
src/forge.js        proximidade com o ferreiro + janela de forja (seleção, timer, consumo)
src/hud.js          faixa de recursos + painel de personagem + mensagens + DEBUG
src/main.js         bootstrap, cena de seleção, mundo, game loop com dt
```

Com `DEBUG = true`, `window.GAME` expõe `scene` e `world` para inspeção no console.

### Como estender (editando só dados)

- **Novo recurso** (ex.: ouro): adicione `gold_ore` em `ITEM_TYPES`/`INVENTORY_ORDER`
  e `gold_rock` em `RESOURCE_TYPES` (`data.js`), posicione instâncias em `level.js`
  e (opcional) um sprite em `assets.js` — a lógica não muda.
- **Nona instância de objeto**: uma linha nova em `LEVEL.objects` (`level.js`).
- **Nova arma**: entrada em `WEAPON_TYPES` com `targetCategory` + ícone/animação em
  `assets.js`; a seleção automática usa o índice derivado `WEAPON_FOR_CATEGORY`.
- **Nova construção**: entrada em `BUILDINGS` (custo, tempo, mensagem, tamanho) +
  instância em `LEVEL.buildings` + sprite em `ASSETS.buildings`.
- **Nova receita de forja**: uma entrada em `RECIPES` (`recipes.js`) + ícone em
  `ASSETS.forgeIcons` — a janela de forja, o custo e o equipamento se adaptam sozinhos.

### Atributos e forja (Milestone 2)

Os atributos do personagem (`damage`, `moveSpeed`, `attackSpeed`) têm base em
`config.js` e são calculados por `stats.js` como **base + modificadores** dos itens
equipados: `final = (base + Σflat) × (1 + Σpercent)`. Nada lê dano/velocidade
hardcoded — tudo vem de `stats.get(...)`.

Formato de uma **receita** (`recipes.js`):

```js
{
  id: 'sword',                 // referência única / slot de equipamento via `slot`
  name: 'Espada',
  slot: 'sword',
  icon: 'sword',               // chave em ASSETS.forgeIcons
  cost: { wood: 2, iron_ore: 2 },
  time: CONFIG.FORGE_TIME,     // segundos de forja
  modifiers: [{ stat: 'damage', type: 'flat', value: 1 }]
}
```

Um **modificador** é declarativo: `{ stat, type: 'flat'|'percent', value }`.
Ao forjar, o custo é debitado na hora, a barra de progresso roda `time` segundos
(mesmo com a janela fechada) e, ao concluir, `equipment.equip(id)` recalcula os
atributos — o bônus vale imediatamente.

**Controles novos:** `[E]` forja (perto do ferreiro), `[I]`/`[TAB]` painel de
personagem, `ESC` fecha a forja, mouse+teclado na janela de forja.

## Sprites a substituir (`src/assets.js`)

Toda a arte é placeholder procedural. Para arte real, troque as funções `create*`
de `assets.js` por carregamento de imagens mantendo a interface `ASSETS.*`:

| Sprite | Tamanho (px) | Frames necessários |
|---|---|---|
| Jogador (menino e menina) | 16×22, âncora nos pés (8,21) | idle ×1, walk ×4, ataque ×3 **por arma** — nas 4 direções (esquerda pode espelhar a direita) |
| **Árvore (5 estágios de dano)** | 24×32, âncora (12,31) | 5 frames do maior (5 HP) ao menor (1 HP) + destruída (caída) |
| **Rochas de bronze, ferro e pedra (5 estágios de dano)** | 24×20, âncora (12,19) | 5 frames do maior (5 HP) ao menor (1 HP) + quebrada, por tipo |
| Itens/ícones (madeira, minérios, pedra) | 8×8 | 1 (usado no chão e no HUD) |
| Ícones de arma (machado, picareta) | 10×10 | 1 |
| Casa do Ferreiro | 48×40, âncora (24,39) | construída (a "subida" é recorte progressivo do mesmo sprite) |
| Chão | 480×270 (ou tileset 16×16) | o xadrez de dev é gerado em `createGround()` — troque só essa função |

O texto usa uma fonte bitmap 3×5 embutida (`ASSETS.drawText`) para ficar sem antialias.

### Estágios de dano (árvore e rochas de bronze, ferro e pedra)

Todos os objetos atingíveis têm **5 HP** e mostram um sprite diferente por vida
restante, encolhendo a cada hit (5 HP = maior → 1 HP = menor). O sprite é escolhido
por `Harvestable.currentNormalImage()` via `maxHp - hp`, então qualquer recurso ganha
estágios só declarando `stages: [...]` no lugar de `normal` em `assets.js` e o
`hp` correspondente em `data.js`.

Os placeholders vêm de `createTreeStages()` (árvore) e `createRockStages(cor)`
(rochas, com a paleta de cada uma em `ROCK_STAGE_COLORS`). Para usar os PNGs reais:

1. Coloque os arquivos em `assets/` (do maior/5 HP ao menor/1 HP):
   - Árvore: `Tree_grass_shadow_dark1.png` … `Tree_grass_shadow_dark5.png`
   - Bronze: `Rock2_grass_shadow_dark1.png` … `Rock2_grass_shadow_dark5.png`
   - Ferro:  `Rock1_grass_shadow_dark1.png` … `Rock1_grass_shadow_dark5.png`
   - Pedra:  `Rock3_grass_shadow_dark1.png` … `Rock3_grass_shadow_dark5.png`
2. Ligue `USE_REAL_ROCK_SPRITES: true` em `config.js`.

Os nomes dos arquivos ficam em `REAL_STAGE_FILES` (`assets.js`) — ajuste ali se os
seus arquivos tiverem outros nomes. São carregados por cima dos placeholders
(`loadRealStageSprites()`); se algum faltar, o placeholder daquele estágio permanece.

## Pronto para o Milestone 3

- **Atributos data-driven**: novos atributos entram em `CONFIG` + `STAT_LABELS`;
  `stats.get()` já compõe `flat`/`percent` de qualquer fonte de modificadores.
- **Modificadores genéricos**: qualquer sistema (poções, buffs temporários, níveis)
  pode empurrar `{ stat, type, value }` para `stats.setModifiers` sem tocar no resto.
- **Receitas e equipamento declarativos**: novas forjas/slots = novas entradas em
  `RECIPES`; a UI de forja e o painel se adaptam sozinhos.
- **Forja em background com uma fila de 1** — base pronta para múltiplas forjas/fila.
- **HUD centralizado** (`hud.js`) com painel modular (boneco, atributos, grade) e
  primitivas de UI reutilizáveis (`ASSETS.drawPanel` / `drawSlot`).
- **Tabelas de dados** de recursos, armas, construções e estágios de dano continuam
  data-driven; novos tipos não exigem `if/else`.
- **`window.GAME`** (modo DEBUG) para inspecionar/manipular o mundo em testes.

> Observação de balanceamento: os objetos foram elevados a 5 HP (estágios de dano) a
> pedido, então a Espada (`damage +1`) faz 2 de dano por hit em vez de derrubar uma
> árvore de 2 HP em um golpe. É só ajustar o `hp` em `data.js` se quiser o
> comportamento de "1 hit".
