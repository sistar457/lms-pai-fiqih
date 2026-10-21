// ============================================================
// LMS PAI & FIQIH — MODUL ADMIN (Fase 2)
// Dimuat setelah app.js; memakai $, esc, api, toast, setBusy, svg, cfg, me.
// ============================================================

Object.assign(ICONS, {
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 5 5"/>',
  school: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  log: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>'
});

// ---------- util umum ----------
const SPIN = '<div class="empty"><span class="spinner"></span></div>';
const errBox = m => '<p class="form-error">' + esc(m) + '</p>';
const chip = (t, k) => '<span class="chip chip-' + k + '">' + esc(t) + '</span>';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtTime = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; };
const opts = (list, val, blank) => (blank ? '<option value="">' + esc(blank) + '</option>' : '') +
  list.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
const fld = (label, id, val, attr) => '<label class="field"><span class="field-label">' + esc(label) + '</span><input id="' + id + '" value="' + esc(val || '') + '" ' + (attr || '') + '></label>';
const sel = (label, id, optionsHtml) => '<label class="field"><span class="field-label">' + esc(label) + '</span><select id="' + id + '" class="select">' + optionsHtml + '</select></label>';
const val = id => ($('#' + id) || {}).value || '';

// Modal generik. onSubmit(el) → true/undefined menutup; string = tampilkan sebagai error; false = tetap terbuka.
function modal({ title, body, submit = 'Simpan', cancel = 'Batal', onSubmit, onOpen }) {
  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><form novalidate>' +
    '<h2>' + esc(title) + '</h2><div class="modal-body">' + body + '</div><p class="form-error" data-err hidden></p>' +
    '<div class="modal-actions"><button type="button" class="btn btn-secondary" data-cancel>' + esc(cancel) + '</button>' +
    (submit ? '<button type="submit" class="btn btn-primary" data-ok>' + esc(submit) + '</button>' : '') + '</div></form></div>';
  document.body.appendChild(ov);
  const form = $('form', ov), errEl = $('[data-err]', ov);
  const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  $('[data-cancel]', ov).addEventListener('click', close);
  const api_ = { el: ov, close, error: m => { errEl.textContent = m; errEl.hidden = !m; } };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!onSubmit) return close();
    const btn = $('[data-ok]', ov); api_.error('');
    setBusy(btn, true, 'Memproses…');
    let r;
    try { r = await onSubmit(ov, api_); } catch (e) { r = e.message || 'Terjadi kesalahan.'; }
    if (!document.body.contains(ov)) return;
    setBusy(btn, false);
    if (typeof r === 'string') api_.error(r); else if (r !== false) close();
  });
  const first = $('input,select', ov); if (first) first.focus();
  if (onOpen) onOpen(api_);
  return api_;
}

// Menampilkan sandi sementara satu kali
function showSecret(title, nama, username, password) {
  modal({ title, submit: '', cancel: 'Selesai', body:
    '<p class="hint">Catat atau salin sekarang. Sandi ini <strong>tidak dapat dilihat lagi</strong>; pengguna wajib menggantinya saat masuk pertama kali.</p>' +
    '<div class="secret"><div><small>Nama</small><strong>' + esc(nama) + '</strong></div><div><small>Nama pengguna</small><strong>' + esc(username) + '</strong></div>' +
    '<div><small>Sandi sementara</small><strong class="mono" id="sec-pw">' + esc(password) + '</strong></div></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="sec-copy">Salin sandi</button>',
    onOpen: m => $('#sec-copy', m.el).addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(password).then(() => toast('Sandi disalin.'), () => toast('Gagal menyalin.', true)); })
  });
}

