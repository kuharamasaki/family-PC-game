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
  phase: "draft",
  playerHp: 10,
  cpuHp: 10,
  playerCharge: 0,
  cpuCharge: 0,
  turn: 0,
  selectedSkills: [],
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
  state.phase = "draft";
  state.playerHp = 10;
  state.cpuHp = 10;
  state.playerCharge = 0;
  state.cpuCharge = 0;
  state.turn = 0;
  state.selectedSkills = [];
  state.playerHand = [];
  state.cpuHand = [];
  state.lastReveal = null;
  state.logEntries = [
    {
      title: "ゲーム開始",
      body: "5枚から3枚を選ぶとバトル開始。CPUも同じく3枚をランダムに構築します。",
    },
  ];
  state.winner = null;
  render();
}

function toggleSkill(skillId) {
  if (state.phase !== "draft") return;

  const exists = state.selectedSkills.includes(skillId);
  if (exists) {
    state.selectedSkills = state.selectedSkills.filter((id) => id !== skillId);
  } else if (state.selectedSkills.length < 3) {
    state.selectedSkills = [...state.selectedSkills, skillId];
  }

  if (state.selectedSkills.length === 3) {
    startBattle();
  } else {
    render();
  }
}

function startBattle() {
  state.phase = "battle";
  state.turn = 1;
  state.playerHand = state.selectedSkills.map((id) => ({ id, used: false }));
  state.cpuHand = buildCpuHand();
  state.logEntries.unshift({
    title: "バトル開始",
    body: `CPUは3枚をセット完了。第${state.turn}ターンの行動を選んでください。`,
  });
  render();
}

function buildCpuHand() {
  const pool = [...SKILLS];
  const hand = [];

  while (hand.length < 3) {
    const remaining = pool.filter((skill) => !hand.includes(skill.id));
    const randomSkill = remaining[Math.floor(Math.random() * remaining.length)];
    hand.push(randomSkill.id);
  }

  return hand.map((id) => ({ id, used: false }));
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
    render();
  }
}

function chooseCpuSkill() {
  const options = state.cpuHand.filter((card) => !card.used).map((card) => card.id);
  const playerAttackBias = remainingPlayerCards().includes("charge")
    ? ["guard", "counter"]
    : ["attack", "heavy", "guard", "counter"];

  const preferred = options.find((id) => playerAttackBias.includes(id));
  if (Math.random() < 0.58 && preferred) {
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
    target: cpuSkill,
    charge: state.playerCharge,
    chargeSpent: false,
  };
  const cpuCtx = {
    skill: cpuSkill,
    target: playerSkill,
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
    body: "「もう1回」で即再戦できます。短いからこそ、次は別の3枚で読み合えます。",
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
  els.selectionCounter.textContent = `${state.selectedSkills.length} / 3 選択`;

  if (state.phase === "draft") {
    els.phaseTitle.textContent = "スキルを3枚選ぶ";
    els.turnLabel.textContent = "準備中";
    els.statusText.textContent =
      state.selectedSkills.length === 3
        ? "デッキ完成。バトルを開始します。"
        : "5枚の中から、3ターンで使いたい3枚を選んでください。";
    setBadge("READY");
  } else if (state.phase === "battle") {
    els.phaseTitle.textContent = `第${state.turn}ターン`;
    els.turnLabel.textContent = `${state.turn} / 3`;
    els.statusText.textContent = "残っている手札からこのターンに使う1枚を選択してください。";
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
    return "3ターンの読み合いを制しました。構成を変えて、もっと強い勝ち筋も試せます。";
  }
  if (state.winner === "lose") {
    return "CPUに読まれました。防御やカウンターの混ぜ方を変えると空気が変わります。";
  }
  return "お互いに一歩も引かない引き分け。次は強攻撃の通し方が勝負になりそうです。";
}

function renderSkillPool() {
  els.skillPool.innerHTML = "";

  SKILLS.forEach((skill) => {
    const card = buildCard(skill);
    const selected = state.selectedSkills.includes(skill.id);
    card.classList.toggle("selected", selected);
    card.disabled = state.phase !== "draft";
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hand-card";
    button.innerHTML = `<strong>${skill.name}</strong><small>${
      card.used ? "使用済み" : "このターンに使う"
    }</small>`;
    button.disabled = card.used || state.phase !== "battle";
    button.classList.toggle("active", !card.used && state.phase === "battle");
    button.addEventListener("click", () => resolveTurn(card.id));
    els.playerHand.appendChild(button);
  });

  state.cpuHand.forEach((card) => {
    const skill = SKILLS.find((entry) => entry.id === card.id);
    const item = document.createElement("div");
    const revealed = state.phase === "result" || card.used;
    item.className = `hand-card ${revealed ? "revealed" : "hidden"}`;
    item.innerHTML = `<strong>${revealed ? skill.name : "???"}</strong><small>${
      revealed ? (card.used ? "使用済み" : "未使用") : "CPUの伏せ札"
    }</small>`;
    els.cpuHand.appendChild(item);
  });
}

function renderReveal() {
  if (!state.lastReveal) {
    els.revealText.textContent = "まだバトルは始まっていません";
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
