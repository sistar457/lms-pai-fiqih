// ============================================================
// LMS PAI & FIQIH — HALAMAN GURU (Fase 3)
// ============================================================

const first_ = () => esc((me.nama || '').split(' ')[0]);

window.guruBeranda = async function () {
  const c = $('#content');
  c.innerHTML = '<div class="hero"><h1>Assalamu\'alaikum, ' + first_() + '!</h1><p>Ringkasan pembelajaran Anda</p></div>' + SPIN;
  const r = await api('gruMapelSaya');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  const aktif = r.data.mapel.filter(m => m.aktif);
  const perlu = aktif.reduce((s, m) => s + m.perlu_nilai, 0);
  c.innerHTML = '<div class="stack"><div class="hero"><h1>Assalamu\'alaikum, ' + first_() + '!</h1><p>' + esc(cfg.nama_lembaga) + '</p></div>' +
    '<div class="stats"><a class="stat" href="#/materi"><strong>' + aktif.length + '</strong><span>Kelas &amp; mapel diampu</span></a>' +
    '<a class="stat" href="#/tugas"><strong>' + perlu + '</strong><span>Tugas perlu dinilai</span></a></div>' +
    (aktif.length ? '<div class="grid-3">' + aktif.map(m => mapelCard(m, '#/materi/' + m.mk_id, m.bab + ' bab · ' + m.tugas + ' tugas')).join('') + '</div>'
      : '<div class="card"><h2>Belum ada penugasan</h2><p class="hint">Admin belum menugaskan Anda pada kelas dan mata pelajaran di semester aktif.</p></div>') + '</div>';
};

// ============================================================
// BAB & MATERI
// ============================================================
async function guruMateri(param) {
  if (param) return guruMateriDetail(param);
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Bab &amp; Materi</h1><p>Pilih kelas dan mata pelajaran.</p></div>' + SPIN;
  const r = await api('gruMapelSaya');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  const list = r.data.mapel;
  c.innerHTML = '<div class="page-head"><h1>Bab &amp; Materi</h1><p>Pilih kelas dan mata pelajaran.</p></div>' +
    (list.length ? '<div class="grid-3">' + list.map(m => mapelCard(m, '#/materi/' + m.mk_id, m.bab + ' bab · ' + m.tugas + ' tugas' + (m.aktif ? '' : ' · semester lalu'))).join('') + '</div>'
      : '<div class="empty">Anda belum ditugaskan pada kelas dan mata pelajaran mana pun. Hubungi admin.</div>');
}

