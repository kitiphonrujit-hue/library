const LOAN_DAYS = 7;
const FINE_PER_DAY = 5;

// ===== หมวดหมู่ =====
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

// ===== เพิ่มหนังสือตรงนี้ =====
const BOOKS = [
  { id: 1, title: 'คู่มือเปิดร้านค้าออนไลน์', author: 'ตัวอย่าง ผู้แต่ง',
    cat: 'ecom', sub: 'platform' },
  { id: 2, title: 'การตลาดบน Facebook และ TikTok', author: 'ตัวอย่าง ผู้แต่ง',
    cat: 'mkt', sub: 'social' },
  { id: 3, title: 'ออกแบบโลโก้ด้วย Illustrator', author: 'ตัวอย่าง ผู้แต่ง',
    cat: 'graphic', sub: 'design' },
  { id: 4, title: 'Excel สำหรับงานสำนักงาน', author: 'ตัวอย่าง ผู้แต่ง',
    cat: 'office', sub: 'excel' },
  { id: 5, title: 'ใช้ AI ทำงานอย่างมืออาชีพ', author: 'ตัวอย่าง ผู้แต่ง',
    cat: 'ai', sub: 'aitool' },
];
// ==============================

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; }
  catch (e) { return def; }
}

let loans = load('loans', []);
let users = load('users', []);
let currentUser = localStorage.getItem('currentUser'); // username ที่ล็อกอินอยู่
let selCat = 'all';
let selSub = 'all';
let authMode = 'login';

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="70">' +
  '<rect width="50" height="70" fill="#8e2f2f"/>' +
  '<rect x="4" y="4" width="42" height="62" fill="none" stroke="#c9a24a" stroke-width="2"/>' +
  '<text x="25" y="42" font-size="24" text-anchor="middle">📖</text></svg>');

