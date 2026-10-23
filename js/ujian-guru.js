// ============================================================
// LMS PAI & FIQIH — UJIAN: SISI GURU (Fase 4A)
// Bank soal, pembuatan ujian/kuis (CBT atau tautan eksternal), hasil & penilaian
// ============================================================

Object.assign(ICONS, {
  bank: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  exam: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'
});
const JENIS_SOAL = { pg: 'Pilihan ganda', bs: 'Benar/Salah', esai: 'Esai' };
const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n) + '…' : String(s));
const kunciLabel = s => s.jenis === 'pg' ? s.kunci + '. ' + trunc((s.opsi['ABCDE'.indexOf(s.kunci)] || ''), 40) : s.jenis === 'bs' ? (s.kunci === 'benar' ? 'Benar' : 'Salah') : 'dinilai manual';

// ============================================================
// BANK SOAL
// ============================================================
async function guruSoal() {
  const c = $('#content'), st = { mapel_id: '', jenis: '', q: '', page: 1 };
  let meta = null, built = false;
  c.innerHTML = '<div class="page-head"><h1>Bank Soal</h1></div>' + SPIN;

  function drawList() {
    const box = $('#sb-list');
    box.innerHTML = meta.items.length ? '<div class="list">' + meta.items.map(s =>
      '<div class="list-item"><div class="li-main"><strong dir="auto">' + esc(trunc(s.pertanyaan, 160)) + '</strong>' +
      '<span class="li-meta">' + esc(s.mapel) + ' · ' + esc(JENIS_SOAL[s.jenis]) + ' · bobot ' + s.bobot + ' · kunci: ' + esc(kunciLabel(s)) + (s.bab ? ' · ' + esc(s.bab) : '') + (s.milik ? '' : ' · milik guru lain') + '</span></div>' +
      (s.milik ? '<div class="li-actions"><button class="btn btn-secondary btn-sm" data-edit="' + esc(s.id) + '">Ubah</button><button class="btn btn-danger btn-sm" data-arsip="' + esc(s.id) + '">Arsip</button></div>' : '') + '</div>').join('') + '</div>'
      : '<div class="empty">Belum ada soal. Klik “+ Soal”.</div>';
    $('#sb-pager').innerHTML = '<span>' + meta.total + ' soal · halaman ' + meta.page + ' dari ' + meta.pages + '</span><span>' +
      '<button class="btn btn-secondary btn-sm" data-pg="-1"' + (meta.page <= 1 ? ' disabled' : '') + '>Sebelumnya</button> ' +
      '<button class="btn btn-secondary btn-sm" data-pg="1"' + (meta.page >= meta.pages ? ' disabled' : '') + '>Berikutnya</button></span>';
  }
  async function reload() { if (built) $('#sb-list').innerHTML = SPIN; await load(); }
  async function load() {
    const r = await api('gruListSoal', st);
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    meta = r.data;
    if (!built) { build(); built = true; }
    drawList();
  }
  function build() {
    c.innerHTML = '<div class="page-head"><h1>Bank Soal</h1><p>Kumpulan soal per mata pelajaran untuk kuis dan ujian.</p></div>' +
      '<div class="toolbar"><select id="sb-mp" class="select" aria-label="Mata pelajaran">' + opts(meta.mapelOpsi.map(m => [m.id, m.nama]), '', 'Semua mata pelajaran') + '</select>' +
      '<select id="sb-jn" class="select" aria-label="Jenis">' + opts(Object.entries(JENIS_SOAL), '', 'Semua jenis') + '</select>' +
      '<input id="sb-q" class="search" type="search" placeholder="Cari pertanyaan…" aria-label="Cari"><button class="btn btn-primary btn-sm" id="sb-add"' + (meta.mapelOpsi.length ? '' : ' disabled') + '>+ Soal</button></div>' +
      '<div class="card"><div id="sb-list"></div><div id="sb-pager" class="pager"></div></div>';
    $('#sb-mp').addEventListener('change', e => { st.mapel_id = e.target.value; st.page = 1; reload(); });
    $('#sb-jn').addEventListener('change', e => { st.jenis = e.target.value; st.page = 1; reload(); });
    $('#sb-q').addEventListener('input', debounce(e => { st.q = e.target.value; st.page = 1; reload(); }, 350));
    $('#sb-add').addEventListener('click', () => formSoal(null, meta, st.mapel_id, reload));
    $('#sb-pager').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { st.page += Number(b.dataset.pg); reload(); } });
    $('#sb-list').addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) return formSoal(meta.items.find(x => x.id === b.dataset.edit), meta, '', reload);
      if (b.dataset.arsip) {
        if (!confirm('Arsipkan soal ini? Soal yang sudah dipakai ujian tetap utuh.')) return;
        const r = await api('gruArsipSoal', { id: b.dataset.arsip }); toast(r.message || 'Selesai.', !r.success); if (r.success) reload();
      }
    });
  }
  load();
}