async function guruMateriDetail(mkId) {
  const c = $('#content');
  async function load() {
    c.innerHTML = SPIN;
    const r = await api('gruGetMapel', { mk_id: mkId });
    if (!r.success) { c.innerHTML = errBox(r.message) + '<p><a href="#/materi">← Kembali</a></p>'; return; }
    const { info, bab } = r.data;
    c.innerHTML = '<p><a href="#/materi">← Semua mata pelajaran</a></p>' +
      '<div class="page-head row-between"><div><h1>' + esc(info.mapel) + ' — Kelas ' + esc(info.kelas) + '</h1><p>Semester ' + esc(info.semester) + '</p></div>' +
      '<button class="btn btn-primary btn-sm" id="bab-add">+ Bab</button></div>' +
      (bab.length ? '<div class="stack">' + bab.map(b =>
        '<div class="card"><div class="row-between"><div><h2>Bab ' + b.urutan + ' · ' + esc(b.judul) + '</h2>' +
        (b.deskripsi ? '<p class="hint" style="margin:0">' + esc(b.deskripsi) + '</p>' : '') + '</div>' +
        '<div class="li-actions">' + chip(b.status === 'terbit' ? 'Terbit' : 'Draf', b.status === 'terbit' ? 'ok' : 'warn') +
        '<button class="btn btn-secondary btn-sm" data-bab-edit="' + esc(b.id) + '">Ubah</button>' +
        '<button class="btn btn-danger btn-sm" data-arsip="bab" data-id="' + esc(b.id) + '">Arsip</button></div></div>' +
        '<div class="list" style="margin-top:8px">' + (b.materi.length ? b.materi.map(m =>
          '<div class="list-item"><div class="li-main"><strong>' + esc(m.judul) + '</strong><span class="li-meta">' + esc(JENIS_LABEL[m.jenis]) + (m.lampiran.length ? ' · ' + m.lampiran.length + ' berkas' : '') + '</span></div>' +
          '<div class="li-actions">' + chip(m.status === 'terbit' ? 'Terbit' : 'Draf', m.status === 'terbit' ? 'ok' : 'warn') +
          '<button class="btn btn-secondary btn-sm" data-mat-edit="' + esc(m.id) + '">Ubah</button>' +
          '<button class="btn btn-danger btn-sm" data-arsip="materi" data-id="' + esc(m.id) + '">Arsip</button></div></div>').join('') : '<div class="empty">Belum ada materi pada bab ini.</div>') + '</div>' +
        '<div style="margin-top:12px"><button class="btn btn-secondary btn-sm" data-mat-add="' + esc(b.id) + '">+ Materi</button></div></div>').join('') + '</div>'
        : '<div class="empty">Belum ada bab. Klik “+ Bab” untuk memulai.</div>');

    $('#bab-add').addEventListener('click', () => formBab(mkId, null, load));
    c.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.babEdit) return formBab(mkId, bab.find(x => x.id === t.dataset.babEdit), load);
      if (t.dataset.matAdd) return formMateri(t.dataset.matAdd, null, load);
      if (t.dataset.matEdit) { const m = bab.flatMap(b => b.materi.map(x => Object.assign({ bab_id: b.id }, x))).find(x => x.id === t.dataset.matEdit); return formMateri(m.bab_id, m, load); }
      if (t.dataset.arsip) {
        if (!confirm('Pindahkan ke arsip? Siswa tidak akan melihatnya lagi.')) return;
        const res = await api('gruArsip', { tipe: t.dataset.arsip, id: t.dataset.id });
        toast(res.message || 'Selesai.', !res.success); if (res.success) load();
      }
    };
  }
  load();
}

function formBab(mkId, b, done) {
  modal({ title: b ? 'Ubah bab' : 'Tambah bab', body:
    fld('Judul bab', 'bb-judul', b ? b.judul : '', 'maxlength="120"') +
    '<label class="field"><span class="field-label">Deskripsi singkat (opsional)</span><textarea id="bb-desk" maxlength="500" rows="3">' + esc(b ? b.deskripsi : '') + '</textarea></label>' +
    fld('Nomor urut', 'bb-urut', b ? b.urutan : '', 'type="number" min="1" placeholder="Otomatis"') +
    sel('Status', 'bb-st', opts([['draft', 'Draf (belum terlihat siswa)'], ['terbit', 'Terbit']], b ? b.status : 'draft')),
    onSubmit: async () => {
      const r = await api('gruSaveBab', { id: b ? b.id : '', mk_id: mkId, judul: val('bb-judul'), deskripsi: val('bb-desk'), urutan: val('bb-urut'), status: val('bb-st') });
      if (!r.success) return r.message; toast('Bab disimpan.'); done();
    } });
}

