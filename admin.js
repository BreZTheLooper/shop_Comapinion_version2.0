/**
 * SHOP COMPANION v2.0 — Admin Panel Logic
 * Handles: Retailer management, subscriptions, revenue, analytics, access control
 */

/* ── Init ── */
function initAdmin() {
  renderAdminOverview();
  renderRetailersTable();
  renderSubscriptionPlans();
  renderRevenueTab();
  renderAnalyticsTab();
  renderCustomerAccess();
}

/* ══════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ══════════════════════════════════════════════════════════════ */
function renderAdminOverview() {
  const retailers = Retailers.getAll();
  const activeR   = retailers.filter(r=>r.status==='active').length;
  const revenue   = Payments.totalRevenue();
  const monthRev  = Payments.monthRevenue();

  // Stats grid
  const sg = document.getElementById('adminStatsGrid');
  if (sg) sg.innerHTML = [
    { label:'Total Retailers',     value: retailers.length,     icon:'🏪', color:'blue'  },
    { label:'Active Subscriptions',value: activeR,              icon:'✅', color:'green' },
    { label:'Monthly Revenue',     value: formatPHP(monthRev),  icon:'💰', color:'green' },
    { label:'Lifetime Revenue',    value: formatPHP(revenue),   icon:'📈', color:'blue'  },
  ].map(s => statCard(s)).join('');

  // Server status
  const sp = document.getElementById('serverStatusPanel');
  if (sp) sp.innerHTML = [
    { label:'API Server',       status:'online',   uptime:'99.9%', ping:'12ms'  },
    { label:'Database',         status:'online',   uptime:'99.8%', ping:'3ms'   },
    { label:'Scanner Service',  status:'online',   uptime:'100%',  ping:'8ms'   },
    { label:'QR Generator',     status:'online',   uptime:'100%',  ping:'5ms'   },
    { label:'Email Service',    status:'degraded', uptime:'97.2%', ping:'145ms' },
  ].map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:8px;height:8px;border-radius:50%;background:${s.status==='online'?'var(--green)':s.status==='degraded'?'var(--yellow)':'var(--red)'}"></span>
        <span style="font-size:14px">${s.label}</span>
      </div>
      <div style="display:flex;gap:16px;font-size:12px;color:var(--gray-400)">
        <span>⬆️ ${s.uptime}</span><span>📡 ${s.ping}</span>
      </div>
    </div>
  `).join('');

  // Activity log
  const al = document.getElementById('adminActivityLog');
  const log = Store.get('activity_log') || [];
  if (al) al.innerHTML = log.slice(0,8).map(e => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px">
      <span>${e.type==='order'?'🛒':e.type==='retailer'?'🏪':e.type==='subscription'?'💎':'🔐'}</span>
      <div style="flex:1"><div style="color:var(--gray-200)">${e.action}</div>
        <div style="font-size:11px;color:var(--gray-400);margin-top:2px">${formatDate(e.time)}</div></div>
    </div>
  `).join('') || '<div class="empty-state">No activity yet</div>';
}

/* ══════════════════════════════════════════════════════════════
   RETAILERS TAB
   ══════════════════════════════════════════════════════════════ */
