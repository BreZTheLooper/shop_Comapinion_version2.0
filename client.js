/**
 * SHOP COMPANION v2.0 — Client (Retailer) Panel Logic
 * Handles: Store dashboard, inventory CRUD, customer management, order history
 */

/* ── Init ── */
function initClient() {
  renderClientDash();
  renderInventory();
  populateCatFilter();
  renderCustomersTable();
  renderClientOrders();
  renderClientAccount();
}

/* ══════════════════════════════════════════════════════════════
   STORE DASHBOARD
   ══════════════════════════════════════════════════════════════ */
function renderClientDash() {
  const period = document.getElementById('revPeriod')?.value || 'weekly';
  const orders = Orders.getAll();

  let revenue = 0, orderCount = 0;
  if (period === 'daily')   { revenue = Orders.getTodayTotal();  orderCount = Orders.getTodayCount(); }
  if (period === 'weekly')  { revenue = Orders.getWeekTotal();   orderCount = orders.filter(o=>new Date(o.date)>=new Date(Date.now()-7*86400000)).length; }
  if (period === 'monthly') { revenue = Orders.getMonthTotal();  orderCount = orders.filter(o=>o.date.startsWith(new Date().toISOString().slice(0,7))).length; }

  const inv = Inventory.getAll();
  const csg = document.getElementById('clientStatsGrid');
  if (csg) csg.innerHTML = [
    { label:'Revenue',         value: formatPHP(revenue),      icon:'💰', color:'green' },
    { label:'Orders',          value: orderCount,              icon:'📋', color:'blue'  },
    { label:'Total Products',  value: inv.length,              icon:'📦', color:'blue'  },
    { label:'Low Stock Items', value: Inventory.getLowStock().length, icon:'⚠️', color:'yellow' },
  ].map(s=>clientStatCard(s)).join('');

  // Best sellers
  const bsc = document.getElementById('bestSellersChart');
  const best = Orders.getBestSellers(5);
  const maxQty = best[0]?.qty || 1;
  if (bsc) bsc.innerHTML = best.length ? best.map((b,i)=>`
    <div class="best-seller-row">
      <div class="bs-rank">#${i+1}</div>
      <div class="bs-name">${b.name}</div>
      <div class="bs-bar-wrap"><div class="bs-bar" style="width:${Math.round(b.qty/maxQty*100)}%"></div></div>
      <div class="bs-count">${b.qty} sold</div>
    </div>
  `).join('') : '<div class="empty-state">No orders yet</div>';

  // Low stock
  renderLowStockPanel('clientLowStock');
}

