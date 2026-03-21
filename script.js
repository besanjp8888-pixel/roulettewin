const STORAGE_KEY = 'roulette_app_v5_state';

const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const wheelIndexMap = Object.fromEntries(wheelOrder.map((n, i) => [n, i]));

const state = {
  historyLatestFirst: [],
  usualExcludeOriginal: [],
};

const els = {
  latestInput: document.getElementById('latestInput'),
  addLatestBtn: document.getElementById('addLatestBtn'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  bulkInput: document.getElementById('bulkInput'),
  replaceBulkBtn: document.getElementById('replaceBulkBtn'),
  appendBulkBtn: document.getElementById('appendBulkBtn'),
  clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
  usualExcludeInput: document.getElementById('usualExcludeInput'),
  replaceUsualExcludeBtn: document.getElementById('replaceUsualExcludeBtn'),
  appendUsualExcludeBtn: document.getElementById('appendUsualExcludeBtn'),
  clearUsualExcludeBtn: document.getElementById('clearUsualExcludeBtn'),
  usualExcludeSaved: document.getElementById('usualExcludeSaved'),
  historyCount: document.getElementById('historyCount'),
  latestNumber: document.getElementById('latestNumber'),
  historyList: document.getElementById('historyList'),
  possibleNumbers: document.getElementById('possibleNumbers'),
  unlikelyNumbers: document.getElementById('unlikelyNumbers'),
};

function isValidNumber(value) {
  return Number.isInteger(value) && value >= 0 && value <= 36;
}

function dedupe(arr) {
  return [...new Set(arr)];
}

function parseNumberList(text) {
  const tokens = text.split(/[^0-9]+/g).map(t => t.trim()).filter(Boolean);
  const nums = tokens.map(t => Number(t)).filter(n => Number.isInteger(n));
  const invalid = nums.filter(n => !isValidNumber(n));
  if (invalid.length) {
    throw new Error(`含有超出範圍的號碼：${invalid.join(', ')}`);
  }
  return nums;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.historyLatestFirst = Array.isArray(parsed.historyLatestFirst) ? parsed.historyLatestFirst.filter(isValidNumber) : [];
    state.usualExcludeOriginal = Array.isArray(parsed.usualExcludeOriginal) ? dedupe(parsed.usualExcludeOriginal.filter(isValidNumber)) : [];
  } catch (err) {
    console.error(err);
  }
}

function getForwardDistance(from, to) {
  const len = wheelOrder.length;
  return (wheelIndexMap[to] - wheelIndexMap[from] + len) % len;
}

function getBackwardDistance(from, to) {
  const len = wheelOrder.length;
  return (wheelIndexMap[from] - wheelIndexMap[to] + len) % len;
}

function moveForward(number, steps) {
  const len = wheelOrder.length;
  return wheelOrder[(wheelIndexMap[number] + steps) % len];
}

function moveBackward(number, steps) {
  const len = wheelOrder.length;
  return wheelOrder[(wheelIndexMap[number] - steps + len) % len];
}

function getChronologicalHistory() {
  return [...state.historyLatestFirst].reverse();
}

function buildDistances(historyChronological) {
  const forward = [];
  const backward = [];
  for (let i = 1; i < historyChronological.length; i += 1) {
    const prev = historyChronological[i - 1];
    const curr = historyChronological[i];
    forward.push(getForwardDistance(prev, curr));
    backward.push(getBackwardDistance(prev, curr));
  }
  return { forward, backward };
}

function buildPredictions() {
  const historyChronological = getChronologicalHistory();
  if (historyChronological.length < 2) {
    return {
      possibleCounts: new Map(),
      finalUsualExcludeCurrent: [],
      finalCombinedUnlikely: [],
      overlapSet: new Set(),
    };
  }

  const latest = state.historyLatestFirst[0];
  const { forward, backward } = buildDistances(historyChronological);
  const allPredictions = [];

  for (const step of forward) allPredictions.push(moveForward(latest, step));
  for (const step of backward) allPredictions.push(moveBackward(latest, step));

  const possibleCounts = new Map();
  for (const n of allPredictions) {
    possibleCounts.set(n, (possibleCounts.get(n) || 0) + 1);
  }

  const possibleSet = new Set(possibleCounts.keys());
  const predictedUnlikely = [];
  for (let n = 0; n <= 36; n += 1) {
    if (!possibleSet.has(n)) predictedUnlikely.push(n);
  }

  const finalUsualExcludeCurrent = state.usualExcludeOriginal.filter(n => !possibleSet.has(n));
  const predictedUnlikelySet = new Set(predictedUnlikely);
  const overlapSet = new Set(finalUsualExcludeCurrent.filter(n => predictedUnlikelySet.has(n)));
  const finalCombinedUnlikely = dedupe([...predictedUnlikely, ...finalUsualExcludeCurrent]).sort((a, b) => a - b);

  return { possibleCounts, finalUsualExcludeCurrent, finalCombinedUnlikely, overlapSet };
}

