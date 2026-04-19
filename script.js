
const MAX_HP = 100;
const CHARGE_BONUS = 20;
const TOTAL_TURNS = 5;
const PLAYER_LABEL = "PLAYER 1";
const CPU_LABEL = "CPU";
const PLAYER2_LABEL = "PLAYER 2";

const CHARACTERS = [
  { id: "cat", name: "ネコ", emoji: "猫", attack: 70, defense: 70, hp: 100, style: "手数型", avatar: "./assets/illustrations/cat.png" },
  { id: "dog", name: "犬", emoji: "犬", attack: 50, defense: 70, hp: 100, style: "安定型", avatar: "./assets/illustrations/dog.png" },
  { id: "parakeet", name: "インコ", emoji: "鳥", attack: 70, defense: 80, hp: 90, style: "速攻型", avatar: "./assets/illustrations/parakeet.png" },
  { id: "goldfish", name: "金魚", emoji: "魚", attack: 70, defense: 90, hp: 80, style: "耐久型", avatar: "./assets/illustrations/goldfish.png" },
  { id: "lizard", name: "トカゲ", emoji: "蜥", attack: 90, defense: 50, hp: 100, style: "強襲型", avatar: "./assets/illustrations/lizard.png" },
];

const SKILLS = [
  { id: "attack", name: "攻撃", tag: "基本", description: "通常の一撃。", power: "ATK 30" },
  { id: "guard", name: "防御", tag: "守り", description: "攻撃を防ぐ。", power: "BLOCK" },
  { id: "charge", name: "溜め", tag: "気合", description: "次の攻撃を強化。", power: "+20" },
  { id: "heavy", name: "強攻撃", tag: "大技", description: "高威力のビーム。", power: "ATK 50" },
  { id: "counter", name: "カウンター", tag: "読み", description: "かわして反撃。", power: "CTR 30" },
];

const BGM_TRACKS = {
  "last-card": { label: "最後の一枚", src: "./assets/audio/last-card.mp3" },
  "blade-edge": { label: "カードの刃先", src: "./assets/audio/blade-edge.mp3" },
};

const EFFECT_LABELS = {
  cat: { attack: "パンチ", heavy: "ビーム", counter: "かわして殴る", guard: "ホログラム楯", charge: "気合充填" },
  dog: { attack: "骨アタック", heavy: "ビーム", counter: "かわして殴る", guard: "ホログラム楯", charge: "気合充填" },
  parakeet: { attack: "つつき", heavy: "ビーム", counter: "かわして殴る", guard: "ホログラム楯", charge: "気合充填" },
  goldfish: { attack: "水かけ", heavy: "ビーム", counter: "かわして殴る", guard: "ホログラム楯", charge: "気合充填" },
  lizard: { attack: "しっぽ振り", heavy: "ビーム", counter: "かわして殴る", guard: "ホログラム楯", charge: "気合充填" },
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
  playerStageImg: document.querySelector("#playerStageImg"),
  cpuStageImg: document.querySelector("#cpuStageImg"),
  playerFighter: document.querySelector("#playerFighter"),
  cpuFighter: document.querySelector("#cpuFighter"),
  playerEffect: document.querySelector("#playerEffect"),
  cpuEffect: document.querySelector("#cpuEffect"),
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
  battleLog: document.querySelector("#battleLog"),
  resultBadge: document.querySelector("#resultBadge"),
  revealPanel: document.querySelector("#revealPanel"),
  playerCard: document.querySelector(".battle-hud.player"),
  cpuCard: document.querySelector(".battle-hud.cpu"),
  modeSelect: document.querySelector("#modeSelect"),
  bgmSelect: document.querySelector("#bgmSelect"),
  soundButton: document.querySelector("#soundButton"),
  resetButton: document.querySelector("#resetButton"),
  characterTemplate: document.querySelector("#characterCardTemplate"),
  skillTemplate: document.querySelector("#skillCardTemplate"),
  setupPanel: document.querySelector("#setupPanel"),
};

const audio = { ctx: null, bgmEl: null };
const ANIMATION_CLASSES = ["is-acting", "action-attack", "action-heavy", "action-guard", "action-charge", "action-counter", "is-hit", "is-guarding", "is-casting"];

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
  state.logEntries = [{ label: "開始", text: "まずはキャラクターを選んでください。" }];
  state.winner = null;
  state.resolving = false;
  state.resultReason = "勝負の決め手がここに出ます。";
  clearEffect(els.playerEffect);
  clearEffect(els.cpuEffect);
  stopBgm();
  render();
}