function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s;                       // cegah injeksi rumus spreadsheet
  return '"' + s.replace(/"/g, '""') + '"';
}
function downloadCSV(name, rows) {
  const csv = '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function parseCSV(text) {
  text = text.replace(/^\ufeff/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

// ============================================================
// BERANDA ADMIN
// ============================================================
window.adminBeranda = async function () {
  const c = $('#content');
  c.innerHTML = '<div class="hero"><h1>Assalamu\'alaikum, ' + esc(me.nama.split(' ')[0]) + '!</h1><p>Ringkasan ' + esc(cfg.nama_aplikasi) + '</p></div>' + SPIN;
  const r = await api('admDashboard');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  const d = r.data;
  const stat = (n, l, href) => '<a class="stat" href="' + href + '"><strong>' + n + '</strong><span>' + esc(l) + '</span></a>';
  const warn = [];
  if (!d.ta) warn.push('Belum ada tahun ajaran aktif. Atur di menu Akademik.');
  if (d.kelas === 0) warn.push('Belum ada kelas pada tahun ajaran aktif. Buat di menu Kelas.');
  if (d.siswa_tanpa_kelas > 0) warn.push(d.siswa_tanpa_kelas + ' siswa aktif belum masuk kelas.');
  if (d.belum_login > 0) warn.push(d.belum_login + ' akun belum pernah masuk.');
  c.innerHTML =
    '<div class="stack"><div class="hero"><h1>Assalamu\'alaikum, ' + esc(me.nama.split(' ')[0]) + '!</h1>' +
    '<p>' + (d.ta ? 'T.A ' + esc(d.ta) + (d.semester ? ' · Semester ' + esc(d.semester) : '') : 'Tahun ajaran belum diatur') + '</p></div>' +
    '<div class="stats">' + stat(d.siswa, 'Siswa aktif', '#/akun') + stat(d.guru, 'Guru aktif', '#/akun') + stat(d.kelas, 'Kelas', '#/kelas') + stat(d.akun, 'Akun aktif', '#/akun') + '</div>' +
    (warn.length ? '<div class="card"><h2>Perlu perhatian</h2><ul class="warn-list">' + warn.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul></div>' : '') +
    '<div class="card"><h2>Aktivitas terbaru</h2>' + logList(d.log) + '<p style="margin-top:12px"><a href="#/log">Lihat semua aktivitas →</a></p></div></div>';
};

function logList(rows) {
  if (!rows.length) return '<div class="empty">Belum ada aktivitas.</div>';
  return '<div class="list">' + rows.map(l =>
    '<div class="list-item"><div class="li-main"><strong>' + esc(l.aksi.replace(/_/g, ' ')) + '</strong>' +
    '<span class="li-meta">' + esc(l.user || '—') + (l.detail ? ' · ' + esc(l.detail) : '') + '</span></div><span class="li-side">' + esc(fmtTime(l.waktu)) + '</span></div>').join('') + '</div>';
}

async function pageLog() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Log Aktivitas</h1><p>200 aktivitas terakhir (login, perubahan akun, pengaturan).</p></div><div class="card" id="log-box">' + SPIN + '</div>';
  const r = await api('admListLog', { limit: 200 });
  $('#log-box').innerHTML = r.success ? logList(r.data.log) : errBox(r.message);
}

// ============================================================
// PENGGUNA & AKUN
// ============================================================
function pageAkun() {
  const st = { tipe: 'siswa', q: '', status: '', page: 1 };
  const c = $('#content');
  c.innerHTML =
    '<div class="page-head"><h1>Pengguna &amp; Akun</h1><p>Kelola akun siswa, guru, dan staf.</p></div>' +
    '<div class="tabs" id="ak-tabs"><button class="active" data-t="siswa">Siswa</button><button data-t="staf">Guru &amp; Staf</button></div>' +
    '<div class="toolbar"><input id="ak-q" class="search" type="search" placeholder="Cari nama atau nama pengguna…" aria-label="Cari">' +
    '<select id="ak-st" class="select" aria-label="Filter status"><option value="">Semua status</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select>' +
    '<span class="grow"></span><button id="ak-imp" class="btn btn-secondary btn-sm">Impor CSV</button><button id="ak-add" class="btn btn-primary btn-sm">+ Tambah</button></div>' +
    '<div class="card"><div id="ak-list"></div><div id="ak-pager" class="pager"></div></div>';

  let items = [];
  async function load() {
    $('#ak-list').innerHTML = SPIN;
    const r = await api('admListAkun', st);
    if (!r.success) { $('#ak-list').innerHTML = errBox(r.message); return; }
    items = r.data.items;
    $('#ak-list').innerHTML = items.length ? '<div class="list">' + items.map(u =>
      '<div class="list-item"><div class="li-main"><strong>' + esc(u.nama) + '</strong>' +
      '<span class="li-meta">' + esc(u.username) +
      (st.tipe === 'siswa' ? ' · ' + (u.kelas ? esc(u.kelas) : 'belum ada kelas') : ' · ' + (u.role === 'admin' ? 'Admin' : 'Guru') + (u.nip ? ' · NIP ' + esc(u.nip) : '')) +
      ' · masuk terakhir ' + esc(fmtTime(u.last_login)) + '</span></div>' +
      '<div class="li-actions">' + chip(u.status === 'aktif' ? 'Aktif' : 'Nonaktif', u.status === 'aktif' ? 'ok' : 'err') +
      '<button class="btn btn-secondary btn-sm" data-act="edit" data-id="' + esc(u.user_id) + '">Ubah</button>' +
      '<button class="btn btn-secondary btn-sm" data-act="reset" data-id="' + esc(u.user_id) + '">Reset sandi</button>' +
      '<button class="btn btn-sm ' + (u.status === 'aktif' ? 'btn-danger' : 'btn-secondary') + '" data-act="toggle" data-id="' + esc(u.user_id) + '">' + (u.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan') + '</button>' +
      '</div></div>').join('') + '</div>' : '<div class="empty">Tidak ada akun yang cocok.</div>';
    const p = r.data;
    $('#ak-pager').innerHTML = '<span>' + p.total + ' akun · halaman ' + p.page + ' dari ' + p.pages + '</span><span>' +
      '<button class="btn btn-secondary btn-sm" data-pg="-1"' + (p.page <= 1 ? ' disabled' : '') + '>Sebelumnya</button> ' +
      '<button class="btn btn-secondary btn-sm" data-pg="1"' + (p.page >= p.pages ? ' disabled' : '') + '>Berikutnya</button></span>';
  }

  $('#ak-tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#ak-tabs button').forEach(x => x.classList.toggle('active', x === b));
    st.tipe = b.dataset.t; st.page = 1; $('#ak-imp').hidden = st.tipe !== 'siswa'; load();
  });
  $('#ak-q').addEventListener('input', debounce(e => { st.q = e.target.value; st.page = 1; load(); }, 350));
  $('#ak-st').addEventListener('change', e => { st.status = e.target.value; st.page = 1; load(); });
  $('#ak-pager').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { st.page += Number(b.dataset.pg); load(); } });
  $('#ak-add').addEventListener('click', () => (st.tipe === 'siswa' ? formSiswa(load) : formStaf(load)));
  $('#ak-imp').addEventListener('click', () => openImport(load));

  $('#ak-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const u = items.find(x => x.user_id === b.dataset.id); if (!u) return;
    if (b.dataset.act === 'reset') {
      if (!confirm('Reset kata sandi untuk ' + u.nama + '? Sandi lama tidak berlaku lagi.')) return;
      const r = await api('admResetSandi', { user_id: u.user_id });
      if (!r.success) return toast(r.message, true);
      showSecret('Sandi sementara baru', r.data.nama, r.data.username, r.data.password); load();
    } else if (b.dataset.act === 'toggle') {
      const next = u.status === 'aktif' ? 'nonaktif' : 'aktif';
      if (!confirm((next === 'nonaktif' ? 'Nonaktifkan' : 'Aktifkan') + ' akun ' + u.nama + '?')) return;
      const r = await api('admUpdateAkun', { user_id: u.user_id, nama: u.nama, status: next });
      toast(r.message || 'Selesai.', !r.success); if (r.success) load();
    } else if (b.dataset.act === 'edit') {
      modal({ title: 'Ubah akun', body: fld('Nama lengkap', 'ed-nama', u.nama, 'maxlength="80"') + '<p class="hint">Nama pengguna (' + esc(u.username) + ') tidak dapat diubah.</p>',
        onSubmit: async () => { const r = await api('admUpdateAkun', { user_id: u.user_id, nama: val('ed-nama'), status: u.status }); if (!r.success) return r.message; toast('Akun diperbarui.'); load(); } });
    }
  });
  load();
}

