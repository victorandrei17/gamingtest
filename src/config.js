// config.js — todos os números de balanceamento do jogo.
// Nenhum valor mágico deve existir fora deste arquivo.
'use strict';

var CONFIG = {
  DEBUG: true,

  // Se true, carrega os PNGs reais das rochas (assets/Rock2_grass_shadow_dark1..5)
  // por cima dos placeholders procedurais. false = usa só os placeholders.
  USE_REAL_ROCK_SPRITES: false,

  // Resolução interna e escala
  GAME_WIDTH: 336,    // -30% vs. o original (480)
  GAME_HEIGHT: 270,
  SCALE: 4,          // 336x270 * 4 = 1344x1080
  TILE_SIZE: 16,

  // Jogador
  PLAYER_SPEED: 90,          // px/s
  PLAYER_HITBOX_W: 10,       // hitbox pelos "pés"
  PLAYER_HITBOX_H: 6,
  PLAYER_REACH: 6,           // alcance do golpe à frente do jogador (px)

  // Combate (o dano por hit vem do atributo `damage`, ver Atributos abaixo)
  HIT_COOLDOWN: 0.5,         // s entre hits (dividido por attackSpeed)
  ATTACK_ANIM_TIME: 0.25,    // s de duração da animação de golpe

  // Atributos base do personagem (stats.js). moveSpeed usa PLAYER_SPEED.
  BASE_DAMAGE: 1,            // dano por hit
  BASE_ATTACK_SPEED: 1.0,    // multiplicador do cooldown de hit

  // Objetos atingíveis
  RESPAWN_TIME: 5,           // s para reaparecer
  DEATH_FADE_TIME: 2,        // s de fade ao morrer (harvestables e inimigos)
  SPAWN_ANIM_TIME: 0.4,      // s da animação de surgimento
  HEALTHBAR_HIDE_TIME: 3,    // s sem dano para esconder a barra de vida

  // Inventário inicial (facilita testar forja/venda sem precisar coletar antes)
  START_INVENTORY_QTY: 10,   // quantidade de cada coletável ao começar

  // Drops / coleta
  COLLECT_RADIUS: 20,        // px — raio de atração do item
  DROP_ARC_TIME: 0.35,       // s do arco de ejeção
  MAGNET_TIME: 0.25,         // s do tween de magnetismo até o jogador

  // Construção (valores padrão; custo por prédio fica em data.js/BUILDINGS)
  BUILD_TIME: 3,             // s de construção
  BLACKSMITH_COST: 3,        // madeiras
  DELIVER_INTERVAL: 0.2,     // s entre cada madeira voando até a área
  UNLOCK_MSG_TIME: 2,        // s da mensagem "FERREIRO DESBLOQUEADO"

  // Forja / comércio
  FORGE_TIME: 3,             // s de forja (padrão; cada receita pode ter o seu)
  SMITH_INTERACT_RADIUS: 34, // px de proximidade para exibir [E] FORJAR
  DENY_FLASH_TIME: 0.3,      // s do feedback de negação (recurso insuficiente)
  GOLD_PER_ITEM: 3,          // gold recebido ao vender 1 coletável (fixo p/ todos)
  FORGE_STRIKE_PERIOD: 0.3,  // s entre marteladas na bigorna (animação de forja)

  // HUD / painel de personagem
  HUD_PULSE_TIME: 0.25,      // s do pulso do contador ao coletar
  FLOAT_TEXT_TIME: 0.8,      // s do "+1" flutuante ao coletar
  STAT_FLASH_TIME: 1.5,      // s do destaque dourado ao ganhar um bônus

  // Inimigos
  ENEMY_SPEED: 45,           // px/s (50% de PLAYER_SPEED)
  ENEMY_VISION_RADIUS: 36,   // px — distância para detectar o jogador (120 * 30%)
  ENEMY_STOP_DISTANCE: 12,   // px — distância mínima ao seguir (evita sobrepor o jogador)
  ENEMY_HP: 3,               // vida dos inimigos
  ENEMY_IDLE_ANIM_SPEED: 4,  // frames/s da animação de idle
  ENEMY_RESPAWN_TIME: 5      // s para o inimigo reaparecer no ponto de spawn
};
