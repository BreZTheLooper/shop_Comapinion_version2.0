/**
 * SHOP COMPANION v2.0 — Customer Panel Logic
 * Handles: Shop browsing, cart, lists, QR generation, rewards/vouchers
 */

/* ── State ── */
let _custCart       = [];   // { id, name, price, qty, image, unit }
let _custCategory   = '';
let _custSearch     = '';
let _custDiscount   = 0;    // applied discount amount
let _selectedPdId   = null; // for product detail modal
let _selectedPdQty  = 1;

/* ── Init ── */
function initCustomer() {
  _custCart = [];
  _custDiscount = 0;
  updateCartBadge();
  renderCustCategories();
  // Defer heavier rendering so the UI remains responsive
  const heavyWork = () => {
    try { renderProducts(); } catch(e){}
    try { renderCustLists(); } catch(e){}
    try { renderRewards(); } catch(e){}
  };
  if ('requestIdleCallback' in window) requestIdleCallback(heavyWork, {timeout:2000});
  else setTimeout(heavyWork, 200);

  // Note: deep-link access is handled by the router (init on DOMContentLoaded)


// Lightweight initialization for fast panel show: updates minimal UI so the
// customer panel becomes interactive quickly. Heavy rendering is deferred.
function initCustomerLight() {
  // Reset lightweight state
  _custCart = _custCart || [];
  _custDiscount = _custDiscount || 0;
  // Fast UI updates
  updateCartBadge();
  renderCustCategories();
  renderProducts(true);
}
  // Set customer label
  const label = document.getElementById('custUserLabel');
  if (label) {
    const customers = Customers.getAll();
    label.textContent = customers.length ? customers[0].name : 'Guest';
  }
}

/* ══════════════════════════════════════════════════════════════
   SHOP — Categories & Products
   ══════════════════════════════════════════════════════════════ */
function renderCustCategories() {
  const el = document.getElementById('custCategoryPills');
  if (!el) return;
  const cats = Inventory.categories();
  el.innerHTML = `
    <button class="pill ${_custCategory===''?'active':''}" onclick="setCustCategory('')">All</button>
    ${cats.map(c=>`<button class="pill ${_custCategory===c?'active':''}" onclick="setCustCategory('${c}')">${c}</button>`).join('')}
  `;
}

function setCustCategory(cat) {
  _custCategory = cat;
  renderCustCategories();
  renderProducts();
}

function searchProducts(val) {
  _custSearch = val;
  renderProducts();
}

