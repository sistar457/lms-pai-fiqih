// ============================================================
// LMS PAI & FIQIH — FRONTEND (Fase 1)
// Login, sesi, shell per peran, Pengaturan Lembaga (admin)
// ============================================================

// ⚠️ GANTI dengan URL Web App (/exec) hasil deploy Google Apps Script
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzruX6ZaF1GsRyI9ueJobow1krH1LiWmzZUTRd3VlogV7anPzP8IdAHhuts5hAwbQ86jQ/exec';

const LS = { token: 'lms_token', user: 'lms_user', cfg: 'lms_cfg' };
const DEFAULT_CFG = { nama_aplikasi: 'LMS PAI & Fiqih', nama_lembaga: 'SMP Islam Tarbiyatul Huda', tahun_ajaran: '', logo: '' };
const FALLBACK_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#087A55"/>' +
  '<path d="M16 22c5-2 11-2 16 2 5-4 11-4 16-2v22c-5-2-11-2-16 2-5-4-11-4-16-2z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M32 24v22" stroke="#D5AE55" stroke-width="3"/></svg>');

const ROLE_LABEL = { admin: 'Administrator', guru: 'Guru', siswa: 'Siswa' };
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  book: '<path d="M3 5.5C5 4.5 8 4.5 12 6.5c4-2 7-2 9-1v13c-2-1-5-1-9 1-4-2-7-2-9-1z"/><path d="M12 6.5v13"/>',
  task: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9l2 2 4-4M8 16h8"/>'
};
const NAV = {
  admin: [['beranda', 'Beranda', 'home'], ['akun', 'Akun', 'users'], ['kelas', 'Kelas', 'school'], ['akademik', 'Akademik', 'calendar'], ['log', 'Log', 'log'], ['pengaturan', 'Pengaturan', 'settings'], ['profil', 'Profil', 'user']],
  guru:  [['beranda', 'Beranda', 'home'], ['materi', 'Materi', 'book'], ['tugas', 'Tugas', 'task'], ['profil', 'Profil', 'user']],
  siswa: [['beranda', 'Beranda', 'home'], ['materi', 'Materi', 'book'], ['tugas', 'Tugas', 'task'], ['profil', 'Profil', 'user']]
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};

let cfg = Object.assign({}, DEFAULT_CFG, store.get(LS.cfg) || {});
let me = store.get(LS.user);

// ============================================================
// API
// ============================================================
async function api(action, data) {
  const token = (store.get(LS.token) || '');
  let res;
  try {
    const r = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // menghindari preflight CORS
      body: JSON.stringify({ action, token, data: data || {} })
    });
    res = await r.json();
  } catch (e) {
    return { success: false, message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
  }
  if (res.code === 'AUTH' && action !== 'login') { endSession(); showLogin('Sesi berakhir. Silakan masuk kembali.'); }
  return res;
}

async function fetchPublicConfig() {
  try {
    const r = await fetch(GAS_URL + '?action=getPublicConfig');
    const j = await r.json();
    if (j.success) { cfg = Object.assign({}, DEFAULT_CFG, j.data); store.set(LS.cfg, cfg); applyBranding(); }
  } catch (e) { /* tetap pakai konfigurasi tersimpan */ }
}

// ============================================================
// BRANDING (nama & logo dari pengaturan admin)
// ============================================================
function applyBranding() {
  const logo = cfg.logo || FALLBACK_LOGO;
  $$('[data-brand-logo]').forEach(el => { el.src = logo; });
  $$('[data-brand-app]').forEach(el => { el.textContent = cfg.nama_aplikasi; });
  $$('[data-brand-lembaga]').forEach(el => { el.textContent = cfg.nama_lembaga; });
  $$('[data-brand-lembaga-short]').forEach(el => { el.textContent = cfg.nama_lembaga.replace(/^SMP Islam\s+/i, ''); });
  $$('[data-brand-copy]').forEach(el => { el.textContent = '© ' + new Date().getFullYear() + ' ' + cfg.nama_lembaga + '. Hak Cipta Dilindungi.'; });
  const ta = $('#chip-ta');
  if (ta) { ta.hidden = !cfg.tahun_ajaran; ta.textContent = 'T.A ' + cfg.tahun_ajaran; }
  document.title = cfg.nama_aplikasi + ' — ' + cfg.nama_lembaga;
}

