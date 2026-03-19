const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const wheelSize = wheelOrder.length;
const allNumbers = Array.from({ length: 37 }, (_, i) => i);
const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const wheelIndexMap = Object.fromEntries(wheelOrder.map((num, idx) => [num, idx]));
const storageKey = 'euro-roulette-history-v1';

const els = {
  singleNumber: document.getElementById('singleNumber'),
  bulkInput: document.getElementById('bulkInput'),
  addSingleBtn: document.getElementById('addSingleBtn'),
  addBulkBtn: document.getElementById('addBulkBtn'),
  sampleBtn: document.getElementById('sampleBtn'),
  deleteLastBtn: document.getElementById('deleteLastBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  analyzeBtnTop: document.getElementById('analyzeBtnTop'),
  numberPad: document.getElementById('numberPad'),
  historyList: document.getElementById('historyList'),
  historyCount: document.getElementById('historyCount'),
  latestNumber: document.getElementById('latestNumber'),
  transitions: document.getElementById('transitions'),
  transitionCount: document.getElementById('transitionCount'),
  possibleNumbers: document.getElementById('possibleNumbers'),
  impossibleNumbers: document.getElementById('impossibleNumbers'),
  forwardSteps: document.getElementById('forwardSteps'),
  backwardSteps: document.getElementById('backwardSteps'),
  forwardPredictions: document.getElementById('forwardPredictions'),
  backwardPredictions: document.getElementById('backwardPredictions'),
  wheelOrderDisplay: document.getElementById('wheelOrderDisplay'),
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

function addSingleNumber(value) {
  const number = Number(value);
  if (!isValidNumber(number)) {
    showToast('請輸入 0 到 36 的整數。');
    return;
  }
  historyNumbers.push(number);
  saveHistory();
  render();
  els.singleNumber.value = '';
  els.singleNumber.focus();
}

function addBulkNumbers() {
  const values = parseBulkInput(els.bulkInput.value);
  if (!values.length) {
    showToast('沒有找到有效號碼。');
    return;
  }
  historyNumbers.push(...values);
  saveHistory();
  render();
  els.bulkInput.value = '';
  showToast(`已加入 ${values.length} 筆資料`);
}

function deleteLast() {
  if (!historyNumbers.length) {
    showToast('目前沒有可刪除的資料。');
    return;
  }
  const removed = historyNumbers.pop();
  saveHistory();
  render();
  showToast(`已刪除最後一筆：${removed}`);
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
  historyNumbers = [5, 9, 22, 1, 0, 32, 15, 19, 4, 21, 2, 25];
  saveHistory();
  render();
  showToast('已載入範例資料');
}

function colorClass(num) {
  if (num === 0) return 'zero';
  return redNumbers.has(num) ? 'red' : 'black';
}

function createNumberPad() {
  els.numberPad.innerHTML = '';
  allNumbers.forEach(num => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = num;
    btn.className = colorClass(num);
    btn.addEventListener('click', () => addSingleNumber(num));
    els.numberPad.appendChild(btn);
  });
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
      transitions,
      lastNumber: null,
      forwardSteps: [],
      backwardSteps: [],
      forwardPredictions: [],
      backwardPredictions: [],
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

  return {
    transitions,
    lastNumber,
    forwardSteps,
    backwardSteps,
    forwardPredictions,
    backwardPredictions,
    rankedPossible,
    impossible
  };
}

function renderHistory() {
  els.historyCount.textContent = historyNumbers.length;
  els.latestNumber.textContent = historyNumbers.length ? historyNumbers[historyNumbers.length - 1] : '-';

  if (!historyNumbers.length) {
    els.historyList.className = 'history-list empty-state';
    els.historyList.textContent = '尚未輸入任何號碼。';
    return;
  }

  els.historyList.className = 'history-list';
  const wrap = document.createElement('div');
  wrap.className = 'history-chip-wrap';
  historyNumbers.forEach((num, idx) => {
    const chip = document.createElement('span');
    chip.className = 'history-chip';
    chip.textContent = `${idx + 1}. ${num}`;
    wrap.appendChild(chip);
  });
  els.historyList.innerHTML = '';
  els.historyList.appendChild(wrap);
}

function renderTransitions(transitions) {
  els.transitionCount.textContent = transitions.length;
  if (!transitions.length) {
    els.transitions.className = 'card-list empty-state';
    els.transitions.textContent = '至少需要 2 筆號碼才能計算間隔。';
    return;
  }

  els.transitions.className = 'card-list';
  els.transitions.innerHTML = '';

  transitions.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'transition-card';
    card.innerHTML = `
      <div class="transition-row">
        <div class="transition-main">${idx + 1}. ${item.previous} → ${item.current}</div>
        <span class="pill">相鄰期數</span>
      </div>
      <div class="transition-meta">
        <span class="tag-muted">順向：${item.forward}</span>
        <span class="tag">逆向：${item.backward}</span>
      </div>
    `;
    els.transitions.appendChild(card);
  });
}

function renderPredictions(prediction) {
  const {
    rankedPossible,
    impossible,
    forwardSteps,
    backwardSteps,
    forwardPredictions,
    backwardPredictions
  } = prediction;

  els.forwardSteps.textContent = forwardSteps.length ? forwardSteps.join(', ') : '-';
  els.backwardSteps.textContent = backwardSteps.length ? backwardSteps.join(', ') : '-';
  els.forwardPredictions.textContent = forwardPredictions.length ? forwardPredictions.join(', ') : '-';
  els.backwardPredictions.textContent = backwardPredictions.length ? backwardPredictions.join(', ') : '-';

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

function renderWheelOrder() {
  els.wheelOrderDisplay.textContent = wheelOrder.join(' → ');
}

function render() {
  renderHistory();
  const prediction = buildPrediction(historyNumbers);
  renderTransitions(prediction.transitions);
  renderPredictions(prediction);
}

els.addSingleBtn.addEventListener('click', () => addSingleNumber(els.singleNumber.value));
els.singleNumber.addEventListener('keydown', event => {
  if (event.key === 'Enter') addSingleNumber(els.singleNumber.value);
});
els.addBulkBtn.addEventListener('click', addBulkNumbers);
els.sampleBtn.addEventListener('click', loadSample);
els.deleteLastBtn.addEventListener('click', deleteLast);
els.clearAllBtn.addEventListener('click', clearAll);
els.analyzeBtn.addEventListener('click', render);
els.analyzeBtnTop.addEventListener('click', render);

createNumberPad();
renderWheelOrder();
render();