function formSoal(s, meta, defMapel, done) {
  const cur = s || { jenis: 'pg', opsi: [], kunci: '', bobot: 1, mapel_id: defMapel || (meta.mapelOpsi[0] || {}).id, bab_id: '' };
  const optRows = [0, 1, 2, 3, 4].map(i => '<div class="opt-row"><input type="radio" name="sk-kunci" value="' + i + '" aria-label="Kunci ' + 'ABCDE'[i] + '"' + (cur.jenis === 'pg' && cur.kunci === 'ABCDE'[i] ? ' checked' : '') + '>' +
    '<input type="text" id="sk-o' + i + '" maxlength="300" placeholder="Pilihan ' + 'ABCDE'[i] + (i > 1 ? ' (opsional)' : '') + '" value="' + esc(cur.opsi[i] || '') + '"></div>').join('');
  modal({ title: s ? 'Ubah soal' : 'Tambah soal', body:
    sel('Mata pelajaran', 'sk-mapel', opts(meta.mapelOpsi.map(m => [m.id, m.nama]), cur.mapel_id)) +
    sel('Jenis soal', 'sk-jenis', opts(Object.entries(JENIS_SOAL), cur.jenis)) +
    '<label class="field"><span class="field-label">Pertanyaan</span><textarea id="sk-pert" rows="4" maxlength="2000" dir="auto">' + esc(s ? s.pertanyaan : '') + '</textarea></label>' +
    '<div id="sk-pg"><span class="field-label">Pilihan jawaban — pilih lingkaran di kiri untuk kunci</span>' + optRows + '</div>' +
    '<div id="sk-bs" hidden>' + sel('Kunci jawaban', 'sk-kbs', opts([['benar', 'Benar'], ['salah', 'Salah']], cur.jenis === 'bs' ? cur.kunci : 'benar')) + '</div>' +
    '<div id="sk-es" hidden><label class="field"><span class="field-label">Rubrik / jawaban acuan (hanya terlihat guru)</span><textarea id="sk-rub" rows="3" maxlength="1500">' + esc(cur.jenis === 'esai' ? cur.kunci : '') + '</textarea></label></div>' +
    fld('Bobot (poin)', 'sk-bobot', cur.bobot, 'type="number" min="1" max="100" step="1"') +
    sel('Bab terkait (opsional)', 'sk-bab', ''),
    onOpen: m => {
      const fill = () => { const mp = val('sk-mapel'); $('#sk-bab', m.el).innerHTML = opts(meta.babOpsi.filter(b => b.mapel_id === mp).map(b => [b.id, b.label]), cur.bab_id, '— tanpa bab —'); };
      const toggle = () => { const j = val('sk-jenis'); $('#sk-pg', m.el).hidden = j !== 'pg'; $('#sk-bs', m.el).hidden = j !== 'bs'; $('#sk-es', m.el).hidden = j !== 'esai'; };
      $('#sk-mapel', m.el).addEventListener('change', fill); $('#sk-jenis', m.el).addEventListener('change', toggle); fill(); toggle();
    },
    onSubmit: async el => {
      const jenis = val('sk-jenis'); let opsi = [], kunci = '';
      if (jenis === 'pg') {
        const rows = [0, 1, 2, 3, 4].map(i => ({ t: val('sk-o' + i).trim(), chk: $$('input[name="sk-kunci"]', el)[i].checked })).filter(r => r.t);
        if (rows.length < 2) return 'Isi minimal dua pilihan jawaban.';
        const k = rows.findIndex(r => r.chk);
        if (k < 0) return 'Pilih kunci jawaban (lingkaran di sebelah pilihan yang benar).';
        opsi = rows.map(r => r.t); kunci = 'ABCDE'[k];
      } else if (jenis === 'bs') kunci = val('sk-kbs'); else kunci = val('sk-rub');
      const r = await api('gruSaveSoal', { id: s ? s.id : '', mapel_id: val('sk-mapel'), jenis, pertanyaan: val('sk-pert'), opsi, kunci, bobot: val('sk-bobot'), bab_id: val('sk-bab') });
      if (!r.success) return r.message; toast('Soal disimpan.'); done();
    } });
}

