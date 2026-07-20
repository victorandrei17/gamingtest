# assets/

Sprites reais do jogo. Ficam na raiz do projeto (mesmo nível de `index.html`),
carregados por caminho relativo a partir de `src/assets.js`.

## Rochas com estágios de dano

Cada objeto usa 5 PNGs, do maior (5 HP) ao menor (1 HP).

**Árvore:**

| Arquivo | Vida |
|---|---|
| `Tree_grass_shadow_dark1.png` | 5 HP (maior) |
| `Tree_grass_shadow_dark2.png` | 4 HP |
| `Tree_grass_shadow_dark3.png` | 3 HP |
| `Tree_grass_shadow_dark4.png` | 2 HP |
| `Tree_grass_shadow_dark5.png` | 1 HP (menor) |

**Rocha de bronze:**

| Arquivo | Vida |
|---|---|
| `Rock2_grass_shadow_dark1.png` | 5 HP (maior) |
| `Rock2_grass_shadow_dark2.png` | 4 HP |
| `Rock2_grass_shadow_dark3.png` | 3 HP |
| `Rock2_grass_shadow_dark4.png` | 2 HP |
| `Rock2_grass_shadow_dark5.png` | 1 HP (menor) |

**Rocha de ferro:**

| Arquivo | Vida |
|---|---|
| `Rock1_grass_shadow_dark1.png` | 5 HP (maior) |
| `Rock1_grass_shadow_dark2.png` | 4 HP |
| `Rock1_grass_shadow_dark3.png` | 3 HP |
| `Rock1_grass_shadow_dark4.png` | 2 HP |
| `Rock1_grass_shadow_dark5.png` | 1 HP (menor) |

Depois de colocar os arquivos, ligue a flag em `src/config.js`:

```js
USE_REAL_ROCK_SPRITES: true
```

Cada imagem é ajustada à base do frame automaticamente por
`loadRealStageSprites()` (24×20 para rochas, 24×32 para a árvore). Se algum
arquivo faltar, o placeholder procedural daquele estágio continua sendo usado.
Os nomes ficam em `REAL_STAGE_FILES` (`src/assets.js`) — ajuste ali se os seus
arquivos tiverem outros nomes.
