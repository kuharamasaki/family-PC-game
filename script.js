const SKILLS = [
  { id: "attack", name: "攻撃", tag: "3", description: "3ダメージ" },
  { id: "guard", name: "防御", tag: "0", description: "受けるダメージを0にする" },
  { id: "charge", name: "溜め", tag: "+2", description: "次の攻撃系に+2" },
  { id: "heavy", name: "強攻撃", tag: "5", description: "5ダメージ。防御で0、カウンターで自傷5" },
  { id: "counter", name: "カウンター", tag: "返", description: "相手が攻撃系なら3ダメージ" },
];

const state = {
  phase: "battle",
  playerHp: 10,
  cpuHp: 10,
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
  playerCharge: document.querySelector("#playerCharge"),
  cpuCharge: document.querySelector("#cpuCharge"),
  turnLabel: document.querySelector("#turnLabel"),
  phaseTitle: document.querySelector("#phaseTitle"),
  selectionCounter: document.querySelector("#selectionCounter"),
  statusText: document.querySelector("#statusText"),
  skillPool: document.querySelector("#skillPool"),
  playerHand: document.querySelector("#playerHand"),
  cpuHand: document.querySelector("#cpuHand"),
  revealText: document.querySelector("#revealText"),
  battleLog: document.querySelector("#battleLog"),
  resultBadge: document.querySelector("#resultBadge"),
  resultHeadline: document.querySelector("#resultHeadline"),
  resetButton: document.querySelector("#resetButton"),
  template: document.querySelector("#skillCardTemplate"),
};

