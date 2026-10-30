/* ==============================================
   EXPENSE PRO — app.js
   All UI logic, API calls, chart rendering
============================================== */

// =============================================
// STATE
// =============================================
const state = {
  user: null,
  transactions: [],
  budget: 0,
  authMode: 'login',      // 'login' | 'register'
  expenseType: 'expense', // 'expense' | 'income'
  sortKey: 'date',
  sortDir: -1,            // -1 = desc, 1 = asc
  pieChart: null,
  barChart: null,
};

// Category definitions
const CATEGORIES = {
  expense: ['Food & Dining', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Utilities', 'Education', 'Other'],
  income:  ['Salary', 'Freelance', 'Investments', 'Gifts', 'Business', 'Other'],
};

// Category color map for charts & icons
const CAT_COLORS = {
  'Food & Dining': '#f59e0b', 'Transport': '#38bdf8',
  'Shopping': '#a78bfa',      'Health': '#34d399',
  'Entertainment': '#f472b6', 'Utilities': '#60a5fa',
  'Education': '#fb923c',     'Other': '#94a3b8',
  'Salary': '#10b981',        'Freelance': '#6366f1',
  'Investments': '#8b5cf6',   'Gifts': '#fb7185',
  'Business': '#fbbf24',
};

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date in add form
  document.getElementById('exp-date').valueAsDate = new Date();
  // Populate category dropdown
  populateCategories();
  // Apply saved theme
  const savedTheme = localStorage.getItem('ep-theme') || 'dark';
  applyTheme(savedTheme);
});

