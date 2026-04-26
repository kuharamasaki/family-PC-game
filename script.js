const MAX_HP = 100;
const CHARGE_BONUS = 20;

const CHARACTERS = [
  {
    id: "cat",
    name: "ネコ",
    emoji: "猫",
    attack: 70,
    defense: 70,
    hp: 100,
    style: "手数型",
    avatar: "./assets/illustrations/cat.png",
  },
  {
    id: "dog",
    name: "犬",
    emoji: "犬",
    attack: 50,
    defense: 70,
    hp: 100,
    style: "安定型",
    avatar: "./assets/illustrations/dog.png",
  },
  {
    id: "parakeet",
    name: "インコ",
    emoji: "鳥",
    attack: 70,
    defense: 80,
    hp: 90,
    style: "速攻型",
    avatar: "./assets/illustrations/parakeet.png",
  },
  {
    id: "goldfish",
    name: "金魚",
    emoji: "魚",
    attack: 70,
    defense: 90,
    hp: 80,
    style: "耐久型",
    avatar: "./assets/illustrations/goldfish.png",
  },
  {
    id: "lizard",
    name: "トカゲ",
    emoji: "蜥",
    attack: 90,
    defense: 50,
    hp: 100,
    style: "強襲型",
    avatar: "./assets/illustrations/lizard.png",
  },
];

const SKILLS = [
  {
    id: "attack",
    name: "攻撃",
    tag: "基本",
    description: "30ダメージ。溜めがあると次の攻撃に上乗せ。",
    power: "ATK 30",
  },
  {
    id: "guard",
    name: "防御",
    tag: "対策",
    description: "このターンの被ダメージを0にする。",
    power: "BLOCK",
  },
  {
    id: "charge",
    name: "溜め",
    tag: "準備",
    description: "次の攻撃系スキルに+20。効果は残る。",
    power: "+20",
  },
  {
    id: "heal",
    name: "回復",
    tag: "支援",
    description: "HPを25回復する。",
    power: "HEAL 25",
  },
  {
    id: "heavy",
    name: "強攻撃",
    tag: "大技",
    description: "50ダメージ。防御で0、カウンターで反動50。",
    power: "ATK 50",
  },
  {
    id: "counter",
    name: "カウンター",
    tag: "読み",
    description: "相手が攻撃系なら成功し30ダメージ。",
    power: "CTR 30",
  },
];

const TOTAL_TURNS = SKILLS.length;

const BGM_TRACKS = {
  "last-card": {
    label: "最後の一枚",
    src: "./assets/audio/last-card.mp3",
  },
  "blade-edge": {
    label: "カードの刃先",
    src: "./assets/audio/blade-edge.mp3",
  },
};

const state = {
  mode: "cpu",
  phase: "character",
  playerCharacter: null,
  cpuCharacter: null,
  playerHp: 0,
  cpuHp: 0,
  playerCharge: 0,
  cpuCharge: 0,
  turn: 1,
  playerHand: [],
  cpuHand: [],
  pendingPlayerSkill: null,
  pendingCpuSkill: null,
  currentChooser: "player",
  lastReveal: null,
  logEntries: [],
  winner: null,
  resolving: false,
  bgmTrack: "last-card",
  soundEnabled: true,
  resultReason: "勝負の決め手がここに出ます。",
};

const els = {
  body: document.body,
  playerName: document.querySelector("#playerName"),
  cpuName: document.querySelector("#cpuName"),
  playerHp: document.querySelector("#playerHp"),
  cpuHp: document.querySelector("#cpuHp"),
  playerHpFill: document.querySelector("#playerHpFill"),
  cpuHpFill: document.querySelector("#cpuHpFill"),
  playerCharge: document.querySelector("#playerCharge"),
  cpuCharge: document.querySelector("#cpuCharge"),
  playerAvatar: document.querySelector("#playerAvatar"),
  cpuAvatar: document.querySelector("#cpuAvatar"),
  playerAvatarImg: document.querySelector("#playerAvatarImg"),
  cpuAvatarImg: document.querySelector("#cpuAvatarImg"),
  turnLabel: document.querySelector("#turnLabel"),
  phaseTitle: document.querySelector("#phaseTitle"),
  leftTitle: document.querySelector("#leftTitle"),
  selectionCounter: document.querySelector("#selectionCounter"),
  statusText: document.querySelector("#statusText"),
  characterPool: document.querySelector("#characterPool"),
  skillPool: document.querySelector("#skillPool"),
  cpuStyle: document.querySelector("#cpuStyle"),
  cpuHand: document.querySelector("#cpuHand"),
  revealText: document.querySelector("#revealText"),
  resultReason: document.querySelector("#resultReason"),
  resultOverlay: document.querySelector("#resultOverlay"),
  battleLog: document.querySelector("#battleLog"),
  resultBadge: document.querySelector("#resultBadge"),
  revealPanel: document.querySelector("#revealPanel"),
  playerCard: document.querySelector(".hp-card.player"),
  cpuCard: document.querySelector(".hp-card.cpu"),
  modeSelect: document.querySelector("#modeSelect"),
  bgmSelect: document.querySelector("#bgmSelect"),
  soundButton: document.querySelector("#soundButton"),
  resetButton: document.querySelector("#resetButton"),
  characterTemplate: document.querySelector("#characterCardTemplate"),
  template: document.querySelector("#skillCardTemplate"),
};

const audio = {
  ctx: null,
  bgmEl: null,
};

const ANIMATION_CLASSES = [
  "is-acting",
  "action-attack",
  "action-heavy",
  "action-guard",
  "action-charge",
  "action-counter",
  "is-hit",
  "is-guarding",
  "is-casting",
  "screen-flash",
];

function resetGame() {
  state.soundEnabled = loadSoundPreference();
  state.bgmTrack = loadBgmPreference();
  state.mode = loadModePreference();
  state.phase = "character";
  state.playerCharacter = null;
  state.cpuCharacter = null;
  state.playerHp = 0;
  state.cpuHp = 0;
  state.playerCharge = 0;
  state.cpuCharge = 0;
  state.turn = 1;
  state.playerHand = [];
  state.cpuHand = [];
  state.pendingPlayerSkill = null;
  state.pendingCpuSkill = null;
  state.currentChooser = "player";
  state.lastReveal = null;
  state.logEntries = [{ label: "開始", text: "まずはキャラクターを選択" }];
  state.winner = null;
  state.resolving = false;
  state.resultReason = "勝負の決め手がここに出ます。";
  stopBgm();
  render();
}

function chooseCharacter(characterId) {
  if (state.phase !== "character") return;
  const chosen = getCharacter(characterId);

  if (state.mode === "pvp" && state.currentChooser === "cpu") {
    if (state.playerCharacter?.id === characterId) return;
    state.cpuCharacter = chosen;
    beginBattle();
    return;
  }

  state.playerCharacter = chosen;
  if (state.mode === "pvp") {
    state.currentChooser = "cpu";
    state.logEntries = [{ label: "開始", text: "PLAYER 1 の次は PLAYER 2 がキャラを選択" }];
    state.resultReason = "端末を PLAYER 2 に渡してキャラクターを選んでください。";
    playSound("select");
    render();
    return;
  }

  state.cpuCharacter = chooseCpuCharacter(characterId);
  beginBattle();
}

