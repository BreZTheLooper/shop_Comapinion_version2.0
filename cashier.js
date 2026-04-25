/**
 * SHOP COMPANION v2.0 — Cashier Panel Logic
 * Handles: POS dashboard, QR checkout, inventory view, customer access QR
 */

/* ── State ── */
let _checkoutCart  = [];  // items in current checkout
let _checkoutDiscount = 0;
let _checkoutScanner = null;

/* ── Init ── */
function initCashier() {
  renderCashierDash();
  renderCashierInventory();
  populateCashierCatFilter();
  renderCheckoutUI();
}

/* ══════════════════════════════════════════════════════════════
   CASHIER DASHBOARD
   ══════════════════════════════════════════════════════════════ */
function renderCashierDash() {
  const csg = document.getElementById('cashierStatsGrid');
  if (csg) csg.innerHTML = [
    { label:'Revenue Today',   value: formatPHP(Orders.getTodayTotal()),  icon:'💰', color:'green' },
    { label:"Today's Orders",  value: Orders.getTodayCount(),             icon:'📋', color:'blue'  },
    { label:'Total Products',  value: Inventory.getAll().length,          icon:'📦', color:'blue'  },
    { label:'Low Stock',       value: Inventory.getLowStock().length,     icon:'⚠️', color:'yellow'},
  ].map(s=>cashierStatCard(s)).join('');

  renderLowStockPanel('cashierLowStock');
  renderTodayOrders();
}