async function formSiswa(done) {
  const kr = await api('admListKelas', {});
  const kelas = kr.success ? kr.data.kelas : [];
  modal({ title: 'Tambah siswa', submit: 'Buat akun', body:
    fld('NISN (juga menjadi nama pengguna)', 'sw-nisn', '', 'inputmode="numeric" maxlength="30"') + fld('Nama lengkap', 'sw-nama', '', 'maxlength="80"') +
    sel('Jenis kelamin', 'sw-jk', opts([['L', 'Laki-laki'], ['P', 'Perempuan']], '', '— pilih —')) +
    sel('Kelas (tahun ajaran aktif)', 'sw-kelas', opts(kelas.map(k => [k.id, k.nama]), '', '— belum ditentukan —')),
    onSubmit: async () => {
      const r = await api('admCreateSiswa', { nisn: val('sw-nisn'), nama: val('sw-nama'), jk: val('sw-jk'), kelas_id: val('sw-kelas') });
      if (!r.success) return r.message;
      const a = r.data.accounts[0]; done(); setTimeout(() => showSecret('Akun siswa dibuat', a.nama, a.nisn, a.password), 50);
    } });
}
function formStaf(done) {
  modal({ title: 'Tambah guru / staf', submit: 'Buat akun', body:
    fld('Nama lengkap', 'st-nama', '', 'maxlength="80"') + fld('Nama pengguna', 'st-user', '', 'maxlength="30" autocapitalize="none"') + fld('NIP (opsional)', 'st-nip', '', 'maxlength="30"') +
    sel('Peran', 'st-role', opts([['guru', 'Guru'], ['admin', 'Administrator']], 'guru')),
    onSubmit: async () => {
      const r = await api('admCreateStaf', { nama: val('st-nama'), username: val('st-user'), nip: val('st-nip'), role: val('st-role') });
      if (!r.success) return r.message;
      done(); setTimeout(() => showSecret('Akun dibuat', r.data.nama, r.data.username, r.data.password), 50);
    } });
}