// =============================================
// THEME
// =============================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  icon.setAttribute('name', theme === 'dark' ? 'sunny-outline' : 'moon-outline');
  localStorage.setItem('ep-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
  // Re-render charts with updated colors
  if (state.transactions.length) renderCharts();
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function showToast(message, type = 'info') {
  const icons = { success: 'checkmark-circle-outline', error: 'alert-circle-outline', warning: 'warning-outline', info: 'information-circle-outline' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<ion-icon name="${icons[type]}"></ion-icon><span>${message}</span>`;
  container.appendChild(el);
  // Auto-remove
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 350);
  }, 3500);
}

// =============================================
// BUDGET BANNER
// =============================================
function showBanner(message, type) {
  const banner = document.getElementById('budget-banner');
  banner.className = `budget-banner ${type}`;
  document.getElementById('budget-banner-text').textContent = message;
  banner.classList.remove('hidden');
}
function closeBanner() {
  document.getElementById('budget-banner').classList.add('hidden');
}

// =============================================
// AUTH
// =============================================
function switchTab(mode) {
  state.authMode = mode;
  const slider = document.getElementById('tab-slider');
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const submitBtn   = document.getElementById('auth-btn-label');
  const switchHint  = document.getElementById('auth-switch-hint');
  const switchLink  = document.getElementById('auth-switch-link');

  if (mode === 'login') {
    slider.classList.remove('right');
    tabLogin.classList.add('active');    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active'); tabRegister.setAttribute('aria-selected', 'false');
    submitBtn.textContent  = 'Sign In';
    switchHint.textContent = "Don't have an account?";
    switchLink.textContent = 'Create one →';
    switchLink.onclick = () => switchTab('register');
  } else {
    slider.classList.add('right');
    tabRegister.classList.add('active');    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active');    tabLogin.setAttribute('aria-selected', 'false');
    submitBtn.textContent  = 'Create Account';
    switchHint.textContent = 'Already have an account?';
    switchLink.textContent = 'Sign in →';
    switchLink.onclick = () => switchTab('login');
  }
}

function togglePw() {
  const input = document.getElementById('auth-password');
  const icon  = document.getElementById('pw-icon');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.setAttribute('name', isHidden ? 'eye-off-outline' : 'eye-outline');
}

async function handleAuth(e) {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!username || !password) { showToast('Please fill all fields', 'warning'); return; }

  const btn     = document.getElementById('auth-submit-btn');
  const spinner = document.getElementById('auth-spinner');
  const label   = document.getElementById('auth-btn-label');
  btn.disabled = true; spinner.classList.remove('hidden'); label.classList.add('hidden');

  const endpoint = state.authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
  try {
    const res  = await fetch(endpoint, { method: 'POST', body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (data.success) {
      state.user = username;
      // Load budget from localStorage (per user)
      state.budget = parseFloat(localStorage.getItem(`ep-budget-${username}`)) || 0;
      if (state.budget) document.getElementById('budget-input').value = state.budget;

      showToast(state.authMode === 'login' ? 'Welcome back! 👋' : 'Account created successfully!', 'success');
      bootApp();
    } else {
      showToast(data.message || 'Authentication failed', 'error');
    }
  } catch {
    showToast('Cannot reach server. Is it running?', 'error');
  } finally {
    btn.disabled = false; spinner.classList.add('hidden'); label.classList.remove('hidden');
  }
}

// =============================================
// APP BOOT / LOGOUT
// =============================================
function bootApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');

  // Set user info in UI
  const initials = state.user.charAt(0).toUpperCase();
  document.getElementById('sidebar-username').textContent  = state.user;
  document.getElementById('sidebar-avatar').textContent   = initials;
  document.getElementById('topbar-username').textContent  = state.user;
  document.getElementById('topbar-avatar').textContent    = initials;

  navigateTo('dashboard', document.getElementById('nav-dashboard'));
  loadTransactions();
}

function handleLogout() {
  state.user         = null;
  state.transactions = [];
  state.pieChart?.destroy(); state.pieChart = null;
  state.barChart?.destroy(); state.barChart = null;
  closeBanner();
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('auth-form').reset();
  showToast('Logged out successfully', 'success');
}

// =============================================
// NAVIGATION
// =============================================
function navigateTo(view, navEl) {
  // Update nav active state
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  navEl?.classList.add('active');

  // Hide all views, show target
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.getElementById(`view-${view}`).classList.add('active-view');

  // Update heading
  const headings = { dashboard: 'Dashboard', add: 'Add Expense', expenses: 'Transactions', analytics: 'Analytics' };
  document.getElementById('page-heading').textContent = headings[view] || '';

  // Close sidebar on mobile
  closeSidebar();

  // Trigger chart render if analytics view
  if (view === 'analytics') renderCharts();
}

// Sidebar mobile toggle
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.toggle('open');
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('active');
}

// =============================================
// DATA LOADING
// =============================================
async function loadTransactions() {
  // Show skeleton
  document.getElementById('dash-skeleton').classList.remove('hidden');
  document.getElementById('dash-content').classList.add('hidden');

  try {
    const res  = await fetch(`/api/expenses?username=${encodeURIComponent(state.user)}`);
    state.transactions = await res.json();
    renderDashboard();
    renderTable();
    populateFilterCategories();
  } catch {
    showToast('Failed to load data', 'error');
  }
}

// =============================================
// DASHBOARD
// =============================================
function renderDashboard() {
  // Hide skeleton, show content
  document.getElementById('dash-skeleton').classList.add('hidden');
  document.getElementById('dash-content').classList.remove('hidden');

  let income = 0, expenses = 0;
  // Current-month data
  const now = new Date();
  const monthlyExpenses = { total: 0, byCategory: {} };

  state.transactions.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else {
      expenses += Math.abs(t.amount);
      const d = new Date(t.date);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        monthlyExpenses.total += Math.abs(t.amount);
        monthlyExpenses.byCategory[t.category] = (monthlyExpenses.byCategory[t.category] || 0) + Math.abs(t.amount);
      }
    }
  });
  const balance = income - expenses;

  // Cards
  document.getElementById('val-balance').textContent  = fmt(balance);
  document.getElementById('val-expenses').textContent = fmt(expenses);
  document.getElementById('val-income').textContent   = fmt(income);

  // Balance card color hint
  const balCard = document.getElementById('val-balance');
  balCard.style.color = balance >= 0 ? 'var(--emerald)' : 'var(--rose)';

  // Budget
  renderBudget(monthlyExpenses.total);

  // Insights
  renderInsights(monthlyExpenses, monthlyExpenses.total);

  // Recent Transactions (latest 6)
  const sorted   = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent   = sorted.slice(0, 6);
  const list     = document.getElementById('recent-list');

  if (recent.length === 0) {
    list.innerHTML = `<div class="empty-recent"><ion-icon name="receipt-outline"></ion-icon><p>No transactions yet. Add your first one!</p></div>`;
    return;
  }
  list.innerHTML = `<div class="txn-list">${recent.map(txnHtml).join('')}</div>`;
}

function renderBudget(spent) {
  const limit = state.budget;
  document.getElementById('budget-spent-label').textContent  = `Spent: ${fmt(spent)}`;
  document.getElementById('budget-limit-label').textContent  = limit ? `Limit: ${fmt(limit)}` : 'No budget set';

  const bar  = document.getElementById('budget-bar');
  const text = document.getElementById('budget-remaining-text');
  closeBanner();

  if (!limit) {
    bar.style.width = '0%'; bar.className = 'progress-bar';
    text.textContent = 'Set a budget limit to track your spending.';
    return;
  }

  const pct      = Math.min((spent / limit) * 100, 100);
  const remain   = limit - spent;
  bar.style.width = pct + '%';

  if (remain < 0) {
    bar.className = 'progress-bar d';
    text.textContent  = `Over budget by ${fmt(Math.abs(remain))} 🚨`;
    text.style.color  = 'var(--rose)';
    showBanner(`Budget exceeded by ${fmt(Math.abs(remain))}. Review your spending immediately.`, 'danger');
    showToast(`Budget exceeded by ${fmt(Math.abs(remain))}!`, 'error');
  } else if (pct >= 80) {
    bar.className = 'progress-bar w';
    text.textContent = `${fmt(remain)} remaining — ${pct.toFixed(0)}% used ⚠️`;
    text.style.color = 'var(--amber)';
    showBanner(`You've used ${pct.toFixed(0)}% of your monthly budget. Slow down!`, 'warning');
    showToast(`Warning: ${pct.toFixed(0)}% of budget used`, 'warning');
  } else {
    bar.className = 'progress-bar';
    text.textContent = `${fmt(remain)} remaining — looking good!`;
    text.style.color = 'var(--emerald)';
  }
}

function saveBudget() {
  const val = parseFloat(document.getElementById('budget-input').value);
  if (!val || val <= 0) { showToast('Enter a valid budget amount', 'warning'); return; }
  state.budget = val;
  localStorage.setItem(`ep-budget-${state.user}`, val);
  showToast(`Budget set to ${fmt(val)}`, 'success');
  renderDashboard();
}

function renderInsights(monthlyData, monthlyTotal) {
  // Top category
  const cats = Object.entries(monthlyData.byCategory).sort((a,b) => b[1] - a[1]);
  const topCat = cats[0];
  document.getElementById('insight-top-cat').innerHTML = topCat
    ? `Top spend: <strong>${topCat[0]}</strong> — ${fmt(topCat[1])}`
    : 'No expense data this month yet';

  // Avg daily
  const daysIn  = new Date().getDate();
  const avgDaily = monthlyTotal / daysIn;
  document.getElementById('insight-avg-daily').innerHTML = `Avg daily expense: <strong>${fmt(avgDaily)}</strong>`;

  // Budget status
  const icon = document.getElementById('insight-budget-icon');
  const msg  = document.getElementById('insight-budget-msg');

  if (!state.budget) {
    icon.setAttribute('name', 'shield-outline'); icon.className = 'insight-icon';
    msg.innerHTML = 'Set a budget to get smart alerts.';
  } else {
    const pct = (monthlyTotal / state.budget) * 100;
    if (pct >= 100) {
      icon.setAttribute('name', 'alert-circle-outline'); icon.className = 'insight-icon';
      icon.style.color = 'var(--rose)';
      msg.innerHTML = '<strong style="color:var(--rose)">Budget exceeded!</strong> Time to cut back.';
    } else if (pct >= 80) {
      icon.setAttribute('name', 'warning-outline'); icon.className = 'insight-icon';
      icon.style.color = 'var(--amber)';
      msg.innerHTML = `<strong style="color:var(--amber)">${pct.toFixed(0)}% used</strong> — approaching limit.`;
    } else {
      icon.setAttribute('name', 'shield-checkmark-outline'); icon.className = 'insight-icon';
      icon.style.color = 'var(--emerald)';
      msg.innerHTML = `<strong style="color:var(--emerald)">On track!</strong> ${pct.toFixed(0)}% of budget used.`;
    }
  }
}

// =============================================
// ADD EXPENSE
// =============================================
function selectType(t) {
  state.expenseType = t;
  document.getElementById('type-expense').classList.toggle('active', t === 'expense');
  document.getElementById('type-income').classList.toggle('active', t === 'income');
  populateCategories();
}

function populateCategories() {
  const sel  = document.getElementById('exp-category');
  const opts = CATEGORIES[state.expenseType];
  sel.innerHTML = opts.map(c => `<option value="${c}">${c}</option>`).join('');
}

async function handleAddExpense(e) {
  e.preventDefault();
  const amtRaw = parseFloat(document.getElementById('exp-amount').value);
  const date   = document.getElementById('exp-date').value;
  const cat    = document.getElementById('exp-category').value;
  const desc   = document.getElementById('exp-desc').value.trim();

  if (!amtRaw || amtRaw <= 0) { showToast('Enter a valid amount', 'warning'); return; }
  if (!desc)                   { showToast('Please add a description', 'warning'); return; }

  const amount = state.expenseType === 'expense' ? -amtRaw : amtRaw;

  const btn     = document.getElementById('add-submit-btn');
  const label   = document.getElementById('add-btn-label');
  const spinner = document.getElementById('add-spinner');
  btn.disabled = true; spinner.classList.remove('hidden'); label.classList.add('hidden');

  try {
    const res  = await fetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ username: state.user, description: desc, category: cat, date, amount }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Transaction saved! 🎉', 'success');
      document.getElementById('add-expense-form').reset();
      document.getElementById('exp-date').valueAsDate = new Date();
      selectType('expense');
      await loadTransactions();
      navigateTo('dashboard', document.getElementById('nav-dashboard'));
    } else {
      showToast('Failed to save transaction', 'error');
    }
  } catch {
    showToast('Server error. Try again.', 'error');
  } finally {
    btn.disabled = false; spinner.classList.add('hidden'); label.classList.remove('hidden');
  }
}