function beginBattle() {
  state.playerHp = state.playerCharacter.hp;
  state.cpuHp = state.cpuCharacter.hp;
  state.playerCharge = 0;
  state.cpuCharge = 0;
  state.turn = 1;
  state.playerHand = SKILLS.map((skill) => ({ id: skill.id, used: false }));
  state.cpuHand = SKILLS.map((skill) => ({ id: skill.id, used: false }));
  state.pendingPlayerSkill = null;
  state.pendingCpuSkill = null;
  state.currentChooser = "player";
  state.lastReveal = null;
  state.phase = "battle";
  state.logEntries = [{ label: "開始", text: `${state.playerCharacter.name} vs ${state.cpuCharacter.name}` }];
  state.resultReason =
    state.mode === "cpu"
      ? `${state.cpuCharacter.name}は${state.cpuCharacter.style}で応戦。`
      : "PLAYER 1 がこのターンのスキルを選択してください。";
  playSound("select");
  startBgmLoop();
  render();
}

function chooseCpuCharacter(playerCharacterId) {
  const pool = CHARACTERS.filter((character) => character.id !== playerCharacterId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function toggleSkill(skillId) {
  if (state.phase !== "battle" || state.resolving) return;
  const activeHand = state.currentChooser === "player" ? state.playerHand : state.cpuHand;
  const card = activeHand.find((entry) => entry.id === skillId);
  if (!card || card.used) return;
  playSound("select");

  if (state.mode === "pvp") {
    queuePvpSkill(skillId);
    return;
  }

  resolveTurn(skillId);
}

function queuePvpSkill(skillId) {
  if (state.currentChooser === "player") {
    state.pendingPlayerSkill = skillId;
    state.currentChooser = "cpu";
    state.lastReveal = null;
    state.resultReason = "PLAYER 2 がこのターンのスキルを選択してください。";
    state.logEntries.unshift({ label: `T${state.turn}`, text: "PLAYER 1 がスキルを選択" });
    render();
    return;
  }

  state.pendingCpuSkill = skillId;
  resolveTurn(state.pendingPlayerSkill, state.pendingCpuSkill);
}

function resolveTurn(playerSkillId, forcedCpuSkillId = null) {
  if (state.phase !== "battle" || state.resolving) return;

  const cpuSkillId = forcedCpuSkillId ?? chooseCpuSkill();
  const playerSkill = getSkill(playerSkillId);
  const cpuSkill = getSkill(cpuSkillId);
  state.resolving = true;
  startBgmLoop();
  triggerSkillAnimations(playerSkill, cpuSkill);
  els.revealText.textContent = `あなた ${playerSkill.name} / CPU ${cpuSkill.name}`;
  els.resultReason.textContent = "スキル発動中...";

  window.setTimeout(() => {
    markUsed(state.playerHand, playerSkillId);
    markUsed(state.cpuHand, cpuSkillId);

    const summary = executeResolutionV4(playerSkill, cpuSkill);
    state.lastReveal = { playerSkill, cpuSkill };
    state.logEntries.unshift({
      label: `T${state.turn}`,
      text: `${playerSkill.name} / ${cpuSkill.name} | ${summary.short}`,
    });

    triggerRevealPulse();
    triggerOutcomeAnimations(summary.notes);
    playTurnSounds(summary.notes, playerSkill, cpuSkill);
    state.resolving = false;
    state.pendingPlayerSkill = null;
    state.pendingCpuSkill = null;
    state.currentChooser = "player";

    if (state.playerHp <= 0 || state.cpuHp <= 0 || state.turn >= TOTAL_TURNS) {
      finishBattle(summary.reason);
    } else {
      state.turn += 1;
      render();
    }
  }, 640);
}

function chooseCpuSkill() {
  const options = state.cpuHand.filter((card) => !card.used).map((card) => card.id);
  const playerOptions = remainingPlayerCards();
  const priorities = [];

  if (options.includes("heal") && state.cpuHp <= Math.max(35, Math.round(state.cpuCharacter.hp * 0.45))) {
    priorities.push("heal", "guard");
  }
  if (state.cpuCharacter && state.cpuCharacter.attack >= 80) priorities.push("heavy", "attack");
  if (state.cpuCharacter && state.cpuCharacter.defense >= 80) priorities.push("guard", "counter");
  if (playerOptions.includes("charge")) priorities.push("guard", "counter");
  if (playerOptions.some((id) => ["attack", "heavy"].includes(id))) {
    priorities.push("counter", "guard", "heavy", "attack");
  }
  priorities.push("attack", "guard", "heavy", "counter", "charge", "heal");

  const preferred = priorities.find((id) => options.includes(id));
  if (preferred && Math.random() < 0.65) return preferred;
  return options[Math.floor(Math.random() * options.length)];
}

function getCharacter(id) {
  return CHARACTERS.find((character) => character.id === id);
}

function getSkill(id) {
  return SKILLS.find((skill) => skill.id === id);
}

function remainingPlayerCards() {
  return state.playerHand.filter((card) => !card.used).map((card) => card.id);
}

function remainingOpponentCards() {
  return state.cpuHand.filter((card) => !card.used).map((card) => card.id);
}

function markUsed(hand, skillId) {
  const target = hand.find((card) => card.id === skillId && !card.used);
  if (target) target.used = true;
}

function executeResolution(playerSkill, cpuSkill) {
  const notes = [];
  const playerCtx = { skill: playerSkill, charge: state.playerCharge, chargeSpent: false };
  const cpuCtx = { skill: cpuSkill, charge: state.cpuCharge, chargeSpent: false };

  if (playerSkill.id === "charge") {
    state.playerCharge += chargeBonus(state.playerCharacter);
    notes.push("自+溜め");
  }
  if (cpuSkill.id === "charge") {
    state.cpuCharge += chargeBonus(state.cpuCharacter);
    notes.push("敵+溜め");
  }

  const playerGuard = playerSkill.id === "guard";
  const cpuGuard = cpuSkill.id === "guard";
  const playerCounter = canCounter(playerSkill, cpuSkill);
  const cpuCounter = canCounter(cpuSkill, playerSkill);
  const offenseClash = isAttackSkill(playerSkill) && isAttackSkill(cpuSkill);
  const playerAttackSealed = cpuCounter && isAttackSkill(playerSkill);
  const cpuAttackSealed = playerCounter && isAttackSkill(cpuSkill);

  if (playerCounter) {
    const damage = adjustedDamage(30, state.playerCharacter, state.cpuCharacter, false);
    state.cpuHp -= damage;
    notes.push(`敵-${damage}`);
  }
  if (cpuCounter) {
    const damage = adjustedDamage(30, state.cpuCharacter, state.playerCharacter, false);
    state.playerHp -= damage;
    notes.push(`自-${damage}`);
  }

  if (playerSkill.id === "heavy" && cpuCounter) {
    const recoil = adjustedDamage(50, state.playerCharacter, state.playerCharacter, true);
    state.playerHp -= recoil;
    notes.push(`自反動-${recoil}`);
  } else if (!playerAttackSealed) {
    const damage = outgoingDamage(playerCtx, state.playerCharacter, state.cpuCharacter);
    if (damage > 0) {
      if (cpuGuard) {
        notes.push("敵防御");
      } else {
        state.cpuHp -= damage;
        notes.push(`敵-${damage}`);
      }
    }
  }

  if (cpuSkill.id === "heavy" && playerCounter) {
    const recoil = adjustedDamage(50, state.cpuCharacter, state.cpuCharacter, true);
    state.cpuHp -= recoil;
    notes.push(`敵反動-${recoil}`);
  } else if (!cpuAttackSealed) {
    const damage = outgoingDamage(cpuCtx, state.cpuCharacter, state.playerCharacter);
    if (damage > 0) {
      if (playerGuard) {
        notes.push("自防御");
      } else {
        state.playerHp -= damage;
        notes.push(`自-${damage}`);
      }
    }
  }

  spendCharge(playerCtx, "player");
  spendCharge(cpuCtx, "cpu");
  state.playerHp = Math.max(0, state.playerHp);
  state.cpuHp = Math.max(0, state.cpuHp);

  return { short: notes.join(" / ") || "変化なし", notes, reason: summarizeReason(notes, playerSkill, cpuSkill) };
}

function canCounter(counterSkill, targetSkill) {
  return counterSkill.id === "counter" && ["attack", "heavy"].includes(targetSkill.id);
}

function executeResolutionV4(playerSkill, cpuSkill) {
  const notes = [];
  const playerCtx = { skill: playerSkill, charge: state.playerCharge, chargeSpent: false };
  const cpuCtx = { skill: cpuSkill, charge: state.cpuCharge, chargeSpent: false };

  if (playerSkill.id === "charge") {
    state.playerCharge += chargeBonus(state.playerCharacter);
    notes.push("自+溜め");
  }
  if (cpuSkill.id === "charge") {
    state.cpuCharge += chargeBonus(state.cpuCharacter);
    notes.push("敵+溜め");
  }

  if (playerSkill.id === "heal") {
    state.playerHp = Math.min(state.playerCharacter.hp, state.playerHp + 25);
    notes.push("自+回復");
  }
  if (cpuSkill.id === "heal") {
    state.cpuHp = Math.min(state.cpuCharacter.hp, state.cpuHp + 25);
    notes.push("敵+回復");
  }

  const playerGuard = playerSkill.id === "guard";
  const cpuGuard = cpuSkill.id === "guard";
  const playerCounter = canCounter(playerSkill, cpuSkill);
  const cpuCounter = canCounter(cpuSkill, playerSkill);

  if (playerCounter) {
    const damage = adjustedDamage(30, state.playerCharacter, state.cpuCharacter, false);
    state.cpuHp -= damage;
    notes.push(`敵-${damage}`);
  }
  if (cpuCounter) {
    const damage = adjustedDamage(30, state.cpuCharacter, state.playerCharacter, false);
    state.playerHp -= damage;
    notes.push(`自-${damage}`);
  }

  const playerSealed = cpuCounter && isAttackSkill(playerSkill);
  const cpuSealed = playerCounter && isAttackSkill(cpuSkill);
  const specialResolved = resolveSpecialMatchupsV4(playerCtx, cpuCtx, playerGuard, cpuGuard, playerSealed, cpuSealed, notes);

  if (!specialResolved) {
    const offenseClash = isAttackSkill(playerSkill) && isAttackSkill(cpuSkill);
    if (offenseClash) {
      notes.push("相打ち");
    } else {
      applySkillDamageV4(playerCtx, state.playerCharacter, state.cpuCharacter, cpuGuard, playerSealed, "cpu", notes);
      applySkillDamageV4(cpuCtx, state.cpuCharacter, state.playerCharacter, playerGuard, cpuSealed, "player", notes);
    }
  }

  spendCharge(playerCtx, "player");
  spendCharge(cpuCtx, "cpu");
  state.playerHp = Math.max(0, state.playerHp);
  state.cpuHp = Math.max(0, state.cpuHp);

  return { short: notes.join(" / ") || "変化なし", notes, reason: summarizeReason(notes, playerSkill, cpuSkill) };
}

function resolveSpecialMatchupsV4(playerCtx, cpuCtx, playerGuard, cpuGuard, playerSealed, cpuSealed, notes) {
  const playerId = playerCtx.skill.id;
  const cpuId = cpuCtx.skill.id;

  if (playerId === "attack" && cpuId === "heavy") {
    if (playerSealed || cpuSealed) return true;
    const attackDamage = attackOnlyDamageV4(playerCtx, state.playerCharacter, state.cpuCharacter);
    const heavyDamage = heavyOnlyDamageV4(cpuCtx, state.cpuCharacter, state.playerCharacter);
    return applyDifferenceDamageV4("player", heavyDamage, attackDamage, playerGuard, notes);
  }

  if (playerId === "heavy" && cpuId === "attack") {
    if (playerSealed || cpuSealed) return true;
    const heavyDamage = heavyOnlyDamageV4(playerCtx, state.playerCharacter, state.cpuCharacter);
    const attackDamage = attackOnlyDamageV4(cpuCtx, state.cpuCharacter, state.playerCharacter);
    return applyDifferenceDamageV4("cpu", heavyDamage, attackDamage, cpuGuard, notes);
  }

  if (playerId === "attack" && cpuId === "charge") {
    if (playerSealed) return true;
    const damage = attackOnlyDamageV4(playerCtx, state.playerCharacter, state.cpuCharacter);
    return applyFlatDamageV4("cpu", damage, cpuGuard, notes);
  }

  if (playerId === "charge" && cpuId === "attack") {
    if (cpuSealed) return true;
    const damage = attackOnlyDamageV4(cpuCtx, state.cpuCharacter, state.playerCharacter);
    return applyFlatDamageV4("player", damage, playerGuard, notes);
  }

  return false;
}

function applyDifferenceDamageV4(target, strongerDamage, weakerDamage, guard, notes) {
  const diff = Math.max(0, strongerDamage - weakerDamage);
  if (guard) {
    notes.push(target === "cpu" ? "敵防御" : "自防御");
    return true;
  }
  if (diff <= 0) {
    notes.push("相殺");
    return true;
  }
  if (target === "cpu") {
    state.cpuHp -= diff;
    notes.push(`敵-${diff}`);
  } else {
    state.playerHp -= diff;
    notes.push(`自-${diff}`);
  }
  return true;
}

function applyFlatDamageV4(target, damage, guard, notes) {
  if (guard) {
    notes.push(target === "cpu" ? "敵防御" : "自防御");
    return true;
  }
  if (damage <= 0) return true;
  if (target === "cpu") {
    state.cpuHp -= damage;
    notes.push(`敵-${damage}`);
  } else {
    state.playerHp -= damage;
    notes.push(`自-${damage}`);
  }
  return true;
}

function applySkillDamageV4(ctx, attacker, defender, defenderGuarding, sealed, target, notes) {
  if (sealed) return;
  const damage = heavyOnlyDamageV4(ctx, attacker, defender);
  if (damage <= 0) return;

  if (defenderGuarding) {
    notes.push(target === "cpu" ? "敵防御" : "自防御");
    return;
  }

  if (target === "cpu") {
    state.cpuHp -= damage;
    notes.push(`敵-${damage}`);
    return;
  }

  state.playerHp -= damage;
  notes.push(`自-${damage}`);
}

function heavyOnlyDamageV4(ctx, attacker, defender) {
  if (ctx.skill.id !== "heavy") return 0;
  ctx.chargeSpent = true;
  return adjustedDamage(50 + ctx.charge, attacker, defender, false);
}

function attackOnlyDamageV4(ctx, attacker, defender) {
  if (ctx.skill.id !== "attack") return 0;
  ctx.chargeSpent = true;
  return adjustedDamage(30 + ctx.charge, attacker, defender, false);
}

function executeResolutionV3(playerSkill, cpuSkill) {
  const notes = [];
  const playerCtx = { skill: playerSkill, charge: state.playerCharge, chargeSpent: false };
  const cpuCtx = { skill: cpuSkill, charge: state.cpuCharge, chargeSpent: false };

  if (playerSkill.id === "charge") {
    state.playerCharge += chargeBonus(state.playerCharacter);
    notes.push("自+溜め");
  }
  if (cpuSkill.id === "charge") {
    state.cpuCharge += chargeBonus(state.cpuCharacter);
    notes.push("敵+溜め");
  }

  if (playerSkill.id === "heal") {
    state.playerHp = Math.min(state.playerCharacter.hp, state.playerHp + 25);
    notes.push("自+回復");
  }
  if (cpuSkill.id === "heal") {
    state.cpuHp = Math.min(state.cpuCharacter.hp, state.cpuHp + 25);
    notes.push("敵+回復");
  }

  const playerGuard = playerSkill.id === "guard";
  const cpuGuard = cpuSkill.id === "guard";
  const playerCounter = canCounter(playerSkill, cpuSkill);
  const cpuCounter = canCounter(cpuSkill, playerSkill);
  const attackVsHeavy =
    (playerSkill.id === "attack" && cpuSkill.id === "heavy") ||
    (playerSkill.id === "heavy" && cpuSkill.id === "attack");
  const attackVsCharge =
    (playerSkill.id === "attack" && cpuSkill.id === "charge") ||
    (playerSkill.id === "charge" && cpuSkill.id === "attack");
  const offenseClash = isAttackSkill(playerSkill) && isAttackSkill(cpuSkill) && !attackVsHeavy;
  const playerAttackSealed = cpuCounter && isAttackSkill(playerSkill);
  const cpuAttackSealed = playerCounter && isAttackSkill(cpuSkill);

  if (playerCounter) {
    const damage = adjustedDamage(30, state.playerCharacter, state.cpuCharacter, false);
    state.cpuHp -= damage;
    notes.push(`敵-${damage}`);
  }
  if (cpuCounter) {
    const damage = adjustedDamage(30, state.cpuCharacter, state.playerCharacter, false);
    state.playerHp -= damage;
    notes.push(`自-${damage}`);
  }

  if (attackVsHeavy) {
    resolveAttackHeavyClashV3(playerCtx, cpuCtx, notes);
  } else if (attackVsCharge) {
    resolveAttackChargeClashV3(playerCtx, cpuCtx, notes);
  } else if (offenseClash) {
    notes.push("相打ち");
  } else {
    applySkillDamageV3(playerCtx, state.playerCharacter, state.cpuCharacter, cpuGuard, playerAttackSealed, "cpu", notes);
    applySkillDamageV3(cpuCtx, state.cpuCharacter, state.playerCharacter, playerGuard, cpuAttackSealed, "player", notes);
  }

  spendCharge(playerCtx, "player");
  spendCharge(cpuCtx, "cpu");
  state.playerHp = Math.max(0, state.playerHp);
  state.cpuHp = Math.max(0, state.cpuHp);

  return { short: notes.join(" / ") || "変化なし", notes, reason: summarizeReason(notes, playerSkill, cpuSkill) };
}

function applySkillDamageV3(ctx, attacker, defender, defenderGuarding, sealed, target, notes) {
  if (sealed) return;
  const damage = heavyOnlyDamageV3(ctx, attacker, defender);
  if (damage <= 0) return;

  if (defenderGuarding) {
    notes.push(target === "cpu" ? "敵防御" : "自防御");
    return;
  }

  if (target === "cpu") {
    state.cpuHp -= damage;
    notes.push(`敵-${damage}`);
    return;
  }

  state.playerHp -= damage;
  notes.push(`自-${damage}`);
}

function resolveAttackHeavyClashV3(playerCtx, cpuCtx, notes) {
  const playerAttackDamage = attackOnlyDamageV3(playerCtx, state.playerCharacter, state.cpuCharacter);
  const cpuAttackDamage = attackOnlyDamageV3(cpuCtx, state.cpuCharacter, state.playerCharacter);
  const playerHeavyDamage = heavyOnlyDamageV3(playerCtx, state.playerCharacter, state.cpuCharacter);
  const cpuHeavyDamage = heavyOnlyDamageV3(cpuCtx, state.cpuCharacter, state.playerCharacter);

  if (playerCtx.skill.id === "attack" && cpuCtx.skill.id === "heavy") {
    const damage = Math.max(0, cpuHeavyDamage - playerAttackDamage);
    if (damage > 0) {
      state.playerHp -= damage;
      notes.push(`自-${damage}`);
    } else {
      notes.push("相殺");
    }
    return;
  }

  if (playerCtx.skill.id === "heavy" && cpuCtx.skill.id === "attack") {
    const damage = Math.max(0, playerHeavyDamage - cpuAttackDamage);
    if (damage > 0) {
      state.cpuHp -= damage;
      notes.push(`敵-${damage}`);
    } else {
      notes.push("相殺");
    }
  }
}

function resolveAttackChargeClashV3(playerCtx, cpuCtx, notes) {
  if (playerCtx.skill.id === "attack" && cpuCtx.skill.id === "charge") {
    const damage = attackOnlyDamageV3(playerCtx, state.playerCharacter, state.cpuCharacter);
    if (damage > 0) {
      state.cpuHp -= damage;
      notes.push(`敵-${damage}`);
    }
    return;
  }

  if (playerCtx.skill.id === "charge" && cpuCtx.skill.id === "attack") {
    const damage = attackOnlyDamageV3(cpuCtx, state.cpuCharacter, state.playerCharacter);
    if (damage > 0) {
      state.playerHp -= damage;
      notes.push(`自-${damage}`);
    }
  }
}

function heavyOnlyDamageV3(ctx, attacker, defender) {
  if (ctx.skill.id !== "heavy") return 0;
  ctx.chargeSpent = true;
  return adjustedDamage(50 + ctx.charge, attacker, defender, false);
}

function attackOnlyDamageV3(ctx, attacker, defender) {
  if (ctx.skill.id !== "attack") return 0;
  ctx.chargeSpent = true;
  return adjustedDamage(30 + ctx.charge, attacker, defender, false);
}

function executeResolutionV2(playerSkill, cpuSkill) {
  const notes = [];
  const playerCtx = { skill: playerSkill, charge: state.playerCharge, chargeSpent: false };
  const cpuCtx = { skill: cpuSkill, charge: state.cpuCharge, chargeSpent: false };

  if (playerSkill.id === "charge") {
    state.playerCharge += chargeBonus(state.playerCharacter);
    notes.push("閾ｪ+貅懊ａ");
  }
  if (cpuSkill.id === "charge") {
    state.cpuCharge += chargeBonus(state.cpuCharacter);
    notes.push("謨ｵ+貅懊ａ");
  }

  if (playerSkill.id === "heal") {
    state.playerHp = Math.min(state.playerCharacter.hp, state.playerHp + 25);
    notes.push("髢ｾ・ｪ+回復");
  }
  if (cpuSkill.id === "heal") {
    state.cpuHp = Math.min(state.cpuCharacter.hp, state.cpuHp + 25);
    notes.push("隰ｨ・ｵ+回復");
  }

  const playerGuard = playerSkill.id === "guard";
  const cpuGuard = cpuSkill.id === "guard";
  const playerCounter = canCounter(playerSkill, cpuSkill);
  const cpuCounter = canCounter(cpuSkill, playerSkill);
  const offenseClash = isAttackSkill(playerSkill) && isAttackSkill(cpuSkill);
  const playerAttackSealed = cpuCounter && isAttackSkill(playerSkill);
  const cpuAttackSealed = playerCounter && isAttackSkill(cpuSkill);

  if (playerCounter) {
    const damage = adjustedDamage(30, state.playerCharacter, state.cpuCharacter, false);
    state.cpuHp -= damage;
    notes.push(`謨ｵ-${damage}`);
  }
  if (cpuCounter) {
    const damage = adjustedDamage(30, state.cpuCharacter, state.playerCharacter, false);
    state.playerHp -= damage;
    notes.push(`閾ｪ-${damage}`);
  }

  if (offenseClash) {
    notes.push("逶ｴ謇九■");
  } else {
    applySkillDamage(playerCtx, state.playerCharacter, state.cpuCharacter, cpuGuard, playerAttackSealed, "cpu", notes);
    applySkillDamage(cpuCtx, state.cpuCharacter, state.playerCharacter, playerGuard, cpuAttackSealed, "player", notes);
  }

  spendCharge(playerCtx, "player");
  spendCharge(cpuCtx, "cpu");
  state.playerHp = Math.max(0, state.playerHp);
  state.cpuHp = Math.max(0, state.cpuHp);

  return { short: notes.join(" / ") || "NO CHANGE", notes, reason: summarizeReason(notes, playerSkill, cpuSkill) };
}

function applySkillDamage(ctx, attacker, defender, defenderGuarding, sealed, target, notes) {
  if (sealed) return;
  const damage = heavyOnlyDamage(ctx, attacker, defender);
  if (damage <= 0) return;

  if (defenderGuarding) {
    notes.push(target === "cpu" ? "謨ｵ髦ｲ蠕｡" : "閾ｪ髦ｲ蠕｡");
    return;
  }

  if (target === "cpu") {
    state.cpuHp -= damage;
    notes.push(`謨ｵ-${damage}`);
    return;
  }

  state.playerHp -= damage;
  notes.push(`閾ｪ-${damage}`);
}

function heavyOnlyDamage(ctx, attacker, defender) {
  if (ctx.skill.id !== "heavy") return 0;
  ctx.chargeSpent = true;
  return adjustedDamage(50 + ctx.charge, attacker, defender, false);
}

function isAttackSkill(skill) {
  return ["attack", "heavy"].includes(skill.id);
}

function chargeBonus(character) {
  return Math.round(CHARGE_BONUS * (0.7 + character.attack / 100));
}

function adjustedDamage(base, attacker, defender, recoil) {
  const attackScale = recoil ? 1 : 0.6 + attacker.attack / 100;
  const defenseScale = recoil ? 1 : 1 - defender.defense / 400;
  return Math.max(8, Math.round(base * attackScale * defenseScale));
}

function outgoingDamage(ctx, attacker, defender) {
  if (ctx.skill.id === "attack") {
    ctx.chargeSpent = true;
    return adjustedDamage(30 + ctx.charge, attacker, defender, false);
  }
  if (ctx.skill.id === "heavy") {
    ctx.chargeSpent = true;
    return adjustedDamage(50 + ctx.charge, attacker, defender, false);
  }
  return 0;
}

function spendCharge(ctx, owner) {
  if (!ctx.chargeSpent) return;
  if (owner === "player") state.playerCharge = 0;
  else state.cpuCharge = 0;
}

function finishBattle(reason) {
  state.phase = "result";

  if (state.playerHp > state.cpuHp) state.winner = "win";
  else if (state.playerHp < state.cpuHp) state.winner = "lose";
  else state.winner = "draw";

  const labelMap = { win: "勝利", lose: "敗北", draw: "引分" };
  state.logEntries.unshift({ label: "結果", text: labelMap[state.winner] });
  state.resultReason =
    state.winner === "win" ? `勝因: ${reason}` : state.winner === "lose" ? `敗因: ${reason}` : `決め手: ${reason}`;
  playSound(state.winner === "win" ? "win" : state.winner === "lose" ? "lose" : "draw");
  render();
}

function summarizeReason(notes, playerSkill, cpuSkill) {
  if (notes.some((note) => note.includes("反動"))) return "強攻撃を読んで反動を取った。";
  if (notes.some((note) => note.includes("防御"))) return "防御で流れを止めた。";
  if (notes.some((note) => note.includes("溜め"))) return "溜めが次の圧を作った。";
  if (playerSkill.id === "counter" || cpuSkill.id === "counter") return "カウンターの読み合いが刺さった。";
  const enemyHits = notes.filter((note) => note.startsWith("敵-")).length;
  const selfHits = notes.filter((note) => note.startsWith("自-")).length;
  if (enemyHits > selfHits) return "先に大きいダメージを通した。";
  if (selfHits > enemyHits) return "受けの択で差がついた。";
  return "お互いの択がかみ合った。";
}

function ensureAudioContext() {
  if (!state.soundEnabled) return null;
  if (!audio.ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audio.ctx = new AudioContextClass();
  }
  if (audio.ctx.state === "suspended") {
    audio.ctx.resume();
  }
  return audio.ctx;
}

function stopBgm() {
  if (!audio.bgmEl) return;
  audio.bgmEl.pause();
  audio.bgmEl.currentTime = 0;
}

function startBgmLoop() {
  if (!state.soundEnabled) return;
  const track = BGM_TRACKS[state.bgmTrack] ?? BGM_TRACKS["last-card"];
  if (!audio.bgmEl) {
    audio.bgmEl = new Audio(track.src);
    audio.bgmEl.loop = true;
    audio.bgmEl.volume = 0.32;
  } else if (!audio.bgmEl.src.endsWith(track.src.replace("./", ""))) {
    const wasPlaying = !audio.bgmEl.paused;
    audio.bgmEl.pause();
    audio.bgmEl = new Audio(track.src);
    audio.bgmEl.loop = true;
    audio.bgmEl.volume = 0.32;
    if (!wasPlaying) return;
  }

  const playPromise = audio.bgmEl.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      // Playback can fail until the user has interacted with the page.
    });
  }
}

