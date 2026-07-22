const STORAGE_KEY = "fistDietCheckin.v1";

const WEIGHT_RULES = [
  { weight: 90, fists: 3 },
  { weight: 95, fists: 4 },
  { weight: 100, fists: 5 },
  { weight: 105, fists: 6 },
  { weight: 110, fists: 7 },
  { weight: 115, fists: 8 },
  { weight: 120, fists: 9 },
  { weight: 125, fists: 10 },
  { weight: 130, fists: 11 }
];

const MEALS = ["早餐", "午餐", "晚餐", "加餐"];
const AMOUNTS = [0.5, 1, 1.5, 2];
const DEFAULT_TARGET_WEIGHT = 100;

const nodes = {
  todayDate: document.querySelector("#todayDate"),
  targetWeightInput: document.querySelector("#targetWeightInput"),
  matchText: document.querySelector("#matchText"),
  quotaText: document.querySelector("#quotaText"),
  usedText: document.querySelector("#usedText"),
  remainText: document.querySelector("#remainText"),
  progressBar: document.querySelector("#progressBar"),
  statusText: document.querySelector("#statusText"),
  mealButtons: document.querySelector("#mealButtons"),
  amountButtons: document.querySelector("#amountButtons"),
  customAmount: document.querySelector("#customAmount"),
  draftHint: document.querySelector("#draftHint"),
  addEntryBtn: document.querySelector("#addEntryBtn"),
  entryList: document.querySelector("#entryList"),
  entryCountText: document.querySelector("#entryCountText"),
  completeTodayBtn: document.querySelector("#completeTodayBtn"),
  resetTodayBtn: document.querySelector("#resetTodayBtn"),
  ruleTable: document.querySelector("#ruleTable"),
  statsGrid: document.querySelector("#statsGrid"),
  historyList: document.querySelector("#historyList"),
  historyCountText: document.querySelector("#historyCountText")
};

const state = loadState();

function defaultState() {
  return {
    tab: "today",
    targetWeight: DEFAULT_TARGET_WEIGHT,
    draftMeal: "午餐",
    draftAmount: 1,
    days: {}
  };
}

function loadState() {
  const base = defaultState();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const rawTarget = stored.targetWeight ?? stored.weight;
    const targetWeight = validTargetWeight(rawTarget) ? Number(rawTarget) : base.targetWeight;
    const draftMeal = MEALS.includes(stored.draftMeal) ? stored.draftMeal : base.draftMeal;
    const draftAmount = validAmount(stored.draftAmount) ? Number(stored.draftAmount) : base.draftAmount;
    return {
      tab: ["today", "rules", "records"].includes(stored.tab) ? stored.tab : base.tab,
      targetWeight,
      draftMeal,
      draftAmount,
      days: normalizeDays(stored.days)
    };
  } catch {
    return base;
  }
}

function normalizeDays(rawDays) {
  if (!rawDays || typeof rawDays !== "object" || Array.isArray(rawDays)) return {};
  const result = {};
  Object.entries(rawDays).forEach(([date, day]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== "object") return;
    const targetWeight = validTargetWeight(day.targetWeight ?? day.weight) ? Number(day.targetWeight ?? day.weight) : DEFAULT_TARGET_WEIGHT;
    const matchedRule = ruleForTarget(targetWeight);
    const entries = Array.isArray(day.entries) ? day.entries.map(normalizeEntry).filter(Boolean).slice(0, 80) : [];
    result[date] = {
      date,
      targetWeight,
      weight: matchedRule.weight,
      quota: matchedRule.fists,
      entries,
      completed: Boolean(day.completed)
    };
  });
  return result;
}

