/**
 * SHOP COMPANION v2.0 — Shared Utilities & Extended Data Layer
 * Handles: LocalStorage, Inventory, Customers, Orders, Retailers, Toast, QR/Barcode
 */

/* ============================================================
   DATA STORE — LocalStorage wrapper
   ============================================================ */
const Store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('sc_' + key)) || null; }
    catch { return null; }
  },
  set(key, val) { localStorage.setItem('sc_' + key, JSON.stringify(val)); },
  remove(key)   { localStorage.removeItem('sc_' + key); }
};

/* ============================================================
   SEED DATA — Populates all stores on first run
   ============================================================ */
function seedData() {
  if (Store.get('seeded_v2')) return;

  /* Inventory with extended fields */
  Store.set('inventory', [
    { id:'P001', name:'Whole Milk (1L)',       barcode:'8901234560011', category:'Dairy',     type:'Full Cream', price:75,  stock:50, unit:'bottle', image:'🥛', expiry:'2025-06-15', batch:'BATCH-2024-001', lowStockThreshold:10 },
    { id:'P002', name:'White Bread Loaf',      barcode:'8901234560028', category:'Bakery',    type:'Sliced',     price:55,  stock:30, unit:'loaf',   image:'🍞', expiry:'2025-04-30', batch:'BATCH-2024-001', lowStockThreshold:5  },
    { id:'P003', name:'Organic Eggs (12 pcs)', barcode:'8901234560035', category:'Dairy',     type:'Free Range', price:120, stock:40, unit:'tray',   image:'🥚', expiry:'2025-05-20', batch:'BATCH-2024-002', lowStockThreshold:8  },
    { id:'P004', name:'Cheddar Cheese (200g)', barcode:'8901234560042', category:'Dairy',     type:'Block',      price:185, stock:20, unit:'pack',   image:'🧀', expiry:'2025-07-10', batch:'BATCH-2024-002', lowStockThreshold:5  },
    { id:'P005', name:'Chicken Breast (500g)', barcode:'8901234560059', category:'Meat',      type:'Boneless',   price:210, stock:25, unit:'pack',   image:'🍗', expiry:'2025-04-22', batch:'BATCH-2024-003', lowStockThreshold:10 },
    { id:'P006', name:'Jasmine Rice (1kg)',    barcode:'8901234560066', category:'Grains',    type:'Premium',    price:65,  stock:80, unit:'bag',    image:'🍚', expiry:'2026-01-01', batch:'BATCH-2024-003', lowStockThreshold:20 },
    { id:'P007', name:'Olive Oil (500ml)',     barcode:'8901234560073', category:'Pantry',    type:'Extra Virgin',price:320,stock:15, unit:'bottle', image:'🫒', expiry:'2026-03-01', batch:'BATCH-2024-004', lowStockThreshold:5  },
    { id:'P008', name:'Pasta (500g)',          barcode:'8901234560080', category:'Grains',    type:'Spaghetti',  price:45,  stock:60, unit:'pack',   image:'🍝', expiry:'2026-06-01', batch:'BATCH-2024-004', lowStockThreshold:15 },
    { id:'P009', name:'Tomato Sauce (250g)',   barcode:'8901234560097', category:'Pantry',    type:'Classic',    price:35,  stock:45, unit:'can',    image:'🥫', expiry:'2026-01-15', batch:'BATCH-2024-005', lowStockThreshold:10 },
    { id:'P010', name:'Orange Juice (1L)',     barcode:'8901234560103', category:'Beverages', type:'No Pulp',    price:95,  stock:35, unit:'bottle', image:'🍊', expiry:'2025-05-01', batch:'BATCH-2024-005', lowStockThreshold:8  },
    { id:'P011', name:'Greek Yogurt (200g)',   barcode:'8901234560110', category:'Dairy',     type:'Plain',      price:85,  stock:28, unit:'cup',    image:'🍦', expiry:'2025-04-28', batch:'BATCH-2024-006', lowStockThreshold:7  },
    { id:'P012', name:'Banana (per kg)',       barcode:'8901234560127', category:'Produce',   type:'Lakatan',    price:60,  stock:55, unit:'kg',     image:'🍌', expiry:'2025-04-24', batch:'BATCH-2024-006', lowStockThreshold:10 },
    { id:'P013', name:'Apple Fuji (per kg)',   barcode:'8901234560134', category:'Produce',   type:'Fuji',       price:110, stock:40, unit:'kg',     image:'🍎', expiry:'2025-05-10', batch:'BATCH-2024-007', lowStockThreshold:8  },
    { id:'P014', name:'Instant Noodles',       barcode:'8901234560141', category:'Pantry',    type:'Chicken',    price:15,  stock:100,unit:'pack',   image:'🍜', expiry:'2026-09-01', batch:'BATCH-2024-007', lowStockThreshold:20 },
    { id:'P015', name:'Bottled Water (1.5L)',  barcode:'8901234560158', category:'Beverages', type:'Purified',   price:25,  stock:90, unit:'bottle', image:'💧', expiry:'2027-01-01', batch:'BATCH-2024-008', lowStockThreshold:25 },
  ]);

  /* Customers */
  Store.set('customers', [
    { id:'C001', name:'Maria Santos',   email:'maria@gmail.com',  phone:'09171234567', joined:'2024-01-15', totalOrders:12, points:1200, regCode:'REG-MARIA01' },
    { id:'C002', name:'Jose Reyes',     email:'jose@gmail.com',   phone:'09181234567', joined:'2024-02-20', totalOrders:8,  points:800,  regCode:'REG-JOSE002' },
    { id:'C003', name:'Ana Cruz',       email:'ana@gmail.com',    phone:'09191234567', joined:'2024-03-10', totalOrders:5,  points:500,  regCode:'REG-ANA0003' },
  ]);

  /* Orders */
  Store.set('orders', [
    { id:'ORD-1001', date:'2025-04-18T09:30:00Z', customerId:'C001', customerName:'Maria Santos', items:[{id:'P001',name:'Whole Milk',qty:2,price:75},{id:'P006',name:'Jasmine Rice',qty:1,price:65}], subtotal:215, tax:25.80, total:240.80, cashierId:'CASHIER-1' },
    { id:'ORD-1002', date:'2025-04-18T11:15:00Z', customerId:'C002', customerName:'Jose Reyes',   items:[{id:'P005',name:'Chicken Breast',qty:2,price:210},{id:'P009',name:'Tomato Sauce',qty:1,price:35}], subtotal:455, tax:54.60, total:509.60, cashierId:'CASHIER-1' },
    { id:'ORD-1003', date:'2025-04-17T14:00:00Z', customerId:'C003', customerName:'Ana Cruz',     items:[{id:'P003',name:'Organic Eggs',qty:1,price:120},{id:'P002',name:'White Bread',qty:2,price:55}], subtotal:230, tax:27.60, total:257.60, cashierId:'CASHIER-1' },
  ]);

  /* Retailers (Admin manages these) */
  Store.set('retailers', [
    { id:'R001', clientName:'Juan Dela Cruz',  storeName:"Juan's Grocery",    location:'Quezon City, Metro Manila', contact:'09171111111', gmail:'juan@gmail.com', plan:'premium', status:'active',    accessCode:'SC-PREM-001', joinDate:'2024-01-01', nextBilling:'2025-05-01' },
    { id:'R002', clientName:'Maria Manalo',    storeName:'Manalo Supermart',   location:'Pasig City, Metro Manila',  contact:'09182222222', gmail:'maria.m@gmail.com', plan:'standard', status:'active', accessCode:'SC-STND-002', joinDate:'2024-03-15', nextBilling:'2025-05-15' },
    { id:'R003', clientName:'Pedro Villanueva',storeName:'PV Mini Mart',       location:'Caloocan, Metro Manila',    contact:'09193333333', gmail:'pedro@gmail.com',   plan:'basic',    status:'expired', accessCode:'SC-BASC-003', joinDate:'2024-06-01', nextBilling:'2025-04-01' },
  ]);

  /* Subscription plans */
  Store.set('sub_plans', [
    { id:'basic',    name:'Basic',    price:499,  maxProducts:100,  features:['Inventory management','Order tracking','Basic reports']  },
    { id:'standard', name:'Standard', price:999,  maxProducts:500,  features:['All Basic features','Barcode scanning','Customer management','QR checkout'] },
    { id:'premium',  name:'Premium',  price:1999, maxProducts:99999,features:['All Standard features','Advanced analytics','Custom branding','Priority support','Multi-cashier'] },
  ]);

  /* Payments / revenue mock */
  Store.set('payments', [
    { id:'PAY-001', retailerId:'R001', retailerName:"Juan's Grocery",  plan:'premium', amount:1999, date:'2025-04-01', status:'paid'    },
    { id:'PAY-002', retailerId:'R002', retailerName:'Manalo Supermart', plan:'standard',amount:999,  date:'2025-04-15', status:'paid'    },
    { id:'PAY-003', retailerId:'R003', retailerName:'PV Mini Mart',     plan:'basic',   amount:499,  date:'2025-03-01', status:'overdue' },
    { id:'PAY-004', retailerId:'R001', retailerName:"Juan's Grocery",  plan:'premium', amount:1999, date:'2025-03-01', status:'paid'    },
    { id:'PAY-005', retailerId:'R002', retailerName:'Manalo Supermart', plan:'standard',amount:999,  date:'2025-03-15', status:'paid'    },
  ]);

  /* Vouchers available */
  Store.set('vouchers', [
    { code:'WELCOME10', discount:10, type:'percent', desc:'10% off for new customers', minOrder:200 },
    { code:'SAVE50',    discount:50, type:'fixed',   desc:'₱50 off orders over ₱500',  minOrder:500 },
    { code:'FRESH20',   discount:20, type:'percent', desc:'20% off fresh produce',      minOrder:100 },
  ]);

  /* Activity log */
  Store.set('activity_log', [
    { time: new Date(Date.now()-60000*5).toISOString(),  action:'Retailer R001 processed checkout ORD-1001', type:'order' },
    { time: new Date(Date.now()-60000*20).toISOString(), action:'New retailer R002 registered',              type:'retailer' },
    { time: new Date(Date.now()-60000*60).toISOString(), action:'Plan upgraded: R001 Basic → Premium',       type:'subscription' },
    { time: new Date(Date.now()-60000*120).toISOString(),action:'Customer access QR generated',              type:'access' },
  ]);

  Store.set('seeded_v2', true);
}