function renderLowStockPanel(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const low = [...Inventory.getLowStock(), ...Inventory.getOutOfStock()];
  if (!low.length) { el.innerHTML = '<div style="color:var(--green);padding:16px;text-align:center">✅ All items well-stocked</div>'; return; }
  el.innerHTML = low.slice(0,8).map(p=>`
    <div class="low-stock-item">
      <div class="low-stock-name"><span>${p.image}</span> ${p.name}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="low-stock-count">${p.stock} left</span>
        ${p.stock===0?'<span class="status-badge badge-out">Out</span>':'<span class="status-badge badge-low">Low</span>'}
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════════════════════
   INVENTORY
   ══════════════════════════════════════════════════════════════ */
let _invFilter = { search:'', category:'', sort:'name', availability:'' };

function populateCatFilter() {
  const cats = Inventory.categories();
  const selectors = ['filterCategory','cashierCatFilter','catList'];
  selectors.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'DATALIST') {
      el.innerHTML = cats.map(c=>`<option value="${c}">`).join('');
    } else {
      const cur = el.value;
      el.innerHTML = `<option value="">All Categories</option>` + cats.map(c=>`<option value="${c}" ${c===cur?'selected':''}>${c}</option>`).join('');
    }
  });
}

function filterInventory(searchVal) {
  if (searchVal !== undefined) _invFilter.search = searchVal;
  _invFilter.category     = document.getElementById('filterCategory')?.value     || document.getElementById('cashierCatFilter')?.value || '';
  _invFilter.sort         = document.getElementById('sortInventory')?.value       || 'name';
  _invFilter.availability = document.getElementById('filterAvailability')?.value  || '';
  renderInventory();
  renderCashierInventory();
}

function renderInventory() {
  const el = document.getElementById('inventoryTable');
  if (!el) return;
  let items = _getFilteredInventory();
  if (!items.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><p>No products found</p></div>`; return; }

  el.innerHTML = `
    <div style="overflow-x:auto">
    <table class="data-table">
      <thead><tr>
        <th>Product</th><th>Category</th><th>Type</th><th>Price</th>
        <th>Stock</th><th>Availability</th><th>Expiry</th><th>Batch</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${items.map(p => {
          const status = Inventory.stockStatus(p);
          const days = Inventory.daysUntilExpiry(p);
          const expiryClass = days===null?'':days<0?'expiry-critical':days<=7?'expiry-warn':'expiry-ok';
          const expiryText  = days===null?'—':days<0?`Expired ${Math.abs(days)}d ago`:days===0?'Expires today':`${days}d left`;
          return `
          <tr>
            <td><span style="margin-right:6px">${p.image||'📦'}</span><strong>${p.name}</strong><br>
              <small style="font-family:var(--font-body);color:var(--gray-400)">${p.barcode||'—'}</small></td>
            <td>${p.category}</td>
            <td style="font-size:13px">${p.type||'—'}</td>
            <td style="font-weight:700;color:var(--blue-light)">${formatPHP(p.price)}</td>
            <td>
              <div class="stock-edit">
                <input type="number" value="${p.stock}" min="0" onchange="quickUpdateStock('${p.id}',this.value)" style="width:64px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:var(--white);font-size:13px;padding:4px 8px;" />
                <span style="font-size:12px;color:var(--gray-400)">${p.unit||''}</span>
              </div>
            </td>
            <td>${stockBadge(status)}</td>
            <td><span class="${expiryClass}" style="font-size:12px">${expiryText}</span></td>
            <td style="font-size:12px;color:var(--gray-400)">${p.batch||'—'}</td>
            <td>
              <div class="btn-group">
                <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>`;
}

function _getFilteredInventory() {
  let items = Inventory.getAll();
  if (_invFilter.search)       items = items.filter(p=>JSON.stringify(p).toLowerCase().includes(_invFilter.search.toLowerCase()));
  if (_invFilter.category)     items = items.filter(p=>p.category===_invFilter.category);
  if (_invFilter.availability) {
    if (_invFilter.availability==='instock') items = items.filter(p=>Inventory.stockStatus(p)==='in');
    if (_invFilter.availability==='low')     items = items.filter(p=>Inventory.stockStatus(p)==='low');
    if (_invFilter.availability==='out')     items = items.filter(p=>Inventory.stockStatus(p)==='out');
  }
  // Sort
  items.sort((a,b)=>{
    if (_invFilter.sort==='price')    return a.price-b.price;
    if (_invFilter.sort==='stock')    return a.stock-b.stock;
    if (_invFilter.sort==='category') return a.category.localeCompare(b.category);
    if (_invFilter.sort==='expiry')   return (a.expiry||'9999').localeCompare(b.expiry||'9999');
    return a.name.localeCompare(b.name);
  });
  return items;
}

function quickUpdateStock(id, val) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0) return;
  Inventory.update(id, { stock: n });
  renderLowStockPanel('clientLowStock');
  renderLowStockPanel('cashierLowStock');
  toast('Stock updated', 'success');
}

function saveProduct() {
  const id = document.getElementById('modalAddProduct').dataset.editId;
  const data = {
    name:     document.getElementById('pName').value.trim(),
    category: document.getElementById('pCategory').value.trim(),
    type:     document.getElementById('pType').value.trim(),
    price:    parseFloat(document.getElementById('pPrice').value)||0,
    stock:    parseInt(document.getElementById('pStock').value)||0,
    unit:     document.getElementById('pUnit').value.trim(),
    barcode:  document.getElementById('pBarcode').value.trim(),
    image:    document.getElementById('pEmoji').value.trim() || '📦',
    expiry:   document.getElementById('pExpiry').value,
    batch:    document.getElementById('pBatch').value.trim(),
    lowStockThreshold: 10,
  };
  if (!data.name || !data.category) { toast('Name and category required', 'warning'); return; }
  if (id) { Inventory.update(id, data); toast('Product updated!', 'success'); }
  else    { Inventory.add(data);        toast(`${data.name} added!`, 'success'); }
  closeModal('modalAddProduct');
  delete document.getElementById('modalAddProduct').dataset.editId;
  renderInventory();
  renderCashierInventory();
  populateCatFilter();
  renderLowStockPanel('clientLowStock');
  renderLowStockPanel('cashierLowStock');
  _clearProductForm();
}

function editProduct(id) {
  const p = Inventory.findById(id);
  if (!p) return;
  document.getElementById('pName').value     = p.name;
  document.getElementById('pCategory').value = p.category;
  document.getElementById('pType').value     = p.type||'';
  document.getElementById('pPrice').value    = p.price;
  document.getElementById('pStock').value    = p.stock;
  document.getElementById('pUnit').value     = p.unit||'';
  document.getElementById('pBarcode').value  = p.barcode||'';
  document.getElementById('pEmoji').value    = p.image||'';
  document.getElementById('pExpiry').value   = p.expiry||'';
  document.getElementById('pBatch').value    = p.batch||'';
  document.getElementById('modalAddProduct').dataset.editId = id;
  openModal('modalAddProduct');
}

function deleteProduct(id) {
  const p = Inventory.findById(id);
  if (!p || !confirm(`Delete "${p.name}"?`)) return;
  Inventory.delete(id);
  renderInventory();
  renderCashierInventory();
  populateCatFilter();
  toast('Product deleted', 'info');
}

function _clearProductForm() {
  ['pName','pCategory','pType','pPrice','pStock','pUnit','pBarcode','pEmoji','pExpiry','pBatch'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.value='';
  });
}

/* ══════════════════════════════════════════════════════════════
   CUSTOMERS TABLE
   ══════════════════════════════════════════════════════════════ */
function renderCustomersTable() {
  const el = document.getElementById('customersTable');
  if (!el) return;
  const customers = Customers.getAll();
  if (!customers.length) { el.innerHTML='<div class="empty-state">No customers yet</div>'; return; }
  el.innerHTML = `
    <div style="overflow-x:auto">
    <table class="data-table">
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Points</th><th>Reg Code</th><th>Actions</th></tr></thead>
      <tbody>${customers.map(c=>`
        <tr>
          <td><strong>${c.name}</strong></td>
          <td style="font-size:13px">${c.email}</td>
          <td style="font-size:13px">${c.phone||'—'}</td>
          <td style="font-size:13px">${c.joined}</td>
          <td style="text-align:center">${c.totalOrders||0}</td>
          <td style="color:var(--yellow);font-weight:700">${c.points||0}pts</td>
          <td><code style="font-size:11px;color:var(--blue-light)">${c.regCode||'—'}</code></td>
          <td>
            <div class="btn-group">
              <button class="btn btn-danger btn-sm" onclick="deleteCustomerFromClient('${c.id}')">🗑</button>
            </div>
          </td>
        </tr>
      `).join('')}</tbody>
    </table>
    </div>`;
}

function saveCustomer() {
  const data = {
    name:  document.getElementById('cName').value.trim(),
    email: document.getElementById('cEmail').value.trim(),
    phone: document.getElementById('cPhone').value.trim(),
  };
  if (!data.name || !data.email) { toast('Name and email required','warning'); return; }
  Customers.add(data);
  closeModal('modalAddCustomer');
  renderCustomersTable();
  toast(`${data.name} added!`, 'success');
  ['cName','cEmail','cPhone'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  // Regenerate reg code for next add
  const rc = document.getElementById('cRegCode'); if(rc) rc.value='REG-'+uid();
}

function deleteCustomerFromClient(id) {
  const c = Customers.findById(id);
  if (!c || !confirm(`Remove customer "${c.name}"?`)) return;
  Customers.delete(id);
  renderCustomersTable();
  toast('Customer removed', 'info');
}

/* ══════════════════════════════════════════════════════════════
   ORDER HISTORY
   ══════════════════════════════════════════════════════════════ */
function renderClientOrders() {
  const el = document.getElementById('clientOrdersTable');
  if (!el) return;
  const orders = Orders.getAll();
  if (!orders.length) { el.innerHTML='<div class="empty-state">No orders yet</div>'; return; }
  el.innerHTML = `
    <div style="overflow-x:auto">
    <table class="data-table">
      <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th></tr></thead>
      <tbody>${orders.map(o=>`
        <tr>
          <td><code style="font-size:12px;color:var(--blue-light)">${o.id}</code></td>
          <td style="font-size:13px">${formatDate(o.date)}</td>
          <td>${o.customerName||'Walk-in'}</td>
          <td style="font-size:13px;color:var(--gray-400)">${(o.items||[]).map(i=>`${i.qty}× ${i.name}`).join(', ')}</td>
          <td style="font-weight:800;color:var(--green)">${formatPHP(o.total)}</td>
        </tr>
      `).join('')}</tbody>
    </table>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   ACCOUNT PANEL
   ══════════════════════════════════════════════════════════════ */
function renderClientAccount() {
  const el = document.getElementById('clientAccountPanel');
  if (!el) return;
  // Use first retailer as "current client" for demo
  const retailer = Retailers.getAll()[0] || {};
  const plan = SubPlans.findById(retailer.plan||'basic') || {};
  el.innerHTML = `
    <div class="account-grid">
      <div class="card">
        <div class="account-avatar">🏪</div>
        <h3>${retailer.storeName||'My Store'}</h3>
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:10px">
          ${[
            ['Client Name', retailer.clientName||'—'],
            ['Email', retailer.gmail||'—'],
            ['Contact', retailer.contact||'—'],
            ['Location', retailer.location||'—'],
            ['Access Code', retailer.accessCode||'—'],
            ['Joined', retailer.joinDate||'—'],
          ].map(([k,v])=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px">
              <span style="color:var(--gray-400)">${k}</span>
              <span style="font-weight:500">${v}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Subscription</h3>
        <div class="divider"></div>
        <div class="plan-card" style="background:rgba(26,107,255,0.06);border-color:rgba(26,107,255,0.3)">
          <div class="plan-name">${plan.name||'Basic'} Plan</div>
          <div class="plan-price">${formatPHP(plan.price||499)}</div>
          <div class="plan-period">per month</div>
          <ul class="plan-features" style="margin-top:16px">${(plan.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul>
          <div style="margin-top:16px;padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:13px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--gray-400)">Status</span><span class="status-badge badge-active">Active</span></div>
            <div style="display:flex;justify-content:space-between;margin-top:8px"><span style="color:var(--gray-400)">Next billing</span><span>${retailer.nextBilling||'—'}</span></div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function clientStatCard({label,value,icon,color}) {
  const c = color==='green'?'var(--green)':color==='yellow'?'var(--yellow)':color==='red'?'var(--red)':'var(--blue-light)';
  return `<div class="card stat-card"><div class="stat-icon">${icon}</div><div class="stat-value" style="color:${c}">${value}</div><div class="stat-label">${label}</div></div>`;
}

function stockBadge(status) {
  if (status==='out') return '<span class="status-badge badge-out">Out of Stock</span>';
  if (status==='low') return '<span class="status-badge badge-low">Low Stock</span>';
  return '<span class="status-badge badge-in">In Stock</span>';
}
