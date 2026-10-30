// ============================================================
// LMS PAI & FIQIH — PROGRAM & SERTIFIKAT (Fase 5B)
// Admin: program + penerbitan + daftar. Guru: tab Sertifikat (program manual). Siswa: sertifikat saya.
// Publik: halaman verifikasi keaslian. Memakai fmtN (nilai-guru.js), modal/opts/fld/sel/val (admin.js).
// ============================================================

const TGL_PANJANG = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'; };
const urlVerifikasi = nomor => location.origin + location.pathname + '#/verifikasi/' + nomor;

function kriteriaTeks(p) {
  const k = p.kriteria || {};
  if (k.tipe === 'nilai') return 'Nilai akhir ' + (p.mapel || 'mapel') + ' ≥ ' + fmtN(k.min) + ' (lengkap, semester aktif)';
  if (k.tipe === 'kehadiran') return 'Kehadiran ' + (p.mapel || 'mapel') + ' ≥ ' + fmtN(k.min) + '% (minimal ' + k.min_sesi + ' sesi)';
  return 'Ditetapkan manual oleh guru/admin';
}

// ---------- Tampilan sertifikat (dapat dicetak / disimpan sebagai PDF) ----------
function sertifikatHtml(it) {
  return '<div class="cert-print"><div class="cert"><div class="cert-in">' +
    '<img class="cert-logo" alt="" src="' + esc(cfg.logo || FALLBACK_LOGO) + '">' +
    '<div class="cert-inst">' + esc(cfg.nama_lembaga) + '</div><h1 class="cert-title">SERTIFIKAT</h1>' +
    '<p class="cert-sub">diberikan kepada</p><div class="cert-name">' + esc(it.siswa) + '</div>' +
    '<p class="cert-sub">atas keberhasilan menyelesaikan program</p><div class="cert-prog">' + esc(it.program) + '</div>' +
    (it.deskripsi ? '<p class="cert-desc">' + esc(it.deskripsi) + '</p>' : '') +
    '<div class="cert-foot"><div><small>Tanggal terbit</small><strong>' + esc(TGL_PANJANG(it.tanggal)) + '</strong><small>No. ' + esc(it.nomor) + '</small></div>' +
    '<div class="cert-sign"><div class="cert-line"></div><small>Kepala Sekolah</small></div></div>' +
    '<p class="cert-ver">Keaslian dapat diperiksa di:<br>' + esc(urlVerifikasi(it.nomor)) + '</p></div></div></div>';
}
function bukaSertifikat(it) {
  modal({ title: 'Sertifikat', submit: 'Cetak / Simpan PDF', cancel: 'Tutup', body: sertifikatHtml(it) + '<p class="hint">Pilih “Simpan sebagai PDF” pada jendela cetak untuk mengunduh. Gunakan orientasi lanskap.</p>',
    onSubmit: async () => { window.print(); return false; } });
}