// ============================================================
// UJIAN & KUIS
// ============================================================
async function guruUjian(param) {
  if (param) return guruHasil(param);
  const c = $('#content');
  async function load() {
    c.innerHTML = '<div class="page-head"><h1>Ujian &amp; Kuis</h1></div>' + SPIN;
    const r = await api('gruListUjian', {});
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    const { items, mapel } = r.data;
    const stChip = t => chip({ draft: 'Draf', terbit: 'Terbit', ditutup: 'Ditutup' }[t.status], t.status === 'terbit' ? 'ok' : t.status === 'ditutup' ? 'err' : 'warn');
    c.innerHTML = '<div class="page-head row-between"><div><h1>Ujian &amp; Kuis</h1><p>Kerjakan di aplikasi (CBT) atau arahkan siswa ke tautan eksternal.</p></div>' +
      '<button class="btn btn-primary btn-sm" id="uj-add"' + (mapel.length ? '' : ' disabled') + '>+ Ujian</button></div>' +
      (items.length ? '<div class="card"><div class="list">' + items.map(u =>
        '<div class="list-item"><div class="li-main"><strong>' + esc(u.judul) + '</strong>' +
        '<span class="li-meta">' + (u.tipe === 'kuis' ? 'Kuis' : 'Ujian') + ' · ' + (u.mode === 'cbt' ? 'CBT aplikasi' : 'Tautan eksternal') + ' · ' + esc(u.mapel) + ' · Kelas ' + esc(u.kelas) + '</span>' +
        '<span class="li-meta">' + esc(fmtTenggat(u.mulai)) + ' → ' + esc(fmtTenggat(u.selesai)) + (u.mode === 'cbt' ? ' · ' + u.jumlah_soal + ' soal · ' + u.durasi_menit + ' menit · ' + u.mengerjakan + '/' + u.total + ' mengerjakan' + (u.menunggu ? ' · ' + u.menunggu + ' menunggu nilai esai' : '') : '') + '</span>' +
        (u.peringatan ? '<span class="li-meta" style="color:#92400E">⚠ Siswa kelas (' + u.total + ') melebihi kapasitas (' + u.kapasitas + '). Pecah sesi atau pakai tautan eksternal.</span>' : '') + '</div>' +
        '<div class="li-actions">' + stChip(u) + '<a class="btn btn-primary btn-sm" href="#/ujian/' + esc(u.id) + '">Hasil</a><button class="btn btn-secondary btn-sm" data-edit="' + esc(u.id) + '">Ubah</button><button class="btn btn-danger btn-sm" data-arsip="' + esc(u.id) + '">Arsip</button></div></div>').join('') + '</div></div>'
        : '<div class="empty">Belum ada ujian.</div>');
    const add = $('#uj-add'); if (add) add.addEventListener('click', () => formUjian(null, r.data, load));
    c.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) return formUjian(items.find(x => x.id === b.dataset.edit), r.data, load);
      if (b.dataset.arsip) { if (!confirm('Arsipkan ujian ini?')) return; const res = await api('gruArsipUjian', { id: b.dataset.arsip }); toast(res.message || 'Selesai.', !res.success); if (res.success) load(); }
    };
  }
  load();
}

