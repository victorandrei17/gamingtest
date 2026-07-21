// quests.js — sistema de quests: cadeia tutorial 100% declarativa, no
// espírito de RECIPES/BUILDINGS. Quests só OBSERVAM eventos que os sistemas
// existentes já disparam (destruição, coleta, construção, forja, venda) —
// nenhum desses sistemas é reestruturado, cada um ganha só uma chamada a
// Quests.onEvent no ponto em que o efeito já acontece.
'use strict';

// Uma quest por vez, encadeada via `next`. Adicionar uma quest nova = uma
// entrada aqui; não precisa tocar no motor abaixo.
//   objective.type   referencia uma função em QUEST_MATCHERS
//   reward.gold      somado a world.gold
//   reward.items     { itemId: quantidade } somado ao inventário
//   reward.modifiers lista { stat, type, value } — mesmo formato de RECIPES
//   reward.unlockRecipe  id de receita com `locked:true` (recipes.js) que
//                        passa a ser considerada desbloqueada
//   markerBuilding   (opcional) força o marcador de objetivo (4.3) a apontar
//                    para essa construção mesmo quando objective.type não é
//                    BUILD (ex.: a quest final aponta pra ilha)
var QUESTS = [
  {
    id: 'first_wood',
    title: 'Primeiros Passos',
    description: 'Colete 3 madeiras.',
    objective: { type: 'COLLECT', item: 'wood', amount: 3 },
    reward: { gold: 10 },
    next: 'build_smith'
  },
  {
    id: 'build_smith',
    title: 'Um Teto pro Ferreiro',
    description: 'Construa o Ferreiro.',
    objective: { type: 'BUILD', buildingId: 'blacksmith' },
    reward: { gold: 15 },
    next: 'forge_sword'
  },
  {
    id: 'forge_sword',
    title: 'Ferramentas Melhores',
    description: 'Forje uma Espada no Ferreiro.',
    objective: { type: 'FORGE', recipeId: 'sword' },
    reward: { unlockRecipe: 'bronze_axe' },
    next: 'sell_five'
  },
  {
    id: 'sell_five',
    title: 'Fundo de Reserva',
    description: 'Venda 5 itens na aba VENDER do Ferreiro.',
    objective: { type: 'SELL', item: 'any', amount: 5 },
    reward: { gold: 20 },
    next: 'reach_island'
  },
  {
    id: 'reach_island',
    title: 'Rumo ao Mar',
    description: 'Acumule 30 de ouro e desbraveie a nova area a leste.',
    objective: { type: 'GOLD', amount: 30 },
    reward: {},
    next: null,
    markerBuilding: 'island'
  }
];

// Um resolvedor por tipo de objetivo. `matches` decide se um evento conta
// para o objetivo ativo; `amount` quanto ele soma ao progresso; `target`
// quanto é preciso para completar. GOLD não usa matches/amount — é conferido
// direto contra world.gold em Quests.update (ver mais abaixo).
var QUEST_MATCHERS = {
  COLLECT: {
    matches: function (obj, payload) { return payload.item === obj.item; },
    amount: function (payload) { return payload.amount; },
    target: function (obj) { return obj.amount; }
  },
  DESTROY: {
    matches: function (obj, payload) {
      if (obj.resourceId) return payload.resourceId === obj.resourceId;
      if (obj.category) return payload.category === obj.category;
      return false;
    },
    amount: function () { return 1; },
    target: function (obj) { return obj.amount; }
  },
  BUILD: {
    matches: function (obj, payload) { return payload.buildingId === obj.buildingId; },
    amount: function () { return 1; },
    target: function () { return 1; }
  },
  FORGE: {
    matches: function (obj, payload) { return payload.recipeId === obj.recipeId; },
    amount: function () { return 1; },
    target: function () { return 1; }
  },
  SELL: {
    matches: function (obj, payload) { return obj.item === 'any' || obj.item == null || payload.item === obj.item; },
    amount: function (payload) { return payload.amount; },
    target: function (obj) { return obj.amount; }
  },
  GOLD: {
    matches: function () { return false; },
    amount: function () { return 0; },
    target: function (obj) { return obj.amount; }
  }
};