function loadSoundPreference() {
  try {
    const saved = window.localStorage.getItem("deckBattleSoundEnabled");
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

function loadBgmPreference() {
  try {
    const saved = window.localStorage.getItem("deckBattleBgmTrack");
    return saved && BGM_TRACKS[saved] ? saved : "last-card";
  } catch {
    return "last-card";
  }
}

function loadModePreference() {
  try {
    const saved = window.localStorage.getItem("deckBattleMode");
    return saved === "pvp" ? "pvp" : "cpu";
  } catch {
    return "cpu";
  }
}

function saveSoundPreference() {
  try {
    window.localStorage.setItem("deckBattleSoundEnabled", String(state.soundEnabled));
  } catch {
    // Ignore storage failures.
  }
}

function saveBgmPreference() {
  try {
    window.localStorage.setItem("deckBattleBgmTrack", state.bgmTrack);
  } catch {
    // Ignore storage failures.
  }
}

function saveModePreference() {
  try {
    window.localStorage.setItem("deckBattleMode", state.mode);
  } catch {
    // Ignore storage failures.
  }
}

function triggerRevealPulse() {
  if (!els.revealPanel) return;
  els.revealPanel.classList.remove("is-revealed");
  window.requestAnimationFrame(() => {
    els.revealPanel.classList.add("is-revealed");
  });
}

function pulseElement(element, ...classNames) {
  if (!element) return;
  ANIMATION_CLASSES.forEach((className) => element.classList.remove(className));
  void element.offsetWidth;
  classNames.forEach((className) => element.classList.add(className));
}

function skillAnimationClass(skillId) {
  const classMap = {
    attack: "action-attack",
    heavy: "action-heavy",
    guard: "action-guard",
    charge: "action-charge",
    counter: "action-counter",
  };
  return classMap[skillId] ?? "is-acting";
}

function triggerSkillAnimations(playerSkill, cpuSkill) {
  pulseElement(els.playerCard, "is-acting", skillAnimationClass(playerSkill.id));
  pulseElement(els.cpuCard, "is-acting", skillAnimationClass(cpuSkill.id));
  pulseElement(els.revealPanel, "is-casting");

  if (isAttackSkill(playerSkill) || isAttackSkill(cpuSkill)) {
    pulseElement(els.body, "screen-flash");
  }
}

function triggerOutcomeAnimations(notes) {
  const playerDamaged = notes.some((note) => note.startsWith("自-") || note.startsWith("自反動-"));
  const cpuDamaged = notes.some((note) => note.startsWith("敵-") || note.startsWith("敵反動-"));
  const playerGuarded = notes.includes("自防御");
  const cpuGuarded = notes.includes("敵防御");

  if (playerDamaged) pulseElement(els.playerCard, "is-hit");
  if (cpuDamaged) pulseElement(els.cpuCard, "is-hit");
  if (playerGuarded) pulseElement(els.playerCard, "is-guarding");
  if (cpuGuarded) pulseElement(els.cpuCard, "is-guarding");
}

function scheduleTone(ctx, frequency, start, duration, gainValue, type = "triangle") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playSound(kind) {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (kind === "select") {
    scheduleTone(ctx, 520, now, 0.08, 0.03, "square");
    scheduleTone(ctx, 660, now + 0.05, 0.1, 0.02, "triangle");
    return;
  }

  if (kind === "charge") {
    scheduleTone(ctx, 320, now, 0.12, 0.025, "sine");
    scheduleTone(ctx, 480, now + 0.08, 0.16, 0.03, "sine");
    return;
  }

  if (kind === "heal") {
    scheduleTone(ctx, 460, now, 0.1, 0.025, "triangle");
    scheduleTone(ctx, 620, now + 0.08, 0.16, 0.02, "triangle");
    scheduleTone(ctx, 780, now + 0.18, 0.18, 0.018, "sine");
    return;
  }

  if (kind === "hit") {
    scheduleTone(ctx, 180, now, 0.08, 0.04, "sawtooth");
    scheduleTone(ctx, 120, now + 0.03, 0.12, 0.03, "square");
    return;
  }

  if (kind === "impact") {
    scheduleTone(ctx, 210, now, 0.04, 0.05, "square");
    scheduleTone(ctx, 132, now + 0.015, 0.08, 0.045, "sawtooth");
    scheduleTone(ctx, 86, now + 0.03, 0.12, 0.035, "triangle");
    return;
  }

  if (kind === "smash") {
    scheduleTone(ctx, 160, now, 0.03, 0.06, "square");
    scheduleTone(ctx, 98, now + 0.012, 0.08, 0.05, "sawtooth");
    scheduleTone(ctx, 64, now + 0.022, 0.12, 0.04, "triangle");
    return;
  }

  if (kind === "heavy") {
    scheduleTone(ctx, 120, now, 0.1, 0.04, "sawtooth");
    scheduleTone(ctx, 90, now + 0.04, 0.16, 0.035, "square");
    return;
  }

  if (kind === "counter") {
    scheduleTone(ctx, 740, now, 0.05, 0.03, "square");
    scheduleTone(ctx, 440, now + 0.05, 0.08, 0.03, "square");
    return;
  }

  if (kind === "block") {
    scheduleTone(ctx, 240, now, 0.07, 0.025, "triangle");
    scheduleTone(ctx, 190, now + 0.04, 0.09, 0.02, "triangle");
    return;
  }

  if (kind === "win") {
    scheduleTone(ctx, 523, now, 0.12, 0.03, "triangle");
    scheduleTone(ctx, 659, now + 0.11, 0.12, 0.03, "triangle");
    scheduleTone(ctx, 784, now + 0.22, 0.2, 0.04, "triangle");
    return;
  }

  if (kind === "lose") {
    scheduleTone(ctx, 392, now, 0.14, 0.03, "sawtooth");
    scheduleTone(ctx, 294, now + 0.12, 0.14, 0.03, "sawtooth");
    scheduleTone(ctx, 196, now + 0.24, 0.22, 0.035, "sawtooth");
    return;
  }

  if (kind === "draw") {
    scheduleTone(ctx, 330, now, 0.12, 0.025, "triangle");
    scheduleTone(ctx, 330, now + 0.14, 0.12, 0.02, "triangle");
  }
}

function playTurnSounds(notes, playerSkill, cpuSkill) {
  if (notes.some((note) => note.includes("回復"))) {
    playSound("heal");
  }
  const attackCommitted = isAttackSkill(playerSkill) || isAttackSkill(cpuSkill);
  const heavyCommitted = playerSkill.id === "heavy" || cpuSkill.id === "heavy";

  if (notes.some((note) => note.includes("防御"))) {
    playSound("block");
  }
  if (notes.some((note) => note.includes("溜め"))) {
    playSound("charge");
  }
  if (notes.some((note) => note.includes("反動"))) {
    playSound("counter");
    playSound("heavy");
    playSound("smash");
    return;
  }
  if (attackCommitted) {
    playSound("impact");
    playSound("smash");
  }
  if (notes.some((note) => note.includes("-30"))) {
    playSound("counter");
  }
  if (heavyCommitted || notes.some((note) => note.includes("-5") || note.includes("-6") || note.includes("-7"))) {
    playSound("heavy");
  } else if (notes.some((note) => note.includes("-"))) {
    playSound("hit");
  }
}

function render() {
  renderHeader();
  renderCharacterPool();
  renderSkillPool();
  renderCpuHand();
  renderReveal();
  renderLog();
}

function renderHeader() {
  const playerMax = state.playerCharacter ? state.playerCharacter.hp : MAX_HP;
  const cpuMax = state.cpuCharacter ? state.cpuCharacter.hp : MAX_HP;
  els.playerName.textContent = state.playerCharacter ? state.playerCharacter.name : "PLAYER";
  els.cpuName.textContent = state.cpuCharacter ? state.cpuCharacter.name : state.mode === "pvp" ? "PLAYER 2" : "CPU";
  els.playerHp.textContent = `${state.playerHp} / ${playerMax}`;
  els.cpuHp.textContent = `${state.cpuHp} / ${cpuMax}`;
  els.playerHpFill.style.width = `${playerMax ? (state.playerHp / playerMax) * 100 : 0}%`;
  els.cpuHpFill.style.width = `${cpuMax ? (state.cpuHp / cpuMax) * 100 : 0}%`;
  els.playerCharge.textContent = `溜め +${state.playerCharge}`;
  els.cpuCharge.textContent = `溜め +${state.cpuCharge}`;
  els.cpuStyle.textContent = state.cpuCharacter ? `${state.cpuCharacter.style}${state.mode === "pvp" ? "" : "AI"}` : state.mode === "pvp" ? "PLAYER 2" : "標準AI";
  els.playerCard.dataset.character = state.playerCharacter?.id ?? "neutral";
  els.cpuCard.dataset.character = state.cpuCharacter?.id ?? "neutral";
  els.playerAvatar.dataset.character = state.playerCharacter?.id ?? "neutral";
  els.cpuAvatar.dataset.character = state.cpuCharacter?.id ?? "neutral";
  setAvatarImage(els.playerAvatarImg, state.playerCharacter);
  setAvatarImage(els.cpuAvatarImg, state.cpuCharacter);
  updateResultOverlay();

  if (state.phase === "character") {
    els.phaseTitle.textContent = "キャラ選択";
    els.turnLabel.textContent = "準備中";
    els.leftTitle.textContent = "キャラクター選択";
    els.selectionCounter.textContent = `${CHARACTERS.length}体から選択`;
    els.statusText.textContent =
      state.mode === "pvp" && state.currentChooser === "cpu"
        ? "PLAYER 2 のキャラクターを選ぶと対戦開始です。"
        : "キャラクターを選ぶと、攻撃力・防御力・HPが対戦に反映されます。";
    els.resultReason.textContent = state.resultReason;
    setBadge("READY");
  } else if (state.phase === "battle") {
    els.phaseTitle.textContent = `第${state.turn}ターン`;
    els.turnLabel.textContent = `${state.turn} / ${TOTAL_TURNS}`;
    els.leftTitle.textContent = "スキル状況";
    els.selectionCounter.textContent = `${remainingPlayerCards().length} / ${TOTAL_TURNS} 使用可能`;
    els.statusText.textContent =
      state.mode === "pvp"
        ? state.currentChooser === "player"
          ? `PLAYER 1 の番です。残り${remainingPlayerCards().length}枚から1枚選んでください。`
          : `PLAYER 2 の番です。残り${remainingOpponentCards().length}枚から1枚選んでください。`
        : `残り${remainingPlayerCards().length}枚。 このターンに使う1枚を選んでください。`;
    els.resultReason.textContent = state.resultReason;
    setBadge("BATTLE");
  } else {
    els.phaseTitle.textContent = "結果";
    els.turnLabel.textContent = "END";
    els.leftTitle.textContent = "スキル状況";
    els.selectionCounter.textContent = `${remainingPlayerCards().length} / ${TOTAL_TURNS} 使用可能`;
    els.statusText.textContent = resultMessage();
    els.resultReason.textContent = state.resultReason;
    setBadge(state.winner === "win" ? "WIN" : state.winner === "lose" ? "LOSE" : "DRAW", state.winner);
  }

  els.soundButton.textContent = state.soundEnabled ? "音 ON" : "音 OFF";
  els.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
  els.modeSelect.value = state.mode;
  els.bgmSelect.value = state.bgmTrack;
}

function renderCharacterPool() {
  els.characterPool.innerHTML = "";
  els.characterPool.hidden = state.phase !== "character";
  els.skillPool.hidden = state.phase === "character";
  if (state.phase !== "character") return;

  CHARACTERS.forEach((character) => {
    if (state.mode === "pvp" && state.currentChooser === "cpu" && state.playerCharacter?.id === character.id) return;
    const card = els.characterTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".character-avatar").dataset.character = character.id;
    const photo = card.querySelector(".character-photo");
    photo.src = character.avatar;
    photo.alt = `${character.name}のイラスト`;
    card.querySelector(".character-name").textContent = character.name;
    card.querySelector(".character-emoji").textContent = character.emoji;
    card.querySelector(".character-style").textContent = character.style;
    card.querySelector(".character-stats").innerHTML = [
      `攻 ${character.attack}`,
      `防 ${character.defense}`,
      `HP ${character.hp}`,
    ]
      .map((text) => `<span>${text}</span>`)
      .join("");
    card.addEventListener("click", () => chooseCharacter(character.id));
    els.characterPool.appendChild(card);
  });
}

function setBadge(label, tone = "") {
  els.resultBadge.textContent = label;
  els.resultBadge.className = `result-badge${tone ? ` ${tone}` : ""}`;
}

function updateResultOverlay() {
  if (!els.resultOverlay) return;
  const isResult = state.phase === "result";
  els.resultOverlay.hidden = !isResult;

  if (!isResult) {
    els.resultOverlay.textContent = "";
    els.resultOverlay.className = "result-overlay";
    return;
  }

  const label = state.winner === "win" ? "WIN" : state.winner === "lose" ? "LOSE" : "DRAW";
  els.resultOverlay.textContent = label;
  els.resultOverlay.className = `result-overlay ${state.winner}`;
}

function resultMessage() {
  if (state.winner === "win") return "読み勝ちです。もう一度挑めます。";
  if (state.winner === "lose") return "CPUに読まれました。順番を変えて再戦。";
  return "引き分けです。次の一手を変えてみましょう。";
}

function renderSkillPool() {
  els.skillPool.innerHTML = "";
  if (state.phase === "character") return;

  SKILLS.forEach((skill) => {
    const card = buildCard(skill);
    const activeHand = state.currentChooser === "player" ? state.playerHand : state.cpuHand;
    const activeCharge = state.currentChooser === "player" ? state.playerCharge : state.cpuCharge;
    const playerCard = activeHand.find((entry) => entry.id === skill.id);
    const available = Boolean(playerCard) && !playerCard.used && state.phase === "battle";
    const boosted = available && activeCharge > 0 && ["attack", "heavy"].includes(skill.id);

    card.classList.toggle("selected", available);
    card.classList.toggle("used", playerCard?.used);
    card.classList.toggle("boosted", boosted);
    card.disabled = !available || state.resolving;
    card.querySelector(".skill-state").textContent = playerCard?.used ? "使用済み" : boosted ? "強化中" : "選択可";
    card.addEventListener("click", () => toggleSkill(skill.id));
    els.skillPool.appendChild(card);
  });
}

function renderCpuHand() {
  els.cpuHand.innerHTML = "";
  if (state.phase === "character") return;

  state.cpuHand.forEach((card) => {
    const skill = getSkill(card.id);
    const revealed = state.phase === "result" || card.used;
    const item = document.createElement("div");
    item.className = `hand-card compact-hand ${revealed ? "revealed" : "hidden"}`;
    item.innerHTML = `<strong>${revealed ? skill.name : "???"}</strong><small>${revealed ? (card.used ? "使用済み" : "未使用") : "未公開"}</small>`;
    els.cpuHand.appendChild(item);
  });
}

function renderReveal() {
  if (state.phase === "character") {
    els.revealText.textContent =
      state.mode === "pvp" && state.currentChooser === "cpu" ? "PLAYER 2 のキャラクターを選んでください" : "キャラクターを選んでください";
    return;
  }
  if (!state.lastReveal) {
    els.revealText.textContent =
      state.mode === "pvp"
        ? state.currentChooser === "player"
          ? "PLAYER 1 のカードを選んでください"
          : "PLAYER 2 のカードを選んでください"
        : "1ターン目のカードを選んでください";
    return;
  }
  els.revealText.textContent =
    state.mode === "pvp"
      ? `PLAYER 1 ${state.lastReveal.playerSkill.name} / PLAYER 2 ${state.lastReveal.cpuSkill.name}`
      : `あなた ${state.lastReveal.playerSkill.name} / CPU ${state.lastReveal.cpuSkill.name}`;
  els.revealPanel.classList.remove("is-revealed");
  void els.revealPanel.offsetWidth;
  els.revealPanel.classList.add("is-revealed");
}

function renderLog() {
  els.battleLog.innerHTML = "";
  state.logEntries.slice(0, 4).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "log-item compact-item";
    item.innerHTML = `<strong>${normalizeBattleLogTextV2(entry.label)}</strong><span>${normalizeBattleLogTextV2(entry.text)}</span>`;
    els.battleLog.appendChild(item);
  });
}

