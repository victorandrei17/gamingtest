# Pixel Game — esqueleto inicial

Stack: Phaser 3 + TypeScript + Vite.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Hot reload ativo.

## Estado atual

- Core loop mínimo: um retângulo laranja (placeholder do personagem) se move
  com as setas do teclado, dentro dos limites do mundo.
- Nenhum tema definido ainda — nada de recursos, crafting ou construção
  implementado. As pastas `src/systems/`, `src/data/` e `src/entities/`
  têm READMEs explicando o que vai entrar em cada uma.

## Próximos passos sugeridos

1. Definir o tema/setting do jogo.
2. Trocar o placeholder do player por um sprite real (ver `src/scenes/BootScene.ts`).
3. Implementar um sistema por vez (inventário → coleta → crafting → construção),
   testando no navegador a cada etapa.
4. Assets de pixel art: considerar packs prontos (ex: kenney.nl, licença livre)
   antes de gerar arte customizada.

## Estrutura

```
src/
  main.ts          # bootstrap do jogo Phaser
  config.ts        # resolução, escala, tamanho de tile
  scenes/
    BootScene.ts    # preload de assets
    GameScene.ts    # cena principal / core loop
  systems/          # lógica de inventário, crafting, construção etc (vazio por enquanto)
  data/             # JSON de balanceamento (vazio por enquanto)
  entities/         # classes de player, NPCs, recursos (vazio por enquanto)
public/
  assets/
    sprites/
    tiles/
```
