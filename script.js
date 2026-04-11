const MAX_HP = 100;
const CHARGE_BONUS = 20;

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

const state = {
  phase: "battle",
  playerHp: MAX_HP,
  cpuHp: MAX_HP,
  playerCharge: 0,
  cpuCharge: 0,
  turn: 1,
  playerHand: [],
  cpuHand: [],
  lastReveal: null,
  logEntries: [],
  winner: null,
};

const els = {
  playerHp: document.querySelector("#playerHp"),
  cpuHp: document.querySelector("#cpuHp"),
  playerHpFill: document.querySelector("#playerHpFill"),
  cpuHpFill: document.querySelector("#cpuHpFill"),
  playerCharge: document.querySelector("#playerCharge"),
  cpuCharge: document.querySelector("#cpuCharge"),
  turnLabel: document.querySelector("#turnLabel"),
  phaseTitle: document.querySelector("#phaseTitle"),
  selectionCounter: document.querySelector("#selectionCounter"),
  statusText: document.querySelector("#statusText"),
  skillPool: document.querySelector("#skillPool"),
  cpuHand: document.querySelector("#cpuHand"),
  revealText: document.querySelector("#revealText"),
  battleLog: document.querySelector("#battleLog"),
  resultBadge: document.querySelector("#resultBadge"),
  resetButton: document.querySelector("#resetButton"),
  template: document.querySelector("#skillCardTemplate"),
};

function resetGame() {
  state.phase = "battle";
  state.playerHp = MAX_HP;
  state.cpuHp = MAX_HP;
  state.playerCharge = 0;
  state.cpuCharge = 0;
  state.turn = 1;
  state.playerHand = SKILLS.map((skill) => ({ id: skill.id, used: false }));
  state.cpuHand = SKILLS.map((skill) => ({ id: skill.id, used: false }));
  state.lastReveal = null;
  state.logEntries = [{ label: "開始", text: "5枚から1枚選んで即バトル" }];
  state.winner = null;
  render();
}

function toggleSkill(skillId) {
  if (state.phase !== "battle") return;
  const card = state.playerHand.find((entry) => entry.id === skillId);
  if (!card || card.used) return;
  resolveTurn(skillId);
}

function resolveTurn(playerSkillId) {
  if (state.phase !== "battle") return;

  const cpuSkillId = chooseCpuSkill();
  const playerSkill = getSkill(playerSkillId);
  const cpuSkill = getSkill(cpuSkillId);

  markUsed(state.playerHand, playerSkillId);
  markUsed(state.cpuHand, cpuSkillId);

  const summary = executeResolution(playerSkill, cpuSkill);
  state.lastReveal = { playerSkill, cpuSkill };
  state.logEntries.unshift({
    label: `T${state.turn}`,
    text: `${playerSkill.name} / ${cpuSkill.name} | ${summary.short}`,
  });

  if (state.playerHp <= 0 || state.cpuHp <= 0 || state.turn >= 3) {
    finishBattle();
  } else {
    state.turn += 1;
    render();
  }
}

function chooseCpuSkill() {
  const options = state.cpuHand.filter((card) => !card.used).map((card) => card.id);
  const playerOptions = remainingPlayerCards();
  const priorities = [];

  if (playerOptions.includes("charge")) priorities.push("guard", "counter");
  if (playerOptions.some((id) => ["attack", "heavy"].includes(id))) {
    priorities.push("counter", "guard", "heavy", "attack");
  }
  priorities.push("attack", "guard", "heavy", "counter", "charge");

  const preferred = priorities.find((id) => options.includes(id));
  if (preferred && Math.random() < 0.65) return preferred;
  return options[Math.floor(Math.random() * options.length)];
}

function getSkill(id) {
  return SKILLS.find((skill) => skill.id === id);
}

function remainingPlayerCards() {
  return state.playerHand.filter((card) => !card.used).map((card) => card.id);
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
    state.playerCharge += CHARGE_BONUS;
    notes.push("自+20");
  }
  if (cpuSkill.id === "charge") {
    state.cpuCharge += CHARGE_BONUS;
    notes.push("敵+20");
  }

  const playerGuard = playerSkill.id === "guard";
  const cpuGuard = cpuSkill.id === "guard";
  const playerCounter = canCounter(playerSkill, cpuSkill);
  const cpuCounter = canCounter(cpuSkill, playerSkill);

  if (playerCounter) {
    state.cpuHp -= 30;
    notes.push("敵-30");
  }
  if (cpuCounter) {
    state.playerHp -= 30;
    notes.push("自-30");
  }

  if (playerSkill.id === "heavy" && cpuCounter) {
    state.playerHp -= 50;
    notes.push("自反動-50");
  } else {
    const damage = outgoingDamage(playerCtx);
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
    state.cpuHp -= 50;
    notes.push("敵反動-50");
  } else {
    const damage = outgoingDamage(cpuCtx);
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

  return { short: notes.join(" / ") || "変化なし" };
}

