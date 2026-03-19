const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const wheelSize = wheelOrder.length;
const allNumbers = Array.from({ length: 37 }, (_, i) => i);
const wheelIndexMap = Object.fromEntries(wheelOrder.map((num, idx) => [num, idx]));
const storageKey = 'euro-roulette-history-v2';

const els = {
  bulkInput: document.getElementById('bulkInput'),
  replaceBulkBtn: document.getElementById('replaceBulkBtn'),
  appendBulkBtn: document.getElementById('appendBulkBtn'),
  sampleBtn: document.getElementById('sampleBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  latestInput: document.getElementById('latestInput'),
  addLatestBtn: document.getElementById('addLatestBtn'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  historyList: document.getElementById('historyList'),
  historyCount: document.getElementById('historyCount'),
  latestNumber: document.getElementById('latestNumber'),
  possibleNumbers: document.getElementById('possibleNumbers'),
  impossibleNumbers: document.getElementById('impossibleNumbers'),
  toast: document.getElementById('toast')
};

let historyNumbers = loadHistory();

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 1800);
}

function saveHistory() {
  localStorage.setItem(storageKey, JSON.stringify(historyNumbers));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidNumber) : [];
  } catch {
    return [];
  }
}

function isValidNumber(value) {
  return Number.isInteger(value) && value >= 0 && value <= 36;
}

function parseBulkInput(text) {
  return text
    .split(/[\s,，、;；\n\t]+/)
    .map(token => token.trim())
    .filter(Boolean)
    .map(Number)
    .filter(isValidNumber);
}

function replaceBulkHistory() {
  const values = parseBulkInput(els.bulkInput.value);
  if (!values.length) {
    showToast('沒有找到有效號碼。');
    return;
  }
  historyNumbers = values;
  saveHistory();
  render();
  els.bulkInput.value = '';
  showToast(`已覆蓋為 ${values.length} 筆歷史資料`);
}

function appendBulkHistory() {
  const values = parseBulkInput(els.bulkInput.value);
  if (!values.length) {
    showToast('沒有找到有效號碼。');
    return;
  }
  historyNumbers.push(...values);
  saveHistory();
  render();
  els.bulkInput.value = '';
  showToast(`已追加 ${values.length} 筆歷史資料`);
}

function addLatestNumber() {
  const number = Number(els.latestInput.value);
  if (!isValidNumber(number)) {
    showToast('請輸入 0 到 36 的整數。');
    return;
  }
  historyNumbers.push(number);
  saveHistory();
  render();
  els.latestInput.value = '';
  els.latestInput.focus();
  showToast(`已加入最新一期：${number}`);
}

function clearAll() {
  if (!historyNumbers.length) {
    showToast('目前沒有資料。');
    return;
  }
  if (!window.confirm('確定要清空全部歷史號碼嗎？')) return;
  historyNumbers = [];
  saveHistory();
  render();
  showToast('已清空全部資料');
}

function loadSample() {
  historyNumbers = [5, 9, 24, 1, 13, 16, 33, 4, 16, 21, 23, 4, 9, 10];
  saveHistory();
  render();
  showToast('已載入範例資料');
}

function getForwardSteps(from, to) {
  const fromIndex = wheelIndexMap[from];
  const toIndex = wheelIndexMap[to];
  return (toIndex - fromIndex + wheelSize) % wheelSize;
}

function getBackwardSteps(from, to) {
  const fromIndex = wheelIndexMap[from];
  const toIndex = wheelIndexMap[to];
  return (fromIndex - toIndex + wheelSize) % wheelSize;
}

function moveForward(start, steps) {
  const startIndex = wheelIndexMap[start];
  return wheelOrder[(startIndex + steps) % wheelSize];
}

function moveBackward(start, steps) {
  const startIndex = wheelIndexMap[start];
  return wheelOrder[(startIndex - steps + wheelSize) % wheelSize];
}