function chooseCharacter(characterId) {
  if (state.phase !== "character") return;
  const chosen = getCharacter(characterId);
  if (!chosen) return;

  if (state.mode === "pvp" && state.currentChooser === "cpu") {
    if (state.playerCharacter?.id === characterId) return;
    state.cpuCharacter = chosen;
    beginBattle();
    return;
  }

  state.playerCharacter = chosen;
  if (state.mode === "pvp") {
    state.currentChooser = "cpu";
    state.logEntries = [{ label: "選択", text: "PLAYER 1 の次は PLAYER 2 がキャラを選びます。" }];
    state.resultReason = "PLAYER 2 がキャラクターを選ぶと対戦開始です。";
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
  state.resultReason = state.mode === "cpu" ? `${state.cpuCharacter.name} は ${state.cpuCharacter.style} です。スキルを選んでください。` : "PLAYER 1 がこのターンのスキルを選んでください。";
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
    state.resultReason = "PLAYER 2 がこのターンのスキルを選んでください。";
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
  if (!playerSkill || !cpuSkill) return;

  state.resolving = true;
  startBgmLoop();
  triggerSkillAnimations(playerSkill, cpuSkill);
  els.revealText.textContent = `${state.playerCharacter.name} ${playerSkill.name} / ${opponentLabel()} ${cpuSkill.name}`;
  els.resultReason.textContent = "スキル発動中...";

  window.setTimeout(() => {
    markUsed(state.playerHand, playerSkillId);
    markUsed(state.cpuHand, cpuSkillId);

    const summary = executeResolution(playerSkill, cpuSkill);
    state.lastReveal = { playerSkill, cpuSkill };
    state.logEntries.unshift({ label: `T${state.turn}`, text: `${playerSkill.name} / ${cpuSkill.name} | ${summary.short}` });

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
      state.resultReason = state.mode === "pvp" ? "PLAYER 1 がこのターンのスキルを選んでください。" : "次のカードを選んでください。";
      render();
    }
  }, 640);
}