// ---------- Impor siswa dari CSV ----------
function openImport(done) {
  let rows = [], valid = [];
  const m = modal({ title: 'Impor siswa dari CSV', submit: '', cancel: 'Tutup', body:
    '<p class="hint">Simpan berkas Excel sebagai <strong>CSV</strong>. Kolom: <code>nisn, nama, jk, tgl_lahir, kelas</code>. Nama kelas harus sama dengan kelas yang sudah dibuat (mis. VII-A). Kolom jk, tgl_lahir, dan kelas boleh kosong.</p>' +
    '<div class="row-actions"><button type="button" class="btn btn-secondary btn-sm" id="im-tpl">Unduh template</button>' +
    '<button type="button" class="btn btn-primary btn-sm" id="im-pick">Pilih berkas CSV</button></div>' +
    '<input type="file" id="im-file" accept=".csv,text/csv" hidden><div id="im-out" class="im-out"></div>' });
  const out = $('#im-out', m.el);

  $('#im-tpl', m.el).addEventListener('click', () => downloadCSV('template-impor-siswa.csv',
    [['nisn', 'nama', 'jk', 'tgl_lahir', 'kelas'], ['0089271625', 'Contoh Nama Siswa', 'L', '2011-05-20', 'VII-A']]));
  $('#im-pick', m.el).addEventListener('click', () => $('#im-file', m.el).click());
  $('#im-file', m.el).addEventListener('change', async ev => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { out.innerHTML = errBox('Berkas terlalu besar (maks. 2 MB).'); return; }
    const table = parseCSV(await f.text());
    if (table.length < 2) { out.innerHTML = errBox('Berkas kosong atau tidak memiliki baris data.'); return; }
    const head = table[0].map(h => h.trim().toLowerCase());
    if (head.indexOf('nisn') < 0 || head.indexOf('nama') < 0) { out.innerHTML = errBox('Baris judul harus memuat kolom nisn dan nama.'); return; }
    rows = table.slice(1).map((r, i) => { const o = { line: i + 2 }; head.forEach((h, j) => { o[h] = (r[j] || '').trim(); }); return o; });
    if (rows.length > 1000) { out.innerHTML = errBox('Maksimal 1000 baris per berkas.'); return; }
    // duplikat di dalam berkas
    const seen = {}, errors = [];
    rows.forEach(r => { const k = r.nisn.toLowerCase(); if (k && seen[k]) errors.push({ line: r.line, msg: 'NISN ganda di dalam berkas (sama dengan baris ' + seen[k] + ').' }); else if (k) seen[k] = r.line; });
    const dupLines = new Set(errors.map(e => e.line));
    out.innerHTML = '<p>Memeriksa ' + rows.length + ' baris…</p>';
    const toCheck = rows.filter(r => !dupLines.has(r.line));
    for (let i = 0; i < toCheck.length; i += 200) {
      const r = await api('admImportSiswa', { rows: toCheck.slice(i, i + 200), dryRun: true });
      if (!r.success) { out.innerHTML = errBox(r.message); return; }
      errors.push(...r.data.errors);
    }
    const bad = new Set(errors.map(e => e.line));
    valid = rows.filter(r => !bad.has(r.line));
    errors.sort((a, b) => a.line - b.line);
    out.innerHTML = '<div class="im-sum">' + chip(valid.length + ' baris valid', 'ok') + ' ' + chip(errors.length + ' baris bermasalah', errors.length ? 'err' : 'ok') + '</div>' +
      (errors.length ? '<div class="im-err">' + errors.slice(0, 50).map(e => '<div>Baris ' + e.line + ': ' + esc(e.msg) + '</div>').join('') + (errors.length > 50 ? '<div>…dan ' + (errors.length - 50) + ' lainnya.</div>' : '') + '</div>' : '') +
      (valid.length ? '<button type="button" class="btn btn-primary" id="im-go" style="margin-top:12px">Impor ' + valid.length + ' siswa valid</button>' + (errors.length ? '<p class="hint">Baris bermasalah dilewati. Perbaiki di berkas lalu impor ulang.</p>' : '') : '');
    const go = $('#im-go', m.el);
    if (go) go.addEventListener('click', commit);
  });

  async function commit() {
    const go = $('#im-go', m.el); go.disabled = true;
    const accounts = [], failed = [];
    for (let i = 0; i < valid.length; i += 20) {
      out.querySelector('.im-prog') || out.insertAdjacentHTML('beforeend', '<p class="im-prog"></p>');
      out.querySelector('.im-prog').textContent = 'Menyimpan ' + Math.min(i + 20, valid.length) + ' dari ' + valid.length + '… jangan tutup jendela ini.';
      const r = await api('admImportSiswa', { rows: valid.slice(i, i + 20), dryRun: false });
      if (!r.success) { failed.push(r.message); break; }
      accounts.push(...r.data.accounts); failed.push(...r.data.errors.map(e => 'Baris ' + e.line + ': ' + e.msg));
    }
    done();
    out.innerHTML = '<div class="im-sum">' + chip(accounts.length + ' akun dibuat', 'ok') + (failed.length ? ' ' + chip(failed.length + ' gagal', 'err') : '') + '</div>' +
      '<p class="hint"><strong>Unduh daftar akun sekarang.</strong> Sandi sementara hanya ditampilkan satu kali dan tidak disimpan dalam bentuk terbaca.</p>' +
      (accounts.length ? '<button type="button" class="btn btn-primary" id="im-dl">Unduh daftar akun (CSV)</button>' : '') +
      (failed.length ? '<div class="im-err">' + failed.slice(0, 20).map(x => '<div>' + esc(x) + '</div>').join('') + '</div>' : '');
    const dl = $('#im-dl', m.el);
    if (dl) dl.addEventListener('click', () => downloadCSV('akun-siswa-baru.csv', [['nisn', 'nama', 'kelas', 'sandi_sementara']].concat(accounts.map(a => [a.nisn, a.nama, a.kelas, a.password]))));
  }
}