function renderProducts(fast = false) {
  const el = document.getElementById('custProductGrid');
  if (!el) return;
  const sort = document.getElementById('custSortProd')?.value || 'name';
  let items = Inventory.getAll();

  if (_custCategory) items = items.filter(p => p.category === _custCategory);
  if (_custSearch)   items = items.filter(p =>
    p.name.toLowerCase().includes(_custSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(_custSearch.toLowerCase()) ||
    (p.type||'').toLowerCase().includes(_custSearch.toLowerCase())
  );

  // Sort
  items.sort((a,b)=>{
    if (sort==='price')    return a.price - b.price;
    if (sort==='category') return a.category.localeCompare(b.category);
    if (sort==='expiry')   return (a.expiry||'9999').localeCompare(b.expiry||'9999');
    return a.name.localeCompare(b.name);
  });

  if (!items.length) { el.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>No products found</p></div>'; return; }

  const list = fast ? items.slice(0, 24) : items;

  el.innerHTML = list.map(p=>{
    const inCart = _custCart.find(i=>i.id===p.id);
    const status = Inventory.stockStatus(p);
    const days   = Inventory.daysUntilExpiry(p);
    const isOut  = status === 'out';
    return `
      <div class="product-card ${isOut?'out-of-stock':''}" onclick="showProductDetail('${p.id}')">
        ${status==='low'?'<div style="position:absolute;top:10px;right:10px;background:rgba(255,217,77,0.15);border:1px solid var(--yellow);border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--yellow)">LOW STOCK</div>':''}
        ${isOut?'<div style="position:absolute;top:10px;right:10px;background:rgba(255,79,106,0.15);border:1px solid var(--red);border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--red)">OUT OF STOCK</div>':''}
        <span class="product-emoji">${p.image||'📦'}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.category}${p.type?' · '+p.type:''} · ${p.unit||''}</div>
      ${days!==null?`<div style="font-size:11px;color:${days<0?'var(--red)':'var(--gray-400)'}">⏰ Expires ${formatShortDate(p.expiry)}</div>`:''}
        <div class="product-price">${formatPHP(p.price)}</div>
        <div class="product-actions" onclick="event.stopPropagation()">
          ${inCart ? `
            <div class="qty-control">
              <button class="qty-btn" onclick="custChangeQty('${p.id}',-1)">−</button>
              <span class="qty-val">${inCart.qty}</span>
              <button class="qty-btn" onclick="custChangeQty('${p.id}',1)">+</button>
            </div>
          ` : `
            <button class="add-cart-btn" onclick="custAddToCart('${p.id}',1)" ${isOut?'disabled':''}>
              🛒 Add to Cart
            </button>
          `}
          <button class="add-list-btn" title="Save to list" onclick="quickAddToList('${p.id}')">📋</button>
        </div>
      </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT DETAIL MODAL
   ══════════════════════════════════════════════════════════════ */
function showProductDetail(id) {
  const p = Inventory.findById(id);
  if (!p) return;
  _selectedPdId = id;
  _selectedPdQty = 1;
  const days = Inventory.daysUntilExpiry(p);
  const status = Inventory.stockStatus(p);

  document.getElementById('pdTitle').textContent = p.name;
  document.getElementById('pdContent').innerHTML = `
    <div class="pd-emoji">${p.image||'📦'}</div>
    <div class="pd-row"><span class="pd-label">Category</span><span class="pd-val">${p.category}</span></div>
    <div class="pd-row"><span class="pd-label">Type</span><span class="pd-val">${p.type||'—'}</span></div>
    <div class="pd-row"><span class="pd-label">Unit</span><span class="pd-val">${p.unit||'—'}</span></div>
    <div class="pd-row"><span class="pd-label">Price</span><span class="pd-val" style="color:var(--blue-light);font-family:var(--font-display)">${formatPHP(p.price)}</span></div>
    <div class="pd-row"><span class="pd-label">Availability</span><span class="pd-val">${stockBadge(status)}</span></div>
  ${days!==null?`<div class="pd-row"><span class="pd-label">Expiry</span><span class="pd-val ${days<0?'expiry-critical':days<=7?'expiry-warn':'expiry-ok'}">${formatShortDate(p.expiry)}</span></div>`:''}
    ${status!=='out'?`
      <div style="margin-top:16px;display:flex;align-items:center;gap:12px;justify-content:center">
        <button class="qty-btn" onclick="_selectedPdQty=Math.max(1,_selectedPdQty-1);this.nextElementSibling.textContent=_selectedPdQty" style="width:36px;height:36px;font-size:20px">−</button>
        <span id="pdQtyDisplay" style="font-weight:700;font-size:1.2rem;min-width:30px;text-align:center">1</span>
        <button class="qty-btn" onclick="_selectedPdQty++;this.previousElementSibling.textContent=_selectedPdQty" style="width:36px;height:36px;font-size:20px">+</button>
      </div>
    `:''}
  `;
  openModal('modalProductDetail');
}

function addToCartFromDetail() {
  if (_selectedPdId) { custAddToCart(_selectedPdId, _selectedPdQty); closeModal('modalProductDetail'); }
}

/* ══════════════════════════════════════════════════════════════
   CART
   ══════════════════════════════════════════════════════════════ */
function custAddToCart(id, qty=1) {
  const p = Inventory.findById(id);
  if (!p || p.stock <= 0) { toast(`${p?.name||'Item'} out of stock`, 'error'); return; }
  const existing = _custCart.find(i=>i.id===id);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, p.stock);
  } else {
    _custCart.push({ id:p.id, name:p.name, price:p.price, qty, image:p.image, unit:p.unit });
  }
  updateCartBadge();
  renderProducts();      // refresh qty controls
  renderCustCart();
  toast(`${p.name} added to cart`, 'success');
}

function custChangeQty(id, delta) {
  const item = _custCart.find(i=>i.id===id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) _custCart = _custCart.filter(i=>i.id!==id);
  updateCartBadge();
  renderProducts();
  renderCustCart();
}

function custRemoveItem(id) {
  _custCart = _custCart.filter(i=>i.id!==id);
  updateCartBadge();
  renderProducts();
  renderCustCart();
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = _custCart.reduce((s,i)=>s+i.qty,0);
}

function renderCustCart() {
  const itemsEl  = document.getElementById('custCartItems');
  const summaryEl = document.getElementById('custSummaryRows');
  const totalEl  = document.getElementById('custCartTotal');
  if (!itemsEl) return;

  if (!_custCart.length) {
    itemsEl.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-icon">🛒</div><p>Your cart is empty</p></div>';
    if (summaryEl) summaryEl.innerHTML = '';
    if (totalEl) totalEl.textContent = '₱0.00';
    return;
  }

  itemsEl.innerHTML = _custCart.map(i=>`
    <div class="cart-item">
      <span class="cart-item-emoji">${i.image||'📦'}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-unit">${i.unit||''}</div>
        <div class="cart-item-price">${formatPHP(i.price)} each</div>
      </div>
      <div class="cart-item-right">
        <div class="qty-control">
          <button class="qty-btn" onclick="custChangeQty('${i.id}',-1)">−</button>
          <span class="qty-val">${i.qty}</span>
          <button class="qty-btn" onclick="custChangeQty('${i.id}',1)">+</button>
        </div>
        <div class="cart-item-subtotal">${formatPHP(i.price*i.qty)}</div>
        <button class="cart-remove" onclick="custRemoveItem('${i.id}')">🗑</button>
      </div>
    </div>
  `).join('');

  const { subtotal, discount, tax, total } = calcTotals(_custCart, _custDiscount);
  if (summaryEl) summaryEl.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${formatPHP(subtotal)}</span></div>
    ${discount>0?`<div class="summary-row" style="color:var(--green)"><span>Discount</span><span>−${formatPHP(discount)}</span></div>`:''}
    <div class="summary-row"><span>VAT (12%)</span><span>${formatPHP(tax)}</span></div>
  `;
  if (totalEl) totalEl.innerHTML = `<span>Total</span><span>${formatPHP(total)}</span>`;
}

function applyCustVoucher() {
  const code = document.getElementById('custVoucher')?.value.trim();
  const { subtotal } = calcTotals(_custCart, 0);
  const result = Vouchers.apply(code, subtotal);
  if (!result.ok) { toast(result.msg, 'warning'); return; }
  _custDiscount = result.discount;
  renderCustCart();
  toast(`Voucher applied: −${formatPHP(result.discount)}`, 'success');
}

/* ══════════════════════════════════════════════════════════════
   MY QR
   ══════════════════════════════════════════════════════════════ */
function generateCustQR() {
  const el = document.getElementById('custQrOutput');
  const preview = document.getElementById('custQrPreview');
  if (!el) return;

  if (!_custCart.length) {
    el.innerHTML = '<div style="color:var(--gray-400);padding:20px;text-align:center">Add items to your cart first</div>';
    if (preview) preview.innerHTML = '';
    return;
  }

  // Compact payload for QR
  const payload = {
    type:  'SC_CART',
    ts:    Date.now(),
    items: _custCart.map(i=>({ id:i.id, name:i.name, qty:i.qty, price:i.price })),
  };

  generatePlainQR(el, JSON.stringify(payload), 240);

  // Preview items
  const { total } = calcTotals(_custCart, _custDiscount);
  if (preview) preview.innerHTML = `
    <div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.07);padding-top:12px">
      ${_custCart.map(i=>`<div class="qr-item-line"><span>${i.qty}× ${i.name}</span><span>${formatPHP(i.price*i.qty)}</span></div>`).join('')}
      <div class="qr-item-line" style="font-weight:800;color:var(--green);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07)">
        <span>Total (incl. VAT)</span><span>${formatPHP(total)}</span>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════
   MY LISTS
   ══════════════════════════════════════════════════════════════ */
function getCustLists() { return Store.get('cust_lists') || []; }
function saveCustLists(l){ Store.set('cust_lists', l); }

function renderCustLists() {
  const el = document.getElementById('custListsGrid');
  if (!el) return;
  const lists = getCustLists();
  if (!lists.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No saved lists yet</p></div>';
    return;
  }
  el.innerHTML = lists.map(list=>`
    <div class="list-card">
      <div class="list-card-header">
        <div class="list-name">📋 ${list.name}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="loadListToCart('${list.id}')">Load</button>
          <button class="btn btn-danger btn-sm" onclick="deleteList('${list.id}')">🗑</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--gray-400);margin-bottom:8px">${list.items.length} items · Saved ${formatShortDate(list.savedAt)}</div>
      ${list.items.slice(0,3).map(i=>`
        <div class="list-item-preview"><span>${i.qty}× ${i.name}</span><span>${formatPHP(i.price*i.qty)}</span></div>
      `).join('')}
      ${list.items.length>3?`<div style="font-size:12px;color:var(--gray-400);margin-top:6px">+${list.items.length-3} more…</div>`:''}
      <div class="list-actions">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="loadListToCart('${list.id}')">🛒 Add to Cart</button>
        <button class="btn btn-ghost btn-sm" onclick="editListName('${list.id}')">✏️ Rename</button>
      </div>
    </div>
  `).join('');
}

function createNewList() {
  const name = document.getElementById('newListName')?.value.trim();
  if (!name) { toast('Please enter a list name', 'warning'); return; }
  const lists = getCustLists();
  lists.push({ id:'L'+Date.now(), name, items: [..._custCart], savedAt: new Date().toISOString() });
  saveCustLists(lists);
  closeModal('modalNewList');
  renderCustLists();
  document.getElementById('newListName').value = '';
  toast(`List "${name}" saved!`, 'success');
}

function saveCartAsList() {
  if (!_custCart.length) { toast('Cart is empty', 'warning'); return; }
  openModal('modalNewList');
}

function loadListToCart(id) {
  const list = getCustLists().find(l=>l.id===id);
  if (!list) return;
  list.items.forEach(i => {
    const existing = _custCart.find(c=>c.id===i.id);
    if (existing) existing.qty += i.qty;
    else _custCart.push({...i});
  });
  updateCartBadge();
  renderProducts();
  renderCustCart();
  toast(`"${list.name}" loaded into cart`, 'success');
}

function deleteList(id) {
  const lists = getCustLists().filter(l=>l.id!==id);
  saveCustLists(lists);
  renderCustLists();
  toast('List deleted', 'info');
}

function editListName(id) {
  const name = prompt('New list name:');
  if (!name) return;
  const lists = getCustLists().map(l=>l.id===id?{...l,name}:l);
  saveCustLists(lists);
  renderCustLists();
  toast('List renamed', 'success');
}

function quickAddToList(productId) {
  const p = Inventory.findById(productId);
  if (!p) return;
  const lists = getCustLists();
  if (!lists.length) { toast('Create a list first in My Lists tab', 'info'); return; }
  // Add to first list as quick action
  lists[0].items.push({ id:p.id, name:p.name, qty:1, price:p.price, image:p.image });
  saveCustLists(lists);
  toast(`${p.name} added to "${lists[0].name}"`, 'success');
}

/* ══════════════════════════════════════════════════════════════
   REWARDS / VOUCHERS
   ══════════════════════════════════════════════════════════════ */
function renderRewards() {
  // Points
  const pp = document.getElementById('custPointsPanel');
  const customer = Customers.getAll()[0]; // demo: first customer
  const points = customer?.points || 0;
  if (pp) pp.innerHTML = `
    <div class="points-display">
      <div class="points-number">${points}</div>
      <div class="points-label">Reward Points</div>
      <div style="margin-top:16px;font-size:13px;color:var(--gray-400)">
        Every ₱100 spent = 10 points<br>100 points = ₱10 off
      </div>
      <div style="margin-top:20px">
        <div style="display:flex;justify-content:space-between;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:14px;margin-bottom:8px">
          <span>Silver Tier</span><span style="color:var(--blue-light)">500 pts</span>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:999px;height:8px;overflow:hidden">
          <div style="height:100%;border-radius:999px;background:var(--blue);width:${Math.min(100,points/5)}%"></div>
        </div>
        <div style="font-size:11px;color:var(--gray-400);margin-top:6px">${Math.max(0,500-points)} pts to Silver</div>
      </div>
    </div>
  `;

  // Vouchers
  const vp = document.getElementById('custVouchersPanel');
  const vouchers = Vouchers.getAll();
  if (vp) vp.innerHTML = vouchers.map(v=>`
    <div class="voucher-item">
      <div>
        <div class="voucher-code">${v.code}</div>
        <div class="voucher-desc">${v.desc} · Min. order: ${formatPHP(v.minOrder)}</div>
      </div>
      <div class="voucher-discount">${v.type==='percent'?v.discount+'%':'₱'+v.discount}</div>
    </div>
  `).join('') || '<div style="color:var(--gray-400);text-align:center;padding:20px">No vouchers available</div>';
}

/* ══════════════════════════════════════════════════════════════
   CUSTOMER ACCESS FROM URL
   ══════════════════════════════════════════════════════════════ */
function initCustomerAccessFromURL() {
  try {
    const hash = window.location.hash || '';
    if (!hash) return;
    const raw = hash.slice(1);
    const [path, qs] = raw.split('?');
    if (!qs || path !== 'customer') return;
    const params = new URLSearchParams(qs);
    const token  = params.get('access') || params.get('token');
    const exp    = params.get('exp');
    if (exp) {
      if (Date.now() <= parseInt(exp,10)) {
        // lightweight acceptance — set session flag and open customer via router
        sessionStorage.setItem('sc_customer_allowed','1');
        history.replaceState(null,'',window.location.pathname+'#customer');
        selectRole('customer');
        toast('Welcome! Customer access granted.','success');
      } else {
        toast('Access link expired','error');
      }
      return;
    }
    if (token) {
      // validate token (fast) and open customer if OK. Avoid heavy rendering here.
      const ok = validateAndConsumeCustomerAccessToken(token);
      if (ok) {
        sessionStorage.setItem('sc_customer_allowed','1');
        history.replaceState(null,'',window.location.pathname+'#customer');
        selectRole('customer');
        toast('Welcome! Access granted.','success');
      } else {
        toast('Invalid or expired access token','error');
      }
    }
  } catch(e){}
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function stockBadge(status) {
  if (status==='out') return '<span class="status-badge badge-out">Out of Stock</span>';
  if (status==='low') return '<span class="status-badge badge-low">Low Stock</span>';
  return '<span class="status-badge badge-in">In Stock</span>';
}