function chooseCpuSkill() {
  const options = state.cpuHand.filter((card) => !card.used).map((card) => card.id);
  const playerOptions = remainingPlayerCards();
  const priorities = [];

  if (state.cpuCharacter && state.cpuCharacter.attack >= 80) priorities.push("heavy", "attack");
  if (state.cpuCharacter && state.cpuCharacter.defense >= 80) priorities.push("guard", "counter");
  if (playerOptions.includes("charge")) priorities.push("guard", "counter");
  if (playerOptions.some((id) => ["attack", "heavy"].includes(id))) priorities.push("counter", "guard");
  priorities.push("attack", "guard", "heavy", "counter", "charge");

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
      if (cpuGuard) notes.push("敵防御");
      else {
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
      if (playerGuard) notes.push("自防御");
      else {
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

  const labelMap = { win: "勝利", lose: "敗北", draw: "引き分け" };
  state.logEntries.unshift({ label: "結果", text: labelMap[state.winner] });
  state.resultReason = state.winner === "win" ? `勝因: ${reason}` : state.winner === "lose" ? `敗因: ${reason}` : `決着: ${reason}`;
  playSound(state.winner === "win" ? "win" : state.winner === "lose" ? "lose" : "draw");
  render();
}

function summarizeReason(notes, playerSkill, cpuSkill) {
  if (notes.some((note) => note.includes("反動"))) return "強攻撃を読んで反動を取った。";
  if (notes.some((note) => note.includes("防御"))) return "防御で流れを止めた。";
  if (notes.some((note) => note.includes("溜め"))) return "気合の溜めが次の圧を作った。";
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
  if (audio.ctx.state === "suspended") audio.ctx.resume();
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
  if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
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
  } catch {}
}

function saveBgmPreference() {
  try {
    window.localStorage.setItem("deckBattleBgmTrack", state.bgmTrack);
  } catch {}
}

function saveModePreference() {
  try {
    window.localStorage.setItem("deckBattleMode", state.mode);
  } catch {}
}

function pulseElement(element, ...classNames) {
  if (!element) return;
  ANIMATION_CLASSES.forEach((className) => element.classList.remove(className));
  void element.offsetWidth;
  classNames.forEach((className) => element.classList.add(className));
}

function skillAnimationClass(skillId) {
  const classMap = { attack: "action-attack", heavy: "action-heavy", guard: "action-guard", charge: "action-charge", counter: "action-counter" };
  return classMap[skillId] ?? "is-acting";
}

function showEffect(target, characterId, skillId) {
  if (!target) return;
  const text = skillId === "heavy" ? "" : EFFECT_LABELS[characterId]?.[skillId] ?? "スキル";
  target.textContent = text;
  target.className = `fighter-effect ${skillId} show`;
}

function clearEffect(target) {
  if (!target) return;
  target.textContent = "";
  target.className = "fighter-effect";
}

function triggerSkillAnimations(playerSkill, cpuSkill) {
  pulseElement(els.playerCard, "is-acting", skillAnimationClass(playerSkill.id));
  pulseElement(els.cpuCard, "is-acting", skillAnimationClass(cpuSkill.id));
  pulseElement(els.playerFighter, "is-acting", skillAnimationClass(playerSkill.id));
  pulseElement(els.cpuFighter, "is-acting", skillAnimationClass(cpuSkill.id));
  pulseElement(els.revealPanel, "is-casting");
  showEffect(els.playerEffect, state.playerCharacter?.id, playerSkill.id);
  showEffect(els.cpuEffect, state.cpuCharacter?.id, cpuSkill.id);
  window.setTimeout(() => {
    clearEffect(els.playerEffect);
    clearEffect(els.cpuEffect);
  }, 700);
}

function triggerOutcomeAnimations(notes) {
  const playerDamaged = notes.some((note) => note.startsWith("自-") || note.startsWith("自反動-"));
  const cpuDamaged = notes.some((note) => note.startsWith("敵-") || note.startsWith("敵反動-"));
  const playerGuarded = notes.includes("自防御");
  const cpuGuarded = notes.includes("敵防御");

  if (playerDamaged) {
    pulseElement(els.playerCard, "is-hit");
    pulseElement(els.playerFighter, "is-hit");
  }
  if (cpuDamaged) {
    pulseElement(els.cpuCard, "is-hit");
    pulseElement(els.cpuFighter, "is-hit");
  }
  if (playerGuarded) {
    pulseElement(els.playerCard, "is-guarding");
    pulseElement(els.playerFighter, "is-guarding");
  }
  if (cpuGuarded) {
    pulseElement(els.cpuCard, "is-guarding");
    pulseElement(els.cpuFighter, "is-guarding");
  }
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
  if (kind === "block") {
    scheduleTone(ctx, 240, now, 0.07, 0.025, "triangle");
    scheduleTone(ctx, 190, now + 0.04, 0.09, 0.02, "triangle");
    return;
  }
  if (kind === "counter") {
    scheduleTone(ctx, 740, now, 0.05, 0.03, "square");
    scheduleTone(ctx, 440, now + 0.05, 0.08, 0.03, "square");
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
    scheduleTone(ctx, 392, now + 0.09, 0.12, 0.025, "triangle");
  }
}

function playTurnSounds(notes, playerSkill, cpuSkill) {
  if (notes.some((note) => note.includes("防御"))) playSound("block");
  if (playerSkill.id === "charge" || cpuSkill.id === "charge") playSound("charge");
  if (playerSkill.id === "counter" || cpuSkill.id === "counter") playSound("counter");
  if (playerSkill.id === "heavy" || cpuSkill.id === "heavy") {
    playSound("impact");
    playSound("smash");
    return;
  }
  if (isAttackSkill(playerSkill) || isAttackSkill(cpuSkill)) playSound("impact");
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
  els.playerName.textContent = state.playerCharacter ? state.playerCharacter.name : PLAYER_LABEL;
  els.cpuName.textContent = state.cpuCharacter ? state.cpuCharacter.name : state.mode === "pvp" ? PLAYER2_LABEL : CPU_LABEL;
  els.playerHp.textContent = `${state.playerHp} / ${playerMax}`;
  els.cpuHp.textContent = `${state.cpuHp} / ${cpuMax}`;
  els.playerHpFill.style.width = `${playerMax ? (state.playerHp / playerMax) * 100 : 0}%`;
  els.cpuHpFill.style.width = `${cpuMax ? (state.cpuHp / cpuMax) * 100 : 0}%`;
  els.playerCharge.textContent = `ため +${state.playerCharge}`;
  els.cpuCharge.textContent = `ため +${state.cpuCharge}`;
  els.cpuStyle.textContent = state.cpuCharacter ? `${state.cpuCharacter.style}${state.mode === "pvp" ? "" : "AI"}` : state.mode === "pvp" ? PLAYER2_LABEL : "標準AI";
  setAvatarImage(els.playerAvatar, els.playerAvatarImg, state.playerCharacter, false);
  setAvatarImage(els.cpuAvatar, els.cpuAvatarImg, state.cpuCharacter, true);
  setStageImage(els.playerFighter, els.playerStageImg, state.playerCharacter);
  setStageImage(els.cpuFighter, els.cpuStageImg, state.cpuCharacter);

  if (state.phase === "character") {
    els.phaseTitle.textContent = "キャラ選択";
    els.turnLabel.textContent = "準備中";
    els.leftTitle.textContent = "キャラクター選択";
    els.selectionCounter.textContent = `${CHARACTERS.length}体から選択`;
    els.statusText.textContent = state.mode === "pvp" && state.currentChooser === "cpu" ? "PLAYER 2 のキャラクターを選ぶと対戦開始です。" : "キャラクターを選ぶと、攻撃力・防御力・HPが対戦に反映されます。";
    els.setupPanel.hidden = false;
    setBadge("READY");
  } else if (state.phase === "battle") {
    els.phaseTitle.textContent = `第${state.turn}ターン`;
    els.turnLabel.textContent = `${state.turn} / ${TOTAL_TURNS}`;
    els.leftTitle.textContent = "スキル選択";
    els.selectionCounter.textContent = `${remainingPlayerCards().length} / ${TOTAL_TURNS} 使用可能`;
    els.statusText.textContent = state.mode === "pvp" ? (state.currentChooser === "player" ? `PLAYER 1 の番です。残り${remainingPlayerCards().length}枚から1枚選んでください。` : `PLAYER 2 の番です。残り${remainingOpponentCards().length}枚から1枚選んでください。`) : `残り${remainingPlayerCards().length}枚。 このターンに使う1枚を選んでください。`;
    els.setupPanel.hidden = true;
    setBadge("BATTLE");
  } else {
    els.phaseTitle.textContent = "結果";
    els.turnLabel.textContent = "END";
    els.leftTitle.textContent = "スキル結果";
    els.selectionCounter.textContent = `${remainingPlayerCards().length} / ${TOTAL_TURNS} 使用可能`;
    els.statusText.textContent = resultMessage();
    els.setupPanel.hidden = true;
    setBadge(state.winner === "win" ? "WIN" : state.winner === "lose" ? "LOSE" : "DRAW", state.winner);
  }

  els.resultReason.textContent = state.resultReason;
  els.soundButton.textContent = state.soundEnabled ? "音 ON" : "音 OFF";
  els.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
  els.modeSelect.value = state.mode;
  els.bgmSelect.value = state.bgmTrack;
}

function renderCharacterPool() {
  els.characterPool.innerHTML = "";
  if (state.phase !== "character") return;

  CHARACTERS.forEach((character) => {
    if (state.mode === "pvp" && state.currentChooser === "cpu" && state.playerCharacter?.id === character.id) return;
    const card = els.characterTemplate.content.firstElementChild.cloneNode(true);
    const avatar = card.querySelector(".character-avatar");
    const photo = card.querySelector(".character-photo");
    avatar.dataset.character = character.id;
    photo.src = character.avatar;
    photo.alt = `${character.name}のイラスト`;
    card.querySelector(".character-name").textContent = character.name;
    card.querySelector(".character-emoji").textContent = character.emoji;
    card.querySelector(".character-style").textContent = character.style;
    card.querySelector(".character-stats").innerHTML = [`攻 ${character.attack}`, `防 ${character.defense}`, `HP ${character.hp}`].map((text) => `<span>${text}</span>`).join("");
    card.addEventListener("click", () => chooseCharacter(character.id));
    els.characterPool.appendChild(card);
  });
}

function renderSkillPool() {
  els.skillPool.innerHTML = "";
  els.skillPool.hidden = state.phase === "character";
  if (state.phase === "character") return;

  SKILLS.forEach((skill) => {
    const card = buildSkillCard(skill);
    const activeHand = state.currentChooser === "player" ? state.playerHand : state.cpuHand;
    const activeCharge = state.currentChooser === "player" ? state.playerCharge : state.cpuCharge;
    const entry = activeHand.find((handCard) => handCard.id === skill.id);
    const available = Boolean(entry) && !entry.used && state.phase === "battle";
    const boosted = available && activeCharge > 0 && ["attack", "heavy"].includes(skill.id);
    card.classList.toggle("selected", available);
    card.classList.toggle("used", entry?.used);
    card.classList.toggle("boosted", boosted);
    card.disabled = !available || state.resolving;
    card.querySelector(".skill-state").textContent = entry?.used ? "使用済み" : boosted ? "強化中" : "選択可";
    card.addEventListener("click", () => toggleSkill(skill.id));
    els.skillPool.appendChild(card);
  });
}

function renderCpuHand() {
  els.cpuHand.innerHTML = "";
  if (state.phase === "character") return;
  state.cpuHand.forEach((card) => {
    const skill = getSkill(card.id);
    const revealed = state.phase === "result" || card.used || (state.mode === "pvp" && state.currentChooser === "cpu");
    const item = document.createElement("div");
    item.className = `hand-card ${revealed ? "revealed" : "hidden"}`;
    item.innerHTML = `<strong>${revealed ? skill.name : "???"}</strong><small>${revealed ? (card.used ? "使用済み" : "未使用") : "未公開"}</small>`;
    els.cpuHand.appendChild(item);
  });
}

function renderReveal() {
  if (state.phase === "character") {
    els.revealText.textContent = state.mode === "pvp" && state.currentChooser === "cpu" ? "PLAYER 2 のキャラクターを選んでください" : "キャラクターを選んでください";
    return;
  }
  if (!state.lastReveal) {
    els.revealText.textContent = state.mode === "pvp" ? (state.currentChooser === "player" ? "PLAYER 1 のカードを選んでください" : "PLAYER 2 のカードを選んでください") : "このターンのカードを選んでください";
    return;
  }
  els.revealText.textContent = state.mode === "pvp" ? `PLAYER 1 ${state.lastReveal.playerSkill.name} / PLAYER 2 ${state.lastReveal.cpuSkill.name}` : `${state.playerCharacter.name} ${state.lastReveal.playerSkill.name} / CPU ${state.lastReveal.cpuSkill.name}`;
}

function renderLog() {
  els.battleLog.innerHTML = "";
  state.logEntries.slice(0, 3).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "log-item";
    item.innerHTML = `<strong>${entry.label}</strong><span>${entry.text}</span>`;
    els.battleLog.appendChild(item);
  });
}