// ============================================================
// KELAS & PENUGASAN GURU
// ============================================================
async function pageKelas(param) {
  if (param) return pageKelasDetail(param);
  const c = $('#content');
  let taId = '', data = null;
  async function load() {
    c.innerHTML = '<div class="page-head"><h1>Kelas</h1><p>Kelola kelas, anggota, mata pelajaran, dan guru pengampu.</p></div>' + SPIN;
    const r = await api('admListKelas', { ta_id: taId });
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    data = r.data; taId = data.ta_id;
    c.innerHTML = '<div class="page-head"><h1>Kelas</h1><p>Kelola kelas, anggota, mata pelajaran, dan guru pengampu.</p></div>' +
      '<div class="toolbar"><select id="kl-ta" class="select" aria-label="Tahun ajaran">' + opts(data.tahun.map(t => [t.id, 'T.A ' + t.label + (t.aktif ? ' (aktif)' : '')]), taId) + '</select><span class="grow"></span>' +
      '<button class="btn btn-primary btn-sm" id="kl-add">+ Tambah kelas</button></div>' +
      (data.kelas.length ? '<div class="grid-3">' + data.kelas.map(k =>
        '<a class="card kelas-card" href="#/kelas/' + esc(k.id) + '"><span class="chip chip-soft">Kelas ' + k.tingkat + '</span><h2>' + esc(k.nama) + '</h2>' +
        '<p class="hint" style="margin:0">' + k.anggota + ' siswa<br>Wali: ' + (k.wali ? esc(k.wali) : '<em>belum ditentukan</em>') + '</p></a>').join('') + '</div>'
        : '<div class="empty">Belum ada kelas pada tahun ajaran ini. Klik “Tambah kelas”.</div>');
    $('#kl-ta').addEventListener('change', e => { taId = e.target.value; load(); });
    $('#kl-add').addEventListener('click', () => formKelas(null, data.gurus, taId, load));
  }
  load();
}