/* ============================================================
   INVENTORY HELPERS (Extended)
   ============================================================ */
const Inventory = {
  getAll()           { return Store.get('inventory') || []; },
  save(inv)          { Store.set('inventory', inv); },
  findById(id)       { return this.getAll().find(p => p.id === id); },
  findByBarcode(bc)  { return this.getAll().find(p => p.barcode === bc); },
  categories()       { return [...new Set(this.getAll().map(p => p.category))].sort(); },
  types(category)    { return [...new Set(this.getAll().filter(p=>p.category===category).map(p=>p.type))].sort(); },

  add(product) {
    const inv = this.getAll();
    product.id = 'P' + String(Date.now()).slice(-6);
    if (!product.lowStockThreshold) product.lowStockThreshold = 10;
    inv.push(product);
    this.save(inv);
    return product;
  },
  update(id, changes) {
    const inv = this.getAll().map(p => p.id === id ? { ...p, ...changes } : p);
    this.save(inv);
  },
  delete(id) { this.save(this.getAll().filter(p => p.id !== id)); },
  deductStock(items) {
    const inv = this.getAll();
    items.forEach(({ id, qty }) => {
      const p = inv.find(x => x.id === id);
      if (p) p.stock = Math.max(0, p.stock - qty);
    });
    this.save(inv);
  },
  getLowStock() { return this.getAll().filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold); },
  getOutOfStock(){ return this.getAll().filter(p => p.stock === 0); },

  /** Returns 'in' | 'low' | 'out' */
  stockStatus(p) {
    if (p.stock === 0) return 'out';
    if (p.stock <= (p.lowStockThreshold || 10)) return 'low';
    return 'in';
  },
  /** Days until expiry; null if no expiry set */
  daysUntilExpiry(p) {
    if (!p.expiry) return null;
    return Math.ceil((new Date(p.expiry) - new Date()) / 86400000);
  }
};