function save() {
  localStorage.setItem('loans', JSON.stringify(loans));
  localStorage.setItem('users', JSON.stringify(users));
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ===== ระบบสมาชิก =====
// หมายเหตุ: เป็นระบบจำลองเก็บในเบราว์เซอร์ ยังไม่ปลอดภัยจริง
function hash(s) {
  let h = 5381;
  for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return String(h);
}

function getUser() {
  return users.find(u => u.username === currentUser) || null;
}

function openAuth(mode) {
  authMode = mode;
  document.getElementById('aName').value = '';
  document.getElementById('aUser').value = '';
  document.getElementById('aPass').value = '';
  updateAuthModal();
  document.getElementById('authModal').classList.add('show');
}

function closeAuth() {
  document.getElementById('authModal').classList.remove('show');
}

function toggleAuth() {
  authMode = authMode === 'login' ? 'register' : 'login';
  updateAuthModal();
}

function updateAuthModal() {
  const reg = authMode === 'register';
  document.getElementById('authTitle').textContent = reg ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  document.getElementById('aName').style.display = reg ? 'block' : 'none';
  document.getElementById('authSubmit').textContent = reg ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
  document.getElementById('authSwitch').textContent =
    reg ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก';
}

function submitAuth() {
  const name = document.getElementById('aName').value.trim();
  const username = document.getElementById('aUser').value.trim().toLowerCase();
  const pass = document.getElementById('aPass').value;

  if (authMode === 'register') {
    if (!name) return alert('กรุณาใส่ชื่อ-นามสกุล');
    if (username.length < 3) return alert('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
    if (pass.length < 4) return alert('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
    if (users.some(u => u.username === username)) return alert('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
    users.push({ username, name, pass: hash(pass) });
  } else {
    const u = users.find(u => u.username === username && u.pass === hash(pass));
    if (!u) return alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  currentUser = username;
  localStorage.setItem('currentUser', currentUser);
  save();
  closeAuth();
  render();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  render();
}

function renderAuth() {
  const u = getUser();
  document.getElementById('authArea').innerHTML = u
    ? `<span class="hello">👤 ${esc(u.name)}</span>
       <button class="outline" onclick="logout()">ออกจากระบบ</button>`
    : `<button class="outline" onclick="openAuth('login')">เข้าสู่ระบบ</button>
       <button onclick="openAuth('register')">สมัครสมาชิก</button>`;
}

// ===== ยืม-คืน =====
function loanOf(id) {
  return loans.find(l => l.bookId === id && !l.returned);
}

function borrowBook(id) {
  const u = getUser();
  if (!u) { alert('กรุณาเข้าสู่ระบบก่อนยืมหนังสือ'); return openAuth('login'); }
  if (loanOf(id)) return alert('หนังสือไม่ว่าง');
  const due = new Date();
  due.setDate(due.getDate() + LOAN_DAYS);
  loans.push({ bookId: id, username: u.username, member: u.name,
               due: due.toISOString(), returned: false });
  save();
  render();
}

function returnBook(id) {
  const u = getUser();
  const loan = loanOf(id);
  if (!loan) return;
  if (!u || loan.username !== u.username) return alert('คืนได้เฉพาะหนังสือที่คุณยืมเท่านั้น');
  loan.returned = true;
  const lateDays = Math.floor((new Date() - new Date(loan.due)) / 86400000);
  if (lateDays > 0) alert('คืนเกินกำหนด ' + lateDays + ' วัน ค่าปรับ ' + lateDays * FINE_PER_DAY + ' บาท');
  else alert('คืนสำเร็จ');
  save();
  render();
}

// ===== หมวดหมู่ =====
function setCat(c) {
  selCat = (selCat === c) ? 'all' : c;
  selSub = 'all';
  render();
}

function setSub(s) {
  selSub = s;
  render();
}

function renderCategories() {
  let tabs = `<button class="tab ${selCat === 'all' ? 'active' : ''}" onclick="setCat('all')">📚 ทั้งหมด</button>`;
  let i = 0;
  for (const key in CATEGORIES) {
    i++;
    const c = CATEGORIES[key];
    tabs += `<button class="tab ${selCat === key ? 'active' : ''}" onclick="setCat('${key}')">${i}. ${c.icon} ${c.name}</button>`;
  }
  document.getElementById('catTabs').innerHTML = tabs;

  let sub = '';
  if (selCat !== 'all') {
    const idx = Object.keys(CATEGORIES).indexOf(selCat) + 1;
    sub = '<div class="sub-list">';
    sub += `<button class="sub-item ${selSub === 'all' ? 'active' : ''}" onclick="setSub('all')">ทุกหัวข้อ</button>`;
    let j = 0;
    for (const k in CATEGORIES[selCat].subs) {
      j++;
      sub += `<button class="sub-item ${selSub === k ? 'active' : ''}" onclick="setSub('${k}')">${idx}.${j} ${CATEGORIES[selCat].subs[k]}</button>`;
    }
    sub += '</div>';
  }
  document.getElementById('subPanel').innerHTML = sub;
}

function catLabel(b) {
  const c = CATEGORIES[b.cat];
  if (!c) return '-';
  const s = c.subs[b.sub];
  return `<span class="tag">${c.icon} ${esc(c.name)}</span>` + (s ? `<br><small>• ${esc(s)}</small>` : '');
}

// ===== แสดงผล =====
function render() {
  renderAuth();
  renderCategories();
  const q = document.getElementById('search').value.toLowerCase();

  const bookRows = BOOKS
    .filter(b => selCat === 'all' || b.cat === selCat)
    .filter(b => selSub === 'all' || b.sub === selSub)
    .filter(b => b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q))
    .map(b => {
      const loan = loanOf(b.id);
      let btn;
      if (!loan) btn = `<button onclick="borrowBook(${b.id})">ยืม</button>`;
      else if (loan.username === currentUser) btn = `<button onclick="returnBook(${b.id})">คืน</button>`;
      else btn = '<small>มีผู้ยืมอยู่</small>';
      return `
      <tr>
        <td><img class="cover" src="${b.cover || PLACEHOLDER}" alt=""
             onerror="this.onerror=null;this.src=PLACEHOLDER"></td>
        <td><strong>${esc(b.title)}</strong><br><small>${esc(b.author)}</small></td>
        <td>${catLabel(b)}</td>
        <td class="${loan ? 'late' : 'ok'}">${loan ? 'ถูกยืม' : 'ว่าง'}</td>
        <td>${btn}</td>
      </tr>`;
    }).join('');
  document.getElementById('bookTable').innerHTML =
    bookRows || '<tr><td colspan="5">ไม่มีหนังสือในหมวดนี้</td></tr>';

  const now = new Date();
  const loanRows = loans
    .filter(l => !l.returned)
    .map(l => {
      const book = BOOKS.find(b => b.id === l.bookId);
      const due = new Date(l.due);
      const late = now > due;
      const mine = l.username === currentUser ? ' (คุณ)' : '';
      return `
        <tr>
          <td>${book ? esc(book.title) : '-'}</td>
          <td>${esc(l.member)}${mine}</td>
          <td>${due.toLocaleDateString('th-TH')}</td>
          <td class="${late ? 'late' : 'ok'}">${late ? 'เกินกำหนด' : 'ปกติ'}</td>
        </tr>`;
    }).join('');
  document.getElementById('loanTable').innerHTML =
    loanRows || '<tr><td colspan="4">ไม่มีรายการยืม</td></tr>';
}

render();