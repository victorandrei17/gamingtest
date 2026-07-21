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
//   markerPos        (opcional) marcador de objetivo (4.3) apontando pra uma
//                     posição fixa do mapa em vez de uma construção (ex.: um
//                     Pickup — some quando world.pickups fica vazio)
var QUESTS = [
  {
    id: 'get_axe',
    title: 'Machado a Vista',
    description: 'Pegue o machado no chao.',
    objective: { type: 'PICKUP', pickupId: 'axe' },
    reward: {},
    next: 'first_wood',
    markerPos: LEVEL.pickups[0] // mesma posição do machado no chão (level.js)
  },
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
  },
  PICKUP: {
    eventType: 'PICKUP',
    matches: function (obj, payload) { return payload.pickupId === obj.pickupId; },
    bucket: function () { return SINGLE_BUCKET; },
    amount: function () { return 1; },
    targets: function () { var t = {}; t[SINGLE_BUCKET] = 1; return t; }
  }
};

// Tipos tudo-ou-nada: sem contagem fracionária no tracker/log, só a
// descrição (ver currentProgress/progressLines).
var BINARY_OBJECTIVE_TYPES = { BUILD: true, FORGE: true, PICKUP: true };

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
  // nada (BINARY_OBJECTIVE_TYPES), sem contagem fracionária. Para objetivos
  // com mais de um balde (COLLECT_SET), current/target somam todos juntos.
  function currentProgress(world) {
    var q = activeQuest();
    if (!q) return null;
    var obj = q.objective;
    if (obj.type === 'GOLD') return { current: Math.min(world.gold, obj.amount), target: obj.amount, binary: false };
    if (BINARY_OBJECTIVE_TYPES[obj.type]) return { current: 0, target: 1, binary: true };
    var targets = QUEST_MATCHERS[obj.type].targets(obj);
    var current = 0, target = 0;
    for (var k in targets) { current += Math.min(progress[k] || 0, targets[k]); target += targets[k]; }
    return { current: current, target: target, binary: false };
  }

  // ASSETS.drawText usa uma fonte bitmap sem acentos (letra não suportada
  // vira espaço em branco) — normaliza antes de mostrar nome de item na tela.
  function stripAccents(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

  // Linhas de progresso pro tracker/log, uma por objetivo simples — ou uma
  // por item nos objetivos com vários itens (COLLECT_SET), pra ficar claro
  // o que falta de cada um em vez de só uma fração agregada ("0/2").
  function progressLines(world) {
    var q = activeQuest();
    if (!q) return [];
    var obj = q.objective;
    if (obj.type === 'COLLECT_SET') {
      var lines = [];
      for (var item in obj.items) {
        var target = obj.items[item], current = Math.min(progress[item] || 0, target);
        var name = stripAccents(ITEM_TYPES[item].name).toUpperCase();
        lines.push(target + ' ' + name + '  ' + current + '/' + target);
      }
      return lines;
    }
    if (BINARY_OBJECTIVE_TYPES[obj.type]) return [q.description];
    var prog = currentProgress(world);
    return [q.description + '  ' + prog.current + '/' + prog.target];
  }

  // Construção alvo do marcador de objetivo (4.3): BUILD aponta pra si
  // mesma; outros tipos só apontam se a quest declarar `markerBuilding`.
  function markerBuildingId() {
    var q = activeQuest();
    if (!q) return null;
    if (q.objective.type === 'BUILD') return q.objective.buildingId;
    return q.markerBuilding || null;
  }

  // Posição fixa do marcador de objetivo (4.3) pra quests que apontam pra
  // algo que não é uma construção (ex.: um Pickup no chão).
  function markerPos() {
    var q = activeQuest();
    return q ? (q.markerPos || null) : null;
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
    progressLines: progressLines,
    chainOrder: chainOrder,
    markerBuildingId: markerBuildingId,
    markerPos: markerPos,
    byId: byId,
    flashTime: function () { return flashTime; },
    debugState: function () { return { activeId: activeId, progress: progress, ready: ready, completed: completed }; }
  };
})();