/* ============================================================
   CUSTOMER HELPERS
   ============================================================ */
const Customers = {
  getAll()  { return Store.get('customers') || []; },
  save(c)   { Store.set('customers', c); },
  findById(id)    { return this.getAll().find(c => c.id === id); },
  findByEmail(em) { return this.getAll().find(c => c.email.toLowerCase() === em.toLowerCase()); },

  add(customer) {
    const list = this.getAll();
    customer.id         = 'C' + String(Date.now()).slice(-6);
    customer.joined     = new Date().toISOString().slice(0,10);
    customer.totalOrders= 0;
    customer.points     = 0;
    customer.regCode    = 'REG-' + uid();
    list.push(customer);
    this.save(list);
    return customer;
  },
  update(id, changes) { this.save(this.getAll().map(c => c.id === id ? { ...c, ...changes } : c)); },
  delete(id)          { this.save(this.getAll().filter(c => c.id !== id)); },

  addPoints(id, pts) {
    const c = this.findById(id);
    if (c) this.update(id, { points: (c.points || 0) + pts });
  }
};

/* ============================================================
   ORDER HELPERS
   ============================================================ */
const Orders = {
  getAll()  { return Store.get('orders') || []; },
  save(o)   { Store.set('orders', o); },

  add(order) {
    const list = this.getAll();
    order.id   = 'ORD-' + Date.now();
    order.date = new Date().toISOString();
    list.unshift(order);
    this.save(list);
    return order;
  },
  getTodayTotal() {
    const today = new Date().toISOString().slice(0,10);
    return this.getAll()
      .filter(o => o.date.startsWith(today))
      .reduce((s,o) => s + (o.total||0), 0);
  },
  getTodayCount() {
    const today = new Date().toISOString().slice(0,10);
    return this.getAll().filter(o => o.date.startsWith(today)).length;
  },
  getWeekTotal() {
    const cutoff = Date.now() - 7*24*3600*1000;
    return this.getAll().filter(o => new Date(o.date).getTime() >= cutoff).reduce((s,o) => s + (o.total||0), 0);
  },
  getMonthTotal() {
    const mo = new Date().toISOString().slice(0,7);
    return this.getAll().filter(o => o.date.startsWith(mo)).reduce((s,o) => s + (o.total||0), 0);
  },
  getBestSellers(limit=5) {
    const counts = {};
    this.getAll().forEach(order => {
      (order.items || []).forEach(item => {
        counts[item.name] = (counts[item.name]||0) + (item.qty||1);
      });
    });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, limit).map(([name,qty])=>({name,qty}));
  }
};