// ============================================================
// UI HELPERS
// ============================================================
let toastTimer;
function toast(msg, isError) {
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('error', !!isError); t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
function setBusy(btn, busy, label) {
  if (busy) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>' + (label || 'Memproses…'); }
  else { btn.disabled = false; btn.innerHTML = btn.dataset.label || btn.innerHTML; }
}
function svg(name) { return '<svg class="ic" viewBox="0 0 24 24">' + ICONS[name] + '</svg>'; }

// ============================================================
// LOGIN & SESI
// ============================================================
function showLogin(msg) {
  $('#view-shell').hidden = true; $('#view-login').hidden = false; $('#boot').hidden = true;
  const err = $('#login-error');
  err.hidden = !msg; err.textContent = msg || '';
  applyBranding();
}
function endSession() { store.del(LS.token); store.del(LS.user); me = null; }

function initLogin() {
  $('#pw-toggle').addEventListener('click', () => {
    const p = $('#in-pass'); p.type = p.type === 'password' ? 'text' : 'password';
  });
  $('#login-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = $('#login-btn'), err = $('#login-error');
    const username = $('#in-user').value.trim(), password = $('#in-pass').value;
    err.hidden = true;
    if (!username || !password) { err.textContent = 'Isi nama pengguna dan kata sandi.'; err.hidden = false; return; }
    setBusy(btn, true, 'Memeriksa…');
    const res = await api('login', { username, password });
    setBusy(btn, false);
    if (!res.success) { err.textContent = res.message; err.hidden = false; return; }
    store.set(LS.token, res.data.token); store.set(LS.user, res.data.user); me = res.data.user;
    $('#in-pass').value = '';
    startApp();
  });
}

// ============================================================
// SHELL & ROUTER
// ============================================================
function startApp() {
  $('#view-login').hidden = true; $('#view-shell').hidden = false; $('#boot').hidden = true;
  $('#who-name').textContent = me.nama;
  $('#who-role').textContent = ROLE_LABEL[me.role] || me.role;
  buildNav();
  applyBranding();
  if (!location.hash) location.hash = '#/beranda';
  route();
}

function buildNav() {
  const items = NAV[me.role] || NAV.siswa;
  const html = items.map(([id, label, ic]) =>
    '<a class="nav-item" href="#/' + id + '" data-route="' + id + '">' + svg(ic) + '<span>' + label + '</span></a>').join('');
  $('#side-nav').innerHTML = html;
  $('#bottom-nav').innerHTML = html;
}

function route() {
  if (!me) return;
  const parts = (location.hash.replace('#/', '') || 'beranda').split('?')[0].split('/');
  let id = parts[0] || 'beranda'; const param = parts[1] || '';
  if (me.must_change) id = 'profil';                                // wajib ganti sandi dulu
  const allowed = (NAV[me.role] || []).map(n => n[0]);
  if (allowed.indexOf(id) < 0) id = 'beranda';
  $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.route === id));
  const byRole = { admin: window.ADMIN_PAGES, guru: window.GURU_PAGES, siswa: window.SISWA_PAGES }[me.role] || {};
  const pages = Object.assign({ beranda: pageBeranda, pengaturan: pagePengaturan, profil: pageProfil }, byRole);
  pages[id](param);
  $('#content').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// ============================================================
// HALAMAN: BERANDA (placeholder Fase 1)
// ============================================================
function pageBeranda() {
  if (me.role === 'admin' && window.adminBeranda) return window.adminBeranda();
  if (me.role === 'guru' && window.guruBeranda) return window.guruBeranda();
  if (me.role === 'siswa' && window.siswaBeranda) return window.siswaBeranda();
  const first = esc(me.nama.split(' ')[0]);
  const note = {
    admin: 'Pengelolaan akun, tahun ajaran, dan kelas akan tersedia pada fase berikutnya. Saat ini Anda dapat mengatur nama lembaga dan logo di menu Pengaturan.',
    guru: 'Materi, tugas, dan ujian akan tersedia pada fase berikutnya.',
    siswa: 'Materi, tugas, dan ujian akan tersedia pada fase berikutnya.'
  }[me.role];
  $('#content').innerHTML =
    '<div class="stack"><div class="hero"><h1>Assalamu\'alaikum, ' + first + '!</h1><p>Selamat datang di ' + esc(cfg.nama_aplikasi) + '.</p></div>' +
    '<div class="card"><h2>Status aplikasi</h2><p class="hint">' + esc(note) + '</p></div></div>';
}