// =============================================
// EXPENSE TABLE
// =============================================
let filteredTransactions = [];

function populateFilterCategories() {
  const sel  = document.getElementById('filter-cat');
  const cats = [...new Set(state.transactions.map(t => t.category))].sort();
  sel.innerHTML = '<option value="all">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function applyFilters() {
  const query   = document.getElementById('search-query').value.toLowerCase();
  const catFilter  = document.getElementById('filter-cat').value;
  const typeFilter = document.getElementById('filter-type').value;

  filteredTransactions = state.transactions.filter(t => {
    const matchSearch = t.description.toLowerCase().includes(query) || t.category.toLowerCase().includes(query);
    const matchCat    = catFilter === 'all' || t.category === catFilter;
    const matchType   = typeFilter === 'all' || (typeFilter === 'expense' ? t.amount < 0 : t.amount > 0);
    return matchSearch && matchCat && matchType;
  });
  // Sort
  filteredTransactions.sort((a, b) => {
    let aVal, bVal;
    if (state.sortKey === 'date')     { aVal = new Date(a.date); bVal = new Date(b.date); }
    else if (state.sortKey === 'amount')   { aVal = Math.abs(a.amount); bVal = Math.abs(b.amount); }
    else if (state.sortKey === 'category') { aVal = a.category; bVal = b.category; }
    if (aVal < bVal) return -1 * state.sortDir;
    if (aVal > bVal) return  1 * state.sortDir;
    return 0;
  });
}