/* ============================================================
   RETAILER HELPERS (Admin)
   ============================================================ */
const Retailers = {
  getAll()  { return Store.get('retailers') || []; },
  save(r)   { Store.set('retailers', r); },
  findById(id) { return this.getAll().find(r => r.id === id); },

  add(retailer) {
    const list = this.getAll();
    retailer.id         = 'R' + String(Date.now()).slice(-4);
    retailer.joinDate   = new Date().toISOString().slice(0,10);
    retailer.status     = 'active';
    retailer.accessCode = 'SC-' + retailer.plan.slice(0,4).toUpperCase() + '-' + uid().slice(0,4);
    // next billing: 30 days from now
    const nb = new Date(); nb.setDate(nb.getDate()+30);
    retailer.nextBilling = nb.toISOString().slice(0,10);
    list.push(retailer);
    this.save(list);
    logActivity(`New retailer added: ${retailer.storeName}`, 'retailer');
    return retailer;
  },
  update(id, changes) { this.save(this.getAll().map(r => r.id === id ? {...r,...changes} : r)); },
  delete(id) { this.save(this.getAll().filter(r => r.id !== id)); },
};

/* ============================================================
   SUBSCRIPTION PLAN HELPERS
   ============================================================ */
const SubPlans = {
  getAll() { return Store.get('sub_plans') || []; },
  save(p)  { Store.set('sub_plans', p); },
  findById(id) { return this.getAll().find(p => p.id === id); },
  add(plan) {
    const list = this.getAll();
    plan.id = plan.name.toLowerCase().replace(/\s+/g,'-');
    list.push(plan);
    this.save(list);
  },
  update(id, changes) { this.save(this.getAll().map(p => p.id === id ? {...p,...changes} : p)); }
};