function formMateri(babId, m, done) {
  const cur = m || { jenis: 'teks', status: 'draft', lampiran: [] };
  const m_ = modal({ title: m ? 'Ubah materi' : 'Tambah materi', body:
    fld('Judul materi', 'mt-judul', m ? m.judul : '', 'maxlength="120"') +
    sel('Jenis materi', 'mt-jenis', opts(Object.entries(JENIS_LABEL), cur.jenis)) +
    '<div id="mt-teks"><label class="field"><span class="field-label">Isi materi</span><textarea id="mt-isi" rows="9" maxlength="20000">' + esc(cur.jenis === 'teks' ? cur.isi : '') + '</textarea>' +
    '<small>Pisahkan paragraf dengan baris kosong. Awali paragraf dengan “&gt; ” untuk menampilkan ayat atau hadits sebagai kutipan.</small></label></div>' +
    '<div id="mt-url" hidden>' + fld('Tautan (https://…)', 'mt-link', cur.url, 'inputmode="url" autocapitalize="none"') +
    '<label class="field"><span class="field-label">Keterangan (opsional)</span><textarea id="mt-ket" rows="3" maxlength="1000">' + esc(cur.jenis === 'video' || cur.jenis === 'tautan' ? cur.isi : '') + '</textarea></label></div>' +
    '<div id="mt-file" hidden><label class="field"><span class="field-label">Unggah berkas (maks. 5 MB)</span><input type="file" id="mt-berkas" accept="' + FILE_ACCEPT + '"><small>PDF, DOCX, PPTX, gambar, atau audio.</small></label>' +
    '<div id="mt-lamp">' + (cur.lampiran || []).map(l => '<div class="list-item" data-l="' + esc(l.id) + '"><div class="li-main"><strong>' + esc(l.nama) + '</strong><span class="li-meta">' + fmtSize(l.ukuran) + '</span></div><div class="li-actions"><button type="button" class="btn btn-danger btn-sm" data-del-l="' + esc(l.id) + '">Hapus</button></div></div>').join('') + '</div></div>' +
    sel('Status', 'mt-st', opts([['draft', 'Draf (belum terlihat siswa)'], ['terbit', 'Terbit']], cur.status)),
    onOpen: mm => {
      const toggle = () => { const j = val('mt-jenis'); $('#mt-teks', mm.el).hidden = j !== 'teks'; $('#mt-url', mm.el).hidden = !(j === 'video' || j === 'tautan'); $('#mt-file', mm.el).hidden = !(j === 'pdf' || j === 'modul'); };
      $('#mt-jenis', mm.el).addEventListener('change', toggle); toggle();
      $('#mt-lamp', mm.el).addEventListener('click', async e => {
        const b = e.target.closest('[data-del-l]'); if (!b || !confirm('Hapus berkas ini?')) return;
        const r = await api('deleteLampiran', { id: b.dataset.delL });
        if (!r.success) return toast(r.message, true);
        b.closest('[data-l]').remove(); toast('Berkas dihapus.'); done();
      });
    },
    onSubmit: async () => {
      const j = val('mt-jenis');
      const file = (j === 'pdf' || j === 'modul') ? await fileToPayload($('#mt-berkas').files[0]) : null;
      const r = await api('gruSaveMateri', { id: m ? m.id : '', bab_id: babId, judul: val('mt-judul'), jenis: j, status: val('mt-st'),
        isi: j === 'teks' ? val('mt-isi') : val('mt-ket'), url: val('mt-link'), file });
      if (!r.success) return r.message; toast('Materi disimpan.'); done();
    } });
}