// ============================================================
// ADMIN — menu Sertifikat
// ============================================================
async function adminSertifikat() {
  const c = $('#content');
  let tab = 'program', st = { q: '', page: 1 };
  c.innerHTML = '<div class="page-head"><h1>Program &amp; Sertifikat</h1><p>Tetapkan program, kriteria, dan terbitkan sertifikat.</p></div>' +
    '<div class="tabs" id="sr-tabs"><button class="active" data-t="program">Program</button><button data-t="terbit">Sertifikat terbit</button></div><div id="sr-body"></div>';
  $('#sr-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; $$('#sr-tabs button').forEach(x => x.classList.toggle('active', x === b)); tampil(); });
  const tampil = () => (tab === 'program' ? tabProgram() : tabTerbit());

  async function tabProgram() {
    const box = $('#sr-body'); box.innerHTML = SPIN;
    const r = await api('admListProgram');
    if (!r.success) { box.innerHTML = errBox(r.message); return; }
    const { items, mapel } = r.data;
    box.innerHTML = '<div class="toolbar"><span class="grow"></span><button class="btn btn-primary btn-sm" id="pg-add">+ Program</button></div>' +
      (items.length ? '<div class="card"><div class="list">' + items.map(p =>
        '<div class="list-item"><div class="li-main"><strong>' + esc(p.nama) + '</strong><span class="li-meta">' + esc(kriteriaTeks(p)) + ' · ' + p.terbit + ' sertifikat terbit</span>' + (p.deskripsi ? '<span class="li-meta" dir="auto">' + esc(p.deskripsi) + '</span>' : '') + '</div>' +
        '<div class="li-actions">' + chip(p.status === 'aktif' ? 'Aktif' : 'Nonaktif', p.status === 'aktif' ? 'ok' : 'err') +
        '<button class="btn btn-primary btn-sm" data-terbit="' + esc(p.id) + '"' + (p.status === 'aktif' ? '' : ' disabled') + '>Terbitkan</button><button class="btn btn-secondary btn-sm" data-edit="' + esc(p.id) + '">Ubah</button></div></div>').join('') + '</div></div>'
        : '<div class="empty">Belum ada program. Klik “+ Program”.</div>');
    $('#pg-add').addEventListener('click', () => formProgram(null, mapel, tabProgram));
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) formProgram(items.find(x => x.id === b.dataset.edit), mapel, tabProgram);
      if (b.dataset.terbit) modalTerbit(items.find(x => x.id === b.dataset.terbit), tabProgram);
    };
  }

  async function tabTerbit() {
    const box = $('#sr-body');
    box.innerHTML = '<div class="toolbar"><input id="st-q" class="search" type="search" placeholder="Cari nomor, nama, atau program…" aria-label="Cari"></div><div class="card"><div id="st-list"></div><div id="st-pager" class="pager"></div></div>';
    $('#st-q').value = st.q;
    let items = [];
    async function muat() {
      $('#st-list').innerHTML = SPIN;
      const r = await api('admListSertifikat', st);
      if (!r.success) { $('#st-list').innerHTML = errBox(r.message); return; }
      items = r.data.items;
      $('#st-list').innerHTML = items.length ? '<div class="list">' + items.map(x => '<div class="list-item"><div class="li-main"><strong>' + esc(x.nomor) + ' · ' + esc(x.siswa) + '</strong><span class="li-meta">' + esc(x.program) + ' · ' + esc(TGL_PANJANG(x.tanggal)) + (x.oleh ? ' · oleh ' + esc(x.oleh) : '') + '</span></div>' +
        '<div class="li-actions"><button class="btn btn-secondary btn-sm" data-lihat="' + esc(x.id) + '">Lihat</button><button class="btn btn-danger btn-sm" data-cabut="' + esc(x.id) + '">Cabut</button></div></div>').join('') + '</div>' : '<div class="empty">Belum ada sertifikat.</div>';
      const p = r.data;
      $('#st-pager').innerHTML = '<span>' + p.total + ' sertifikat · halaman ' + p.page + ' dari ' + p.pages + '</span><span><button class="btn btn-secondary btn-sm" data-pg="-1"' + (p.page <= 1 ? ' disabled' : '') + '>Sebelumnya</button> <button class="btn btn-secondary btn-sm" data-pg="1"' + (p.page >= p.pages ? ' disabled' : '') + '>Berikutnya</button></span>';
    }
    $('#st-q').addEventListener('input', debounce(e => { st.q = e.target.value; st.page = 1; muat(); }, 350));
    $('#st-pager').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { st.page += Number(b.dataset.pg); muat(); } });
    $('#st-list').addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      const x = items.find(i => i.id === (b.dataset.lihat || b.dataset.cabut)); if (!x) return;
      if (b.dataset.lihat) return bukaSertifikat({ nomor: x.nomor, program: x.program, siswa: x.siswa, tanggal: x.tanggal, deskripsi: '' });
      if (!confirm('Cabut sertifikat ' + x.nomor + ' milik ' + x.siswa + '? Sertifikat tidak akan valid lagi pada verifikasi, dan tindakan ini tercatat di Log.')) return;
      const r = await api('admCabutSertifikat', { id: x.id }); toast(r.message || 'Selesai.', !r.success); if (r.success) muat();
    });
    muat();
  }
  tampil();
}

