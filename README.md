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

**Controles:** WASD ou setas para andar (8 direções). Na tela inicial, setas +
Enter/Espaço, ou clique/toque direto no personagem (funciona em touch de
celular) para escolher e começar. O ataque é automático ao encostar
em um objeto atingível (a arma correta é selecionada sozinha).

## Constantes (`src/config.js`)

Todos os números de balanceamento vivem em `CONFIG` — nenhum valor mágico no código.

| Constante | Padrão | Efeito |
|---|---|---|
| `DEBUG` | `true` | Overlays de desenvolvimento (grade numerada, hitboxes, raio de coleta, coordenadas do jogador, timers de respawn); com `true`, mostra um botão **DEBUG** no canto superior direito da tela pra ligar/desligar o overlay em runtime sem editar este arquivo |
| `GAME_WIDTH` / `GAME_HEIGHT` | 496 / 270 | Resolução interna — `ORIGINAL_MAP_WIDTH` (336) + a faixa de água da ilha |
| `ORIGINAL_MAP_WIDTH` | 336 | Borda direita do mapa original; além dela é a faixa travada da "ilha" |
| `ISLAND_WATER_TILES` | 10 | Tiles de água acrescentados à direita (destravados ao criar a "ilha") |
| `SCALE` | 4 | Escala inteira de exibição (1984×1080) |
| `TILE_SIZE` | 16 | Grid base em px |
| `PLAYER_SPEED` | 90 | Velocidade do jogador (px/s) |
| `PLAYER_HITBOX_W` / `_H` | 10 / 6 | Hitbox de colisão pelos pés |
| `PLAYER_REACH` | 6 | Alcance do golpe à frente do jogador (px) — o ataque só ocorre de frente para o objeto |
| `BASE_DAMAGE` | 1 | Atributo base `damage` (dano por hit) |
| `BASE_ATTACK_SPEED` | 1.0 | Atributo base `attackSpeed` (multiplicador do cooldown) |
| `HIT_COOLDOWN` | 0.5 | Segundos entre golpes (dividido por `attackSpeed`) |
| `ATTACK_ANIM_TIME` | 0.25 | Duração da animação de golpe |
| `RESPAWN_TIME` | 5 | Segundos para o objeto reaparecer |
| `DEATH_FADE_TIME` | 2 | Segundos de fade ao morrer (árvores/rochas e inimigos) |
| `SPAWN_ANIM_TIME` | 0.4 | Duração da animação de surgimento |
| `HEALTHBAR_HIDE_TIME` | 3 | Segundos sem dano até esconder a barra de vida |
| `START_INVENTORY_QTY` | 10 | Quantidade inicial de cada coletável (facilita testar forja/venda sem coletar antes) |
| `COLLECT_RADIUS` | 20 | Raio de atração dos drops (px) |
| `DROP_ARC_TIME` | 0.35 | Duração do arco de ejeção do drop |
| `MAGNET_TIME` | 0.25 | Duração do tween de magnetismo até o jogador |
| `PICKUP_ANIM_TIME` | 2 | Segundos travado erguendo um item pego no chão (ver `pickup.js`) |
| `BUILD_TIME` | 3 | Segundos de construção |
| `BLACKSMITH_COST` | 3 | Madeiras para o Ferreiro |
| `DELIVER_INTERVAL` | 0.2 | Intervalo entre cada madeira voando até a área |
| `UNLOCK_MSG_TIME` | 2 | Duração das mensagens de destaque (desbloqueio/forja) |
| `FORGE_TIME` | 3 | Segundos de forja (padrão; cada receita pode sobrescrever) |
| `SMITH_INTERACT_RADIUS` | 34 | Proximidade (px) para exibir `[E] FORJAR` |
| `DENY_FLASH_TIME` | 0.3 | Feedback de negação ao tentar forjar sem recursos |
| `GOLD_PER_ITEM` | 3 | Gold recebido ao vender 1 coletável (fixo para todos) |
| `FORGE_STRIKE_PERIOD` | 0.3 | Segundos entre marteladas na bigorna (animação de forja) |
| `HUD_PULSE_TIME` | 0.25 | Duração do pulso do contador do HUD ao coletar |
| `FLOAT_TEXT_TIME` | 0.8 | Duração do `+1` flutuante ao coletar |
| `STAT_FLASH_TIME` | 1.5 | Duração do destaque dourado ao ganhar um bônus |
| `ENEMY_RESPAWN_TIME` | 5 | Segundos para o inimigo reaparecer no ponto de spawn |