function formUjian(u, data, done) {
  const cur = u || { tipe: 'ujian', mode: 'cbt', durasi_menit: 60, maks_percobaan: 1, acak_soal: true, acak_opsi: true, pembahasan: 'tidak', kapasitas: data.kapasitas_default, status: 'draft', soal_ids: [], url: '' };
  const chosen = new Set(cur.soal_ids || []);
  let bank = [];
  const mapelOf = mk => (data.mapel.find(m => m.mk_id === mk) || {}).mapel_id || '';
  modal({ title: u ? 'Ubah ujian' : 'Buat ujian', body:
    (u ? '' : sel('Kelas & mata pelajaran', 'uj-mk', opts(data.mapel.map(m => [m.mk_id, m.mapel + ' — Kelas ' + m.kelas]), '', '— pilih —'))) +
    fld('Judul', 'uj-judul', u ? u.judul : '', 'maxlength="120"') +
    sel('Jenis', 'uj-tipe', opts([['ujian', 'Ujian / penilaian'], ['kuis', 'Kuis']], cur.tipe)) +
    sel('Cara pelaksanaan', 'uj-mode', opts([['cbt', 'CBT di aplikasi'], ['eksternal', 'Tautan eksternal (Google Form, dll.)']], cur.mode)) +
    '<div id="uj-cbt">' +
      fld('Durasi (menit)', 'uj-dur', cur.durasi_menit, 'type="number" min="5" max="240"') +
      fld('Jumlah percobaan', 'uj-maks', cur.maks_percobaan, 'type="number" min="1" max="5"') +
      fld('Kapasitas peserta serentak', 'uj-kap', cur.kapasitas, 'type="number" min="5" max="200"') +
      '<label class="check"><input type="checkbox" id="uj-acs"' + (cur.acak_soal ? ' checked' : '') + '><span>Acak urutan soal untuk tiap siswa</span></label>' +
      '<label class="check"><input type="checkbox" id="uj-aco"' + (cur.acak_opsi ? ' checked' : '') + '><span>Acak urutan pilihan jawaban</span></label>' +
      sel('Pembahasan untuk siswa', 'uj-pem', opts([['tidak', 'Tidak ditampilkan'], ['setelah_selesai', 'Setelah siswa selesai'], ['setelah_tutup', 'Setelah ujian ditutup']], cur.pembahasan)) +
      '<span class="field-label">Pilih soal dari bank soal <span id="uj-cnt" class="li-meta"></span></span><div class="pick-list" id="uj-pick"><div class="empty">Pilih kelas dan mata pelajaran dulu.</div></div></div>' +
    '<div id="uj-ext" hidden>' + fld('Tautan ujian (https://…)', 'uj-url', cur.url, 'inputmode="url" autocapitalize="none"') +
      '<p class="hint">Siswa membuka tautan ini dari aplikasi. Nilainya Anda masukkan manual pada halaman Hasil.</p></div>' +
    fld('Mulai dibuka', 'uj-mulai', toLocalInput(u ? u.mulai : null), 'type="datetime-local"') + fld('Ditutup', 'uj-selesai', toLocalInput(u ? u.selesai : new Date(Date.now() + 8 * 864e5)), 'type="datetime-local"') +
    sel('Status', 'uj-st', opts([['draft', 'Draf (belum terlihat siswa)'], ['terbit', 'Terbit'], ['ditutup', 'Ditutup']], cur.status)),
    onOpen: m => {
      const drawPick = () => {
        const q = ''; const box = $('#uj-pick', m.el);
        box.innerHTML = bank.length ? bank.map(s => '<label class="pick-item"><input type="checkbox" data-id="' + esc(s.id) + '"' + (chosen.has(s.id) ? ' checked' : '') + '><span dir="auto"><strong>' + esc(trunc(s.pertanyaan, 90)) + '</strong><br><small class="li-meta">' + esc(JENIS_SOAL[s.jenis]) + ' · ' + s.bobot + ' poin</small></span></label>').join('') : '<div class="empty">Belum ada soal untuk mata pelajaran ini. Buat di menu Bank Soal.</div>';
        const pts = bank.filter(s => chosen.has(s.id)).reduce((a, s) => a + s.bobot, 0);
        $('#uj-cnt', m.el).textContent = '— ' + chosen.size + ' dipilih, total ' + pts + ' poin';
      };
      const loadBank = async () => {
        const mk = u ? u.mk_id : val('uj-mk'); if (!mk) return;
        $('#uj-pick', m.el).innerHTML = SPIN;
        const r = await api('gruListSoal', { mapel_id: u ? u.mapel_id : mapelOf(mk), limit: 200 });
        bank = r.success ? r.data.items : []; drawPick();
      };
      const toggle = () => { const e = val('uj-mode') === 'eksternal'; $('#uj-cbt', m.el).hidden = e; $('#uj-ext', m.el).hidden = !e; };
      $('#uj-mode', m.el).addEventListener('change', toggle); toggle();
      if (!u) $('#uj-mk', m.el).addEventListener('change', () => { chosen.clear(); loadBank(); });
      $('#uj-pick', m.el).addEventListener('change', e => { const cb = e.target.closest('[data-id]'); if (!cb) return; cb.checked ? chosen.add(cb.dataset.id) : chosen.delete(cb.dataset.id); drawPick(); });
      if (u) loadBank();
    },
    onSubmit: async () => {
      const mk = u ? u.mk_id : val('uj-mk'); if (!mk) return 'Pilih kelas dan mata pelajaran.';
      if (!val('uj-mulai') || !val('uj-selesai')) return 'Isi jadwal pembukaan dan penutupan.';
      const r = await api('gruSaveUjian', { id: u ? u.id : '', mk_id: mk, judul: val('uj-judul'), tipe: val('uj-tipe'), mode: val('uj-mode'),
        durasi_menit: val('uj-dur'), maks_percobaan: val('uj-maks'), kapasitas: val('uj-kap'), acak_soal: $('#uj-acs').checked, acak_opsi: $('#uj-aco').checked,
        pembahasan: val('uj-pem'), soal_ids: [...chosen], url: val('uj-url'), mulai: new Date(val('uj-mulai')).toISOString(), selesai: new Date(val('uj-selesai')).toISOString(), status: val('uj-st') });
      if (!r.success) return r.message;
      toast(r.message + (r.data.peringatan ? ' ' + r.data.peringatan : ''), !!r.data.peringatan); done();
    } });
}

