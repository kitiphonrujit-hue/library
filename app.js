// ===== ตั้งค่า =====
const API_URL = 'https://script.google.com/macros/s/AKfycbzbAA08Nc0ncrjWScDmjkjQgPJdYZt7lUzzCJklKPm5tNc7RcsE1XinTvDONCDLN_TP/exec';
const LOAN_DAYS = 7; // ใช้แสดงข้อความเท่านั้น (ค่าจริงตั้งใน Apps Script)

const CATEGORIES = {
  ecom: { name: 'ธุรกิจอิเล็กทรอนิกส์ (E-Commerce)', icon: '🛒',
    subs: { platform: 'แพลตฟอร์มร้านค้าออนไลน์', payment: 'ระบบชำระเงินออนไลน์', logistics: 'โลจิสติกส์และการขนส่ง' } },
  mkt: { name: 'การตลาดดิจิทัล (Digital Marketing)', icon: '📣',
    subs: { social: 'การตลาดโซเชียลมีเดีย', seo: 'SEO และการโฆษณาออนไลน์', content: 'คอนเทนต์มาร์เก็ตติ้ง' } },
  graphic: { name: 'การออกแบบกราฟิกและสื่อดิจิทัล', icon: '🎨',
    subs: { design: 'การออกแบบกราฟิก', video: 'ตัดต่อวิดีโอและเสียง', ui: 'UI/UX และเว็บดีไซน์' } },
  office: { name: 'โปรแกรมสำนักงาน (Office Applications)', icon: '🗃️',
    subs: { word: 'Word และงานเอกสาร', excel: 'Excel และการวิเคราะห์ข้อมูล', ppt: 'PowerPoint และงานนำเสนอ' } },
  ai: { name: 'เทคโนโลยีดิจิทัลและ AI', icon: '🤖',
    subs: { aitool: 'เครื่องมือ AI และ Generative AI', security: 'ความปลอดภัยไซเบอร์', data: 'ข้อมูลและคลาวด์' } },
};

// ===== สถานะ =====
let books = [], loans = [], users = [];
let me = null;
let finePerDay = 5;
let session = loadJSON('session', null);
let view = 'main';          // main | profile | admin
let adminTab = 'loans';     // loans | books | users
let showReturned = false;
let selCat = 'all', selSub = 'all';
let authMode = 'login';
let menuOpen = false, activeItem = 0;

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="70">' +
  '<rect width="50" height="70" fill="#8e2f2f"/>' +
  '<rect x="4" y="4" width="42" height="62" fill="none" stroke="#c9a24a" stroke-width="2"/>' +
  '<text x="25" y="42" font-size="24" text-anchor="middle">📖</text></svg>');