/* ============================================================
   PAYMENT HELPERS
   ============================================================ */
const Payments = {
  getAll() { return Store.get('payments') || []; },
  save(p)  { Store.set('payments', p); },
  add(payment) {
    const list = this.getAll();
    payment.id = 'PAY-' + Date.now();
    list.unshift(payment);
    this.save(list);
    return payment;
  },
  totalRevenue() { return this.getAll().filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0); },
  monthRevenue() {
    const mo = new Date().toISOString().slice(0,7);
    return this.getAll().filter(p=>p.status==='paid'&&p.date.startsWith(mo)).reduce((s,p)=>s+p.amount,0);
  },
  /** Last N months labels + totals */
  monthlyBreakdown(n=6) {
    const months = [];
    for (let i = n-1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i);
      const label = d.toLocaleString('en-PH',{month:'short',year:'2-digit'});
      const key   = d.toISOString().slice(0,7);
      const total = this.getAll().filter(p=>p.status==='paid'&&p.date.startsWith(key)).reduce((s,p)=>s+p.amount,0);
      months.push({ label, total });
    }
    return months;
  }
};

/* ============================================================
   VOUCHER HELPERS
   ============================================================ */
const Vouchers = {
  getAll() { return Store.get('vouchers') || []; },
  find(code) { return this.getAll().find(v => v.code.toUpperCase() === code.toUpperCase()); },
  apply(code, subtotal) {
    const v = this.find(code);
    if (!v) return { ok: false, msg: 'Voucher not found' };
    if (subtotal < v.minOrder) return { ok: false, msg: `Min. order ₱${v.minOrder} required` };
    const disc = v.type === 'percent' ? subtotal * (v.discount/100) : v.discount;
    return { ok: true, discount: disc, voucher: v };
  }
};

/* ============================================================
   ACTIVITY LOG
   ============================================================ */
function logActivity(action, type='info') {
  const log = Store.get('activity_log') || [];
  log.unshift({ time: new Date().toISOString(), action, type });
  if (log.length > 100) log.pop(); // keep last 100
  Store.set('activity_log', log);
}

/* ============================================================
   TAX & TOTALS
   ============================================================ */