var Quests = (function () {
  var QUEST_BY_ID = {};
  for (var qi = 0; qi < QUESTS.length; qi++) QUEST_BY_ID[QUESTS[qi].id] = QUESTS[qi];

  var activeId = null;
  var completed = {};   // id -> true
  var progress = 0;     // contador do objetivo ativo (só usado por COLLECT/DESTROY/SELL)
  var flashTime = 0;    // s restantes do destaque de conclusão no tracker

  function reset() {
    activeId = null;
    completed = {};
    progress = 0;
    flashTime = 0;
  }

  function start(id) {
    activeId = id;
    progress = 0;
  }

  function activeQuest() { return activeId ? QUEST_BY_ID[activeId] : null; }
  function isCompleted(id) { return !!completed[id]; }
  function byId(id) { return QUEST_BY_ID[id]; }

  // Ordem da cadeia a partir da primeira quest declarada, seguindo `next` —
  // usado pelo log (4.2) pra listar concluídas/ativa/futuras na ordem certa
  // mesmo que QUESTS não esteja em ordem de array.
  function chainOrder() {
    var ids = [], seen = {}, id = QUESTS.length ? QUESTS[0].id : null;
    while (id && !seen[id]) {
      seen[id] = true;
      ids.push(id);
      id = QUEST_BY_ID[id].next;
    }
    return ids;
  }

  // Receita com `locked:true` (recipes.js) some ficar bloqueada até que
  // alguma quest concluída a liste em reward.unlockRecipe.
  function isRecipeLocked(recipeId) {
    var rec = RECIPE_BY_ID[recipeId];
    if (!rec || !rec.locked) return false;
    for (var i = 0; i < QUESTS.length; i++) {
      var q = QUESTS[i];
      if (q.reward && q.reward.unlockRecipe === recipeId && completed[q.id]) return false;
    }
    return true;
  }

  function applyReward(reward, world) {
    if (!reward) return;
    if (reward.gold) { world.gold += reward.gold; HUD.notifyGold(); }
    if (reward.items) {
      for (var item in reward.items) world.addToInventory(item, reward.items[item]);
    }
    if (reward.modifiers) world.stats.setModifiers(world.stats.mods.concat(reward.modifiers));
  }

  function complete(world) {
    var q = QUEST_BY_ID[activeId];
    completed[activeId] = true;
    applyReward(q.reward, world);
    flashTime = CONFIG.UNLOCK_MSG_TIME;
    world.showMessage('QUEST CONCLUIDA: ' + q.title.toUpperCase(), CONFIG.UNLOCK_MSG_TIME);
    if (q.next) start(q.next);
    else { activeId = null; progress = 0; }
  }

  // Chamado pelos sistemas existentes no ponto em que o efeito já acontece
  // (destruição, coleta, construção, forja, venda). Só faz algo se o tipo
  // bater com o objetivo da quest ativa no momento.
  function onEvent(type, payload, world) {
    var q = activeQuest();
    if (!q || q.objective.type !== type) return;
    var obj = q.objective, matcher = QUEST_MATCHERS[type];
    if (!matcher.matches(obj, payload)) return;
    progress += matcher.amount(payload);
    if (progress >= matcher.target(obj)) complete(world);
  }

  // GOLD é estado acumulado, não um evento pontual — conferido a cada frame.
  // Também é aqui que o destaque do tracker se apaga com o tempo.
  function update(dt, world) {
    if (flashTime > 0) flashTime -= dt;
    var q = activeQuest();
    if (q && q.objective.type === 'GOLD' && world.gold >= q.objective.amount) complete(world);
  }

  // { current, target, binary } pro tracker/log. binary = objetivo tudo-ou-
  // nada (BUILD/FORGE), sem contagem fracionária.
  function currentProgress(world) {
    var q = activeQuest();
    if (!q) return null;
    var obj = q.objective;
    if (obj.type === 'GOLD') return { current: Math.min(world.gold, obj.amount), target: obj.amount, binary: false };
    if (obj.type === 'BUILD' || obj.type === 'FORGE') return { current: 0, target: 1, binary: true };
    return { current: progress, target: QUEST_MATCHERS[obj.type].target(obj), binary: false };
  }

  // Construção alvo do marcador de objetivo (4.3): BUILD aponta pra si
  // mesma; outros tipos só apontam se a quest declarar `markerBuilding`.
  function markerBuildingId() {
    var q = activeQuest();
    if (!q) return null;
    if (q.objective.type === 'BUILD') return q.objective.buildingId;
    return q.markerBuilding || null;
  }

  return {
    start: start,
    reset: reset,
    onEvent: onEvent,
    update: update,
    activeQuest: activeQuest,
    isCompleted: isCompleted,
    isRecipeLocked: isRecipeLocked,
    currentProgress: currentProgress,
    chainOrder: chainOrder,
    markerBuildingId: markerBuildingId,
    byId: byId,
    flashTime: function () { return flashTime; },
    debugState: function () { return { activeId: activeId, progress: progress, completed: completed }; }
  };
})();