## Arquitetura

Scripts clássicos carregados em ordem no `index.html` (sem ES modules, para
funcionar via `file://`):

```
src/config.js       constantes de balanceamento + DEBUG
src/data.js         tabelas ITEM_TYPES, RESOURCE_TYPES, WEAPON_TYPES, BUILDINGS
src/level.js        posições declarativas dos objetos e construções
src/stats.js        atributos base + modificadores + valor final (stats.get)
src/recipes.js      receitas forjáveis declarativas (RECIPES)
src/quests.js       cadeia de quests declarativa (QUESTS) + motor de progresso/reward
src/equipment.js    itens equipados → injeta modificadores em stats
src/assets.js       TODA a arte (procedural) — única camada a trocar por sprites reais
src/input.js        teclado (vetor normalizado nas diagonais) + mouse
src/effects.js      partículas de hit e pop de coleta
src/player.js       máquina de estados idle/walk/attack/pickup, colisão; lê dano/velocidade de stats
src/pickup.js       itens fixos no chão que concedem uma ferramenta ao serem tocados (ex.: o machado)
src/harvestable.js  ciclo alive → destroyed → respawning → spawning
src/drops.js        arco de ejeção, magnetismo, coleta
src/building.js     área de obra: entrega item a item → obra → construído
src/forge.js        proximidade com o ferreiro + janela de forja (seleção, timer, consumo)
src/hud.js          faixa de recursos + painel de personagem + mensagens + DEBUG
src/main.js         bootstrap, cena de seleção, mundo, game loop com dt
```

Com `DEBUG = true`, `window.GAME` expõe `scene`, `world` e `quests` (id da quest
ativa, progresso e mapa de concluídas) para inspeção no console.

### Como estender (editando só dados)

- **Novo recurso** (ex.: ouro): adicione `gold_ore` em `ITEM_TYPES`/`INVENTORY_ORDER`
  e `gold_rock` em `RESOURCE_TYPES` (`data.js`), posicione instâncias em `level.js`
  e (opcional) um sprite em `assets.js` — a lógica não muda.
- **Nona instância de objeto**: uma linha nova em `LEVEL.objects` (`level.js`).
- **Nova arma**: entrada em `WEAPON_TYPES` com `targetCategory` + ícone/animação em
  `assets.js`; a seleção automática usa o índice derivado `WEAPON_FOR_CATEGORY`.
- **Novo pickup** (item fixo no chão que concede uma ferramenta, ex.: o machado):
  uma linha em `LEVEL.pickups` (`type` referencia `ASSETS.weaponIcons`) — `pickup.js`
  faz o resto (detecção de toque, animação travada de `CONFIG.PICKUP_ANIM_TIME`s
  erguendo o item, disparo do evento `PICKUP` pras quests).
- **Nova construção**: entrada em `BUILDINGS` (custo, tempo, mensagem, tamanho) +
  instância em `LEVEL.buildings` + sprite em `ASSETS.buildings`. Só o ferreiro
  abre a janela de forja (`Forge.nearSmith` filtra por `type: 'blacksmith'`) —
  outras construções não interferem nesse fluxo. `explosionOnBuild: true`
  troca o reveal padrão ("casa subindo") por um estouro de partículas
  (`ASSETS.particleColors[type]` define as cores) ao concluir.
- **Nova receita de forja**: uma entrada em `RECIPES` (`recipes.js`) + ícone em
  `ASSETS.forgeIcons` — a janela de forja, o custo e o equipamento se adaptam sozinhos.