const TAX_RATE = 0.12;
function calcTotals(items, discountAmount=0) {
  const subtotal = items.reduce((s,i) => s + (i.price||0) * (i.qty||1), 0);
  const discount = Math.min(discountAmount, subtotal);
  const taxable  = subtotal - discount;
  const tax      = taxable * TAX_RATE;
  const total    = taxable + tax;
  return { subtotal, discount, tax, total };
}
function formatPHP(num) {
  return '₱' + (num||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function toast(msg, type='info') {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  let container = document.getElementById('toast-container');
  if (!container) { container = document.createElement('div'); container.id='toast-container'; document.body.appendChild(container); }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('toast-out'); setTimeout(()=>el.remove(),300); }, 3200);
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

/* ============================================================
   QR CODE GENERATION
   ============================================================ */
function generateQR(container, data, size=200) {
  container.innerHTML = '';
  new QRCode(container, {
    text: typeof data==='string' ? data : JSON.stringify(data),
    width: size, height: size,
    colorDark: '#1a6bff', colorLight: '#0a0a0f',
    correctLevel: QRCode.CorrectLevel.M
  });
}
function generatePlainQR(container, data, size=220) {
  container.innerHTML = '';
  const payload = typeof data==='string' ? data : JSON.stringify(data);
  new QRCode(container, {
    text: payload,
    width: size, height: size,
    colorDark: '#000000', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  // Ensure canvas is accessible for saving and remove duplicates
  setTimeout(() => {
    const canvas = container.querySelector('canvas');
    if (canvas) {
      try {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.cssText = 'width:100%;max-width:220px;border-radius:8px;display:block;margin:0 auto';
        img.alt = 'QR Code';
        canvas.replaceWith(img);
      } catch(e) { /* ignore canvas->img conversion errors */ }
    }
    // Remove duplicate images if present (some renderers may append extras)
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length > 1) imgs.slice(1).forEach(i => i.remove());
    // Remove any stray extra child nodes beyond the first
    const children = Array.from(container.children);
    if (children.length > 1) children.slice(1).forEach(c => c.remove());
  }, 200);
}

/* ============================================================
   IMPROVED SCANNER — Optimized initialization & multi-format
   ============================================================ */
const Scanner = {
  reader: null,
  active: false,
  _currentContext: null,  // tracks what triggered the scan
  _onDecode: null,

  async start(videoEl, onDecode) {
    if (this.active) await this.stop();
    this._onDecode = onDecode;
    try {
      if (!window.ZXing) { toast('Scanning library not loaded', 'error'); return; }
      const ZXing = window.ZXing;
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.QR_CODE,
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.DATA_MATRIX,
      ]);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      this.reader = new ZXing.BrowserMultiFormatReader(hints, 500); // 500ms decode interval
      this.active = true;

      await this.reader.decodeFromVideoDevice(null, videoEl, (result, err) => {
        if (result && this._onDecode) {
          const text = result.getText();
          this._onDecode(text);
        }
      });
    } catch (err) {
      console.warn('Scanner error:', err);
      if (err.name === 'NotAllowedError') {
        toast('Camera permission denied. Use manual entry below.', 'error');
      } else {
        toast('Camera unavailable — use manual entry', 'warning');
      }
      this.active = false;
    }
  },

  async stop() {
    try {
      if (this.reader) { this.reader.reset(); this.reader = null; }
    } catch(e) {}
    this.active = false;
    this._onDecode = null;
  }
};

/* ============================================================
   SCANNER MODAL — Shared popup scanner
   ============================================================ */
let _scannerModalContext = null;
let _scannerModalCallback = null;

function openScannerModal(context, callback) {
  _scannerModalContext = context;
  _scannerModalCallback = callback;
  document.getElementById('scannerStatus').textContent = 'Initializing camera…';
  document.getElementById('manualScanInput').value = '';
  openModal('modalScanner');
  setTimeout(() => {
    const vid = document.getElementById('scannerVideo');
    Scanner.start(vid, (code) => {
      handleScanResult(code, context);
    }).then(() => {
      document.getElementById('scannerStatus').textContent = 'Scanning… point camera at barcode';
    });
  }, 300);
}

function closeScannerModal() {
  Scanner.stop();
  closeModal('modalScanner');
  _scannerModalContext = null;
  _scannerModalCallback = null;
}

