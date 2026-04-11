const SKILLS = [
  {
    id: "attack",
    name: "攻撃",
    tag: "基本",
    description: "3ダメージ。溜めがあると次の攻撃にだけ上乗せされる。",
  },
  {
    id: "guard",
    name: "防御",
    tag: "対策",
    description: "このターンに受けるダメージを0にする。強攻撃にも有効。",
  },
  {
    id: "charge",
    name: "溜め",
    tag: "準備",
    description: "次に使う攻撃系スキルに+2。攻撃するまで効果は残る。",
  },
  {
    id: "heavy",
    name: "強攻撃",
    tag: "大技",
    description: "5ダメージ。防御されると0。カウンターされると自分が5ダメージ。",
  },
  {
    id: "counter",
    name: "カウンター",
    tag: "読み",
    description: "相手が攻撃か強攻撃なら成功し、相手に3ダメージを返す。",
  },
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
  state.logEntries = [
    {
      title: "ゲーム開始",
      body: "毎ターン、残っているスキルから1枚ずつ選んで即バトルします。使ったスキルはその対戦中は再使用できません。",
    },
  ];
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
  const playerSkill = SKILLS.find((skill) => skill.id === playerSkillId);
  const cpuSkill = SKILLS.find((skill) => skill.id === cpuSkillId);

  markUsed(state.playerHand, playerSkillId);
  markUsed(state.cpuHand, cpuSkillId);

  const summary = executeResolution(playerSkill, cpuSkill);
  state.lastReveal = { playerSkill, cpuSkill, summary };
  state.logEntries.unshift({
    title: `ターン ${state.turn}: ${playerSkill.name} vs ${cpuSkill.name}`,
    body: summary.details.join(" "),
  });

  if (state.playerHp <= 0 || state.cpuHp <= 0 || state.turn >= 3) {
    finishBattle();
  } else {
    state.turn += 1;
    state.logEntries.unshift({
      title: `次は第${state.turn}ターン`,
      body: `残り${remainingPlayerCards().length}枚から次の1枚を選んでください。`,
    });
    render();
  }
}

function chooseCpuSkill() {
  const options = state.cpuHand.filter((card) => !card.used).map((card) => card.id);
  const playerOptions = remainingPlayerCards();
  const playerLikelyAttack = playerOptions.some((id) => ["attack", "heavy"].includes(id));
  const playerLikelyCharge = playerOptions.includes("charge");

  const priorities = [];
  if (playerLikelyCharge) priorities.push("guard", "counter", "charge");
  if (playerLikelyAttack) priorities.push("counter", "guard", "heavy", "attack");
  priorities.push("attack", "guard", "heavy", "counter", "charge");

  const preferred = priorities.find((id) => options.includes(id));
  if (preferred && Math.random() < 0.62) {
    return preferred;
  }

  return options[Math.floor(Math.random() * options.length)];
}

function remainingPlayerCards() {
  return state.playerHand.filter((card) => !card.used).map((card) => card.id);
}

function markUsed(hand, skillId) {
  const target = hand.find((card) => card.id === skillId && !card.used);
  if (target) target.used = true;
}

function executeResolution(playerSkill, cpuSkill) {
  const details = [];
  const playerCtx = {
    skill: playerSkill,
    charge: state.playerCharge,
    chargeSpent: false,
  };
  const cpuCtx = {
    skill: cpuSkill,
    charge: state.cpuCharge,
    chargeSpent: false,
  };

  if (playerSkill.id === "charge") {
    state.playerCharge += 2;
    details.push("あなたは溜めた。次の攻撃に+2。");
  }

  if (cpuSkill.id === "charge") {
    state.cpuCharge += 2;
    details.push("CPUは溜めた。次の攻撃に+2。");
  }

  const playerGuard = playerSkill.id === "guard";
  const cpuGuard = cpuSkill.id === "guard";
  const playerCounter = canCounter(playerSkill, cpuSkill);
  const cpuCounter = canCounter(cpuSkill, playerSkill);

  if (playerCounter) {
    state.cpuHp -= 3;
    details.push("あなたのカウンター成功。CPUに3ダメージ。");
  }

  if (cpuCounter) {
    state.playerHp -= 3;
    details.push("CPUのカウンター成功。あなたに3ダメージ。");
  }

  if (playerSkill.id === "heavy" && cpuCounter) {
    state.playerHp -= 5;
    details.push("強攻撃が読まれ、あなたは反動で5ダメージ。");
  } else {
    const damage = outgoingDamage(playerCtx);
    if (damage > 0) {
      if (cpuGuard) {
        details.push(`${playerSkill.name}はCPUの防御で無効化。`);
      } else {
        state.cpuHp -= damage;
        details.push(`あなたの${playerSkill.name}が通り、CPUに${damage}ダメージ。`);
      }
    }
  }

  if (cpuSkill.id === "heavy" && playerCounter) {
    state.cpuHp -= 5;
    details.push("CPUの強攻撃は読まれ、CPUは反動で5ダメージ。");
  } else {
    const damage = outgoingDamage(cpuCtx);
    if (damage > 0) {
      if (playerGuard) {
        details.push(`CPUの${cpuSkill.name}を防御。ダメージ0。`);
      } else {
        state.playerHp -= damage;
        details.push(`CPUの${cpuSkill.name}が通り、あなたに${damage}ダメージ。`);
      }
    }
  }

  spendCharge(playerCtx, "player");
  spendCharge(cpuCtx, "cpu");
  state.playerHp = Math.max(0, state.playerHp);
  state.cpuHp = Math.max(0, state.cpuHp);

  return { details };
}