function renderPossibleNumbers(possibleCounts) {
  const entries = [...possibleCounts.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]));
  if (!entries.length) {
    els.possibleNumbers.className = 'result-list empty-state';
    els.possibleNumbers.textContent = '至少需要 2 筆號碼才能產生預測。';
    return;
  }
  els.possibleNumbers.className = 'result-list';
  els.possibleNumbers.innerHTML = entries.map(([num, count]) =>
    `<span class="number-chip">${num}<span class="count">${count}次</span></span>`
  ).join('');
}

function renderUnlikelyNumbers(numbers, overlapSet) {
  if (!numbers.length) {
    els.unlikelyNumbers.className = 'result-list empty-state';
    els.unlikelyNumbers.textContent = '至少需要 2 筆號碼才能產生預測。';
    return;
  }
  els.unlikelyNumbers.className = 'result-list';
  els.unlikelyNumbers.innerHTML = numbers.map(num => {
    const cls = overlapSet.has(num) ? 'number-circle red-fill' : 'number-circle';
    return `<span class="${cls}">${num}</span>`;
  }).join('');
}

function renderUsualExcludeSaved(currentActive) {
  if (!state.usualExcludeOriginal.length) {
    els.usualExcludeSaved.className = 'result-list empty-state';
    els.usualExcludeSaved.textContent = '尚未設定。';
    return;
  }
  const activeSet = new Set(currentActive);
  els.usualExcludeSaved.className = 'result-list';
  els.usualExcludeSaved.innerHTML = state.usualExcludeOriginal.map(num => {
    const inactive = activeSet.has(num) ? '' : ' style="opacity:0.38;text-decoration:line-through;"';
    return `<span class="number-circle"${inactive}>${num}</span>`;
  }).join('');
}

function renderHistory() {
  els.historyCount.textContent = String(state.historyLatestFirst.length);
  els.latestNumber.textContent = state.historyLatestFirst.length ? String(state.historyLatestFirst[0]) : '-';

  if (!state.historyLatestFirst.length) {
    els.historyList.className = 'history-grid empty-state';
    els.historyList.textContent = '尚未輸入任何號碼。';
    return;
  }

  els.historyList.className = 'history-grid';
  els.historyList.innerHTML = state.historyLatestFirst.map(num => `<div class="history-box">${num}</div>`).join('');
}

function renderAll() {
  const predictionBundle = buildPredictions();
  renderHistory();
  renderPossibleNumbers(predictionBundle.possibleCounts);
  renderUnlikelyNumbers(predictionBundle.finalCombinedUnlikely, predictionBundle.overlapSet);
  renderUsualExcludeSaved(predictionBundle.finalUsualExcludeCurrent);
  saveState();
}

function handleAddLatest() {
  const value = Number(els.latestInput.value);
  if (!isValidNumber(value)) {
    alert('請輸入 0 ~ 36 的號碼。');
    return;
  }
  state.historyLatestFirst.unshift(value);
  els.latestInput.value = '';
  renderAll();
}

function handleReplaceBulkHistory() {
  try {
    const numbers = parseNumberList(els.bulkInput.value);
    state.historyLatestFirst = numbers;
    renderAll();
  } catch (err) {
    alert(err.message);
  }
}

function handleAppendBulkHistory() {
  try {
    const numbers = parseNumberList(els.bulkInput.value);
    state.historyLatestFirst = numbers.concat(state.historyLatestFirst);
    renderAll();
  } catch (err) {
    alert(err.message);
  }
}

function handleClearAllHistory() {
  state.historyLatestFirst = [];
  renderAll();
}

function handleReplaceUsualExclude() {
  try {
    const numbers = dedupe(parseNumberList(els.usualExcludeInput.value));
    state.usualExcludeOriginal = numbers;
    renderAll();
  } catch (err) {
    alert(err.message);
  }
}

function handleAppendUsualExclude() {
  try {
    const numbers = dedupe(parseNumberList(els.usualExcludeInput.value));
    state.usualExcludeOriginal = dedupe([...state.usualExcludeOriginal, ...numbers]);
    renderAll();
  } catch (err) {
    alert(err.message);
  }
}

function handleClearUsualExclude() {
  state.usualExcludeOriginal = [];
  renderAll();
}

els.addLatestBtn.addEventListener('click', handleAddLatest);
els.analyzeBtn.addEventListener('click', renderAll);
els.replaceBulkBtn.addEventListener('click', handleReplaceBulkHistory);
els.appendBulkBtn.addEventListener('click', handleAppendBulkHistory);
els.clearAllHistoryBtn.addEventListener('click', handleClearAllHistory);
els.replaceUsualExcludeBtn.addEventListener('click', handleReplaceUsualExclude);
els.appendUsualExcludeBtn.addEventListener('click', handleAppendUsualExclude);
els.clearUsualExcludeBtn.addEventListener('click', handleClearUsualExclude);

loadState();
renderAll();