function renderRetailersTable(filter='', statusFilter='') {
  const rt = document.getElementById('retailersTable');
  if (!rt) return;
  let retailers = Retailers.getAll();
  if (filter)       retailers = retailers.filter(r => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()));
  if (statusFilter) retailers = retailers.filter(r => r.status === statusFilter);

  if (!retailers.length) { rt.innerHTML = `<div class="empty-state"><div class="empty-icon">🏪</div><p>No retailers found</p></div>`; return; }

  rt.innerHTML = `
    <div style="overflow-x:auto">
    <table class="data-table">
      <thead><tr>
        <th>Store</th><th>Client</th><th>Location</th><th>Contact</th>
        <th>Plan</th><th>Status</th><th>Next Billing</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${retailers.map(r => `
          <tr>
            <td><strong>${r.storeName}</strong><br><small style="color:var(--gray-400);font-family:monospace">${r.accessCode}</small></td>
            <td>${r.clientName}<br><small style="color:var(--gray-400)">${r.gmail}</small></td>
            <td style="font-size:13px">${r.location}</td>
            <td style="font-size:13px">${r.contact}</td>
            <td><span class="status-badge badge-active" style="text-transform:capitalize">${r.plan}</span></td>
            <td>${statusBadge(r.status)}</td>
            <td style="font-size:13px;color:${isOverdue(r.nextBilling)?'var(--red)':'var(--gray-200)'}">${r.nextBilling}</td>
            <td>
              <div class="btn-group">
                <button class="btn btn-ghost btn-sm" onclick="suspendRetailer('${r.id}')">⏸</button>
                <button class="btn btn-danger btn-sm" onclick="deleteRetailer('${r.id}')">🗑</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </div>`;
}

function filterRetailers(val) { renderRetailersTable(val); }
function filterRetailersByStatus(val) { renderRetailersTable('', val); }

function saveRetailer() {
  const r = {
    clientName:  document.getElementById('rClientName').value.trim(),
    storeName:   document.getElementById('rStoreName').value.trim(),
    location:    document.getElementById('rLocation').value.trim(),
    contact:     document.getElementById('rContact').value.trim(),
    gmail:       document.getElementById('rGmail').value.trim(),
    plan:        document.getElementById('rPlan').value,
  };
  if (!r.clientName || !r.storeName || !r.gmail) { toast('Please fill in required fields', 'warning'); return; }
  Retailers.add(r);
  closeModal('modalAddRetailer');
  renderRetailersTable();
  renderAdminOverview();
  toast(`Retailer "${r.storeName}" added!`, 'success');
  // Clear form
  ['rClientName','rStoreName','rLocation','rContact','rGmail'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}

function suspendRetailer(id) {
  const r = Retailers.findById(id);
  if (!r) return;
  const newStatus = r.status === 'suspended' ? 'active' : 'suspended';
  Retailers.update(id, { status: newStatus });
  renderRetailersTable();
  toast(`${r.storeName} ${newStatus}`, newStatus==='active'?'success':'warning');
}

function deleteRetailer(id) {
  const r = Retailers.findById(id);
  if (!r || !confirm(`Remove retailer "${r.storeName}"?`)) return;
  Retailers.delete(id);
  renderRetailersTable();
  renderAdminOverview();
  toast('Retailer removed', 'info');
}

/* ══════════════════════════════════════════════════════════════
   SUBSCRIPTIONS TAB
   ══════════════════════════════════════════════════════════════ */
function renderSubscriptionPlans() {
  const sg = document.getElementById('subscriptionPlansGrid');
  const at = document.getElementById('activeSubsTable');
  const plans = SubPlans.getAll();
  const retailers = Retailers.getAll();

  if (sg) sg.innerHTML = `<div class="plan-cards-grid">${plans.map((p,i)=>`
    <div class="plan-card ${i===1?'featured':''}">
      ${i===1?'<div class="plan-featured-tag">Popular</div>':''}
      <div class="plan-name">${p.name}</div>
      <div class="plan-price">${formatPHP(p.price)}</div>
      <div class="plan-period">per month</div>
      <ul class="plan-features">${p.features.map(f=>`<li>${f}</li>`).join('')}</ul>
      <div style="font-size:12px;color:var(--gray-400);margin-bottom:12px">Max Products: ${p.maxProducts===99999?'Unlimited':p.maxProducts}</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="editPlan('${p.id}')">Edit</button>
        <div style="flex:1;text-align:right;font-size:13px;color:var(--gray-400)">${retailers.filter(r=>r.plan===p.id).length} retailers</div>
      </div>
    </div>
  `).join('')}</div>`;

  if (at) {
    const subs = retailers.map(r => ({...r, planData: SubPlans.findById(r.plan)}));
    at.innerHTML = `
      <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Retailer</th><th>Plan</th><th>Amount</th><th>Status</th><th>Next Billing</th></tr></thead>
        <tbody>${subs.map(r=>`
          <tr>
            <td>${r.storeName}<br><small style="color:var(--gray-400)">${r.clientName}</small></td>
            <td style="text-transform:capitalize">${r.plan}</td>
            <td>${r.planData?formatPHP(r.planData.price):'—'}</td>
            <td>${statusBadge(r.status)}</td>
            <td style="color:${isOverdue(r.nextBilling)?'var(--red)':'var(--gray-200)'}">${r.nextBilling}</td>
          </tr>
        `).join('')}</tbody>
      </table>
      </div>`;
  }
}

function editPlan(id) {
  const p = SubPlans.findById(id);
  if (!p) return;
  document.getElementById('planName').value = p.name;
  document.getElementById('planPrice').value = p.price;
  document.getElementById('planMaxProducts').value = p.maxProducts === 99999 ? 'Unlimited' : p.maxProducts;
  document.getElementById('planFeatures').value = p.features.join(', ');
  document.getElementById('modalEditPlan').dataset.editId = id;
  openModal('modalEditPlan');
}

function savePlan() {
  const id = document.getElementById('modalEditPlan').dataset.editId;
  const data = {
    name: document.getElementById('planName').value.trim(),
    price: parseFloat(document.getElementById('planPrice').value)||0,
    maxProducts: document.getElementById('planMaxProducts').value==='Unlimited'?99999:parseInt(document.getElementById('planMaxProducts').value)||100,
    features: document.getElementById('planFeatures').value.split(',').map(f=>f.trim()).filter(Boolean),
  };
  if (id) SubPlans.update(id, data);
  else SubPlans.add(data);
  closeModal('modalEditPlan');
  renderSubscriptionPlans();
  toast('Plan saved', 'success');
}

/* ══════════════════════════════════════════════════════════════
   REVENUE TAB
   ══════════════════════════════════════════════════════════════ */
function renderRevenueTab() {
  const rsg = document.getElementById('revenueStatsGrid');
  if (rsg) rsg.innerHTML = [
    { label:'Total Revenue',    value: formatPHP(Payments.totalRevenue()),  icon:'💰', color:'green' },
    { label:'This Month',       value: formatPHP(Payments.monthRevenue()),  icon:'📅', color:'blue'  },
    { label:'Active Subs',      value: Retailers.getAll().filter(r=>r.status==='active').length, icon:'✅', color:'green' },
    { label:'Overdue Payments', value: Payments.getAll().filter(p=>p.status==='overdue').length, icon:'⚠️', color:'yellow'},
  ].map(s=>statCard(s)).join('');

  // Bar chart
  const rc = document.getElementById('revenueChart');
  if (rc) {
    const data = Payments.monthlyBreakdown(6);
    const max  = Math.max(...data.map(d=>d.total), 1);
    rc.innerHTML = `<div class="bar-chart">${data.map(d=>`
      <div class="bar-item">
        <div class="bar-value">${d.total?formatPHP(d.total):''}</div>
        <div class="bar-fill" style="height:${Math.max(4,(d.total/max)*140)}px" title="${formatPHP(d.total)}"></div>
        <div class="bar-label">${d.label}</div>
      </div>
    `).join('')}</div>`;
  }

  // Payment history table
  const pht = document.getElementById('paymentHistoryTable');
  if (pht) {
    const pays = Payments.getAll();
    pht.innerHTML = `
      <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Date</th><th>Retailer</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${pays.map(p=>`
          <tr>
            <td style="font-size:13px">${p.date}</td>
            <td>${p.retailerName}</td>
            <td style="text-transform:capitalize">${p.plan}</td>
            <td style="font-weight:700;color:var(--green)">${formatPHP(p.amount)}</td>
            <td>${p.status==='paid'?'<span class="status-badge badge-active">Paid</span>':'<span class="status-badge badge-expired">Overdue</span>'}</td>
          </tr>
        `).join('')}</tbody>
      </table>
      </div>`;
  }
}

/* ══════════════════════════════════════════════════════════════
   ANALYTICS TAB
   ══════════════════════════════════════════════════════════════ */
function renderAnalyticsTab() {
  const asg = document.getElementById('analyticsStatsGrid');
  if (asg) asg.innerHTML = [
    { label:'System Uptime',   value:'99.7%',  icon:'⬆️', color:'green' },
    { label:'API Calls Today', value:'4,821',  icon:'📡', color:'blue'  },
    { label:'Active Sessions', value:'12',     icon:'👥', color:'blue'  },
    { label:'Avg Response',    value:'42ms',   icon:'⚡', color:'green' },
  ].map(s=>statCard(s)).join('');

  // Uptime heatmap (last 30 days mock)
  const uc = document.getElementById('uptimeChart');
  if (uc) {
    const blocks = Array.from({length:30},(_,i)=>{
      const r = Math.random();
      const cls = r > 0.97 ? 'uptime-down' : r > 0.93 ? 'uptime-part' : 'uptime-up';
      const d = new Date(); d.setDate(d.getDate()-29+i);
      return `<div class="uptime-block ${cls}" title="${d.toLocaleDateString()}"></div>`;
    });
    uc.innerHTML = `<div class="uptime-grid">${blocks.join('')}</div>
      <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--gray-400)">
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px;margin-right:4px"></span>Up</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--yellow);border-radius:2px;margin-right:4px"></span>Degraded</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--red);border-radius:2px;margin-right:4px"></span>Down</span>
      </div>`;
  }

  // Access logs
  const alt = document.getElementById('accessLogsTable');
  if (alt) {
    const log = Store.get('activity_log') || [];
    alt.innerHTML = log.slice(0,15).map(e=>`
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px">
        <span>${e.type==='order'?'🛒':e.type==='retailer'?'🏪':e.type==='subscription'?'💎':'🔐'}</span>
        <div style="flex:1"><div>${e.action}</div><div style="font-size:11px;color:var(--gray-400)">${formatDate(e.time)}</div></div>
      </div>
    `).join('') || '<div class="empty-state">No logs yet</div>';
  }
}

/* ══════════════════════════════════════════════════════════════
   ACCESS CONTROL TAB
   ══════════════════════════════════════════════════════════════ */
function renderCustomerAccess() {
  const listEl = document.getElementById('caList');
  if (!listEl) return;
  const tokens = getCustomerAccessTokens();
  if (!tokens.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔐</div><p>No active access tokens</p></div>`;
    return;
  }
  listEl.innerHTML = tokens.map(t => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;background:rgba(255,255,255,0.03);margin-bottom:8px;gap:8px">
      <div>
        <div style="font-family:monospace;font-size:13px;color:var(--blue-light)">${t.token}</div>
        <div style="font-size:11px;color:var(--gray-400);margin-top:3px">Expires: ${new Date(t.expires).toLocaleTimeString()}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="revokeCustomerAccess('${t.token}')">Revoke</button>
    </div>
  `).join('');
}

function generateCustomerAccess() {
  const minutes = parseInt(document.getElementById('caExpiry')?.value || '10', 10);
  const item = createCustomerAccessToken(minutes);
  const base = window.location.href.split('#')[0];
  const url  = `${base}#customer?access=${item.token}&exp=${item.expires}`;
  const out  = document.getElementById('caOutput');
  out.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px';

  const qrDiv = document.createElement('div');
  generatePlainQR(qrDiv, url, 220);

  const info = document.createElement('div');
  info.style.cssText = 'font-size:13px;text-align:center';
  info.innerHTML = `<div style="color:var(--gray-400);margin-bottom:8px">One-time QR · Expires in ${minutes} min</div>
    <code style="word-break:break-all;font-size:11px;color:var(--blue-light)">${url}</code>`;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-ghost btn-sm';
  copyBtn.textContent = '📋 Copy URL';
  copyBtn.onclick = () => { try { navigator.clipboard.writeText(url); toast('URL copied!','success'); } catch(e){prompt('Copy URL',url);} };

  wrap.append(qrDiv, info, copyBtn);
  out.appendChild(wrap);
  renderCustomerAccess();
  toast('QR generated!', 'success');
}

function revokeCustomerAccess(token) {
  revokeCustomerAccessToken(token);
  renderCustomerAccess();
  toast('Token revoked', 'info');
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function statCard({label,value,icon,color}) {
  const c = color==='green'?'var(--green)':color==='yellow'?'var(--yellow)':color==='red'?'var(--red)':'var(--blue-light)';
  return `
    <div class="card stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value" style="color:${c}">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function statusBadge(status) {
  const map = { active:'badge-active', expired:'badge-expired', suspended:'badge-suspended' };
  return `<span class="status-badge ${map[status]||'badge-expired'}">${status}</span>`;
}

function isOverdue(dateStr) {
  return dateStr && new Date(dateStr) < new Date();
}
