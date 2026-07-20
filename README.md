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
| `DAMAGE_PER_HIT` | 1 | Dano por golpe |
| `HIT_COOLDOWN` | 0.5 | Segundos entre golpes |
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
| `UNLOCK_MSG_TIME` | 2 | Duração da mensagem de desbloqueio |
| `HUD_PULSE_TIME` | 0.25 | Duração do pulso do contador do HUD ao coletar |

## Arquitetura

Scripts clássicos carregados em ordem no `index.html` (sem ES modules, para
funcionar via `file://`):

```
src/config.js       constantes de balanceamento + DEBUG
src/data.js         tabelas ITEM_TYPES, RESOURCE_TYPES, WEAPON_TYPES, BUILDINGS
src/level.js        posições declarativas dos objetos e construções
src/assets.js       TODA a arte (procedural) — única camada a trocar por sprites reais
src/input.js        teclado (vetor normalizado nas diagonais)
src/effects.js      partículas de hit e pop de coleta
src/player.js       máquina de estados idle/walk/attack, colisão eixo a eixo
src/harvestable.js  ciclo alive → destroyed → respawning → spawning
src/drops.js        arco de ejeção, magnetismo, coleta
src/building.js     área de obra: entrega item a item → obra → construído
src/hud.js          inventário, arma ativa, mensagens, overlays de DEBUG
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

## Sprites a substituir (`src/assets.js`)

Toda a arte é placeholder procedural. Para arte real, troque as funções `create*`
de `assets.js` por carregamento de imagens mantendo a interface `ASSETS.*`:

| Sprite | Tamanho (px) | Frames necessários |
|---|---|---|
| Jogador (menino e menina) | 16×22, âncora nos pés (8,21) | idle ×1, walk ×4, ataque ×3 **por arma** — nas 4 direções (esquerda pode espelhar a direita) |
| Árvore | 24×32, âncora (12,31) | normal + destruída (caída) |
| Rocha de pedra | 20×16, âncora (10,15) | normal + quebrada |
| **Rochas de bronze e ferro (5 estágios de dano)** | 24×20, âncora (12,19) | 5 frames do maior (5 HP) ao menor (1 HP) + quebrada, por tipo |
| Itens/ícones (madeira, minérios, pedra) | 8×8 | 1 (usado no chão e no HUD) |
| Ícones de arma (machado, picareta) | 10×10 | 1 |
| Casa do Ferreiro | 48×40, âncora (24,39) | construída (a "subida" é recorte progressivo do mesmo sprite) |
| Chão | 480×270 (ou tileset 16×16) | o xadrez de dev é gerado em `createGround()` — troque só essa função |

O texto usa uma fonte bitmap 3×5 embutida (`ASSETS.drawText`) para ficar sem antialias.

### Estágios de dano (rochas de bronze e ferro)

As rochas de bronze e ferro têm **5 HP** e mostram um sprite diferente por vida
restante, encolhendo a cada hit (5 HP = maior → 1 HP = menor). O sprite é escolhido
por `Harvestable.currentNormalImage()` via `maxHp - hp`, então qualquer recurso ganha
estágios só declarando `stages: [...]` no lugar de `normal` em `assets.js` e o
`hp` correspondente em `data.js`.

Os placeholders são gerados por `createRockStages(cor)`, com a paleta de cada rocha
em `ROCK_STAGE_COLORS` (adicione uma entrada para dar estágios a uma nova rocha).
Para usar os PNGs reais:

1. Coloque os arquivos em `assets/` (do maior/5 HP ao menor/1 HP):
   - Bronze: `Rock2_grass_shadow_dark1.png` … `Rock2_grass_shadow_dark5.png`
   - Ferro:  `Rock1_grass_shadow_dark1.png` … `Rock1_grass_shadow_dark5.png`
2. Ligue `USE_REAL_ROCK_SPRITES: true` em `config.js`.

Os nomes dos arquivos ficam em `REAL_ROCK_FILES` (`assets.js`) — ajuste ali se os
seus arquivos tiverem outros nomes. São carregados por cima dos placeholders
(`loadRealRockSprites()`); se algum faltar, o placeholder daquele estágio permanece.

## Pronto para o Milestone 2

- **Tabelas de dados**: recursos, armas e construções são data-driven; novos tipos
  não exigem `if/else` novos.
- **Custo multi-item**: `BUILDINGS[].cost` é um mapa `{ item: qtd }` — uma construção
  que custe madeira **e** pedra já funciona na lógica de entrega.
- **Máquinas de estado explícitas** no jogador e nos objetos — fácil adicionar
  estados (nadar, carregar, ferramenta melhorada...).
- **Camada de assets isolada** — sprites reais entram sem tocar na lógica.
- **`window.GAME`** (modo DEBUG) para inspecionar/manipular o mundo em testes.