// ============================================================
// TUGAS & PENILAIAN
// ============================================================
async function guruTugas(param) {
  if (param) return guruPengumpulan(param);
  const c = $('#content');
  async function load() {
    c.innerHTML = '<div class="page-head"><h1>Tugas &amp; Pengumpulan</h1></div>' + SPIN;
    const r = await api('gruListTugas', {});
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    const { items, mapel } = r.data, aktif = mapel.filter(m => m.aktif);
    const stChip = t => chip({ draft: 'Draf', terbit: 'Terbit', ditutup: 'Ditutup' }[t.status], t.status === 'terbit' ? 'ok' : t.status === 'ditutup' ? 'err' : 'warn');
    c.innerHTML = '<div class="page-head row-between"><div><h1>Tugas &amp; Pengumpulan</h1><p>Buat tugas, periksa jawaban, dan beri nilai.</p></div>' +
      '<button class="btn btn-primary btn-sm" id="tg-add"' + (aktif.length ? '' : ' disabled') + '>+ Tugas</button></div>' +
      (items.length ? '<div class="card"><div class="list">' + items.map(t =>
        '<div class="list-item"><div class="li-main"><strong>' + esc(t.judul) + '</strong><span class="li-meta">' + esc(t.mapel) + ' · Kelas ' + esc(t.kelas) + ' · tenggat ' + esc(fmtTenggat(t.tenggat)) + '</span>' +
        '<span class="li-meta">' + t.terkumpul + '/' + t.total + ' terkumpul · ' + t.dinilai + ' dinilai</span></div>' +
        '<div class="li-actions">' + stChip(t) + '<a class="btn btn-primary btn-sm" href="#/tugas/' + esc(t.id) + '">Periksa</a>' +
        '<button class="btn btn-secondary btn-sm" data-edit="' + esc(t.id) + '">Ubah</button>' +
        '<button class="btn btn-danger btn-sm" data-arsip="' + esc(t.id) + '">Arsip</button></div></div>').join('') + '</div></div>'
        : '<div class="empty">Belum ada tugas.</div>');
    const add = $('#tg-add'); if (add) add.addEventListener('click', () => formTugas(null, aktif, load));
    c.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) return formTugas(items.find(x => x.id === b.dataset.edit), mapel, load);
      if (b.dataset.arsip) {
        if (!confirm('Pindahkan tugas ini ke arsip?')) return;
        const res = await api('gruArsip', { tipe: 'tugas', id: b.dataset.arsip });
        toast(res.message || 'Selesai.', !res.success); if (res.success) load();
      }
    };
  }
  load();
}

function formTugas(t, mapelList, done) {
  const cur = t || { jenis_jawaban: 'berkas', status: 'draft', lampiran: [] };
  modal({ title: t ? 'Ubah tugas' : 'Buat tugas', body:
    (t ? '' : sel('Kelas & mata pelajaran', 'tg-mk', opts(mapelList.map(m => [m.mk_id, m.mapel + ' — Kelas ' + m.kelas]), '', '— pilih —'))) +
    fld('Judul tugas', 'tg-judul', t ? t.judul : '', 'maxlength="120"') +
    '<label class="field"><span class="field-label">Instruksi</span><textarea id="tg-ins" rows="6" maxlength="5000">' + esc(t ? t.instruksi : '') + '</textarea></label>' +
    sel('Jenis jawaban siswa', 'tg-jenis', opts(Object.entries(JAWAB_LABEL), cur.jenis_jawaban)) +
    fld('Tenggat pengumpulan', 'tg-tenggat', toLocalInput(t ? t.tenggat : null), 'type="datetime-local"') +
    '<label class="field"><span class="field-label">Lampiran soal/bahan (opsional, maks. 5 MB)</span><input type="file" id="tg-berkas" accept="' + FILE_ACCEPT + '">' +
    (cur.lampiran || []).map(l => '<small>Terlampir: ' + esc(l.nama) + '</small>').join('') + '</label>' +
    sel('Status', 'tg-st', opts([['draft', 'Draf (belum terlihat siswa)'], ['terbit', 'Terbit'], ['ditutup', 'Ditutup (tidak menerima jawaban)']], cur.status)),
    onSubmit: async () => {
      const mk = t ? t.mk_id : val('tg-mk');
      if (!mk) return 'Pilih kelas dan mata pelajaran.';
      const tg = val('tg-tenggat'); if (!tg) return 'Isi tenggat pengumpulan.';
      const file = await fileToPayload($('#tg-berkas').files[0]);
      const r = await api('gruSaveTugas', { id: t ? t.id : '', mk_id: mk, judul: val('tg-judul'), instruksi: val('tg-ins'), jenis_jawaban: val('tg-jenis'),
        tenggat: new Date(tg).toISOString(), status: val('tg-st'), file });
      if (!r.success) return r.message; toast('Tugas disimpan.'); done();
    } });
}