- **Nova quest**: uma entrada em `QUESTS` (`quests.js`), apontando `next` para
  encadear — tracker, log (`Q`) e reward se adaptam sozinhos (ver seção abaixo).

### Expansão de mapa ("ilha")

A faixa de `CONFIG.ORIGINAL_MAP_WIDTH` (336) até `CONFIG.GAME_WIDTH` (496) nasce
como água — mas só um recorte de 5x5 tiles dela (`BUILDINGS.island.width/height`,
`data.js`) é desbloqueável; o resto da faixa é água permanente, bloqueada pra
sempre. `main.js` (`rebuildSolids`) cerca esse retângulo com três sólidos fixos
(acima, à direita, abaixo — nunca somem) e um quarto sólido, do tamanho exato
do retângulo, que existe só enquanto a construção `island` não está `'built'`.
`island` usa `terrainUnlock: true`: não é uma estrutura física, então
`Building.solidBox`/`draw` (`building.js`) não geram sólido nem sprite próprios
para ela — só a área de entrega (dashed marker + ícone + contador, igual ao
ferreiro) aparece encostada na fronteira verde/água, alcançável do lado de
dentro. Ao entregar os itens (`cost: { geleia_rosa: 1, pluma: 1 }`), a construção completa
(`explosionOnBuild: true`, partículas via `ASSETS.particleColors.island`), o
quarto sólido some e `main.js` sobrepõe `ASSETS.groundExtension` — só sobre o
retângulo 5x5, não a faixa inteira — com o mesmo xadrez de grama do resto do
mapa (paridade de tile calculada a partir da posição absoluta pra encaixar sem
costura). O mapa cresce de verdade, só naquele pedaço; o resto do mar continua
água pra sempre. Uma nova expansão seguiria o mesmo padrão: outro recorte,
outra entrada em `BUILDINGS` com `terrainUnlock`.

### Atributos e forja (Milestone 2)

Os atributos do personagem (`damage`, `moveSpeed`, `attackSpeed`) têm base em
`config.js` e são calculados por `stats.js` como **base + modificadores** dos itens
equipados: `final = (base + Σflat) × (1 + Σpercent)`. Nada lê dano/velocidade
hardcoded — tudo vem de `stats.get(...)`.

Formato de uma **receita** (`recipes.js`):

```js
{
  id: 'sword',                 // referência única
  name: 'Espada',
  slot: 'weapon',               // slot de equipamento (EQUIP_SLOTS em data.js)
  icon: 'sword',                // chave em ASSETS.forgeIcons
  cost: { wood: 2, iron_ore: 2 },
  time: CONFIG.FORGE_TIME,      // segundos de forja
  modifiers: [{ stat: 'damage', type: 'flat', value: 1 }],
  desc: 'Lamina afiada de ferro que aumenta o dano dos seus golpes.' // coluna DESCRICAO da bancada
}
```

Um **modificador** é declarativo: `{ stat, type: 'flat'|'percent', value }`.
Ao forjar, o custo é debitado na hora, a barra de progresso roda `time` segundos
(mesmo com a janela fechada) e, ao concluir, `equipment.equip(id)` recalcula os
atributos — o bônus vale imediatamente.

### Dano por categoria de alvo

Além do atributo global `damage` (soma em qualquer golpe), existem atributos de
bônus que só valem contra uma categoria de objeto: `damageTree` (árvores) e
`damageRock` (rochas/minérios) — base 0, só existem via modificador de item.
`CATEGORY_DAMAGE_STAT` (`data.js`) mapeia `category -> stat`; no golpe, `player.js`
calcula `stats.get('damage') + stats.get(CATEGORY_DAMAGE_STAT[categoriaDoAlvo])`.
Machado de Bronze (`damageTree +1`) e Picareta de Bronze (`damageRock +1`) usam
esse mecanismo — o bônus de um nunca vaza para a categoria do outro. Uma nova
categoria de alvo (ex.: `metal` para um monstro) só precisa de uma entrada nova
em `CATEGORY_DAMAGE_STAT` + o `base` correspondente em `Stats()` (`stats.js`).