function formProgram(p, mapel, done) {
  const k = p ? p.kriteria : { tipe: 'nilai', min: 85, min_sesi: 10 };
  modal({ title: p ? 'Ubah program' : 'Tambah program', body:
    fld('Nama program', 'pg-nama', p ? p.nama : '', 'maxlength="80" placeholder="Contoh: Hafalan Juz 30"') +
    '<label class="field"><span class="field-label">Deskripsi (tampil di sertifikat)</span><textarea id="pg-desk" rows="2" maxlength="500">' + esc(p ? p.deskripsi : '') + '</textarea></label>' +
    sel('Kriteria penerbitan', 'pg-tipe', opts([['nilai', 'Nilai akhir mata pelajaran'], ['kehadiran', 'Persentase kehadiran'], ['manual', 'Manual (guru/admin menetapkan)']], k.tipe)) +
    '<div id="pg-mp">' + sel('Mata pelajaran', 'pg-mapel', opts(mapel.map(m => [m.id, m.nama]), k.mapel_id || '', '— pilih —')) +
    fld('Batas minimal (nilai atau % kehadiran)', 'pg-min', k.min === undefined ? '' : k.min, 'type="number" min="0" max="100" step="0.5"') +
    '<div id="pg-ses">' + fld('Minimal jumlah sesi (kehadiran)', 'pg-sesi', k.min_sesi || 10, 'type="number" min="1" max="200"') + '</div></div>' +
    sel('Status', 'pg-st', opts([['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']], p ? p.status : 'aktif')) +
    (p && p.terbit ? '<p class="hint">Program ini sudah menerbitkan ' + p.terbit + ' sertifikat, sehingga kriterianya tidak dapat diubah.</p>' : ''),
    onOpen: m => {
      const sync = () => { const t = val('pg-tipe'); $('#pg-mp', m.el).hidden = t === 'manual'; $('#pg-ses', m.el).hidden = t !== 'kehadiran'; };
      $('#pg-tipe', m.el).addEventListener('change', sync); sync();
    },
    onSubmit: async () => {
      const r = await api('admSaveProgram', { id: p ? p.id : '', nama: val('pg-nama'), deskripsi: val('pg-desk'), status: val('pg-st'),
        kriteria: { tipe: val('pg-tipe'), mapel_id: val('pg-mapel'), min: val('pg-min'), min_sesi: val('pg-sesi') } });
      if (!r.success) return r.message; toast('Program disimpan.'); done();
    } });
}

async function modalTerbit(p, done) {
  const r = await api('admEvaluasiProgram', { program_id: p.id });
  if (!r.success) return toast(r.message, true);
  const layak = r.data.layak, manual = r.data.program.kriteria.tipe === 'manual';
  modal({ title: 'Terbitkan — ' + p.nama, submit: layak.some(x => !x.sudah) ? 'Terbitkan terpilih' : '', cancel: 'Tutup', body:
    '<p class="hint">' + (manual ? 'Program manual: pilih siswa yang berhak.' : 'Siswa yang memenuhi kriteria (' + esc(kriteriaTeks(p)) + ').') + '</p>' +
    (layak.length ? '<div class="pick-list" style="max-height:320px">' + layak.map(x => '<label class="pick-item"><input type="checkbox" data-sid="' + esc(x.siswa_id) + '"' + (x.sudah ? ' disabled' : (manual ? '' : ' checked')) + '><span><strong>' + esc(x.nama) + '</strong> <small class="li-meta">' + esc(x.kelas) + (x.capaian !== null ? ' · capaian ' + fmtN(x.capaian) : '') + (x.sudah ? ' · sudah terbit' : '') + '</small></span></label>').join('') + '</div>'
      : '<div class="empty">Belum ada siswa yang memenuhi kriteria pada semester aktif.</div>'),
    onSubmit: async el => {
      const ids = $$('[data-sid]:checked', el).map(i => i.dataset.sid);
      if (!ids.length) return 'Pilih minimal satu siswa.';
      const s = await api('admTerbitkan', { program_id: p.id, siswa_ids: ids });
      if (!s.success) return s.message; toast(s.message); done();
    } });
}

// ============================================================
// GURU — tab "Sertifikat" pada halaman Nilai (program manual untuk kelasnya)
// ============================================================
async function tabSertifikat(mkId) {
  const box = $('#nl-body');
  box.innerHTML = SPIN;
  const r = await api('gruProgramManual', { mk_id: mkId });
  if (!r.success) { box.innerHTML = errBox(r.message); return; }
  if ($('#nl-mk') && $('#nl-mk').value !== mkId) return;
  const { programs, roster } = r.data;
  if (!programs.length) { box.innerHTML = '<div class="card"><h2>Sertifikat</h2><div class="empty">Belum ada program manual yang aktif. Admin dapat membuatnya di menu Sertifikat. Program berkriteria nilai atau kehadiran diterbitkan oleh admin.</div></div>'; return; }
  let pid = programs[0].id;
  const gambar = () => {
    const pr = programs.find(x => x.id === pid), sudah = {}; pr.terbit.forEach(s => { sudah[s] = 1; });
    box.innerHTML = '<div class="card"><h2>Terbitkan sertifikat</h2><div class="toolbar"><select id="sg-prog" class="select" aria-label="Program">' + opts(programs.map(x => [x.id, x.nama]), pid) + '</select></div>' +
      (pr.deskripsi ? '<p class="hint">' + esc(pr.deskripsi) + '</p>' : '') +
      '<div class="pick-list" style="max-height:320px">' + roster.map(x => '<label class="pick-item"><input type="checkbox" data-sid="' + esc(x.siswa_id) + '"' + (sudah[x.siswa_id] ? ' disabled' : '') + '><span><strong>' + esc(x.nama) + '</strong>' + (sudah[x.siswa_id] ? ' <small class="li-meta">· sudah terbit</small>' : '') + '</span></label>').join('') + '</div>' +
      '<p id="sg-err" class="form-error" hidden></p><button class="btn btn-primary" id="sg-go">Terbitkan untuk yang dipilih</button></div>';
    $('#sg-prog').addEventListener('change', e => { pid = e.target.value; gambar(); });
    $('#sg-go').addEventListener('click', async () => {
      const ids = $$('[data-sid]:checked', box).map(i => i.dataset.sid), err = $('#sg-err'), b = $('#sg-go'); err.hidden = true;
      if (!ids.length) { err.textContent = 'Pilih minimal satu siswa.'; err.hidden = false; return; }
      setBusy(b, true, 'Menerbitkan…');
      const s = await api('gruTerbitkan', { program_id: pid, mk_id: mkId, siswa_ids: ids });
      setBusy(b, false);
      if (!s.success) { err.textContent = s.message; err.hidden = false; return; }
      toast(s.message); tabSertifikat(mkId);
    });
  };
  gambar();
}