function canCounter(counterSkill, targetSkill) {
  return counterSkill.id === "counter" && ["attack", "heavy"].includes(targetSkill.id);
}

function outgoingDamage(ctx) {
  if (ctx.skill.id === "attack") {
    ctx.chargeSpent = true;
    return 30 + ctx.charge;
  }
  if (ctx.skill.id === "heavy") {
    ctx.chargeSpent = true;
    return 50 + ctx.charge;
  }
  return 0;
}

function spendCharge(ctx, owner) {
  if (!ctx.chargeSpent) return;
  if (owner === "player") state.playerCharge = 0;
  else state.cpuCharge = 0;
}

function finishBattle() {
  state.phase = "result";

  if (state.playerHp > state.cpuHp) state.winner = "win";
  else if (state.playerHp < state.cpuHp) state.winner = "lose";
  else state.winner = "draw";

  const labelMap = { win: "勝利", lose: "敗北", draw: "引分" };
  state.logEntries.unshift({ label: "結果", text: labelMap[state.winner] });
  render();
}

function render() {
  renderHeader();
  renderSkillPool();
  renderCpuHand();
  renderReveal();
  renderLog();
}

function renderHeader() {
  els.playerHp.textContent = `${state.playerHp} / ${MAX_HP}`;
  els.cpuHp.textContent = `${state.cpuHp} / ${MAX_HP}`;
  els.playerHpFill.style.width = `${(state.playerHp / MAX_HP) * 100}%`;
  els.cpuHpFill.style.width = `${(state.cpuHp / MAX_HP) * 100}%`;
  els.playerCharge.textContent = `溜め +${state.playerCharge}`;
  els.cpuCharge.textContent = `溜め +${state.cpuCharge}`;
  els.selectionCounter.textContent = `${remainingPlayerCards().length} / 5 使用可能`;

  if (state.phase === "battle") {
    els.phaseTitle.textContent = `第${state.turn}ターン`;
    els.turnLabel.textContent = `${state.turn} / 3`;
    els.statusText.textContent = "このターンに使う1枚を選んでください。";
    setBadge("BATTLE");
  } else {
    els.phaseTitle.textContent = "結果";
    els.turnLabel.textContent = "END";
    els.statusText.textContent = resultMessage();
    setBadge(state.winner === "win" ? "WIN" : state.winner === "lose" ? "LOSE" : "DRAW", state.winner);
  }
}

function setBadge(label, tone = "") {
  els.resultBadge.textContent = label;
  els.resultBadge.className = `result-badge${tone ? ` ${tone}` : ""}`;
}

function resultMessage() {
  if (state.winner === "win") return "読み勝ちです。もう一度挑めます。";
  if (state.winner === "lose") return "CPUに読まれました。順番を変えて再戦。";
  return "引き分けです。次の一手を変えてみましょう。";
}

function renderSkillPool() {
  els.skillPool.innerHTML = "";

  SKILLS.forEach((skill) => {
    const card = buildCard(skill);
    const playerCard = state.playerHand.find((entry) => entry.id === skill.id);
    const available = Boolean(playerCard) && !playerCard.used && state.phase === "battle";

    card.classList.toggle("selected", available);
    card.classList.toggle("used", playerCard?.used);
    card.disabled = !available;
    card.querySelector(".skill-state").textContent = playerCard?.used ? "使用済み" : "選択可";
    card.addEventListener("click", () => toggleSkill(skill.id));
    els.skillPool.appendChild(card);
  });
}

function renderCpuHand() {
  els.cpuHand.innerHTML = "";

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
  if (!state.lastReveal) {
    els.revealText.textContent = "1ターン目のカードを選んでください";
    return;
  }
  els.revealText.textContent = `あなた ${state.lastReveal.playerSkill.name} / CPU ${state.lastReveal.cpuSkill.name}`;
}

function renderLog() {
  els.battleLog.innerHTML = "";
  state.logEntries.slice(0, 4).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "log-item compact-item";
    item.innerHTML = `<strong>${entry.label}</strong><span>${entry.text}</span>`;
    els.battleLog.appendChild(item);
  });
}

function buildCard(skill) {
  const fragment = els.template.content.firstElementChild.cloneNode(true);
  fragment.querySelector(".skill-name").textContent = skill.name;
  fragment.querySelector(".skill-tag").textContent = skill.tag;
  fragment.querySelector(".skill-description").textContent = skill.description;
  fragment.querySelector(".skill-power").textContent = skill.power;
  return fragment;
}

els.resetButton.addEventListener("click", resetGame);

resetGame();