function normalizeEntry(item) {
  const fists = validAmount(item?.fists) ? Number(item.fists) : 0;
  const meal = MEALS.includes(item?.meal) ? item.meal : "午餐";
  if (!fists) return null;
  return {
    id: String(item.id || Date.now() + Math.random()),
    meal,
    fists,
    time: String(item.time || timeLabel(new Date()))
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function todayLabel() {
  const date = new Date();
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function timeLabel(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function validWeight(weight) {
  return WEIGHT_RULES.some((item) => item.weight === Number(weight));
}

function validTargetWeight(weight) {
  const value = Number(weight);
  return Number.isFinite(value) && value >= 60 && value <= 180;
}

function validAmount(amount) {
  const value = Number(amount);
  return Number.isFinite(value) && value >= 0.5 && value <= 12 && value * 2 === Math.round(value * 2);
}

function quotaForWeight(weight) {
  return WEIGHT_RULES.find((item) => item.weight === Number(weight))?.fists || 5;
}

function ruleForTarget(targetWeight) {
  const value = validTargetWeight(targetWeight) ? Number(targetWeight) : DEFAULT_TARGET_WEIGHT;
  return WEIGHT_RULES.reduce((best, item) => {
    const bestDiff = Math.abs(best.weight - value);
    const diff = Math.abs(item.weight - value);
    if (diff < bestDiff) return item;
    if (diff === bestDiff && item.weight > best.weight) return item;
    return best;
  }, WEIGHT_RULES[0]);
}

function getToday() {
  const key = todayKey();
  if (!state.days[key]) {
    const matchedRule = ruleForTarget(state.targetWeight);
    state.days[key] = {
      date: key,
      targetWeight: state.targetWeight,
      weight: matchedRule.weight,
      quota: matchedRule.fists,
      entries: [],
      completed: false
    };
  }
  return state.days[key];
}

function usedFists(day) {
  return roundHalf(day.entries.reduce((sum, entry) => sum + Number(entry.fists || 0), 0));
}

function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

function formatFists(value) {
  const rounded = roundHalf(Number(value || 0));
  return Number.isInteger(rounded) ? `${rounded} 拳` : `${rounded.toFixed(1)} 拳`;
}

function entryMeta(entry) {
  return `约 ${Math.round(entry.fists * 100)} 克 / ${Math.round(entry.fists * 150)} 卡 · ${entry.time}`;
}

function resultForDay(day) {
  const used = usedFists(day);
  const over = used > day.quota;
  if (!day.completed && !day.entries.length) return { text: "未开始", tone: "" };
  if (!day.completed) return { text: "进行中", tone: "" };
  return over ? { text: "超额", tone: "over" } : { text: "达标", tone: "done" };
}

function renderAll() {
  renderShell();
  renderToday();
  renderRules();
  renderRecords();
}

function renderShell() {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view${capitalize(state.tab)}`);
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === state.tab);
  });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderToday() {
  const day = getToday();
  syncTodayTarget(day);
  const quota = day.quota;
  const used = usedFists(day);
  const remain = roundHalf(quota - used);
  const percent = Math.min(100, Math.round((used / quota) * 100));
  const isOver = used > quota;

  nodes.todayDate.textContent = todayLabel();
  if (document.activeElement !== nodes.targetWeightInput) {
    nodes.targetWeightInput.value = Number(state.targetWeight).toString();
  }
  nodes.matchText.textContent = `自动按 ${day.weight} 斤档计算：今天 ${formatFists(quota)}。`;
  nodes.quotaText.textContent = formatFists(quota);
  nodes.usedText.textContent = formatFists(used);
  nodes.remainText.textContent = remain >= 0 ? formatFists(remain) : `超 ${formatFists(Math.abs(remain))}`;
  nodes.progressBar.style.width = `${percent}%`;
  nodes.progressBar.parentElement.classList.toggle("over", isOver);
  nodes.statusText.textContent = statusSentence(day, remain, isOver);

  nodes.mealButtons.innerHTML = MEALS.map((meal) =>
    `<button class="segment-button ${meal === state.draftMeal ? "is-active" : ""}" type="button" data-meal="${meal}">${meal}</button>`
  ).join("");
  nodes.amountButtons.innerHTML = AMOUNTS.map((amount) =>
    `<button class="amount-button ${amount === state.draftAmount ? "is-active" : ""}" type="button" data-amount="${amount}">+${formatFists(amount)}</button>`
  ).join("");
  nodes.customAmount.value = state.draftAmount;
  nodes.draftHint.textContent = `${state.draftMeal} · ${formatFists(state.draftAmount)}`;
  nodes.entryCountText.textContent = `${day.entries.length} 条`;
  nodes.entryList.innerHTML = renderEntryList(day);
  nodes.completeTodayBtn.disabled = day.entries.length === 0;
  nodes.completeTodayBtn.textContent = day.completed ? "今天已完成" : "完成今天";
}

function statusSentence(day, remain, isOver) {
  if (day.completed && isOver) return "今天已保存，但已经超过当前拳头额度。";
  if (day.completed) return "今天已完成，记录已保存在本机。";
  if (!day.entries.length) return "先选择餐次和拳头数，再加入今天。";
  if (isOver) return `已经超过 ${formatFists(Math.abs(remain))}，仍可保存今天作为真实记录。`;
  return `还剩 ${formatFists(remain)}，继续按当天实际吃的记录。`;
}

function renderEntryList(day) {
  if (!day.entries.length) {
    return `<p class="empty-text">今天还没有记录。</p>`;
  }
  return day.entries.map((entry) => `
    <article class="entry-item">
      <div class="entry-main">
        <strong>${entry.meal} · ${formatFists(entry.fists)}</strong>
        <p class="entry-meta">${entryMeta(entry)}</p>
      </div>
      <button class="entry-remove" type="button" data-remove-entry="${entry.id}" aria-label="删除这条记录">×</button>
    </article>
  `).join("");
}

function renderRules() {
  nodes.ruleTable.innerHTML = WEIGHT_RULES.map((item) => `
    <div class="rule-cell">${item.weight} 斤</div>
    <div class="rule-cell">${item.fists === 11 ? "11 拳" : `${item.fists} <span class="highlight-mark">拳头</span>`}</div>
  `).join("");
}

function renderRecords() {
  const days = Object.values(state.days)
    .filter((day) => day.entries.length || day.completed)
    .sort((a, b) => b.date.localeCompare(a.date));
  const completed = days.filter((day) => day.completed);
  const withinQuota = completed.filter((day) => usedFists(day) <= day.quota);
  const totalUsed = days.reduce((sum, day) => sum + usedFists(day), 0);
  const avg = days.length ? roundHalf(totalUsed / days.length) : 0;

  nodes.statsGrid.innerHTML = [
    statCard("打卡天数", `${completed.length} 天`),
    statCard("达标天数", `${withinQuota.length} 天`),
    statCard("累计记录", formatFists(totalUsed)),
    statCard("日均拳头", days.length ? formatFists(avg) : "--")
  ].join("");

  nodes.historyCountText.textContent = `${days.length} 天`;
  nodes.historyList.innerHTML = days.length ? days.slice(0, 30).map(renderHistoryItem).join("") : `<p class="empty-text">完成今天后，这里会出现记录。</p>`;
}

function statCard(label, value) {
  return `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderHistoryItem(day) {
  const used = usedFists(day);
  const result = resultForDay(day);
  return `
    <article class="history-item">
      <div class="history-main">
        <strong>${day.date} · ${formatFists(used)} / ${formatFists(day.quota)}</strong>
        <p class="history-meta">目标 ${formatWeight(day.targetWeight)} 斤 · ${day.weight} 斤档 · ${day.entries.length} 条记录</p>
      </div>
      <span class="result-pill ${result.tone}">${result.text}</span>
    </article>
  `;
}

function formatWeight(weight) {
  const value = Number(weight);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function switchTab(tab) {
  if (!["today", "rules", "records"].includes(tab)) return;
  state.tab = tab;
  saveState();
  renderAll();
}

function addEntry() {
  if (!validAmount(state.draftAmount)) return;
  const day = getToday();
  syncTodayTarget(day);
  day.completed = false;
  day.entries.push({
    id: String(Date.now()),
    meal: state.draftMeal,
    fists: Number(state.draftAmount),
    time: timeLabel(new Date())
  });
  saveState();
  renderAll();
}

function removeEntry(id) {
  const day = getToday();
  day.entries = day.entries.filter((entry) => entry.id !== id);
  if (!day.entries.length) day.completed = false;
  saveState();
  renderAll();
}

function completeToday() {
  const day = getToday();
  if (!day.entries.length) return;
  day.completed = true;
  saveState();
  renderAll();
}

function resetToday() {
  const day = getToday();
  if (!day.entries.length && !day.completed) return;
  if (!window.confirm("确定清空今天的记录吗？")) return;
  const matchedRule = ruleForTarget(state.targetWeight);
  state.days[todayKey()] = {
    date: todayKey(),
    targetWeight: state.targetWeight,
    weight: matchedRule.weight,
    quota: matchedRule.fists,
    entries: [],
    completed: false
  };
  saveState();
  renderAll();
}

function changeTargetWeight(weight) {
  if (!validTargetWeight(weight)) return;
  state.targetWeight = Number(weight);
  const day = getToday();
  syncTodayTarget(day);
  saveState();
  renderAll();
}

function syncTodayTarget(day) {
  const matchedRule = ruleForTarget(state.targetWeight);
  day.targetWeight = state.targetWeight;
  day.weight = matchedRule.weight;
  day.quota = matchedRule.fists;
}

document.body.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) {
    switchTab(tabButton.dataset.tab);
    return;
  }

  const mealButton = event.target.closest("[data-meal]");
  if (mealButton) {
    state.draftMeal = mealButton.dataset.meal;
    saveState();
    renderAll();
    return;
  }

  const amountButton = event.target.closest("[data-amount]");
  if (amountButton) {
    state.draftAmount = Number(amountButton.dataset.amount);
    saveState();
    renderAll();
    return;
  }

  const removeButton = event.target.closest("[data-remove-entry]");
  if (removeButton) {
    removeEntry(removeButton.dataset.removeEntry);
  }
});

nodes.targetWeightInput.addEventListener("input", (event) => changeTargetWeight(event.target.value));

nodes.customAmount.addEventListener("input", (event) => {
  const value = Number(event.target.value);
  if (!validAmount(value)) return;
  state.draftAmount = value;
  saveState();
  renderAll();
});

nodes.addEntryBtn.addEventListener("click", addEntry);
nodes.completeTodayBtn.addEventListener("click", completeToday);
nodes.resetTodayBtn.addEventListener("click", resetToday);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20260722t2").catch(() => {});
  });
}

renderAll();