function resultMessage() {
  if (state.winner === "win") return "読み勝ちです。もう一度挑めます。";
  if (state.winner === "lose") return "相手に読まれました。順番を変えて再戦。";
  return "引き分けです。次の一手を変えてみましょう。";
}

function setBadge(label, tone = "") {
  els.resultBadge.textContent = label;
  els.resultBadge.className = `result-badge${tone ? ` ${tone}` : ""}`;
}

function buildSkillCard(skill) {
  const fragment = els.skillTemplate.content.firstElementChild.cloneNode(true);
  fragment.querySelector(".skill-name").textContent = skill.name;
  fragment.querySelector(".skill-tag").textContent = skill.tag;
  fragment.querySelector(".skill-description").textContent = skill.description;
  fragment.querySelector(".skill-power").textContent = skill.power;
  return fragment;
}

function setAvatarImage(wrapper, img, character, flip) {
  wrapper.dataset.character = character?.id ?? "neutral";
  wrapper.classList.toggle("cpu-avatar", flip);
  if (!character) {
    img.removeAttribute("src");
    img.alt = "";
    return;
  }
  img.src = character.avatar;
  img.alt = `${character.name}のイラスト`;
}

function setStageImage(wrapper, img, character) {
  wrapper.dataset.character = character?.id ?? "neutral";
  if (!character) {
    img.removeAttribute("src");
    img.alt = "";
    return;
  }
  img.src = character.avatar;
  img.alt = `${character.name}の立ち絵`;
}

function opponentLabel() {
  return state.mode === "pvp" ? PLAYER2_LABEL : CPU_LABEL;
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