### Equipamento, venda e gold

`EQUIP_SLOTS` (`data.js`) define os slots de forma declarativa: `weapon`, `boot`,
`axe` e `pickaxe` são **permanentes** (`removable:false`, só recebem upgrade — o
slot fica esmaecido até a receita correspondente ser forjada); `chest` e `ring`
são **removíveis** (`removable:true`). A ferramenta base (machado/picareta) já é
usável desde o início — o slot de equipamento só rastreia o *upgrade* de bronze
e o bônus de dano que ele concede, sem afetar qual ferramenta o jogador empunha
automaticamente (`WEAPON_FOR_CATEGORY`, inalterado). A receita aponta o slot que
ocupa via `slot`; `equipment.owned` guarda tudo já forjado, então um item
removido (peito/anel) pode ser reequipado.

O ferreiro (tecla `E`) tem duas abas: **FORJAR** e **VENDER**. Na venda, cada
coletável vale `CONFIG.GOLD_PER_ITEM` gold (fixo), e só itens com quantidade > 0
aparecem na grade 2x3 (`Forge.sellList()`). A janela de VENDER usa o mesmo
tamanho fixo (304x178) da janela de FORJAR — trocar de aba não redimensiona
a janela. O gold acumula em `world.gold` e aparece no rodapé do inventário e
no rodapé da janela do ferreiro — reservado para revelar novas áreas no
próximo passo.

A aba **FORJAR** é uma bancada em 3 colunas (`Forge.drawCraft` em `forge.js`):
esquerda com a grade de itens forjáveis (ícone por receita, selecionável por mouse
ou teclado); meio-topo com uma grade 3×3 dos ingredientes da receita selecionada
(preenche as primeiras N células, com quantidade colorida verde/vermelha);
meio-base com o botão **FORJAR** e uma bigorna desenhada em `Forge.drawAnvil` — ao
confirmar, uma marreta bate no ritmo de `CONFIG.FORGE_STRIKE_PERIOD` soltando
faíscas (`Forge.spawnSparks`) enquanto a barra de progresso avança; direita com a
descrição do item (ícone, nome, efeito e texto livre via `recipe.desc`).

**Controles:** `[C]` equipamento + status, `[I]` inventário (com total de gold),
`[Q]` log de quests, `[E]` ferreiro (forjar/vender) perto da estação, `ESC` fecha,
mouse+teclado nas janelas. Equipamento, inventário, quests e ferreiro são
mutuamente exclusivos (abrir um fecha os outros).

### Sistema de quests (Milestone 3)

Cadeia tutorial 100% declarativa (`src/quests.js`), no mesmo espírito de
`RECIPES`/`BUILDINGS`: uma quest ativa por vez, cada uma apontando a próxima via
`next`. As quests **observam** eventos que os outros sistemas já disparam —
nenhum deles foi reestruturado, cada um só ganhou uma chamada a `Quests.onEvent`
no ponto em que o efeito já acontecia (destruição em `harvestable.js`, coleta em
`drops.js`, construção concluída em `building.js`, forja e venda em `forge.js`).
`GOLD` é a exceção: como é estado acumulado (não um evento pontual), é conferido
a cada frame por `Quests.update`, chamado de `main.js` junto do resto do loop —
por isso não é usado em quests que vêm depois de outra que já dá gold de reward
na mesma cadeia (o total já bateria a meta no instante em que ela ativa).

Ao atingir o objetivo a quest **não conclui sozinha**: ela vira `Quests.isReady()`
e o tracker pulsa convidando o clique. Só quando o jogador clica no tracker
(`Quests.claim`, chamado de `HUD.update`) é que a reward é aplicada, a mensagem
de conclusão aparece e a próxima da cadeia (`next`) é ativada.

Formato de uma quest:

```js
{
  id: 'first_wood',
  title: 'Primeiros Passos',
  description: 'Colete 3 madeiras.',
  objective: { type: 'COLLECT', item: 'wood', amount: 3 },
  reward: { gold: 10 },
  next: 'build_smith'          // id da próxima quest da cadeia, ou null no fim
}
```

Tipos de objetivo (`objective.type`), cada um resolvido por uma entrada em
`QUEST_MATCHERS` — adicionar um tipo novo é só uma entrada nessa tabela:

| Tipo | Campos | Conta contra |
|---|---|---|
| `COLLECT` | `item`, `amount` | quantidade **ganha** desde o início da quest (não o total do inventário — não completa sozinha por causa do estoque de `START_INVENTORY_QTY`) |
| `COLLECT_SET` | `items: { itemId: quantidade, ... }` | igual `COLLECT`, mas pedindo vários itens diferentes na mesma quest — cada item é o seu próprio "balde" de progresso, todos precisam bater a meta |
| `DESTROY` | `category` ou `resourceId`, `amount` | harvestables destruídos |
| `BUILD` | `buildingId` | construção concluída |
| `FORGE` | `recipeId` | forja concluída |
| `SELL` | `item` (ou `'any'`), `amount` | itens vendidos na aba VENDER |
| `GOLD` | `amount` | `world.gold` acumulado (evitar encadear logo após uma quest que dá gold de reward — ver nota acima) |
| `PICKUP` | `pickupId` | um `Pickup` do chão foi tocado (`pickup.js`) — ver Ferramentas abaixo |

`reward` aceita, todos opcionais: `gold` (soma a `world.gold`), `items`
(`{ itemId: quantidade }`, soma ao inventário), `modifiers` (lista
`{ stat, type, value }`, empurrada para `stats.setModifiers` — mesmo formato de
`RECIPES.modifiers`) e `unlockRecipe` (id de receita). Uma receita com
`locked: true` em `recipes.js` (ex.: `bronze_axe`) fica esmaecida e bloqueada na
bancada (`Forge.recipeState` retorna `'locked'`) até que alguma quest concluída
liste esse id em `reward.unlockRecipe` (`Quests.isRecipeLocked`) — sem precisar
mutar `RECIPES` em runtime. O mesmo padrão vale pra construções: `revealQuest`
em `BUILDINGS` (ex.: o Ferreiro só aparece após `first_wood`) esconde a área de
obra inteira — sem marcador tracejado, ícone ou entrega — até aquela quest
concluir (`Building.isRevealed`, `building.js`).

**UI:** tracker discreto no canto superior direito (título + progresso, ou só o
título nos objetivos tudo-ou-nada) com um destaque dourado breve ao concluir
(mesmo padrão de `CONFIG.UNLOCK_MSG_TIME` das mensagens de desbloqueio); log
completo em `[Q]`, na mesma moldura (`ASSETS.drawPanel`) do equipamento/inventário,
listando concluídas (marcadas), a ativa (com progresso e descrição) e as
próximas da cadeia esmaecidas (só o título, sem revelar o objetivo); e um
marcador pulsante (`!`) sobre o alvo da quest quando ele ainda não foi
concluído/coletado: `Quests.markerBuildingId` aponta pra uma construção (direto
pra objetivos `BUILD`, ou via o campo opcional `markerBuilding` quando o
objetivo não é `BUILD`); `Quests.markerPos` aponta pra uma posição fixa do
mapa via o campo opcional `markerPos` (usado pelo machado — some quando
`world.pickups` esvazia).

### Ferramentas: o machado precisa ser encontrado

