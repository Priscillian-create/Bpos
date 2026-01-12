const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const amountInput = document.getElementById('amount');
const chargeInput = document.getElementById('charge');
const addBtn = document.getElementById('add-btn');
const previewFee = document.getElementById('preview-fee');
const previewProfit = document.getElementById('preview-profit');
const rows = document.getElementById('rows');
const filterDate = document.getElementById('filter-date');
const clearDayBtn = document.getElementById('clear-day');
const sumCount = document.getElementById('sum-count');
const sumAmount = document.getElementById('sum-amount');
const sumCharge = document.getElementById('sum-charge');
const sumFee = document.getElementById('sum-fee');
const sumProfit = document.getElementById('sum-profit');
const appEl = document.getElementById('app');
const authEl = document.getElementById('auth');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

const LS_KEY = 'pagerrys-pos-transactions';
const LS_BAL_KEY = 'pagerrys-pos-balances';
const SB_URL = 'https://jahogxnavfhrddfzxwcd.supabase.co';
const SB_KEY = 'sb_publishable_bEzlFbe_D7OGeyCvUZlr-g_04hECDbk';
let sb = null;
let currentUser = null;
let deferredPrompt = null;
const installBtn = document.getElementById('install-btn');
const openingCashInput = document.getElementById('opening-cash');
const additionalCashInput = document.getElementById('additional-cash');
const openingPosInput = document.getElementById('opening-pos');
const closingCashInput = document.getElementById('closing-cash');
const closingPosInput = document.getElementById('closing-pos');
const saveBalancesBtn = document.getElementById('save-balances');
const openCashEl = document.getElementById('open-cash');
const openPosEl = document.getElementById('open-pos');
const expCloseCashEl = document.getElementById('exp-close-cash');
const actCloseCashEl = document.getElementById('act-close-cash');
const expClosePosEl = document.getElementById('exp-close-pos');
const actClosePosEl = document.getElementById('act-close-pos');