// ============================================================
// HASIL & PENILAIAN
// ============================================================
async function guruHasil(id) {
  const c = $('#content');
  async function load() {
    c.innerHTML = SPIN;
    const r = await api('gruHasilUjian', { ujian_id: id });
    if (!r.success) { c.innerHTML = errBox(r.message) + '<p><a href="#/ujian">← Kembali</a></p>'; return; }
    const { ujian, rows, stats } = r.data, ext = ujian.mode === 'eksternal';
    const stChip = x => chip({ belum: 'Belum', berlangsung: 'Mengerjakan', menunggu_nilai: 'Menunggu nilai esai', dinilai: 'Selesai' }[x.status] || '', x.status === 'dinilai' ? 'ok' : x.status === 'belum' ? 'warn' : 'soft');
    c.innerHTML = '<p><a href="#/ujian">← Semua ujian</a></p>' +
      '<div class="page-head"><h1>' + esc(ujian.judul) + '</h1><p>Kelas ' + esc(ujian.kelas) + ' · ' + esc(fmtTenggat(ujian.mulai)) + ' → ' + esc(fmtTenggat(ujian.selesai)) + '</p></div>' +
      '<div class="stats"><div class="stat"><strong>' + stats.n + '</strong><span>Sudah bernilai</span></div><div class="stat"><strong>' + (stats.rata === '' ? '—' : stats.rata) + '</strong><span>Rata-rata</span></div>' +
      '<div class="stat"><strong>' + (stats.min === '' ? '—' : stats.min) + '</strong><span>Terendah</span></div><div class="stat"><strong>' + (stats.max === '' ? '—' : stats.max) + '</strong><span>Tertinggi</span></div></div>' +
      (ext ? '<div class="card" style="margin-top:16px"><div class="row-between"><h2>Input nilai manual</h2><a class="btn btn-secondary btn-sm" href="' + esc(ujian.url) + '" target="_blank" rel="noopener noreferrer">Buka tautan ujian ↗</a></div>' +
        '<div class="list">' + rows.map(x => '<div class="list-item"><div class="li-main"><strong>' + esc(x.nama) + '</strong><span class="li-meta">NISN ' + esc(x.nisn) + '</span></div><div class="li-actions"><input class="select" style="width:96px" type="number" min="0" max="100" step="0.5" data-nilai="' + esc(x.siswa_id) + '" value="' + esc(x.nilai) + '" aria-label="Nilai ' + esc(x.nama) + '"></div></div>').join('') + '</div>' +
        '<div style="margin-top:14px"><button class="btn btn-primary" id="nm-save">Simpan semua nilai</button></div></div>'
      : '<div class="card" style="margin-top:16px"><div class="list">' + rows.map(x => '<div class="list-item"><div class="li-main"><strong>' + esc(x.nama) + '</strong><span class="li-meta">NISN ' + esc(x.nisn) + (x.terbaik !== '' ? ' · nilai terbaik ' + x.terbaik : '') + '</span>' +
        (x.percobaan.length ? '<span class="li-meta">' + x.percobaan.map(p => 'Percobaan ' + p.ke + ': ' + ({ berlangsung: 'berjalan', menunggu_nilai: 'menunggu esai', dinilai: p.nilai }[p.status]) + (p.tab ? ' (pindah tab ' + p.tab + '×)' : '')).join(' · ') + '</span>' : '') + '</div>' +
        '<div class="li-actions">' + stChip(x) + x.percobaan.filter(p => p.status !== 'berlangsung').map(p => '<button class="btn btn-' + (p.status === 'menunggu_nilai' ? 'primary' : 'secondary') + ' btn-sm" data-att="' + esc(p.id) + '">' + (p.status === 'menunggu_nilai' ? 'Nilai esai' : 'Lihat') + ' #' + p.ke + '</button>').join('') + '</div></div>').join('') + '</div></div>');

    const save = $('#nm-save');
    if (save) save.addEventListener('click', async () => {
      setBusy(save, true, 'Menyimpan…');
      const res = await api('gruNilaiManual', { ujian_id: id, rows: $$('[data-nilai]').map(i => ({ siswa_id: i.dataset.nilai, nilai: i.value })) });
      setBusy(save, false); toast(res.message || 'Selesai.', !res.success); if (res.success) load();
    });
    c.onclick = e => { const b = e.target.closest('[data-att]'); if (b) openAttempt(b.dataset.att, load); };
  }
  load();
}