// ============================================================
// HALAMAN: PROFIL & GANTI KATA SANDI
// ============================================================
function pageProfil() {
  $('#content').innerHTML =
    '<div class="page-head"><h1>Profil</h1><p>' + esc(me.nama) + ' · ' + esc(ROLE_LABEL[me.role] || me.role) + '</p></div>' +
    '<div class="stack">' +
    (me.must_change ? '<div class="force-note">Demi keamanan, ganti kata sandi sementara Anda sebelum melanjutkan.</div>' : '') +
    '<form id="pw-form" class="card" novalidate><h2>Ganti kata sandi</h2><p class="hint">Gunakan minimal 8 karakter.</p>' +
    '<label class="field"><span class="field-label">Kata sandi lama</span><input id="pw-old" type="password" autocomplete="current-password" required></label>' +
    '<label class="field"><span class="field-label">Kata sandi baru</span><input id="pw-new" type="password" autocomplete="new-password" minlength="8" required></label>' +
    '<label class="field"><span class="field-label">Ulangi kata sandi baru</span><input id="pw-new2" type="password" autocomplete="new-password" required></label>' +
    '<p id="pw-err" class="form-error" hidden></p>' +
    '<button class="btn btn-primary" type="submit" id="pw-btn">Simpan kata sandi</button></form>' +
    '<div class="card"><h2>Keluar</h2><p class="hint">Akhiri sesi di perangkat ini.</p><button class="btn btn-danger" id="logout-btn">Keluar dari akun</button></div></div>';

  $('#pw-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const err = $('#pw-err'), btn = $('#pw-btn');
    const lama = $('#pw-old').value, baru = $('#pw-new').value, ulang = $('#pw-new2').value;
    err.hidden = true;
    if (baru.length < 8) { err.textContent = 'Kata sandi baru minimal 8 karakter.'; err.hidden = false; return; }
    if (baru !== ulang) { err.textContent = 'Konfirmasi kata sandi tidak sama.'; err.hidden = false; return; }
    setBusy(btn, true, 'Menyimpan…');
    const res = await api('changePassword', { lama, baru });
    setBusy(btn, false);
    if (!res.success) { err.textContent = res.message; err.hidden = false; return; }
    me.must_change = false; store.set(LS.user, me);
    toast('Kata sandi berhasil diubah.');
    location.hash = '#/beranda'; route();
  });
  $('#logout-btn').addEventListener('click', async () => {
    await api('logout');
    endSession(); location.hash = ''; showLogin();
  });
}

