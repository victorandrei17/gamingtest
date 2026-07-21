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
//                    BUILD
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
    next: 'hunt_rare_drops'
  },
  {
    id: 'hunt_rare_drops',
    title: 'Primeira Cacada',
    description: 'Colete 1 Geleia Rosa e 1 Pluma.',
    objective: { type: 'COLLECT_SET', items: { geleia_rosa: 1, pluma: 1 } },
    reward: { gold: 15 },
    next: 'reach_island'
  },
  {
    id: 'reach_island',
    title: 'Terras Novas',
    description: 'Entregue os itens na nova area a leste para desbravar a ilha.',
    objective: { type: 'BUILD', buildingId: 'island' },
    reward: {},
    next: null
  }
];

// Um resolvedor por tipo de objetivo. `eventType` é o tipo de evento (o
// primeiro argumento de Quests.onEvent, disparado pelos outros sistemas) que
// esse objetivo escuta — várias entradas podem escutar o mesmo eventType
// (ex.: COLLECT e COLLECT_SET reagem ao mesmo evento 'COLLECT' de drops.js,
// só mudam como validam/contam). `matches` decide se aquele evento em
// particular conta para o objetivo ativo; `bucket` em qual "balde" de
// progresso ele soma (a maioria dos tipos tem um único balde fixo '_';
// COLLECT_SET tem um por item, pra poder pedir mais de um item na mesma
// quest); `amount` quanto soma nesse balde; `targets` quanto cada balde
// precisa pra completar. GOLD não tem eventType — é estado acumulado,
// conferido direto contra world.gold em Quests.update (ver mais abaixo).
var SINGLE_BUCKET = '_';
var QUEST_MATCHERS = {
  COLLECT: {
    eventType: 'COLLECT',
    matches: function (obj, payload) { return payload.item === obj.item; },
    bucket: function () { return SINGLE_BUCKET; },
    amount: function (payload) { return payload.amount; },
    targets: function (obj) { var t = {}; t[SINGLE_BUCKET] = obj.amount; return t; }
  },
  // Coleta de vários itens diferentes numa mesma quest: objective.items é
  // { itemId: quantidade, ... }; cada item é o seu próprio balde de progresso.
  COLLECT_SET: {
    eventType: 'COLLECT',
    matches: function (obj, payload) { return Object.prototype.hasOwnProperty.call(obj.items, payload.item); },
    bucket: function (payload) { return payload.item; },
    amount: function (payload) { return payload.amount; },
    targets: function (obj) { return obj.items; }
  },
  DESTROY: {
    eventType: 'DESTROY',
    matches: function (obj, payload) {
      if (obj.resourceId) return payload.resourceId === obj.resourceId;
      if (obj.category) return payload.category === obj.category;
      return false;
    },
    bucket: function () { return SINGLE_BUCKET; },
    amount: function () { return 1; },
    targets: function (obj) { var t = {}; t[SINGLE_BUCKET] = obj.amount; return t; }
  },
  BUILD: {
    eventType: 'BUILD',
    matches: function (obj, payload) { return payload.buildingId === obj.buildingId; },
    bucket: function () { return SINGLE_BUCKET; },
    amount: function () { return 1; },
    targets: function () { var t = {}; t[SINGLE_BUCKET] = 1; return t; }
  },
  FORGE: {
    eventType: 'FORGE',
    matches: function (obj, payload) { return payload.recipeId === obj.recipeId; },
    bucket: function () { return SINGLE_BUCKET; },
    amount: function () { return 1; },
    targets: function () { var t = {}; t[SINGLE_BUCKET] = 1; return t; }
  },
  SELL: {
    eventType: 'SELL',
    matches: function (obj, payload) { return obj.item === 'any' || obj.item == null || payload.item === obj.item; },
    bucket: function () { return SINGLE_BUCKET; },
    amount: function (payload) { return payload.amount; },
    targets: function (obj) { var t = {}; t[SINGLE_BUCKET] = obj.amount; return t; }
  },
  GOLD: {
    eventType: null,
    matches: function () { return false; },
    bucket: function () { return SINGLE_BUCKET; },
    amount: function () { return 0; },
    targets: function (obj) { var t = {}; t[SINGLE_BUCKET] = obj.amount; return t; }
  }
};