function initSupabase() {
  if (!sb && window.supabase && typeof window.supabase.createClient === 'function') {
    sb = window.supabase.createClient(SB_URL, SB_KEY);
  }
}
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }
    });
  }
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function loadBalancesMap() {
  try {
    const raw = localStorage.getItem(LS_BAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveBalancesMap(map) {
  localStorage.setItem(LS_BAL_KEY, JSON.stringify(map || {}));
}
async function getBalances(dateStr) {
  if (sb && currentUser) {
    const { data } = await sb
      .from('day_balances')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', dateStr)
      .maybeSingle();
    if (data) {
      return {
        opening_cash: Number(data.opening_cash) || 0,
        opening_pos: Number(data.opening_pos) || 0,
        additional_cash: Number(data.additional_cash) || 0,
        closing_cash: Number(data.closing_cash) || 0,
        closing_pos: Number(data.closing_pos) || 0,
      };
    }
  }
  const map = loadBalancesMap();
  const b = map[dateStr] || {};
  return {
    opening_cash: Number(b.opening_cash) || 0,
    opening_pos: Number(b.opening_pos) || 0,
    additional_cash: Number(b.additional_cash) || 0,
    closing_cash: Number(b.closing_cash) || 0,
    closing_pos: Number(b.closing_pos) || 0,
  };
}
async function setBalances(dateStr, vals) {
  const payload = {
    opening_cash: Math.round(Number(vals.opening_cash) || 0),
    opening_pos: Math.round(Number(vals.opening_pos) || 0),
    additional_cash: Math.round(Number(vals.additional_cash) || 0),
    closing_cash: Math.round(Number(vals.closing_cash) || 0),
    closing_pos: Math.round(Number(vals.closing_pos) || 0),
  };
  if (sb && currentUser) {
    const { error } = await sb
      .from('day_balances')
      .upsert({
        user_id: currentUser.id,
        date: dateStr,
        ...payload
      }, { onConflict: 'user_id,date' });
    if (!error) return;
  }
  const map = loadBalancesMap();
  map[dateStr] = payload;
  saveBalancesMap(map);
}
function naira(n) {
  const v = Math.round(Number(n) || 0);
  return `₦${v.toLocaleString('en-NG')}`;
}

function feeFor(type, amount) {
  const a = Number(amount) || 0;
  if (type === 'withdrawal') {
    if (a < 20000) return Math.round(a * 0.005);
    return 100;
  }
  if (type === 'transfer_out') {
    return 20;
  }
  if (type === 'transfer_in') {
    if (a >= 10000) return 50;
    return 0;
  }
  return 0;
}

function updatePreview() {
  const fee = feeFor(typeInput.value, amountInput.value);
  const profit = Math.round((Number(chargeInput.value) || 0) - fee);
  previewFee.textContent = `Moniepoint Fee: ${naira(fee)}`;
  previewProfit.textContent = `Profit: ${naira(profit)}`;
  addBtn.disabled = !(dateInput.value && typeInput.value && Number(amountInput.value) > 0);
}

async function render() {
  const activeDate = filterDate.value || todayStr();
  let filtered = [];
  if (sb && currentUser) {
    const { data, error } = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', activeDate)
      .order('created_at', { ascending: true });
    if (!error && data) {
      filtered = data;
    }
  } else {
    const list = load();
    filtered = list.filter(t => t.date === activeDate);
  }
  const balances = await getBalances(activeDate);
  openingCashInput.value = String(balances.opening_cash || '');
  openingPosInput.value = String(balances.opening_pos || '');
  additionalCashInput.value = String(balances.additional_cash || '');
  closingCashInput.value = String(balances.closing_cash || '');
  closingPosInput.value = String(balances.closing_pos || '');
  rows.innerHTML = '';
  filtered.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.date}</td>
      <td><span class="tag">${labelFor(t.type)}</span></td>
      <td class="amount">${naira(t.amount)}</td>
      <td class="amount">${naira(t.charge)}</td>
      <td class="amount">${naira(t.fee)}</td>
      <td class="amount">${naira(t.profit)}</td>
      <td><button class="action" data-id="${t.id}">Delete</button></td>
    `;
    rows.appendChild(tr);
  });
  const totals = filtered.reduce((acc, t) => {
    acc.count += 1;
    acc.amount += t.amount;
    acc.charge += t.charge;
    acc.fee += t.fee;
    acc.profit += t.profit;
    return acc;
  }, { count: 0, amount: 0, charge: 0, fee: 0, profit: 0 });
  sumCount.textContent = String(totals.count);
  sumAmount.textContent = naira(totals.amount);
  sumCharge.textContent = naira(totals.charge);
  sumFee.textContent = naira(totals.fee);
  sumProfit.textContent = naira(totals.profit);
  const sums = filtered.reduce((acc, t) => {
    if (t.type === 'withdrawal') acc.withdrawal += t.amount;
    else if (t.type === 'transfer_in') acc.transfer_in += t.amount;
    else if (t.type === 'transfer_out') acc.transfer_out += t.amount;
    acc.charges += t.charge;
    return acc;
  }, { withdrawal: 0, transfer_in: 0, transfer_out: 0, charges: 0 });
  const expCloseCash = (balances.opening_cash || 0) - sums.withdrawal + sums.transfer_in + sums.charges + (balances.additional_cash || 0);
  const expClosePos = (balances.opening_pos || 0) + sums.withdrawal + sums.transfer_in - sums.transfer_out;
  openCashEl.textContent = naira(balances.opening_cash || 0);
  openPosEl.textContent = naira(balances.opening_pos || 0);
  expCloseCashEl.textContent = naira(expCloseCash);
  actCloseCashEl.textContent = naira(balances.closing_cash || 0);
  expClosePosEl.textContent = naira(expClosePos);
  actClosePosEl.textContent = naira(balances.closing_pos || 0);
}

function labelFor(t) {
  if (t === 'withdrawal') return 'Withdrawal';
  if (t === 'transfer_in') return 'Transfer In';
  if (t === 'transfer_out') return 'Transfer Out';
  return t;
}

async function addTransaction() {
  const amt = Math.round(Number(amountInput.value) || 0);
  const chg = Math.round(Number(chargeInput.value) || 0);
  const typ = typeInput.value;
  const dt = dateInput.value || todayStr();
  const fee = feeFor(typ, amt);
  const profit = chg - fee;
  if (sb && currentUser) {
    await sb.from('transactions').insert({
      user_id: currentUser.id,
      date: dt,
      type: typ,
      amount: amt,
      charge: chg,
      fee,
      profit
    });
  } else {
    const tx = {
      id: String(Date.now()) + Math.random().toString(36).slice(2),
      date: dt,
      type: typ,
      amount: amt,
      charge: chg,
      fee,
      profit
    };
    const list = load();
    list.push(tx);
    save(list);
  }
  amountInput.value = '';
  chargeInput.value = '';
  await render();
  filterDate.value = dt;
}

async function deleteTransaction(id) {
  if (sb && currentUser) {
    await sb.from('transactions').delete().eq('id', id).eq('user_id', currentUser.id);
  } else {
    const list = load();
    const next = list.filter(t => t.id !== id);
    save(next);
  }
  await render();
}

async function clearDay() {
  const activeDate = filterDate.value || todayStr();
  if (sb && currentUser) {
    await sb.from('transactions').delete().eq('user_id', currentUser.id).eq('date', activeDate);
  } else {
    const list = load().filter(t => t.date !== activeDate);
    save(list);
  }
  await render();
}

async function refreshAuth() {
  if (!sb) return;
  const { data: userData } = await sb.auth.getUser();
  currentUser = userData?.user || null;
  if (currentUser) {
    authEl.style.display = 'none';
    appEl.style.display = '';
  } else {
    authEl.style.display = '';
    appEl.style.display = 'none';
  }
}

async function init() {
  initSupabase();
  registerSW();
  const t = todayStr();
  dateInput.value = t;
  filterDate.value = t;
  updatePreview();
  await refreshAuth();
  await render();
}

amountInput.addEventListener('input', updatePreview);
chargeInput.addEventListener('input', updatePreview);
typeInput.addEventListener('change', updatePreview);
dateInput.addEventListener('change', updatePreview);
addBtn.addEventListener('click', () => addTransaction());
filterDate.addEventListener('change', () => render());
clearDayBtn.addEventListener('click', () => clearDay());
rows.addEventListener('click', (e) => {
  const btn = e.target.closest('button.action');
  if (!btn) return;
  deleteTransaction(btn.getAttribute('data-id'));
});

saveBalancesBtn?.addEventListener('click', async () => {
  const activeDate = filterDate.value || todayStr();
  await setBalances(activeDate, {
    opening_cash: openingCashInput.value,
    opening_pos: openingPosInput.value,
    additional_cash: additionalCashInput.value,
    closing_cash: closingCashInput.value,
    closing_pos: closingPosInput.value,
  });
  await render();
});
loginBtn?.addEventListener('click', async () => {
  initSupabase();
  if (!sb) return;
  const email = (emailInput.value || '').trim();
  const pass = passwordInput.value || '';
  if (!email || !pass) return;
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (!error) {
    await refreshAuth();
    await render();
  } else {
    alert('Login failed');
  }
});

signupBtn?.addEventListener('click', async () => {
  initSupabase();
  if (!sb) return;
  const email = (emailInput.value || '').trim();
  const pass = passwordInput.value || '';
  if (!email || !pass) return;
  const { error } = await sb.auth.signUp({ email, password: pass });
  if (!error) {
    alert('Account created. Please login.');
  } else {
    alert('Signup failed');
  }
});

logoutBtn?.addEventListener('click', async () => {
  if (!sb) return;
  await sb.auth.signOut();
  await refreshAuth();
});
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (authEl) authEl.style.display = '';
  installBtn.style.display = 'block';
});
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) {
    alert('Install not available');
    return;
  }
  const p = deferredPrompt;
  deferredPrompt = null;
  await p.prompt();
});

init();