// ============================================================
// HALAMAN: PENGATURAN LEMBAGA (ADMIN) — nama & logo
// ============================================================
async function pagePengaturan() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Pengaturan Aplikasi</h1><p>Atur identitas lembaga yang tampil di halaman masuk dan header.</p></div><div class="empty"><span class="spinner"></span></div>';
  const res = await api('getSettings');
  if (!res.success) { c.innerHTML = '<div class="form-error">' + esc(res.message) + '</div>'; return; }
  const s = res.data;

  c.innerHTML =
    '<div class="page-head"><h1>Pengaturan Aplikasi</h1><p>Atur identitas lembaga yang tampil di halaman masuk dan header.</p></div>' +
    '<div class="grid-2">' +
    '<form id="set-form" class="card" novalidate><h2>Identitas lembaga</h2><p class="hint">Perubahan berlaku untuk semua pengguna.</p>' +
    '<label class="field"><span class="field-label">Nama lembaga</span><input id="set-lembaga" maxlength="80" value="' + esc(s.nama_lembaga) + '" required></label>' +
    '<label class="field"><span class="field-label">Nama aplikasi</span><input id="set-app" maxlength="60" value="' + esc(s.nama_aplikasi) + '" required></label>' +
    '<p id="set-err" class="form-error" hidden></p>' +
    '<button class="btn btn-primary" type="submit" id="set-btn">Simpan perubahan</button></form>' +

    '<div class="card"><h2>Logo lembaga</h2><p class="hint">Format PNG atau JPG. Gambar diperkecil otomatis (maks. 60 KB).</p>' +
    '<div class="logo-row"><div class="logo-prev"><img id="logo-prev" alt="Pratinjau logo" src="' + esc(s.logo || FALLBACK_LOGO) + '"></div>' +
    '<div class="row-actions"><button class="btn btn-secondary btn-sm" id="logo-pick" type="button">Pilih logo baru</button>' +
    '<button class="btn btn-danger btn-sm" id="logo-del" type="button"' + (s.logo ? '' : ' hidden') + '>Hapus logo</button></div></div>' +
    '<input type="file" id="logo-file" accept="image/png,image/jpeg" hidden>' +
    '<p id="logo-err" class="form-error" hidden></p></div></div>';

  $('#set-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const err = $('#set-err'), btn = $('#set-btn');
    err.hidden = true;
    setBusy(btn, true, 'Menyimpan…');
    const r = await api('saveSettings', { nama_lembaga: $('#set-lembaga').value, nama_aplikasi: $('#set-app').value });
    setBusy(btn, false);
    if (!r.success) { err.textContent = r.message; err.hidden = false; return; }
    cfg.nama_lembaga = $('#set-lembaga').value.trim(); cfg.nama_aplikasi = $('#set-app').value.trim();
    store.set(LS.cfg, cfg); applyBranding(); toast('Pengaturan disimpan.');
  });

  $('#logo-pick').addEventListener('click', () => $('#logo-file').click());
  $('#logo-file').addEventListener('change', async ev => {
    const file = ev.target.files[0]; ev.target.value = '';
    if (!file) return;
    const err = $('#logo-err'); err.hidden = true;
    try {
      const img = await prepareLogo(file);
      $('#logo-prev').src = img.dataUrl;
      const r = await api('uploadLogo', { mime: img.mime, base64: img.base64 });
      if (!r.success) throw new Error(r.message);
      cfg.logo = img.dataUrl; store.set(LS.cfg, cfg); applyBranding();
      $('#logo-del').hidden = false; toast('Logo diperbarui.');
    } catch (e) {
      err.textContent = e.message || 'Logo gagal diproses.'; err.hidden = false;
      $('#logo-prev').src = cfg.logo || FALLBACK_LOGO;
    }
  });
  $('#logo-del').addEventListener('click', async () => {
    if (!confirm('Hapus logo lembaga? Logo bawaan akan dipakai kembali.')) return;
    const r = await api('removeLogo');
    if (!r.success) { toast(r.message, true); return; }
    cfg.logo = ''; store.set(LS.cfg, cfg); applyBranding();
    $('#logo-prev').src = FALLBACK_LOGO; $('#logo-del').hidden = true; toast('Logo dihapus.');
  });
}

// Perkecil & kompres logo agar ≤ 55 KB (batas server 60 KB)
function prepareLogo(file) {
  return new Promise((resolve, reject) => {
    if (['image/png', 'image/jpeg'].indexOf(file.type) < 0) return reject(new Error('Logo harus berformat PNG atau JPG.'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Berkas terlalu besar. Pilih gambar di bawah 8 MB.'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat dibaca.')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const LIMIT = 55 * 1024;
      for (const size of [256, 192, 128]) {
        const r = Math.min(1, size / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * r)), h = Math.max(1, Math.round(img.height * r));
        for (const [mime, q] of [['image/png'], ['image/jpeg', 0.9], ['image/jpeg', 0.75]]) {
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          if (mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = cv.toDataURL(mime, q);
          if (dataUrl.length * 0.75 <= LIMIT) return resolve({ mime, dataUrl, base64: dataUrl.split(',')[1] });
        }
      }
      reject(new Error('Logo terlalu detail untuk dikompres. Gunakan gambar yang lebih sederhana.'));
    };
    img.src = url;
  });
}

// ============================================================
// INISIALISASI
// ============================================================
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => {
  initLogin();
  applyBranding();                                  // tampilan instan dari cache lokal
  if (GAS_URL.indexOf('GANTI_') === 0) { showLogin('URL backend belum diisi. Edit GAS_URL di app.js.'); return; }
  if (store.get(LS.token) && me) {
    const res = await api('me');                    // validasi sesi di server
    if (res.success) { me = res.data.user; store.set(LS.user, me); startApp(); fetchPublicConfig(); return; }
    if (res.code !== 'AUTH') { startApp(); return; } // gangguan jaringan: tetap tampilkan aplikasi
  } else {
    showLogin();
  }
  fetchPublicConfig();
});