var Quests = (function () {
  var QUEST_BY_ID = {};
  for (var qi = 0; qi < QUESTS.length; qi++) QUEST_BY_ID[QUESTS[qi].id] = QUESTS[qi];

  var activeId = null;
  var completed = {};   // id -> true
  var progress = {};    // balde -> contador (balde único '_' na maioria dos tipos, um por item em COLLECT_SET)
  var ready = false;    // objetivo já atingido, aguardando o jogador clicar no tracker pra coletar
  var flashTime = 0;    // s restantes do destaque dourado após coletar

  function reset() {
    activeId = null;
    completed = {};
    progress = {};
    ready = false;
    flashTime = 0;
  }

  function start(id) {
    activeId = id;
    progress = {};
    ready = false;
  }

  function activeQuest() { return activeId ? QUEST_BY_ID[activeId] : null; }
  function isCompleted(id) { return !!completed[id]; }
  function isReady() { return ready; }
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
    if (reward.gold) { world.gold += reward.gold; HUD.notifyGold(reward.gold); }
    if (reward.items) {
      for (var item in reward.items) world.addToInventory(item, reward.items[item]);
    }
    if (reward.modifiers) world.stats.setModifiers(world.stats.mods.concat(reward.modifiers));
  }

  // Objetivo atingido: só marca "pronta pra coletar" — não aplica reward nem
  // avança a cadeia ainda. Isso só acontece quando o jogador clica no tracker
  // (ver HUD.claim/Quests.claim), pra dar tempo do highlight ser percebido.
  function markReady() { ready = true; }

  // Chamado pelo clique no tracker (hud.js) quando a quest ativa está pronta.
  function claim(world) {
    if (!ready || !activeId) return;
    var q = QUEST_BY_ID[activeId];
    completed[activeId] = true;
    applyReward(q.reward, world);
    flashTime = CONFIG.UNLOCK_MSG_TIME;
    world.showMessage('QUEST CONCLUIDA: ' + q.title.toUpperCase(), CONFIG.UNLOCK_MSG_TIME);
    if (q.next) start(q.next);
    else { activeId = null; progress = {}; ready = false; }
  }

  function allTargetsMet(targets) {
    for (var k in targets) { if ((progress[k] || 0) < targets[k]) return false; }
    return true;
  }

  // Chamado pelos sistemas existentes no ponto em que o efeito já acontece
  // (destruição, coleta, construção, forja, venda). Só faz algo se o
  // eventType do objetivo ativo bater com o evento recebido — o objective.type
  // pode ser mais específico que o evento (ex.: COLLECT_SET reage a 'COLLECT').
  function onEvent(type, payload, world) {
    var q = activeQuest();
    if (!q || ready) return;
    var obj = q.objective, matcher = QUEST_MATCHERS[obj.type];
    if (!matcher || matcher.eventType !== type) return;
    if (!matcher.matches(obj, payload)) return;
    var key = matcher.bucket(payload);
    progress[key] = (progress[key] || 0) + matcher.amount(payload);
    if (allTargetsMet(matcher.targets(obj))) markReady();
  }

  // GOLD é estado acumulado, não um evento pontual — conferido a cada frame.
  // Também é aqui que o destaque dourado pós-coleta se apaga com o tempo.
  function update(dt, world) {
    if (flashTime > 0) flashTime -= dt;
    var q = activeQuest();
    if (q && !ready && q.objective.type === 'GOLD' && world.gold >= q.objective.amount) markReady();
  }

  // { current, target, binary } pro tracker/log. binary = objetivo tudo-ou-
  // nada (BUILD/FORGE), sem contagem fracionária. Para objetivos com mais de
  // um balde (COLLECT_SET), current/target somam todos os baldes juntos.
  function currentProgress(world) {
    var q = activeQuest();
    if (!q) return null;
    var obj = q.objective;
    if (obj.type === 'GOLD') return { current: Math.min(world.gold, obj.amount), target: obj.amount, binary: false };
    if (obj.type === 'BUILD' || obj.type === 'FORGE') return { current: 0, target: 1, binary: true };
    var targets = QUEST_MATCHERS[obj.type].targets(obj);
    var current = 0, target = 0;
    for (var k in targets) { current += Math.min(progress[k] || 0, targets[k]); target += targets[k]; }
    return { current: current, target: target, binary: false };
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
    claim: claim,
    isReady: isReady,
    activeQuest: activeQuest,
    isCompleted: isCompleted,
    isRecipeLocked: isRecipeLocked,
    currentProgress: currentProgress,
    chainOrder: chainOrder,
    markerBuildingId: markerBuildingId,
    byId: byId,
    flashTime: function () { return flashTime; },
    debugState: function () { return { activeId: activeId, progress: progress, ready: ready, completed: completed }; }
  };
})();