function renderTodayOrders() {
  const el = document.getElementById('cashierTodayOrders');
  if (!el) return;
  const today = new Date().toISOString().slice(0,10);
  const orders = Orders.getAll().filter(o=>o.date.startsWith(today));
  if (!orders.length) { el.innerHTML='<div style="color:var(--gray-400);text-align:center;padding:20px;font-size:14px">No transactions today yet</div>'; return; }
  el.innerHTML = orders.slice(0,10).map(o=>`
    <div class="recent-order-item">
      <div>
        <div style="font-size:14px;font-weight:600">${o.id}</div>
        <div style="font-size:12px;color:var(--gray-400)">${o.customerName||'Walk-in'} · ${(o.items||[]).length} items</div>
      </div>
      <div style="font-weight:800;color:var(--green)">${formatPHP(o.total)}</div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════════════════════
   CHECKOUT / POS
   ══════════════════════════════════════════════════════════════ */
function startCheckoutScan() {
  const vid = document.getElementById('checkoutVideo');
  document.getElementById('checkoutScanStatus').textContent = 'Scanning customer QR…';
  Scanner.start(vid, (code) => {
    Scanner.stop();
    document.getElementById('checkoutScanStatus').textContent = `Scanned: ${code.slice(0,30)}…`;
    processCustomerQR(code);
  });
}

function stopCheckoutScan() {
  Scanner.stop();
  document.getElementById('checkoutScanStatus').textContent = 'Scan stopped.';
}

function processCustomerQR(code) {
  try {
    // Try parsing as JSON cart payload
    let data;
    try { data = JSON.parse(code); } catch(e) { data = null; }

    if (data && data.type === 'SC_CART') {
      // Load cart from QR
      _checkoutCart = data.items || [];
      _checkoutDiscount = 0;
      toast(`Loaded ${_checkoutCart.length} items from customer QR`, 'success');
      renderCheckoutUI();
      return;
    }

    // Try as barcode (add single item)
    const product = Inventory.findByBarcode(code) || Inventory.findById(code);
    if (product) {
      addItemToCheckout(product.id, 1);
      return;
    }

    toast('Unrecognized QR code', 'warning');
  } catch(e) {
    toast('Could not process QR code', 'error');
  }
}

function manualAddItem() {
  const val = document.getElementById('manualBarcode').value.trim();
  if (!val) return;
  const p = Inventory.findByBarcode(val) || Inventory.findById(val) || Inventory.getAll().find(p=>p.name.toLowerCase().includes(val.toLowerCase()));
  if (!p) { toast('Product not found', 'warning'); return; }
  addItemToCheckout(p.id, 1);
  document.getElementById('manualBarcode').value = '';
  document.getElementById('quickItemSearch').innerHTML = '';
}

function addItemToCheckout(productId, qty=1) {
  const p = Inventory.findById(productId);
  if (!p) return;
  if (p.stock <= 0) { toast(`${p.name} is out of stock`, 'error'); return; }

  const existing = _checkoutCart.find(i=>i.id===productId);
  if (existing) {
    if (existing.qty >= p.stock) { toast('Cannot exceed available stock', 'warning'); return; }
    existing.qty += qty;
  } else {
    _checkoutCart.push({ id:p.id, name:p.name, price:p.price, qty, image:p.image, unit:p.unit });
  }
  renderCheckoutUI();
  toast(`${p.name} added`, 'success');
}

function removeCheckoutItem(id) {
  _checkoutCart = _checkoutCart.filter(i=>i.id!==id);
  renderCheckoutUI();
}

function changeCheckoutQty(id, delta) {
  const item = _checkoutCart.find(i=>i.id===id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) _checkoutCart = _checkoutCart.filter(i=>i.id!==id);
  renderCheckoutUI();
}

function renderCheckoutUI() {
  const itemsEl  = document.getElementById('checkoutItems');
  const totalsEl = document.getElementById('checkoutTotals');
  if (!itemsEl || !totalsEl) return;

  if (!_checkoutCart.length) {
    itemsEl.innerHTML  = '<div style="color:var(--gray-400);text-align:center;padding:24px;font-size:13px">Cart is empty — scan a QR or add items manually</div>';
    totalsEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = _checkoutCart.map(i=>`
    <div class="order-item-row">
      <span class="order-item-icon">${i.image||'📦'}</span>
      <span class="order-item-name">${i.name}</span>
      <div style="display:flex;align-items:center;gap:4px">
        <button class="qty-btn" onclick="changeCheckoutQty('${i.id}',-1)">−</button>
        <span class="qty-val">${i.qty}</span>
        <button class="qty-btn" onclick="changeCheckoutQty('${i.id}',1)">+</button>
      </div>
      <span class="order-item-price">${formatPHP(i.price*i.qty)}</span>
      <button onclick="removeCheckoutItem('${i.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;margin-left:4px">✕</button>
    </div>
  `).join('');

  const { subtotal, discount, tax, total } = calcTotals(_checkoutCart, _checkoutDiscount);
  totalsEl.innerHTML = `
    <div class="order-totals">
      <div class="totals-row"><span>Subtotal</span><span>${formatPHP(subtotal)}</span></div>
      ${discount>0?`<div class="totals-row" style="color:var(--green)"><span>Discount</span><span>−${formatPHP(discount)}</span></div>`:''}
      <div class="totals-row"><span>VAT (12%)</span><span>${formatPHP(tax)}</span></div>
      <div class="totals-row total"><span>TOTAL</span><span>${formatPHP(total)}</span></div>
    </div>`;
}

function applyVoucher() {
  const code = document.getElementById('voucherInput').value.trim();
  const { subtotal } = calcTotals(_checkoutCart, 0);
  const result = Vouchers.apply(code, subtotal);
  if (!result.ok) { toast(result.msg, 'warning'); return; }
  _checkoutDiscount = result.discount;
  renderCheckoutUI();
  toast(`Voucher applied: −${formatPHP(result.discount)}`, 'success');
}

function clearCheckout() {
  _checkoutCart = [];
  _checkoutDiscount = 0;
  renderCheckoutUI();
  document.getElementById('receiptPanel').style.display = 'none';
  document.getElementById('voucherInput').value = '';
}

function completeCheckout() {
  if (!_checkoutCart.length) { toast('Cart is empty', 'warning'); return; }
  const { subtotal, discount, tax, total } = calcTotals(_checkoutCart, _checkoutDiscount);

  const order = Orders.add({
    customerId:   null,
    customerName: 'Walk-in',
    items:        _checkoutCart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price})),
    subtotal, discount, tax, total,
    cashierId:    'CASHIER-1'
  });

  // Deduct from inventory
  Inventory.deductStock(_checkoutCart.map(i=>({id:i.id,qty:i.qty})));
  logActivity(`Checkout completed: ${order.id} — ${formatPHP(total)}`, 'order');

  // Show receipt
  showReceipt(order);

  // Reset cart
  _checkoutCart = [];
  _checkoutDiscount = 0;
  renderCheckoutUI();
  renderCashierDash();
  renderInventory();
  renderCashierInventory();
  document.getElementById('voucherInput').value = '';
  toast(`Checkout complete! ${formatPHP(total)}`, 'success');
}

function showReceipt(order) {
  const rp = document.getElementById('receiptPanel');
  const rc = document.getElementById('receiptContent');
  if (!rp || !rc) return;

  rc.innerHTML = `
    <div class="receipt">
      <div class="receipt-title">🛒 ShopCompanion</div>
      <div style="text-align:center;font-size:11px;color:var(--gray-400);margin-bottom:8px">Official Receipt</div>
      <hr class="receipt-divider" />
      <div class="receipt-row"><span>Order:</span><span>${order.id}</span></div>
      <div class="receipt-row"><span>Date:</span><span>${new Date(order.date).toLocaleString('en-PH')}</span></div>
      <div class="receipt-row"><span>Cashier:</span><span>Station 1</span></div>
      <hr class="receipt-divider" />
      ${order.items.map(i=>`<div class="receipt-row"><span>${i.qty}× ${i.name}</span><span>${formatPHP(i.price*i.qty)}</span></div>`).join('')}
      <hr class="receipt-divider" />
      <div class="receipt-row"><span>Subtotal</span><span>${formatPHP(order.subtotal)}</span></div>
      ${order.discount?`<div class="receipt-row" style="color:var(--green)"><span>Discount</span><span>−${formatPHP(order.discount)}</span></div>`:''}
      <div class="receipt-row"><span>VAT (12%)</span><span>${formatPHP(order.tax)}</span></div>
      <hr class="receipt-divider" />
      <div class="receipt-row receipt-total"><span>TOTAL</span><span>${formatPHP(order.total)}</span></div>
      <hr class="receipt-divider" />
      <div style="text-align:center;font-size:11px;margin-top:8px;color:var(--gray-400)">Thank you for shopping!<br>Powered by ShopCompanion v2.0</div>
    </div>`;
  rp.style.display = 'block';
}

function printReceipt() {
  window.print();
}

/* ══════════════════════════════════════════════════════════════
   CASHIER INVENTORY VIEW
   ══════════════════════════════════════════════════════════════ */
function populateCashierCatFilter() {
  const el = document.getElementById('cashierCatFilter');
  if (!el) return;
  const cats = Inventory.categories();
  el.innerHTML = `<option value="">All Categories</option>` + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function renderCashierInventory() {
  const el = document.getElementById('cashierInventoryTable');
  if (!el) return;
  const catFilter = document.getElementById('cashierCatFilter')?.value || '';
  let items = Inventory.getAll();
  if (catFilter) items = items.filter(p=>p.category===catFilter);
  if (!items.length) { el.innerHTML='<div class="empty-state">No products</div>'; return; }

  el.innerHTML = `
    <div style="overflow-x:auto">
    <table class="data-table">
      <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Expiry</th><th>Action</th></tr></thead>
      <tbody>${items.map(p=>{
        const status = Inventory.stockStatus(p);
        const days = Inventory.daysUntilExpiry(p);
  const expiryClass = days===null?'':days<0?'expiry-critical':days<=7?'expiry-warn':'expiry-ok';
  const expiryText  = days===null?'—':formatShortDate(p.expiry);
        return `
        <tr>
          <td><span style="margin-right:6px">${p.image||'📦'}</span><strong>${p.name}</strong></td>
          <td>${p.category}</td>
          <td style="font-weight:700;color:var(--blue-light)">${formatPHP(p.price)}</td>
          <td>
            <input type="number" value="${p.stock}" min="0" style="width:64px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:var(--white);font-size:13px;padding:4px 8px"
              onchange="quickUpdateStock('${p.id}',this.value)" />
          </td>
          <td>${stockBadge(status)}</td>
          <td><span class="${expiryClass}" style="font-size:12px">${expiryText}</span></td>
          <td><button class="btn btn-primary btn-sm" onclick="addItemToCheckout('${p.id}',1);cashierTab('checkout',null)">+ Add to POS</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   CUSTOMER ACCESS QR (Cashier generates it)
   ══════════════════════════════════════════════════════════════ */
function generateCashierAccessQR() {
  const minutes = parseInt(document.getElementById('cashierCaExpiry')?.value || '10', 10);
  const item = createCustomerAccessToken(minutes);
  const base = window.location.href.split('#')[0];
  const url  = `${base}#customer?access=${item.token}&exp=${item.expires}`;
  const out  = document.getElementById('cashierQrOutput');
  out.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center';

  const qrDiv = document.createElement('div');
  generatePlainQR(qrDiv, url, 220);

  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;color:var(--gray-400)';
  info.textContent = `Expires in ${minutes} minute${minutes>1?'s':''}`;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-ghost btn-sm';
  copyBtn.textContent = '📋 Copy Link';
  copyBtn.onclick = () => { try { navigator.clipboard.writeText(url); toast('Link copied!','success'); } catch(e){prompt('Copy link',url);} };

  wrap.append(qrDiv, info, copyBtn);
  out.appendChild(wrap);
  toast('Customer access QR ready!', 'success');
}

/**
 * Generate a customer access token and copy the access URL to clipboard
 * without rendering the QR. Useful when cashier wants to send/link the URL directly.
 */
function copyCashierAccessLink() {
  const minutes = parseInt(document.getElementById('cashierCaExpiry')?.value || '10', 10);
  const item = createCustomerAccessToken(minutes);
  const base = window.location.href.split('#')[0];
  const url  = `${base}#customer?access=${item.token}&exp=${item.expires}`;
  try {
    navigator.clipboard.writeText(url);
    toast('Access link copied to clipboard', 'success');
  } catch(e) {
    prompt('Copy this link', url);
  }
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function cashierStatCard({label,value,icon,color}) {
  const c = color==='green'?'var(--green)':color==='yellow'?'var(--yellow)':color==='red'?'var(--red)':'var(--blue-light)';
  return `<div class="card stat-card"><div class="stat-icon">${icon}</div><div class="stat-value" style="color:${c}">${value}</div><div class="stat-label">${label}</div></div>`;
}
