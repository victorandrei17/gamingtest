# assets/

Sprites reais do jogo. Ficam na raiz do projeto (mesmo nível de `index.html`),
carregados por caminho relativo a partir de `src/assets.js`.

## Rocha de bronze (estágios de dano)

Coloque os 5 PNGs aqui, do maior (5 HP) ao menor (1 HP):

| Arquivo | Vida |
|---|---|
| `Rock2_grass_shadow_dark1.png` | 5 HP (maior) |
| `Rock2_grass_shadow_dark2.png` | 4 HP |
| `Rock2_grass_shadow_dark3.png` | 3 HP |
| `Rock2_grass_shadow_dark4.png` | 2 HP |
| `Rock2_grass_shadow_dark5.png` | 1 HP (menor) |

Depois de colocar os arquivos, ligue a flag em `src/config.js`:

```js
USE_REAL_ROCK_SPRITES: true
```

Cada imagem é ajustada à base do frame (24×20) automaticamente por
`loadRealBronzeRock()`. Se algum arquivo faltar, o placeholder procedural
daquele estágio continua sendo usado.