function canCounter(counterSkill, targetSkill) {
  return counterSkill.id === "counter" && ["attack", "heavy"].includes(targetSkill.id);
}

function outgoingDamage(ctx) {
  if (ctx.skill.id === "attack") {
    ctx.chargeSpent = true;
    return 3 + ctx.charge;
  }

  if (ctx.skill.id === "heavy") {
    ctx.chargeSpent = true;
    return 5 + ctx.charge;
  }

  return 0;
}

function spendCharge(ctx, owner) {
  if (!ctx.chargeSpent) return;
  if (owner === "player") {
    state.playerCharge = 0;
  } else {
    state.cpuCharge = 0;
  }
}

function finishBattle() {
  state.phase = "result";

  if (state.playerHp > state.cpuHp) {
    state.winner = "win";
  } else if (state.playerHp < state.cpuHp) {
    state.winner = "lose";
  } else {
    state.winner = "draw";
  }

  const resultText = {
    win: "勝利",
    lose: "敗北",
    draw: "引き分け",
  }[state.winner];

  state.logEntries.unshift({
    title: `結果: ${resultText}`,
    body: "「もう1回」で即再戦できます。毎ターン1枚ずつ選ぶので、短くても読み合いが残ります。",
  });

  render();
}

function render() {
  renderHeader();
  renderSkillPool();
  renderHands();
  renderReveal();
  renderLog();
}

function renderHeader() {
  els.playerHp.textContent = state.playerHp;
  els.cpuHp.textContent = state.cpuHp;
  els.playerCharge.textContent = `溜め: ${state.playerCharge}`;
  els.cpuCharge.textContent = `溜め: ${state.cpuCharge}`;
  els.selectionCounter.textContent = `${remainingPlayerCards().length} / 5 使用可能`;

  if (state.phase === "battle") {
    els.phaseTitle.textContent = `第${state.turn}ターン`;
    els.turnLabel.textContent = `${state.turn} / 3`;
    els.statusText.textContent =
      "残っている5枚からこのターンに使う1枚を選択してください。使ったスキルは次のターンでは使えません。";
    setBadge("BATTLE");
  } else {
    els.phaseTitle.textContent = "結果";
    els.turnLabel.textContent = "終了";
    els.statusText.textContent = resultMessage();
    setBadge(
      state.winner === "win" ? "WIN" : state.winner === "lose" ? "LOSE" : "DRAW",
      state.winner
    );
  }
}

function setBadge(label, tone = "") {
  els.resultBadge.textContent = label;
  els.resultBadge.className = `result-badge${tone ? ` ${tone}` : ""}`;
}

function resultMessage() {
  if (state.winner === "win") {
    return "3ターンの読み合いを制しました。選ぶ順番でも勝率が変わります。";
  }
  if (state.winner === "lose") {
    return "CPUに読まれました。次は出す順番を変えて勝負できます。";
  }
  return "引き分けです。1枚ずつ選ぶぶん、次の一手の圧が強く残ります。";
}

function renderSkillPool() {
  els.skillPool.innerHTML = "";

  SKILLS.forEach((skill) => {
    const card = buildCard(skill);
    const playerCard = state.playerHand.find((entry) => entry.id === skill.id);
    const available = Boolean(playerCard) && !playerCard.used && state.phase === "battle";
    card.classList.toggle("selected", available);
    card.disabled = !available;
    card.addEventListener("click", () => toggleSkill(skill.id));
    els.skillPool.appendChild(card);
  });
}

function renderHands() {
  els.playerHand.innerHTML = "";
  els.cpuHand.innerHTML = "";

  if (state.playerHand.length === 0) {
    return;
  }

  state.playerHand.forEach((card) => {
    const skill = SKILLS.find((entry) => entry.id === card.id);
    const item = document.createElement("div");
    item.className = `hand-card ${card.used ? "revealed" : "hidden"}`;
    item.innerHTML = `<strong>${skill.name}</strong><small>${
      card.used ? "使用済み" : "未使用"
    }</small>`;
    els.playerHand.appendChild(item);
  });

  state.cpuHand.forEach((card) => {
    const skill = SKILLS.find((entry) => entry.id === card.id);
    const revealed = state.phase === "result" || card.used;
    const item = document.createElement("div");
    item.className = `hand-card ${revealed ? "revealed" : "hidden"}`;
    item.innerHTML = `<strong>${revealed ? skill.name : "???"}</strong><small>${
      revealed ? (card.used ? "使用済み" : "未使用") : "CPUの未公開スキル"
    }</small>`;
    els.cpuHand.appendChild(item);
  });
}

function renderReveal() {
  if (!state.lastReveal) {
    els.revealText.textContent = "1ターン目のカードを選んでください";
    return;
  }

  els.revealText.textContent = `あなた: ${state.lastReveal.playerSkill.name} / CPU: ${state.lastReveal.cpuSkill.name}`;
}

function renderLog() {
  els.battleLog.innerHTML = "";
  state.logEntries.forEach((entry) => {
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

els.resetButton.addEventListener("click", resetGame);

resetGame();