async function openAttempt(attId, done) {
  const r = await api('gruAttempt', { attempt_id: attId });
  if (!r.success) return toast(r.message, true);
  const a = r.data, pgbs = a.soal.filter(s => s.jenis !== 'esai'), esai = a.soal.filter(s => s.jenis === 'esai');
  const benar = pgbs.filter(s => s.benar).length;
  modal({ title: a.siswa + ' — percobaan ' + a.ke, submit: esai.length ? 'Simpan nilai esai' : '', cancel: 'Tutup', body:
    (a.tab ? '<p class="form-error" style="background:#FFFBEB;color:#92400E;border-color:#FDE68A">Siswa berpindah tab/jendela ' + a.tab + '× selama ujian.</p>' : '') +
    '<p><strong>Pilihan ganda &amp; benar/salah:</strong> ' + benar + ' benar dari ' + pgbs.length + (a.nilai !== '' ? ' · Nilai akhir: <strong>' + esc(a.nilai) + '</strong>' : '') + '</p>' +
    (pgbs.length ? '<details><summary>Rincian jawaban</summary><div class="list">' + pgbs.map((s, i) => '<div class="list-item"><div class="li-main"><span dir="auto">' + (i + 1) + '. ' + esc(trunc(s.pertanyaan, 120)) + '</span><span class="li-meta">Jawaban siswa: ' + esc(s.jawab || '—') + ' · kunci: ' + esc(s.kunci) + '</span></div>' + chip(s.benar ? 'Benar' : 'Salah', s.benar ? 'ok' : 'err') + '</div>').join('') + '</div></details>' : '') +
    esai.map((s, i) => '<div class="card" style="box-shadow:none;margin-top:12px"><h2 dir="auto">Esai ' + (i + 1) + ' (maks. ' + s.bobot + ')</h2><p dir="auto" style="white-space:pre-wrap">' + esc(s.pertanyaan) + '</p>' +
      '<p class="li-meta">Rubrik: ' + esc(s.rubrik || '—') + '</p><div class="secret"><div><small>Jawaban siswa</small><span dir="auto" style="white-space:pre-wrap">' + esc(s.jawab || '(tidak dijawab)') + '</span></div></div>' +
      fld('Skor (0–' + s.bobot + ')', 'es-' + s.id, s.skor === null ? '' : s.skor, 'type="number" min="0" max="' + s.bobot + '" step="0.5" data-es="' + esc(s.id) + '"') +
      '<label class="field"><span class="field-label">Umpan balik</span><textarea rows="2" maxlength="500" data-fb="' + esc(s.id) + '">' + esc(s.fb) + '</textarea></label></div>').join(''),
    onSubmit: async el => {
      const skor = {}, fb = {};
      $$('[data-es]', el).forEach(i => { skor[i.dataset.es] = i.value; });
      $$('[data-fb]', el).forEach(i => { fb[i.dataset.fb] = i.value; });
      const res = await api('gruNilaiEsai', { attempt_id: attId, skor, fb });
      if (!res.success) return res.message; toast(res.message); done();
    } });
}

Object.assign(window.GURU_PAGES, { soal: guruSoal, ujian: guruUjian });