function buildTransitions(numbers) {
  const transitions = [];
  for (let i = 1; i < numbers.length; i++) {
    const previous = numbers[i - 1];
    const current = numbers[i];
    transitions.push({
      previous,
      current,
      forward: getForwardSteps(previous, current),
      backward: getBackwardSteps(previous, current)
    });
  }
  return transitions;
}

function buildPrediction(numbers) {
  const transitions = buildTransitions(numbers);
  if (!numbers.length) {
    return {
      rankedPossible: [],
      impossible: []
    };
  }

  const lastNumber = numbers[numbers.length - 1];
  const forwardSteps = transitions.map(item => item.forward);
  const backwardSteps = transitions.map(item => item.backward);
  const forwardPredictions = forwardSteps.map(step => moveForward(lastNumber, step));
  const backwardPredictions = backwardSteps.map(step => moveBackward(lastNumber, step));
  const allPredictions = [...forwardPredictions, ...backwardPredictions];

  const counts = new Map();
  allPredictions.forEach(num => {
    counts.set(num, (counts.get(num) || 0) + 1);
  });

  const rankedPossible = [...counts.entries()]
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count || a.number - b.number);

  const uniquePossible = new Set(allPredictions);
  const impossible = allNumbers.filter(num => !uniquePossible.has(num));

  return { rankedPossible, impossible };
}

function renderHistory() {
  els.historyCount.textContent = historyNumbers.length;
  els.latestNumber.textContent = historyNumbers.length ? historyNumbers[historyNumbers.length - 1] : '-';

  if (!historyNumbers.length) {
    els.historyList.className = 'history-grid empty-state';
    els.historyList.textContent = '尚未輸入任何號碼。';
    return;
  }

  els.historyList.className = 'history-grid';
  els.historyList.innerHTML = '';

  const displayNumbers = [...historyNumbers].reverse();
  displayNumbers.forEach((num, index) => {
    const item = document.createElement('div');
    item.className = 'history-box';
    if (index === 0) item.classList.add('latest-box');

    const order = document.createElement('div');
    order.className = 'history-order';
    order.textContent = index === 0 ? '最新' : `第 ${historyNumbers.length - index} 筆`;

    const value = document.createElement('div');
    value.className = 'history-value';
    value.textContent = num;

    item.appendChild(order);
    item.appendChild(value);
    els.historyList.appendChild(item);
  });
}

function renderPredictions(prediction) {
  const { rankedPossible, impossible } = prediction;

  if (!rankedPossible.length) {
    els.possibleNumbers.className = 'result-list empty-state';
    els.possibleNumbers.textContent = '至少需要 2 筆號碼才能產生預測。';
  } else {
    els.possibleNumbers.className = 'result-list';
    const wrap = document.createElement('div');
    wrap.className = 'tag-wrap';
    rankedPossible.forEach(item => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = `${item.number}（${item.count}次）`;
      wrap.appendChild(tag);
    });
    els.possibleNumbers.innerHTML = '';
    els.possibleNumbers.appendChild(wrap);
  }

  if (!rankedPossible.length) {
    els.impossibleNumbers.className = 'result-list empty-state';
    els.impossibleNumbers.textContent = '至少需要 2 筆號碼才能產生預測。';
  } else {
    els.impossibleNumbers.className = 'result-list';
    const wrap = document.createElement('div');
    wrap.className = 'tag-wrap';
    impossible.forEach(num => {
      const tag = document.createElement('span');
      tag.className = 'tag-danger';
      tag.textContent = num;
      wrap.appendChild(tag);
    });
    els.impossibleNumbers.innerHTML = '';
    els.impossibleNumbers.appendChild(wrap);
  }
}

function render() {
  renderHistory();
  renderPredictions(buildPrediction(historyNumbers));
}

els.replaceBulkBtn.addEventListener('click', replaceBulkHistory);
els.appendBulkBtn.addEventListener('click', appendBulkHistory);
els.sampleBtn.addEventListener('click', loadSample);
els.clearAllBtn.addEventListener('click', clearAll);
els.addLatestBtn.addEventListener('click', addLatestNumber);
els.latestInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') addLatestNumber();
});
els.analyzeBtn.addEventListener('click', render);

render();