// ============================================================
// SISWA — Sertifikat saya
// ============================================================
async function siswaSertifikat() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Sertifikat</h1></div>' + SPIN;
  const r = await api('sisSertifikat');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  const items = r.data.items;
  c.innerHTML = '<div class="page-head"><h1>Sertifikat</h1><p>Penghargaan atas program yang telah Anda selesaikan.</p></div>' +
    (items.length ? '<div class="grid-3">' + items.map(x => '<div class="card"><span class="chip chip-soft">' + esc(x.nomor) + '</span><h2 style="margin-top:8px" dir="auto">' + esc(x.program) + '</h2><p class="hint" style="margin:0 0 12px">' + esc(TGL_PANJANG(x.tanggal)) + '</p><button class="btn btn-primary btn-sm" data-lihat="' + esc(x.id) + '">Lihat / Cetak</button></div>').join('') + '</div>'
      : '<div class="empty">Belum ada sertifikat. Terus semangat menuntut ilmu!</div>');
  c.onclick = e => { const b = e.target.closest('[data-lihat]'); if (b) bukaSertifikat(items.find(x => x.id === b.dataset.lihat)); };
}

// ============================================================
// PUBLIK — verifikasi keaslian (#/verifikasi/SRT-2026-0001), tanpa login
// ============================================================
async function tampilVerifikasi(nomor) {
  $('#boot').hidden = true; $('#view-login').hidden = true; $('#view-shell').hidden = true;
  const v = $('#view-verify'); v.hidden = false;
  const box = $('#vf-box');
  box.innerHTML = '<div class="empty"><span class="spinner"></span><p>Memeriksa keaslian sertifikat…</p></div>';
  applyBranding();
  fetchPublicConfig();
  let j = null;
  try { j = await (await fetch(GAS_URL + '?action=verifySertifikat&nomor=' + encodeURIComponent(nomor), { cache: 'no-store' })).json(); } catch (e) {}
  if (!j) { box.innerHTML = '<p class="form-error">Tidak dapat terhubung ke server. Coba lagi nanti.</p>'; return; }
  if (!j.success) { box.innerHTML = '<p class="form-error">' + esc(j.message) + '</p>'; return; }
  const d = j.data;
  box.innerHTML = d.valid
    ? '<div style="text-align:center"><div class="ver-ok">✓</div><h1>Sertifikat Asli</h1><p class="hint">Nomor ' + esc(d.nomor) + ' terdaftar pada ' + esc(d.lembaga) + '.</p></div>' +
      '<div class="list"><div class="list-item"><span>Penerima</span><strong>' + esc(d.nama) + '</strong></div><div class="list-item"><span>Program</span><strong dir="auto">' + esc(d.program) + '</strong></div><div class="list-item"><span>Tanggal terbit</span><strong>' + esc(TGL_PANJANG(d.tanggal)) + '</strong></div></div>' +
      '<p class="hint" style="margin-top:12px">Nama penerima disamarkan untuk melindungi privasi siswa.</p>'
    : '<div style="text-align:center"><div class="ver-no">✕</div><h1>Tidak Ditemukan</h1><p class="hint">Nomor sertifikat tidak terdaftar atau sudah dicabut. Periksa kembali nomor pada sertifikat.</p></div>';
}

window.ADMIN_PAGES = Object.assign(window.ADMIN_PAGES || {}, { program: adminSertifikat });
window.SISWA_PAGES = Object.assign(window.SISWA_PAGES || {}, { sertifikat: siswaSertifikat });