O jogador começa **sem o machado** — só com a picareta (`Player.hasAxe = false`
por padrão). Sem ele, árvores simplesmente não reagem a golpes (checado em
`Player.update`, `player.js`); o slot do machado no painel de equipamento
(`[C]`) fica esmaecido com a nota "(nao encontrado)" até então. O machado é um
`Pickup` (`pickup.js`) parado no mapa (`LEVEL.pickups`, `level.js`) — ao
encostar nele, o jogador ganha `hasAxe = true` na hora e entra no estado
`'pickup'` (`Player.startPickup`), travado por `CONFIG.PICKUP_ANIM_TIME`
segundos erguendo o ícone do item acima da cabeça (sem sprite dedicado — arte
procedural), ignorando totalmente input de movimento/ataque nesse intervalo.
O toque também dispara o evento `PICKUP` pras quests.

Cadeia atual: **achar o machado** → coletar madeira → construir o Ferreiro →
forjar a Espada (desbloqueia o Machado de Bronze) → vender 5 itens → caçar
Poring/Coelho Branco por Geléia Rosa e Pluma → entregar os dois na área da
ilha (`BUILDINGS.island.cost`) — guiando o jogador até a expansão da ilha, que
já existia no código mas não tinha nenhum gancho narrativo até agora.

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
| Ícones de forja (espada, bota, peito, anel, machado de bronze, picareta de bronze) | 12×12 | 1 por receita, chave em `ASSETS.forgeIcons` |
| Estação do Ferreiro (fornalha + bigorna) | 56×44, âncora (28,43) | construída (a "subida" é recorte progressivo do mesmo sprite) |
| Chão | 336×270 (ou tileset 16×16) | o xadrez de dev é gerado em `createGround()` — troque só essa função |

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

## Pronto para o Milestone 4

- **Quests repetíveis**: o motor (`Quests.onEvent`/`complete`) hoje assume uma
  cadeia linear (`completed[id]` fica `true` pra sempre); uma quest com um flag
  `repeatable: true` poderia reiniciar (`progress = 0`) em vez de travar em
  `completed`, sem mudar os pontos de evento já instrumentados.
- **Encomendas do ferreiro como segunda camada**: o mesmo formato de objetivo
  (`COLLECT`/`SELL`/`FORGE`) e o mesmo `QUEST_MATCHERS` servem para um quadro de
  encomendas rotativo — só precisaria de uma fonte de quests diferente de
  `QUESTS` (gerada/sorteada) alimentando o mesmo motor.
- **Atributos data-driven**: novos atributos entram em `CONFIG` + `STAT_LABELS`;
  `stats.get()` já compõe `flat`/`percent` de qualquer fonte de modificadores.
- **Modificadores genéricos**: qualquer sistema (poções, buffs temporários, níveis)
  pode empurrar `{ stat, type, value }` para `stats.setModifiers` sem tocar no resto.
- **Receitas e equipamento declarativos**: novas forjas/slots = novas entradas em
  `RECIPES`; a UI de forja e o painel se adaptam sozinhos. `locked: true` já dá
  suporte a receitas gated por progresso (hoje usado pelas quests).
- **Forja em background com uma fila de 1** — base pronta para múltiplas forjas/fila.
- **Slots removíveis vs. permanentes** já modelados em `EQUIP_SLOTS`; peito/anel
  esperam apenas suas receitas para virem itens equipáveis.
- **Economia de gold** pronta (`world.gold`, venda a `GOLD_PER_ITEM`) — já usada
  pela quest final para guiar o jogador até a expansão da ilha.
- **HUD centralizado** (`hud.js`) com painel modular (boneco, atributos, grade) e
  primitivas de UI reutilizáveis (`ASSETS.drawPanel` / `drawSlot`), incluindo
  agora o tracker e o log de quests.
- **Tabelas de dados** de recursos, armas, construções, receitas e quests
  continuam data-driven; novos tipos não exigem `if/else`.
- **`window.GAME`** (modo DEBUG) para inspecionar/manipular o mundo e as quests
  em testes.

> Observação de balanceamento: os objetos foram elevados a 5 HP (estágios de dano) a
> pedido, então a Espada (`damage +1`) faz 2 de dano por hit em vez de derrubar uma
> árvore de 2 HP em um golpe. É só ajustar o `hp` em `data.js` se quiser o
> comportamento de "1 hit".
