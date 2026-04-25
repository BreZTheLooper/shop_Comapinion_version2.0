/**
 * SHOP COMPANION v2.0 — App Router & Navigation Controller
 * Handles role-based view switching and global navigation
 */

/* ── Current active role ── */
let currentRole = null;

/* ── View IDs per role ── */
const VIEWS = {
  landing:  'view-landing',
  admin:    'view-admin',
  client:   'view-client',
  cashier:  'view-cashier',
  customer: 'view-customer',
};

/* ══════════════════════════════════════════════════════════════
   ROLE SELECTOR
   ══════════════════════════════════════════════════════════════ */
function selectRole(role) {
  // Prevent direct access to customer panel without a valid QR token/session flag
  if (role === 'customer') {
    const allowed = sessionStorage.getItem('sc_customer_allowed');
    if (!allowed || allowed !== '1') {
      toast('Customer access is restricted. Please scan the QR code provided by the cashier.', 'warning');
      return;
    }
  }
  currentRole = role;
  // Hide all views
  Object.values(VIEWS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  // Show selected
  const view = document.getElementById(VIEWS[role]);
  if (view) view.classList.remove('hidden');
  // Initialize panel
  switch(role) {
    case 'admin':    initAdmin();    break;
    case 'client':   initClient();   break;
    case 'cashier':  initCashier();  break;
    case 'customer': 
      // show splash for customer panel then initialize (fast path)
      showSplash(1200);
      // lightweight init so UI paints quickly
      try { initCustomerLight(); } catch(e) { /* fallback */ }
      // schedule full init after idle or after splash finishes
      const fullInit = () => { try { initCustomer(); } catch(e){} };
      if ('requestIdleCallback' in window) {
        requestIdleCallback(fullInit, {timeout: 900});
      } else {
        // ensure full init runs shortly after splash
        setTimeout(fullInit, 900);
      }
      break;
  }
  logActivity(`Panel opened: ${role}`, 'access');
}

function goHome() {
  // Stop any active scanner
  Scanner.stop();
  currentRole = null;
  Object.values(VIEWS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  document.getElementById('view-landing').classList.remove('hidden');
}

function clearAllData() {
  if (!confirm('Reset ALL demo data? This cannot be undone.')) return;
  Object.keys(localStorage).filter(k=>k.startsWith('sc_')).forEach(k=>localStorage.removeItem(k));
  location.reload();
}

/* ══════════════════════════════════════════════════════════════
   TAB SWITCHERS — each panel has its own tab set
   ══════════════════════════════════════════════════════════════ */

/* Admin tabs — prefix: atab- */
function adminTab(name, el) {
  event?.preventDefault();
  _switchPanelTabs('atab-', name);
  _setActiveNav(el, '#adminSidebar .nav-item');
}

/* Client tabs — prefix: ctab- */
function clientTab(name, el) {
  event?.preventDefault();
  if (name === 'inventory') { renderInventory(); populateCatFilter(); }
  if (name === 'store-dash') renderClientDash();
  if (name === 'orders-hist') renderClientOrders();
  if (name === 'customers') renderCustomersTable();
  if (name === 'account') renderClientAccount();
  _switchPanelTabs('ctab-', name);
  _setActiveNav(el, '#clientSidebar .nav-item');
}

/* Cashier tabs — prefix: xtab- */
function cashierTab(name, el) {
  event?.preventDefault();
  if (name === 'cash-inventory') { renderCashierInventory(); populateCashierCatFilter(); }
  if (name === 'pos-dash') renderCashierDash();
  _switchPanelTabs('xtab-', name);
  _setActiveNav(el, '#cashierSidebar .nav-item');
}

/* Customer tabs — prefix: cpanel- */
function custTab(name, el) {
  event?.preventDefault();
  if (name === 'my-qr') generateCustQR();
  if (name === 'rewards') renderRewards();
  if (name === 'lists') renderCustLists();
  _switchCustomerPanels(name);
  // Active tab highlight
  document.querySelectorAll('.cust-tab').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    // Try to find by content match
    document.querySelectorAll('.cust-tab').forEach(b => {
      if (b.textContent.toLowerCase().includes(name.replace('-',' '))) b.classList.add('active');
    });
  }
}

function _switchPanelTabs(prefix, name) {
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(el => {
    el.classList.toggle('hidden', el.id !== prefix + name);
    el.classList.toggle('active', el.id === prefix + name);
  });
}

function _switchCustomerPanels(name) {
  document.querySelectorAll('[id^="cpanel-"]').forEach(el => {
    el.classList.toggle('hidden', el.id !== 'cpanel-' + name);
  });
}

function _setActiveNav(el, selector) {
  if (!el) return;
  document.querySelectorAll(selector).forEach(n => n.classList.remove('active'));
  el.classList.add('active');
}

/* ══════════════════════════════════════════════════════════════
   INIT ON LOAD
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  seedData();
  // Always start on landing
  document.getElementById('view-landing').classList.remove('hidden');
  // show splash overlay on initial load (match animation length)
  showSplash(1200);
  // Auto-generate reg code in customer add modal
  const regField = document.getElementById('cRegCode');
  if (regField) regField.value = 'REG-' + uid();
    // If the page was opened via a customer access link (hash), process it so the customer view opens
    if (window.location.hash && window.location.hash.includes('customer')) {
      // initCustomerAccessFromURL is defined in customer.js and will validate token/expiry and call selectRole('customer')
      try { initCustomerAccessFromURL(); } catch(e) { /* ignore if not available */ }
    }
});

/**
 * Show the splash overlay for `ms` milliseconds.
 * Re-usable for initial load and when opening the customer panel.
 */
function showSplash(ms = 6000) {
  const overlay = document.getElementById('splashOverlay');
  if (!overlay) return;
  // Ensure overlay is visible and reset any inline hide
  overlay.style.display = 'flex';
  // remove hidden class to reveal (CSS handles fade)
  overlay.classList.remove('splash-hidden');

  // Restart logo animation (force reflow)
  const logo = overlay.querySelector('.splash-logo');
  if (logo) {
    logo.style.animation = 'none';
    // Force reflow to restart animation
    void logo.offsetWidth;
    logo.style.animation = '';
  }

  // Hide after ms
  setTimeout(() => {
    overlay.classList.add('splash-hidden');
    // remove from flow after transition so it's not focusable
    setTimeout(() => { overlay.style.display = 'none'; }, 500);
  }, ms);
}