async function guruPengumpulan(tugasId) {
  const c = $('#content');
  async function load() {
    c.innerHTML = SPIN;
    const r = await api('gruPengumpulan', { tugas_id: tugasId });
    if (!r.success) { c.innerHTML = errBox(r.message) + '<p><a href="#/tugas">← Kembali</a></p>'; return; }
    const { tugas, rows } = r.data;
    const done_ = rows.filter(x => x.status !== 'belum').length;
    const chipOf = x => x.status === 'dinilai' ? chip('Nilai ' + x.nilai, 'ok') : x.status === 'dikumpulkan' ? chip(x.terlambat ? 'Terlambat — perlu dinilai' : 'Perlu dinilai', 'soft') : chip('Belum mengumpulkan', 'warn');
    c.innerHTML = '<p><a href="#/tugas">← Semua tugas</a></p>' +
      '<div class="page-head"><h1>' + esc(tugas.judul) + '</h1><p>Tenggat ' + esc(fmtTenggat(tugas.tenggat)) + ' · ' + done_ + ' dari ' + rows.length + ' siswa sudah mengumpulkan</p></div>' +
      '<div class="card"><h2>Instruksi</h2><p dir="auto" style="white-space:pre-wrap">' + esc(tugas.instruksi) + '</p></div>' +
      '<div class="card" style="margin-top:16px"><div class="list">' + (rows.length ? rows.map(x =>
        '<div class="list-item"><div class="li-main"><strong>' + esc(x.nama) + '</strong><span class="li-meta">NISN ' + esc(x.nisn) + (x.waktu_kumpul ? ' · ' + esc(fmtTenggat(x.waktu_kumpul)) : '') + '</span></div>' +
        '<div class="li-actions">' + chipOf(x) + (x.status !== 'belum' ? '<button class="btn btn-primary btn-sm" data-nilai="' + esc(x.siswa_id) + '">' + (x.status === 'dinilai' ? 'Lihat / ubah' : 'Periksa') + '</button>' : '') + '</div></div>').join('')
        : '<div class="empty">Belum ada siswa di kelas ini.</div>') + '</div></div>';
    c.onclick = e => {
      const b = e.target.closest('[data-nilai]'); if (!b) return;
      const x = rows.find(y => y.siswa_id === b.dataset.nilai);
      modal({ title: 'Jawaban ' + x.nama, body:
        (x.terlambat ? '<p class="form-error" style="background:#FFFBEB;color:#92400E;border-color:#FDE68A">Dikumpulkan setelah tenggat.</p>' : '') +
        (x.jawaban_teks ? '<div class="card" style="box-shadow:none;margin-bottom:12px"><h2>Jawaban teks</h2><p dir="auto" style="white-space:pre-wrap">' + esc(x.jawaban_teks) + '</p></div>' : '') +
        (x.url ? '<p>' + safeLink(x.url) + '</p>' : '') + (x.file ? '<p>' + fileBtn(x.file) + '</p>' : '') +
        fld('Nilai (0–100)', 'nl-nilai', x.nilai, 'type="number" min="0" max="100" step="0.5" inputmode="decimal"') +
        '<label class="field"><span class="field-label">Umpan balik untuk siswa</span><textarea id="nl-fb" rows="4" maxlength="1000">' + esc(x.umpan_balik) + '</textarea></label>',
        submit: 'Simpan nilai',
        onSubmit: async () => { const res = await api('gruNilai', { pengumpulan_id: x.pengumpulan_id, nilai: val('nl-nilai'), umpan_balik: val('nl-fb') }); if (!res.success) return res.message; toast('Nilai disimpan.'); load(); } });
    };
  }
  load();
}

window.GURU_PAGES = { materi: guruMateri, tugas: guruTugas };