function normalizeBattleLogTextV2(text) {
  let normalized = String(text ?? "");

  const substringReplacements = [
    ["髢句ｧ・", "開始"],
    ["縺ｾ縺壹・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧帝∈謚・", "まずはキャラクターを選んでください。"],
    ["PLAYER 1 縺ｮ谺｡縺ｯ PLAYER 2 縺後く繝｣繝ｩ繧帝∈謚・", "PLAYER 1 の次は PLAYER 2 がキャラクターを選びます。"],
    ["PLAYER 1 縺後せ繧ｭ繝ｫ繧帝∈謚・", "PLAYER 1 がスキルを選びました。"],
    ["髢ｾ・ｪ+雋・㈱・・", "自+溜め"],
    ["隰ｨ・ｵ+雋・㈱・・", "敵+溜め"],
    ["閾ｪ+貅懊ａ", "自+溜め"],
    ["謨ｵ+貅懊ａ", "敵+溜め"],
    ["鬮｢・ｾ繝ｻ・ｪ+蝗槫ｾｩ", "自+回復"],
    ["髫ｰ・ｨ繝ｻ・ｵ+蝗槫ｾｩ", "敵+回復"],
    ["閾ｪ+蝗槫ｾｩ", "自+回復"],
    ["謨ｵ+蝗槫ｾｩ", "敵+回復"],
    ["隰ｨ・ｵ鬮ｦ・ｲ陟包ｽ｡", "敵防御"],
    ["髢ｾ・ｪ鬮ｦ・ｲ陟包ｽ｡", "自防御"],
    ["謨ｵ髦ｲ蠕｡", "敵防御"],
    ["閾ｪ髦ｲ蠕｡", "自防御"],
    ["騾ｶ・ｴ隰・ｹ昶蔓", "相打ち"],
    ["逶ｸ謇薙■", "相打ち"],
    ["逶ｸ谿ｺ", "相殺"],
    ["螟牙喧縺ｪ縺・", "変化なし"],
    ["NO CHANGE", "変化なし"],
  ];

  substringReplacements.forEach(([from, to]) => {
    normalized = normalized.split(from).join(to);
  });

  normalized = normalized.replace(/隰ｨ・ｵ-(\d+)/g, "敵-$1");
  normalized = normalized.replace(/髢ｾ・ｪ-(\d+)/g, "自-$1");
  normalized = normalized.replace(/謨ｵ-(\d+)/g, "敵-$1");
  normalized = normalized.replace(/閾ｪ-(\d+)/g, "自-$1");

  return normalized;
}