function formKelas(k, gurus, taId, done) {
  modal({ title: k ? 'Ubah kelas' : 'Tambah kelas', body:
    sel('Tingkat', 'kl-tg', opts([[7, 'Kelas 7'], [8, 'Kelas 8'], [9, 'Kelas 9']], k ? k.tingkat : 7)) +
    fld('Nama kelas', 'kl-nama', k ? k.nama : '', 'maxlength="20" placeholder="Contoh: VII-A"') +
    sel('Wali kelas', 'kl-wali', opts(gurus.map(g => [g.id, g.nama]), k ? k.wali_guru_id : '', '— belum ditentukan —')),
    onSubmit: async () => {
      const r = await api('admSaveKelas', { id: k ? k.id : '', ta_id: taId, tingkat: val('kl-tg'), nama: val('kl-nama'), wali_guru_id: val('kl-wali') });
      if (!r.success) return r.message; toast('Kelas disimpan.'); done();
    } });
}

async function pageKelasDetail(id) {
  const c = $('#content');
  let tab = 'anggota';
  async function load() {
    c.innerHTML = SPIN;
    const r = await api('admGetKelas', { id });
    if (!r.success) { c.innerHTML = errBox(r.message) + '<p><a href="#/kelas">← Kembali</a></p>'; return; }
    const d = r.data, k = d.kelas;
    c.innerHTML = '<p><a href="#/kelas">← Semua kelas</a></p>' +
      '<div class="page-head row-between"><div><h1>Kelas ' + esc(k.nama) + '</h1><p>Tingkat ' + k.tingkat + ' · ' + d.anggota.length + ' siswa</p></div>' +
      '<button class="btn btn-secondary btn-sm" id="kd-edit">Ubah kelas</button></div>' +
      '<div class="tabs" id="kd-tabs"><button data-t="anggota"' + (tab === 'anggota' ? ' class="active"' : '') + '>Anggota</button><button data-t="mapel"' + (tab === 'mapel' ? ' class="active"' : '') + '>Mata pelajaran &amp; guru</button></div>' +
      '<div class="card" id="kd-body"></div>';
    $('#kd-edit').addEventListener('click', () => formKelas(k, d.gurus, k.ta_id, load));
    $('#kd-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; load(); } });
    tab === 'anggota' ? renderAnggota(d, load) : renderMapel(d, load);
  }
  load();
}

function renderAnggota(d, reload) {
  const k = d.kelas;
  $('#kd-body').innerHTML = '<div class="toolbar"><span class="grow"></span><button class="btn btn-primary btn-sm" id="ag-add">+ Tambah siswa</button></div>' +
    (d.anggota.length ? '<div class="list">' + d.anggota.map(a =>
      '<div class="list-item"><div class="li-main"><strong>' + esc(a.nama) + '</strong><span class="li-meta">NISN ' + esc(a.nisn) + '</span></div>' +
      '<div class="li-actions"><button class="btn btn-danger btn-sm" data-out="' + esc(a.anggota_id) + '" data-nama="' + esc(a.nama) + '">Keluarkan</button></div></div>').join('') + '</div>'
      : '<div class="empty">Belum ada siswa di kelas ini.</div>');
  $('#ag-add').addEventListener('click', () => {
    const m = modal({ title: 'Tambah siswa ke kelas ' + k.nama, submit: '', cancel: 'Tutup', body:
      '<input id="ag-q" class="search" type="search" placeholder="Cari nama atau NISN…" style="width:100%"><div id="ag-res" class="list" style="margin-top:12px"></div>' +
      '<p class="hint">Hanya siswa aktif yang belum punya kelas di tahun ajaran ini.</p>' });
    const search = async () => {
      const res = $('#ag-res', m.el); res.innerHTML = SPIN;
      const r = await api('admSearchSiswaBebas', { ta_id: k.ta_id, q: val('ag-q') });
      if (!r.success) { res.innerHTML = errBox(r.message); return; }
      res.innerHTML = r.data.items.length ? r.data.items.map(s => '<div class="list-item"><div class="li-main"><strong>' + esc(s.nama) + '</strong><span class="li-meta">NISN ' + esc(s.nisn) + '</span></div>' +
        '<div class="li-actions"><button class="btn btn-primary btn-sm" data-add="' + esc(s.id) + '">Tambahkan</button></div></div>').join('') : '<div class="empty">Tidak ada siswa yang tersedia.</div>';
    };
    $('#ag-q', m.el).addEventListener('input', debounce(search, 300));
    $('#ag-res', m.el).addEventListener('click', async e => {
      const b = e.target.closest('[data-add]'); if (!b) return;
      b.disabled = true;
      const r = await api('admAddAnggota', { kelas_id: k.id, siswa_id: b.dataset.add });
      if (!r.success) { b.disabled = false; return toast(r.message, true); }
      toast('Siswa ditambahkan.'); m.close(); reload();
    });
    search();
  });
  $('#kd-body').addEventListener('click', async e => {
    const b = e.target.closest('[data-out]'); if (!b) return;
    if (!confirm('Keluarkan ' + b.dataset.nama + ' dari kelas ' + k.nama + '? Riwayat keanggotaan tetap tersimpan.')) return;
    const r = await api('admRemoveAnggota', { anggota_id: b.dataset.out });
    toast(r.message || 'Selesai.', !r.success); if (r.success) reload();
  });
}

function renderMapel(d, reload) {
  const k = d.kelas;
  $('#kd-body').innerHTML = d.semester.length ? d.semester.map(s => {
    const list = d.mapel.filter(m => m.semester_id === s.id);
    return '<div class="sem-block"><div class="row-between"><h2>Semester ' + esc(s.nama) + (s.aktif ? ' ' + chip('Aktif', 'ok') : '') + '</h2>' +
      '<button class="btn btn-secondary btn-sm" data-add-sem="' + esc(s.id) + '">+ Mata pelajaran</button></div>' +
      (list.length ? '<div class="list">' + list.map(m =>
        '<div class="list-item"><div class="li-main"><strong>' + esc(m.mapel) + '</strong><span class="li-meta">Guru: ' + (m.guru ? esc(m.guru) : '<em>belum ditentukan</em>') + '</span></div>' +
        '<div class="li-actions"><button class="btn btn-secondary btn-sm" data-edit="' + esc(m.id) + '">Ganti guru</button>' +
        '<button class="btn btn-danger btn-sm" data-del="' + esc(m.id) + '">Lepas</button></div></div>').join('') + '</div>' : '<div class="empty">Belum ada mata pelajaran.</div>') + '</div>';
  }).join('') : '<div class="empty">Tahun ajaran ini belum memiliki semester. Buka menu Akademik.</div>';

  const form = (semId, cur) => modal({ title: cur ? 'Ganti guru — ' + cur.mapel : 'Tambah mata pelajaran', body:
    (cur ? '' : sel('Mata pelajaran', 'mp-mapel', opts(d.mapelOpsi.map(m => [m.id, m.nama]), '', '— pilih —'))) +
    sel('Guru pengampu', 'mp-guru', opts(d.gurus.map(g => [g.id, g.nama]), cur ? cur.guru_id : '', '— belum ditentukan —')),
    onSubmit: async () => {
      const mapelId = cur ? cur.mapel_id : val('mp-mapel');
      if (!mapelId) return 'Pilih mata pelajaran.';
      const r = await api('admAssignMapel', { kelas_id: k.id, semester_id: semId, mapel_id: mapelId, guru_id: val('mp-guru') });
      if (!r.success) return r.message; toast('Tersimpan.'); reload();
    } });

  $('#kd-body').addEventListener('click', async e => {
    const add = e.target.closest('[data-add-sem]'), ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (add) form(add.dataset.addSem, null);
    if (ed) { const m = d.mapel.find(x => x.id === ed.dataset.edit); form(m.semester_id, m); }
    if (del) {
      if (!confirm('Lepas mata pelajaran ini dari kelas?')) return;
      const r = await api('admRemoveMapel', { id: del.dataset.del });
      toast(r.message || 'Selesai.', !r.success); if (r.success) reload();
    }
  });
}

// ============================================================
// AKADEMIK: TAHUN AJARAN, SEMESTER, MATA PELAJARAN
// ============================================================
async function pageAkademik() {
  const c = $('#content');
  async function load() {
    c.innerHTML = '<div class="page-head"><h1>Akademik</h1><p>Tahun ajaran, semester, dan mata pelajaran.</p></div>' + SPIN;
    const r = await api('admListAkademik');
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    const d = r.data;
    c.innerHTML = '<div class="page-head"><h1>Akademik</h1><p>Tahun ajaran, semester, dan mata pelajaran.</p></div><div class="stack">' +
      '<div class="card"><div class="row-between"><h2>Tahun ajaran &amp; semester</h2><button class="btn btn-primary btn-sm" id="ta-add">+ Tahun ajaran</button></div>' +
      '<p class="hint">Hanya satu semester yang aktif. Mengaktifkan semester otomatis mengaktifkan tahun ajarannya.</p>' +
      (d.tahun.length ? '<div class="list">' + d.tahun.map(t =>
        '<div class="list-item"><div class="li-main"><strong>T.A ' + esc(t.label) + '</strong><span class="li-meta">' + (t.aktif ? 'Tahun ajaran aktif' : 'Tidak aktif') + '</span></div><div class="li-actions">' +
        t.semester.map(s => s.aktif ? chip('Semester ' + s.nama + ' · aktif', 'ok') : '<button class="btn btn-secondary btn-sm" data-sem="' + esc(s.id) + '" data-n="' + esc(t.label + ' ' + s.nama) + '">Aktifkan ' + esc(s.nama) + '</button>').join('') +
        '</div></div>').join('') + '</div>' : '<div class="empty">Belum ada tahun ajaran.</div>') + '</div>' +
      '<div class="card"><div class="row-between"><h2>Mata pelajaran</h2><button class="btn btn-primary btn-sm" id="mp-add">+ Mata pelajaran</button></div>' +
      '<div class="list">' + d.mapel.map(m =>
        '<div class="list-item"><div class="li-main"><strong>' + esc(m.nama) + '</strong><span class="li-meta">Kode ' + esc(m.kode) + '</span></div><div class="li-actions">' +
        chip(m.status === 'aktif' ? 'Aktif' : 'Nonaktif', m.status === 'aktif' ? 'ok' : 'err') + '<button class="btn btn-secondary btn-sm" data-mp="' + esc(m.id) + '">Ubah</button></div></div>').join('') + '</div></div></div>';

    $('#ta-add').addEventListener('click', () => {
      const y = new Date().getFullYear();
      modal({ title: 'Tambah tahun ajaran', body: fld('Tahun mulai', 'ta-y', y + 1, 'type="number" min="2000" max="2100"') + '<p class="hint">Contoh: 2027 membuat T.A 2027/2028 beserta semester Ganjil dan Genap.</p>',
        onSubmit: async () => { const r = await api('admCreateTA', { tahun_mulai: val('ta-y') }); if (!r.success) return r.message; toast(r.message); load(); } });
    });
    $$('[data-sem]').forEach(s => s.addEventListener('click', async () => {
      if (!confirm('Aktifkan semester ' + s.dataset.n + '? Semester aktif sebelumnya akan dinonaktifkan.')) return;
      const r = await api('admSetSemesterAktif', { id: s.dataset.sem });
      toast(r.message || 'Selesai.', !r.success); if (r.success) load();
    }));
    const mapelForm = m => modal({ title: m ? 'Ubah mata pelajaran' : 'Tambah mata pelajaran', body:
      fld('Kode', 'mp-kode', m ? m.kode : '', 'maxlength="15" style="text-transform:uppercase"') + fld('Nama', 'mp-nama', m ? m.nama : '', 'maxlength="60"') +
      (m ? sel('Status', 'mp-st', opts([['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']], m.status)) : ''),
      onSubmit: async () => { const r = await api('admSaveMapel', { id: m ? m.id : '', kode: val('mp-kode'), nama: val('mp-nama'), status: m ? val('mp-st') : 'aktif' }); if (!r.success) return r.message; toast('Tersimpan.'); load(); } });
    $('#mp-add').addEventListener('click', () => mapelForm(null));
    $$('[data-mp]').forEach(b => b.addEventListener('click', () => mapelForm(d.mapel.find(x => x.id === b.dataset.mp))));
  }
  load();
}

// ---------- daftarkan halaman ke router ----------
window.ADMIN_PAGES = { akun: pageAkun, kelas: pageKelas, akademik: pageAkademik, log: pageLog };