// ===== เครื่องมือ =====
function loadJSON(k, def) {
  try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; }
}
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function hash(s) {
  let h = 5381;
  for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return String(h);
}
function $(id) { return document.getElementById(id); }
function fmt(d) { return d ? new Date(d).toLocaleDateString('th-TH') : '-'; }
function bookOf(id) { return books.find(b => String(b.id) === String(id)); }
function isOpen(l) { return !l.returnDate; }
function isLate(l) { return isOpen(l) && new Date() > new Date(l.due); }
function isAdmin() { return me && me.role === 'admin'; }
function initial(name) { return (String(name).match(/[ก-ฮA-Za-z0-9]/) || ['👤'])[0].toUpperCase(); }
function scrollToId(id) { const el = $(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
function setBusy(on) { $('busy').classList.toggle('show', on); }
function daysLate(l) {
  const end = l.returnDate ? new Date(l.returnDate) : new Date();
  return Math.max(0, Math.floor((end - new Date(l.due)) / 86400000));
}

async function api(action, data) {
  const body = Object.assign({ action }, session || {}, data || {});
  const r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j;
}

async function act(fn, onOk) {
  setBusy(true);
  try {
    const r = await fn();
    if (onOk) onOk(r);
    await refresh();
  } catch (e) {
    alert(e.message === 'Failed to fetch' ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง' : e.message);
  } finally {
    setBusy(false);
  }
}

async function refresh() {
  const r = await api('list');
  books = r.books || [];
  loans = r.loans || [];
  users = r.users || [];
  me = r.user || null;
  finePerDay = r.finePerDay || 5;
  if (session && !me) { session = null; localStorage.removeItem('session'); }
  if (view === 'admin' && !isAdmin()) view = 'main';
  if (view === 'profile' && !me) view = 'main';
  renderAll();
}

// ===== ล็อกอิน =====
function openAuth(mode) {
  closeMega();
  authMode = mode;
  ['aName', 'aUser', 'aPass'].forEach(i => $(i).value = '');
  updateAuthModal();
  $('authModal').classList.add('show');
}
function closeAuth() { $('authModal').classList.remove('show'); }
function toggleAuth() { authMode = authMode === 'login' ? 'register' : 'login'; updateAuthModal(); }
function updateAuthModal() {
  const reg = authMode === 'register';
  $('authTitle').textContent = reg ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  $('aName').style.display = reg ? 'block' : 'none';
  $('authSubmit').textContent = reg ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  $('authSwitch').textContent = reg ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก';
}

async function submitAuth() {
  const name = $('aName').value.trim();
  const username = $('aUser').value.trim().toLowerCase();
  const pass = $('aPass').value;
  const reg = authMode === 'register';
  if (reg) {
    if (!name) return alert('กรุณาใส่ชื่อ-นามสกุล');
    if (username.length < 3) return alert('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
    if (pass.length < 4) return alert('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
  } else if (!username || !pass) {
    return alert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  }
  const passHash = hash(pass);
  setBusy(true);
  try {
    const r = await api(reg ? 'register' : 'login', { name, username, passHash });
    session = { username: r.user.username, passHash };
    localStorage.setItem('session', JSON.stringify(session));
    closeAuth();
    await refresh();
  } catch (e) {
    alert(e.message);
  } finally {
    setBusy(false);
  }
}

function logout() {
  session = null; me = null; view = 'main';
  localStorage.removeItem('session');
  renderAll();
  refresh().catch(() => {});
  window.scrollTo({ top: 0 });
}

// ===== ยืม-คืน =====
function borrowBook(id) {
  if (!me) { alert('กรุณาเข้าสู่ระบบก่อนยืมหนังสือ'); return openAuth('login'); }
  act(() => api('borrow', { bookId: id }),
      () => alert('ยืมสำเร็จ กำหนดคืนภายใน ' + LOAN_DAYS + ' วัน'));
}
function returnBook(loanId) {
  act(() => api('return', { loanId }), r => {
    if (r.lateDays > 0) alert('คืนเกินกำหนด ' + r.lateDays + ' วัน ค่าปรับ ' + r.fine + ' บาท');
    else alert('คืนสำเร็จ');
  });
}

// ===== เมนู (แท็บซ้าย) =====
function buildMenu() {
  const items = [{ name: '🏠 หน้าหลัก', go: 'home' }];

  items.push({ label: 'หมวดหมู่หนังสือ' });
  Object.keys(CATEGORIES).forEach((k, i) => {
    const c = CATEGORIES[k];
    const kids = [{ name: 'ทุกหัวข้อ', cat: k, sub: 'all' }];
    Object.keys(c.subs).forEach((s, j) => {
      kids.push({ name: (i + 1) + '.' + (j + 1) + ' ' + c.subs[s], cat: k, sub: s });
    });
    items.push({ name: (i + 1) + '. ' + c.icon + ' ' + c.name, children: kids, cat: k });
  });

  items.push({ label: 'บริการ' });
  items.push({ name: '🧾 ยืม-คืนหนังสือ', children: [
    { name: 'ดูหนังสือทั้งหมด', go: 'books' },
    { name: 'รายการยืมของฉัน (โปรไฟล์)', go: 'profile' } ] });
  items.push({ name: '📋 กติกาการยืม', children: [
    { name: 'ระยะเวลายืม ' + LOAN_DAYS + ' วัน' },
    { name: 'มีค่าปรับเมื่อคืนเกินกำหนด' },
    { name: 'ต้องเข้าสู่ระบบก่อนยืม' } ] });

  items.push({ label: 'เกี่ยวกับห้องสมุด' });
  items.push({ name: '🕘 เวลาทำการ', children: [
    { name: 'จันทร์ - ศุกร์ 08:30 - 16:30 น.' },
    { name: 'เสาร์ - อาทิตย์ ปิดทำการ' } ] });
  items.push({ name: '📞 ติดต่อเรา', children: [
    { name: 'โทร 0X-XXXX-XXXX' },
    { name: 'อีเมล library@example.com' } ] });

  if (isAdmin()) {
    items.push({ label: 'ผู้ดูแลระบบ' });
    items.push({ name: '⚙️ จัดการระบบ', go: 'admin' });
  }
  return items;
}

function toggleMenu() {
  if (menuOpen) return closeMega();
  menuOpen = true;
  const items = buildMenu();
  let idx = items.findIndex(it => it.children);
  if (selCat !== 'all') {
    const f = items.findIndex(it => it.cat === selCat);
    if (f >= 0) idx = f;
  }
  activeItem = idx;
  renderMenuBtn(); renderMega();
}
function closeMega() { menuOpen = false; renderMenuBtn(); renderMega(); }
function setItem(i) { if (i !== activeItem) { activeItem = i; renderMega(); } }

function pickChild(j) {
  const c = buildMenu()[activeItem].children[j];
  closeMega();
  if (c.cat !== undefined) {
    selCat = c.cat; selSub = c.sub; $('search').value = '';
    setView('main'); scrollToId('bookSection');
  } else if (c.go) {
    gotoView(c.go);
  }
}
function menuGo(g) { closeMega(); gotoView(g); }

function gotoView(g) {
  if (g === 'home') goHome();
  else if (g === 'books') { selCat = 'all'; selSub = 'all'; setView('main'); scrollToId('bookSection'); }
  else if (g === 'profile') goProfile();
  else if (g === 'admin') goAdmin();
}
function goHome() {
  closeMega();
  selCat = 'all'; selSub = 'all'; $('search').value = '';
  setView('main');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function goProfile() {
  if (!me) { alert('กรุณาเข้าสู่ระบบก่อน'); return openAuth('login'); }
  closeMega(); setView('profile'); window.scrollTo({ top: 0 });
}
function goAdmin() {
  if (!isAdmin()) return;
  closeMega(); setView('admin'); window.scrollTo({ top: 0 });
}
function setView(v) { view = v; renderAll(); }

function openBook(id) {
  const b = bookOf(id);
  closeMega();
  selCat = 'all'; selSub = 'all';
  $('search').value = b ? b.title : '';
  setView('main'); scrollToId('bookSection');
}
function clearFilter() { selCat = 'all'; selSub = 'all'; renderMain(); }

function renderMenuBtn() {
  const b = $('menuBtn');
  b.textContent = menuOpen ? '✕ ปิด' : '☰ เมนู';
  b.classList.toggle('open', menuOpen);
  $('topbar').classList.toggle('open', menuOpen);
}

function renderMega() {
  const box = $('mega'), bg = $('megaBg');
  if (!menuOpen) { box.classList.remove('show'); bg.classList.remove('show'); return; }
  const items = buildMenu();
  const cur = items[activeItem];

  const left = items.map((it, i) => {
    if (it.label) return `<div class="m-label">${esc(it.label)}</div>`;
    if (it.children) {
      return `<button class="m-item ${i === activeItem ? 'active' : ''}" onclick="setItem(${i})" onmouseenter="setItem(${i})">
        <span>${esc(it.name)}</span><span>›</span></button>`;
    }
    return `<button class="m-item" onclick="menuGo('${it.go}')"><span>${esc(it.name)}</span></button>`;
  }).join('');

  const mid = ((cur && cur.children) || []).map((c, j) => {
    if (c.cat === undefined && !c.go) return `<div class="m-text">${esc(c.name)}</div>`;
    const on = c.cat !== undefined && c.cat === selCat && c.sub === selSub;
    return `<button class="m-child ${on ? 'active' : ''}" onclick="pickChild(${j})">${esc(c.name)}</button>`;
  }).join('');

  const feat = books.slice(-3).reverse();
  const right = '<h3>📖 หนังสือมาใหม่</h3>' + (feat.length ? feat.map(b =>
    `<button class="m-book" onclick="openBook(${Number(b.id)})">
       <img class="cover" src="${esc(b.cover) || PLACEHOLDER}" alt="" onerror="this.onerror=null;this.src=PLACEHOLDER">
       <span><strong>${esc(b.title)}</strong><br><small>${esc(b.author)}</small></span>
     </button>`).join('') : '<small>ยังไม่มีหนังสือ</small>');

  box.innerHTML = `<div class="mega-inner">
    <div class="mega-left">${left}</div>
    <div class="mega-mid">${mid}</div>
    <div class="mega-right">${right}</div></div>`;
  box.classList.add('show'); bg.classList.add('show');
}

// ===== แสดงผล =====
function renderAuth() {
  $('authArea').innerHTML = me
    ? `<button class="profile-btn" onclick="goProfile()">
         <span class="avatar-sm">${esc(initial(me.name))}</span>
         <span class="pname">${esc(me.name)}</span></button>`
    : `<button class="outline" onclick="openAuth('login')">เข้าสู่ระบบ</button>
       <button onclick="openAuth('register')">สมัครสมาชิก</button>`;
}

function catLabel(b) {
  const c = CATEGORIES[b.cat];
  if (!c) return '-';
  const s = c.subs[b.sub];
  return `<span class="tag">${c.icon} ${esc(c.name)}</span>` + (s ? `<br><small>• ${esc(s)}</small>` : '');
}

function renderAll() {
  renderAuth();
  renderMenuBtn();
  renderMega();
  $('mainView').style.display = view === 'main' ? 'block' : 'none';
  $('profileView').style.display = view === 'profile' ? 'block' : 'none';
  $('adminView').style.display = view === 'admin' ? 'block' : 'none';
  if (view === 'admin') renderAdmin();
  else if (view === 'profile') renderProfile();
  else renderMain();
}

// ----- หน้าหลัก: รายการหนังสือ -----
function renderMain() {
  let info = '';
  if (selCat !== 'all') {
    const c = CATEGORIES[selCat];
    const s = selSub !== 'all' ? ' › ' + c.subs[selSub] : '';
    info = `<div class="filter"><span>กำลังแสดง: ${c.icon} ${esc(c.name)}${esc(s)}</span>
            <button class="danger small" onclick="clearFilter()">ล้างตัวกรอง ✕</button></div>`;
  }
  $('filterInfo').innerHTML = info;

  const q = $('search').value.toLowerCase();
  const myOpen = me ? loans.filter(l => isOpen(l) && l.username === me.username) : [];

  const rows = books
    .filter(b => selCat === 'all' || b.cat === selCat)
    .filter(b => selSub === 'all' || b.sub === selSub)
    .filter(b => String(b.title).toLowerCase().includes(q) || String(b.author || '').toLowerCase().includes(q))
    .map(b => {
      const mine = myOpen.find(l => String(l.bookId) === String(b.id));
      let btn;
      if (mine) btn = `<button class="green" onclick="returnBook('${esc(mine.id)}')">คืน</button>`;
      else if (b.available > 0) btn = `<button onclick="borrowBook(${Number(b.id)})">ยืม</button>`;
      else btn = '<small>ถูกยืมหมด</small>';
      return `<tr>
        <td><img class="cover" src="${esc(b.cover) || PLACEHOLDER}" alt="" onerror="this.onerror=null;this.src=PLACEHOLDER"></td>
        <td><strong>${esc(b.title)}</strong><br><small>${esc(b.author)}</small></td>
        <td>${catLabel(b)}</td>
        <td class="${b.available > 0 ? 'ok' : 'late'}">${b.available}/${b.qty} เล่ม</td>
        <td>${btn}</td></tr>`;
    }).join('');
  $('bookTable').innerHTML = rows || '<tr><td colspan="5" class="empty">ไม่มีหนังสือในหมวดนี้</td></tr>';
}

// ----- หน้าโปรไฟล์ -----
function renderProfile() {
  if (!me) return;
  const mine = loans.filter(l => l.username === me.username);
  const open = mine.filter(isOpen);
  const done = mine.filter(l => !isOpen(l))
    .sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));
  const owed = open.reduce((s, l) => s + daysLate(l) * finePerDay, 0);

  $('profileInfo').innerHTML =
    `<div class="profile-head">
       <div class="avatar">${esc(initial(me.name))}</div>
       <div><strong style="font-size:1.2rem">${esc(me.name)}</strong>
         ${isAdmin() ? '<span class="badge-admin">แอดมิน</span>' : ''}<br>
         <small>@${esc(me.username)} · ${isAdmin() ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</small></div>
       <div class="profile-actions">
         ${isAdmin() ? '<button class="green small" onclick="goAdmin()">⚙️ จัดการระบบ</button>' : ''}
         <button class="danger small" onclick="logout()">ออกจากระบบ</button>
       </div>
     </div>
     <div class="stats">
       <div class="stat"><b>${open.length}</b><span>กำลังยืม</span></div>
       <div class="stat ${open.filter(isLate).length ? 'warn' : ''}"><b>${open.filter(isLate).length}</b><span>เกินกำหนด</span></div>
       <div class="stat"><b>${done.length}</b><span>คืนแล้ว</span></div>
       <div class="stat ${owed ? 'warn' : ''}"><b>${owed}</b><span>ค่าปรับที่ค้าง (บาท)</span></div>
     </div>`;

  $('profileLoans').innerHTML = open.map(l => {
    const b = bookOf(l.bookId);
    const left = Math.ceil((new Date(l.due) - new Date()) / 86400000);
    const st = isLate(l)
      ? `<span class="late">เกินกำหนด ${daysLate(l)} วัน</span>`
      : `<span class="ok">เหลืออีก ${left} วัน</span>`;
    return `<tr><td>${b ? esc(b.title) : '-'}</td>
      <td>${fmt(l.borrowDate)}</td><td>${fmt(l.due)}</td><td>${st}</td>
      <td><button class="green small" onclick="returnBook('${esc(l.id)}')">คืน</button></td></tr>`;
  }).join('') || '<tr><td colspan="5" class="empty">คุณไม่มีหนังสือที่ยืมอยู่</td></tr>';

  $('profileHistory').innerHTML = done.map(l => {
    const b = bookOf(l.bookId);
    const f = daysLate(l) * finePerDay;
    return `<tr><td>${b ? esc(b.title) : '-'}</td>
      <td>${fmt(l.borrowDate)}</td><td>${fmt(l.returnDate)}</td>
      <td class="${f ? 'late' : 'ok'}">${f ? f + ' บาท' : 'ไม่มี'}</td></tr>`;
  }).join('') || '<tr><td colspan="4" class="empty">ยังไม่มีประวัติการยืม</td></tr>';
}

// ----- หน้าแอดมิน -----
function setAdminTab(t) { adminTab = t; renderAdmin(); }
function toggleReturned() { showReturned = !showReturned; renderAdmin(); }

function renderAdmin() {
  if (!isAdmin()) return;
  const open = loans.filter(isOpen);
  const total = books.reduce((s, b) => s + (Number(b.qty) || 0), 0);
  $('stats').innerHTML =
    `<div class="stat"><b>${books.length}</b><span>ชื่อเรื่อง</span></div>
     <div class="stat"><b>${total}</b><span>เล่มทั้งหมด</span></div>
     <div class="stat"><b>${open.length}</b><span>กำลังถูกยืม</span></div>
     <div class="stat ${open.filter(isLate).length ? 'warn' : ''}"><b>${open.filter(isLate).length}</b><span>เกินกำหนด</span></div>`;

  const tabs = [['loans', '🕮 รายการยืม'], ['books', '📚 จัดการหนังสือ'], ['users', '👥 สมาชิก']];
  $('adminTabs').innerHTML = tabs.map(t =>
    `<button class="${adminTab === t[0] ? 'active' : ''}" onclick="setAdminTab('${t[0]}')">${t[1]}</button>`).join('');

  let h = '';
  if (adminTab === 'loans') {
    const list = loans.slice().filter(l => showReturned || isOpen(l))
      .sort((a, b) => (isOpen(b) - isOpen(a)) || (new Date(a.due) - new Date(b.due)));
    h = `<div class="toolbar"><label><input type="checkbox" style="width:auto" ${showReturned ? 'checked' : ''} onchange="toggleReturned()"> แสดงรายการที่คืนแล้วด้วย</label></div>
      <div class="scroll"><table>
      <thead><tr><th>หนังสือ</th><th>ผู้ยืม</th><th>วันที่ยืม</th><th>กำหนดคืน</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>` +
      (list.map(l => {
        const b = bookOf(l.bookId);
        const st = !isOpen(l) ? `<span class="ok">คืนแล้ว ${fmt(l.returnDate)}</span>`
          : isLate(l) ? '<span class="late">เกินกำหนด</span>' : '<span class="ok">ปกติ</span>';
        return `<tr><td>${b ? esc(b.title) : '-'}</td>
          <td>${esc(l.member)}<br><small>@${esc(l.username)}</small></td>
          <td>${fmt(l.borrowDate)}</td><td>${fmt(l.due)}</td><td>${st}</td>
          <td>${isOpen(l) ? `<button class="green small" onclick="returnBook('${esc(l.id)}')">รับคืน</button>` : ''}</td></tr>`;
      }).join('') || '<tr><td colspan="6" class="empty">ไม่มีรายการ</td></tr>') +
      '</tbody></table></div>';
  } else if (adminTab === 'books') {
    h = `<div class="toolbar"><button onclick="openBookForm()">➕ เพิ่มหนังสือ</button></div>
      <div class="scroll"><table>
      <thead><tr><th>ปก</th><th>ชื่อ / ผู้แต่ง</th><th>หมวดหมู่</th><th>คงเหลือ/ทั้งหมด</th><th>จัดการ</th></tr></thead><tbody>` +
      (books.map(b => `<tr>
        <td><img class="cover" src="${esc(b.cover) || PLACEHOLDER}" alt="" onerror="this.onerror=null;this.src=PLACEHOLDER"></td>
        <td><strong>${esc(b.title)}</strong><br><small>${esc(b.author)}</small></td>
        <td>${catLabel(b)}</td>
        <td>${b.available}/${b.qty}</td>
        <td><button class="small" onclick="openBookForm(${Number(b.id)})">แก้ไข</button>
            <button class="danger small" onclick="deleteBook(${Number(b.id)})">ลบ</button></td></tr>`).join('')
        || '<tr><td colspan="5" class="empty">ยังไม่มีหนังสือ กด "เพิ่มหนังสือ"</td></tr>') +
      '</tbody></table></div>';
  } else {
    h = `<div class="scroll"><table>
      <thead><tr><th>ชื่อ</th><th>ชื่อผู้ใช้</th><th>สิทธิ์</th><th>จัดการ</th></tr></thead><tbody>` +
      users.map((u, i) => `<tr><td>${esc(u.name)}</td><td>@${esc(u.username)}</td>
        <td>${u.role === 'admin' ? '<span class="badge-admin">แอดมิน</span>' : 'สมาชิก'}</td>
        <td>${u.username === me.username ? '<small>(คุณ)</small>'
          : `<button class="small" onclick="toggleRole(${i})">${u.role === 'admin' ? 'ถอดสิทธิ์แอดมิน' : 'ตั้งเป็นแอดมิน'}</button>`}</td></tr>`).join('') +
      '</tbody></table></div>';
  }
  $('adminBody').innerHTML = h;
}

// ===== จัดการหนังสือ (แอดมิน) =====
function fillSubs(cat, selected) {
  const subs = (CATEGORIES[cat] || {}).subs || {};
  $('bSub').innerHTML = Object.keys(subs).map(k =>
    `<option value="${k}" ${k === selected ? 'selected' : ''}>${esc(subs[k])}</option>`).join('');
}
function openBookForm(id) {
  const b = id ? bookOf(id) : null;
  $('bookFormTitle').textContent = b ? 'แก้ไขหนังสือ' : 'เพิ่มหนังสือ';
  $('bCat').innerHTML = Object.keys(CATEGORIES).map(k =>
    `<option value="${k}" ${b && b.cat === k ? 'selected' : ''}>${esc(CATEGORIES[k].name)}</option>`).join('');
  $('bId').value = b ? b.id : '';
  $('bTitle').value = b ? b.title : '';
  $('bAuthor').value = b ? b.author : '';
  $('bCover').value = b ? b.cover : '';
  $('bQty').value = b ? b.qty : 1;
  fillSubs($('bCat').value, b ? b.sub : null);
  $('bookModal').classList.add('show');
}
function closeBookForm() { $('bookModal').classList.remove('show'); }
function saveBookForm() {
  const book = {
    id: $('bId').value, title: $('bTitle').value.trim(), author: $('bAuthor').value.trim(),
    cat: $('bCat').value, sub: $('bSub').value, cover: $('bCover').value.trim(),
    qty: Number($('bQty').value) || 0,
  };
  if (!book.title) return alert('กรุณาใส่ชื่อหนังสือ');
  closeBookForm();
  act(() => api('saveBook', { book }));
}
function deleteBook(id) {
  const b = bookOf(id);
  if (!confirm('ลบ "' + (b ? b.title : '') + '" ?')) return;
  act(() => api('deleteBook', { bookId: id }));
}
function toggleRole(i) {
  const u = users[i];
  const role = u.role === 'admin' ? 'member' : 'admin';
  if (!confirm((role === 'admin' ? 'ตั้ง ' : 'ถอดสิทธิ์แอดมินของ ') + u.name + '?')) return;
  act(() => api('setRole', { target: u.username, role }));
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeMega(); closeAuth(); closeBookForm(); }
});

// ===== เริ่มทำงาน =====
renderAll();
setBusy(true);
refresh()
  .catch(e => alert('โหลดข้อมูลไม่สำเร็จ: ' + e.message))
  .finally(() => setBusy(false));