function normalizeBattleLogText(text) {
  const value = String(text ?? "");
  const replacements = new Map([
    ['髢句ｧ・', '開始'],
    ['縺ｾ縺壹・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧帝∈謚・', 'まずはキャラクターを選んでください。'],
    ['PLAYER 1 縺ｮ谺｡縺ｯ PLAYER 2 縺後く繝｣繝ｩ繧帝∈謚・', 'PLAYER 1 の次は PLAYER 2 がキャラクターを選びます。'],
    ['PLAYER 1 縺後せ繧ｭ繝ｫ繧帝∈謚・', 'PLAYER 1 がスキルを選びました。'],
    ['髢ｾ・ｪ+雋・㈱・・', '自+溜め'],
    ['隰ｨ・ｵ+雋・㈱・・', '敵+溜め'],
    ['鬮｢・ｾ繝ｻ・ｪ+蝗槫ｾｩ', '自+回復'],
    ['髫ｰ・ｨ繝ｻ・ｵ+蝗槫ｾｩ', '敵+回復'],
    ['隰ｨ・ｵ鬮ｦ・ｲ陟包ｽ｡', '敵防御'],
    ['髢ｾ・ｪ鬮ｦ・ｲ陟包ｽ｡', '自防御'],
    ['騾ｶ・ｴ隰・ｹ昶蔓', '相打ち'],
    ['逶ｸ謇薙■', '相打ち'],
    ['逶ｸ谿ｺ', '相殺'],
    ['螟牙喧縺ｪ縺・', '変化なし'],
    ['NO CHANGE', '変化なし'],
  ]);

  if (replacements.has(value)) return replacements.get(value);

  let normalized = value;
  normalized = normalized.replace(/隰ｨ・ｵ-(\d+)/g, '敵-$1');
  normalized = normalized.replace(/髢ｾ・ｪ-(\d+)/g, '自-$1');
  return normalized;
}