function manualScanSubmit() {
  const val = document.getElementById('manualScanInput').value.trim();
  if (!val) { toast('Please enter a barcode or code', 'warning'); return; }
  handleScanResult(val, _scannerModalContext);
}

function handleScanResult(code, context) {
  Scanner.stop();
  closeModal('modalScanner');
  toast(`Scanned: ${code}`, 'success');

  if (_scannerModalCallback) { _scannerModalCallback(code); return; }

  switch(context) {
    case 'product-barcode':
    case 'client-barcode':
    case 'cashier-stock': {
      const field = document.getElementById('pBarcode');
      if (field) { field.value = code; }
      // Try autofill product name from existing inventory
      const found = Inventory.findByBarcode(code);
      if (found) {
        toast(`Found: ${found.name}`, 'info');
        if (document.getElementById('pName')) document.getElementById('pName').value = found.name;
      }
      break;
    }
    case 'cashier-item': {
      document.getElementById('manualBarcode').value = code;
      manualAddItem();
      break;
    }
    case 'cust-scan': {
      const found = Inventory.findByBarcode(code);
      if (found) { showProductDetail(found.id); }
      else toast('Product not found in inventory', 'warning');
      break;
    }
    default:
      if (typeof window[`on_scan_${context}`] === 'function') window[`on_scan_${context}`](code);
  }
}

/* ============================================================
   CUSTOMER ACCESS TOKENS
   ============================================================ */
function getCustomerAccessTokens()    { return Store.get('cust_access_tokens') || []; }
function saveCustomerAccessTokens(l)  { Store.set('cust_access_tokens', l); }

function createCustomerAccessToken(minutes=10) {
  const token = uid();
  const expires = Date.now() + Math.max(1, parseInt(minutes,10)) * 60000;
  const list = getCustomerAccessTokens();
  const item = { token, created: Date.now(), expires, used: false };
  list.push(item);
  saveCustomerAccessTokens(list);
  logActivity('Customer access QR generated', 'access');
  return item;
}
function revokeCustomerAccessToken(token) {
  saveCustomerAccessTokens(getCustomerAccessTokens().filter(t=>t.token!==token));
}
function validateAndConsumeCustomerAccessToken(token) {
  if (!token) return false;
  const list = getCustomerAccessTokens();
  const idx  = list.findIndex(t=>t.token===token);
  if (idx===-1) return false;
  if (list[idx].used || Date.now() > list[idx].expires) { list.splice(idx,1); saveCustomerAccessTokens(list); return false; }
  list.splice(idx,1);
  saveCustomerAccessTokens(list);
  return true;
}

/* ============================================================
   UTILITIES
   ============================================================ */
function debounce(fn, ms=300) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function uid()     { return Math.random().toString(36).slice(2,9).toUpperCase(); }
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH',{month:'short',day:'numeric'});
}

/* ============================================================
   THEME
   ============================================================ */
function setTheme(t) {
  try { localStorage.setItem('sc_theme', t); } catch(e){}
  document.documentElement.classList.toggle('light-theme', t==='light');
  const icon = t==='light' ? '🌙' : '☀️';
  document.querySelectorAll('#themeToggleAdmin, #themeToggleCust, [onclick*="toggleTheme"]').forEach(b=>{if(b.tagName==='BUTTON')b.textContent=icon;});
}
function toggleTheme() {
  const cur = localStorage.getItem('sc_theme')||'dark';
  setTheme(cur==='dark'?'light':'dark');
  toast(`${cur==='dark'?'Light':'Dark'} mode`, 'info');
}
function initTheme() { setTheme(localStorage.getItem('sc_theme')||'dark'); }
window.addEventListener('DOMContentLoaded', initTheme);

/* ============================================================
   SIDEBAR TOGGLE
   ============================================================ */
function toggleSidebar(id) {
  const sb = document.getElementById(id);
  const main = sb?.nextElementSibling;
  if (!sb) return;
  sb.classList.toggle('collapsed');
  if (main) main.classList.toggle('expanded');
}