function resetGame() {
  state.phase = "battle";
  state.playerHp = 10;
  state.cpuHp = 10;
  state.playerCharge = 0;
  state.cpuCharge = 0;
  state.turn = 1;
  state.playerHand = SKILLS.map((skill) => ({ id: skill.id, used: false }));
  state.cpuHand = SKILLS.map((skill) => ({ id: skill.id, used: false }));
  state.lastReveal = null;
  state.logEntries = [{ title: "開始", body: "毎ターン1枚ずつ即公開。" }];
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
  const cpuSkillId = chooseCpuSkill();
  const playerSkill = getSkill(playerSkillId);
  const cpuSkill = getSkill(cpuSkillId);

  markUsed(state.playerHand, playerSkillId);
  markUsed(state.cpuHand, cpuSkillId);

  const summary = executeResolution(playerSkill, cpuSkill);
  state.lastReveal = { playerSkill, cpuSkill };
  state.logEntries.unshift({
    title: `T${state.turn} ${playerSkill.name} / ${cpuSkill.name}`,
    body: summarizeTurn(summary),
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
  return options[Math.floor(Math.random() * options.length)];
}

function getSkill(id) {
  return SKILLS.find((skill) => skill.id === id);
}

function markUsed(hand, skillId) {
  const target = hand.find((card) => card.id === skillId && !card.used);
  if (target) target.used = true;
}

function executeResolution(playerSkill, cpuSkill) {
  const log = [];
  const playerGuard = playerSkill.id === "guard";
  const cpuGuard = cpuSkill.id === "guard";
  const playerCounter = playerSkill.id === "counter" && ["attack", "heavy"].includes(cpuSkill.id);
  const cpuCounter = cpuSkill.id === "counter" && ["attack", "heavy"].includes(playerSkill.id);

  if (playerSkill.id === "charge") {
    state.playerCharge += 2;
    log.push("あなたは溜めた。");
  }
  if (cpuSkill.id === "charge") {
    state.cpuCharge += 2;
    log.push("CPUは溜めた。");
  }

  if (playerCounter) {
    state.cpuHp -= 3;
    log.push("あなたのカウンター成功。");
  }
  if (cpuCounter) {
    state.playerHp -= 3;
    log.push("CPUのカウンター成功。");
  }

  applyAttack("player", playerSkill, cpuGuard, cpuCounter, log);
  applyAttack("cpu", cpuSkill, playerGuard, playerCounter, log);

  state.playerHp = Math.max(0, state.playerHp);
  state.cpuHp = Math.max(0, state.cpuHp);
  return log;
}

function applyAttack(owner, skill, targetGuard, targetCounter, log) {
  const isPlayer = owner === "player";
  const charge = isPlayer ? state.playerCharge : state.cpuCharge;
  const actor = isPlayer ? "あなた" : "CPU";
  const target = isPlayer ? "CPU" : "あなた";

  if (skill.id === "heavy" && targetCounter) {
    if (isPlayer) state.playerHp -= 5;
    else state.cpuHp -= 5;
    log.push(`${actor}の強攻撃は読まれて反動5。`);
    return;
  }

  let damage = 0;
  if (skill.id === "attack") damage = 3 + charge;
  if (skill.id === "heavy") damage = 5 + charge;
  if (damage === 0) return;

  if (isPlayer) state.playerCharge = 0;
  else state.cpuCharge = 0;

  if (targetGuard) {
    log.push(`${actor}の${skill.name}は防がれた。`);
    return;
  }

  if (isPlayer) state.cpuHp -= damage;
  else state.playerHp -= damage;
  log.push(`${actor}の${skill.name}で${target}に${damage}ダメージ。`);
}

function finishBattle() {
  state.phase = "result";
  if (state.playerHp > state.cpuHp) state.winner = "win";
  else if (state.playerHp < state.cpuHp) state.winner = "lose";
  else state.winner = "draw";

  const text = state.winner === "win" ? "勝利" : state.winner === "lose" ? "敗北" : "引き分け";
  state.logEntries.unshift({ title: `結果: ${text}`, body: "「もう1回」で再戦できます。" });
  render();
}

function summarizeTurn(log) {
  if (log.some((entry) => entry.includes("反動5"))) return "強攻撃が読まれた";
  if (log.some((entry) => entry.includes("カウンター成功"))) return "カウンター成立";
  if (log.some((entry) => entry.includes("防がれた"))) return "防御で止めた";
  if (log.some((entry) => entry.includes("溜め"))) return "溜めが入った";
  const hit = log.find((entry) => entry.includes("ダメージ"));
  return hit ? hit.replace("あなたの", "").replace("CPUの", "") : "変化なし";
}

function render() {
  renderHeader();
  renderSkillPool();
  renderUsedLists();
  renderReveal();
  renderLog();
}

function renderHeader() {
  els.playerHp.textContent = state.playerHp;
  els.cpuHp.textContent = state.cpuHp;
  els.turnLabel.textContent = state.phase === "battle" ? `${state.turn} / 3` : "終了";
  els.playerCharge.textContent = `あなた 溜め: ${state.playerCharge}`;
  els.cpuCharge.textContent = `CPU 溜め: ${state.cpuCharge}`;
  els.selectionCounter.textContent = `${state.playerHand.filter((card) => !card.used).length} / 5 使用可能`;

  if (state.phase === "battle") {
    els.phaseTitle.textContent = `第${state.turn}ターン`;
    els.statusText.textContent = "残っているスキルから1枚選ぶと、すぐにCPUと同時発動します。";
    els.resultHeadline.textContent = "進行中";
    setBadge("BATTLE");
  } else {
    els.phaseTitle.textContent = "結果";
    els.statusText.textContent =
      state.winner === "win" ? "勝ち。" : state.winner === "lose" ? "負け。" : "引き分け。";
    els.resultHeadline.textContent =
      state.winner === "win" ? "勝利" : state.winner === "lose" ? "敗北" : "引き分け";
    setBadge(state.winner === "win" ? "WIN" : state.winner === "lose" ? "LOSE" : "DRAW");
  }
}

function renderSkillPool() {
  els.skillPool.innerHTML = "";
  SKILLS.forEach((skill) => {
    const card = buildCard(skill);
    const playerCard = state.playerHand.find((entry) => entry.id === skill.id);
    const available = state.phase === "battle" && playerCard && !playerCard.used;
    card.disabled = !available;
    if (!available) card.classList.add("used");
    card.addEventListener("click", () => toggleSkill(skill.id));
    els.skillPool.appendChild(card);
  });
}

function renderUsedLists() {
  els.playerHand.innerHTML = "";
  els.cpuHand.innerHTML = "";

  state.playerHand.forEach((card) => {
    els.playerHand.appendChild(buildStatusChip(card.id, card.used, true));
  });

  state.cpuHand.forEach((card) => {
    els.cpuHand.appendChild(buildStatusChip(card.id, card.used, false));
  });
}

function buildStatusChip(skillId, used, revealName) {
  const skill = getSkill(skillId);
  const chip = document.createElement("div");
  chip.className = `status-chip ${used ? "done" : ""}`;
  chip.textContent = revealName || used || state.phase === "result" ? skill.name : "???";
  return chip;
}

function renderReveal() {
  if (!state.lastReveal) {
    els.revealText.textContent = "1ターン目のカードを選んでください";
    return;
  }
  els.revealText.textContent = `${state.lastReveal.playerSkill.name} VS ${state.lastReveal.cpuSkill.name}`;
}

function renderLog() {
  els.battleLog.innerHTML = "";
  state.logEntries.slice(0, 4).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "log-item";
    item.innerHTML = `<strong>${entry.title}</strong><span>${entry.body}</span>`;
    els.battleLog.appendChild(item);
  });
}

function buildCard(skill) {
  const fragment = els.template.content.firstElementChild.cloneNode(true);
  fragment.querySelector(".skill-name").textContent = skill.name;
  fragment.querySelector(".skill-tag").textContent = skill.tag;
  fragment.querySelector(".skill-description").textContent = skill.description;
  return fragment;
}

function setBadge(label) {
  els.resultBadge.textContent = label;
  els.resultBadge.className = `badge ${label.toLowerCase()}`;
}

els.resetButton.addEventListener("click", resetGame);
resetGame();