function buildCard(skill) {
  const fragment = els.template.content.firstElementChild.cloneNode(true);
  fragment.querySelector(".skill-name").textContent = skill.name;
  fragment.querySelector(".skill-tag").textContent = skill.tag;
  fragment.querySelector(".skill-description").textContent = skill.description;
  fragment.querySelector(".skill-power").textContent = skill.power;
  return fragment;
}

function setAvatarImage(img, character) {
  if (!img) return;
  if (!character) {
    img.removeAttribute("src");
    img.alt = "";
    return;
  }
  img.src = character.avatar;
  img.alt = `${character.name}のイラスト`;
}

els.resetButton.addEventListener("click", resetGame);
els.soundButton.addEventListener("click", () => {
  state.soundEnabled = !state.soundEnabled;
  saveSoundPreference();
  if (state.soundEnabled) {
    playSound("select");
    startBgmLoop();
  } else {
    stopBgm();
  }
  renderHeader();
});

els.modeSelect.addEventListener("change", (event) => {
  state.mode = event.target.value === "pvp" ? "pvp" : "cpu";
  saveModePreference();
  resetGame();
});

els.bgmSelect.addEventListener("change", (event) => {
  const nextTrack = event.target.value;
  if (!BGM_TRACKS[nextTrack]) return;
  state.bgmTrack = nextTrack;
  saveBgmPreference();
  if (state.soundEnabled) {
    stopBgm();
    startBgmLoop();
  }
  renderHeader();
});

resetGame();