function sortBy(key) {
  if (state.sortKey === key) state.sortDir *= -1;
  else { state.sortKey = key; state.sortDir = -1; }
  renderTable();
}

function renderTable() {
  applyFilters();
  const tbody   = document.getElementById('exp-table-body');
  const empty   = document.getElementById('empty-state');
  const table   = document.getElementById('exp-table');
  const rows    = filteredTransactions;

  if (rows.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  table.classList.remove('hidden');
  empty.classList.add('hidden');

  tbody.innerHTML = rows.map(t => {
    const isExp  = t.amount < 0;
    const typeStr = isExp ? 'expense' : 'income';
    const amtStr  = `${isExp ? '−' : '+'}${fmt(Math.abs(t.amount))}`;
    const color   = CAT_COLORS[t.category] || '#94a3b8';
    return `
      <tr>
        <td>${t.date}</td>
        <td><strong>${escHtml(t.description)}</strong></td>
        <td><span class="cat-dot" style="background:${color}"></span>${t.category}</td>
        <td><span class="type-badge ${typeStr}">${isExp ? '↓ Expense' : '↑ Income'}</span></td>
        <td class="${isExp ? 'expense-color' : 'income-color'}" style="font-weight:700">${amtStr}</td>
        <td>
          <div class="action-wrap">
            <button class="act-btn del" onclick="deleteTransaction(${t.id})" title="Delete">
              <ion-icon name="trash-outline"></ion-icon>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    const res  = await fetch('/api/expenses/delete', { method: 'POST', body: JSON.stringify({ id }) });
    const data = await res.json();
    if (data.success) {
      showToast('Transaction deleted', 'success');
      await loadTransactions();
      renderTable();
    } else {
      showToast('Failed to delete', 'error');
    }
  } catch {
    showToast('Server error', 'error');
  }
}

// =============================================
// CHARTS
// =============================================
function renderCharts() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const expenses = state.transactions.filter(t => t.amount < 0);

  // ---- PIE CHART ----
  const pieEmpty = document.getElementById('pie-empty');
  const pieWrap  = document.querySelector('.chart-wrap');

  if (expenses.length === 0) {
    pieEmpty.classList.remove('hidden');
  } else {
    pieEmpty.classList.add('hidden');
    const byCategory = {};
    expenses.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
    });
    const labels = Object.keys(byCategory);
    const data   = Object.values(byCategory);
    const colors = labels.map(l => CAT_COLORS[l] || '#94a3b8');

    state.pieChart?.destroy();
    state.pieChart = new Chart(document.getElementById('pie-chart'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 12 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, padding: 16, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw / data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`,
            },
          },
        },
        animation: { animateRotate: true, duration: 800 },
      },
    });
  }

  // ---- BAR CHART ----
  const barEmpty = document.getElementById('bar-empty');
  // Build last-30-days buckets
  const buckets = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    buckets[d.toISOString().split('T')[0]] = 0;
  }
  expenses.forEach(t => { if (buckets[t.date] !== undefined) buckets[t.date] += Math.abs(t.amount); });

  const hasBarData = Object.values(buckets).some(v => v > 0);
  if (!hasBarData) {
    barEmpty.classList.remove('hidden');
  } else {
    barEmpty.classList.add('hidden');
    const barLabels = Object.keys(buckets).map(d => d.slice(5)); // MM-DD
    const barData   = Object.values(buckets);

    state.barChart?.destroy();
    state.barChart = new Chart(document.getElementById('bar-chart'), {
      type: 'bar',
      data: {
        labels: barLabels,
        datasets: [{
          label: 'Daily Expenses ($)',
          data: barData,
          backgroundColor: 'rgba(99,102,241,0.7)',
          hoverBackgroundColor: '#6366f1',
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: textColor, maxTicksLimit: 10, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            ticks: { color: textColor, font: { size: 11 }, callback: v => `$${v}` },
            grid: { color: gridColor },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { labels: { color: textColor, font: { size: 12 } } },
          tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } },
        },
        animation: { duration: 700 },
      },
    });
  }
}

// =============================================
// HELPER: transaction HTML block (for recent list)
// =============================================
function txnHtml(t) {
  const isExp  = t.amount < 0;
  const color  = CAT_COLORS[t.category] || '#94a3b8';
  const amtStr = `${isExp ? '−' : '+'}${fmt(Math.abs(t.amount))}`;
  const catIcon = isExp ? 'trending-down-outline' : 'trending-up-outline';
  return `
    <div class="txn-item">
      <div class="txn-icon-wrap" style="background:${color}22; color:${color}">
        <ion-icon name="${catIcon}"></ion-icon>
      </div>
      <div class="txn-info">
        <div class="txn-desc">${escHtml(t.description)}</div>
        <div class="txn-cat">${t.category}</div>
      </div>
      <div class="txn-meta">
        <div class="txn-amount ${isExp ? 'expense-color' : 'income-color'}">${amtStr}</div>
        <div class="txn-date">${t.date}</div>
      </div>
    </div>`;
}

// =============================================
// HELPERS
// =============================================
function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n || 0);
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
