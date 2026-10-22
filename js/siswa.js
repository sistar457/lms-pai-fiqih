// ============================================================
// LMS PAI & FIQIH — HALAMAN SISWA (Fase 3)
// ============================================================

const tugasRow = t =>
  '<a class="list-item row-link" href="#/tugas/' + esc(t.id) + '"><div class="li-main"><strong>' + esc(t.judul) + '</strong>' +
  '<span class="li-meta">' + esc(t.mapel || '') + (t.mapel ? ' · ' : '') + 'tenggat ' + esc(fmtTenggat(t.tenggat)) + '</span></div>' +
  '<div class="li-actions">' + stateChip(t) + '</div></a>';

window.siswaBeranda = async function () {
  const c = $('#content');
  c.innerHTML = '<div class="hero"><h1>Assalamu\'alaikum, ' + first_() + '!</h1><p>Semangat menimba ilmu hari ini.</p></div>' + SPIN;
  const [rt, rm] = await Promise.all([api('sisTugasSaya'), api('sisMapelSaya')]);
  if (!rt.success || !rm.success) { c.innerHTML = errBox((rt.message || rm.message)); return; }
  const belum = rt.data.items.filter(t => t.state === 'belum' && t.status === 'terbit');
  c.innerHTML = '<div class="stack"><div class="hero"><h1>Assalamu\'alaikum, ' + first_() + '!</h1><p>' + esc(cfg.nama_lembaga) + '</p></div>' +
    '<div class="stats"><a class="stat" href="#/tugas"><strong>' + belum.length + '</strong><span>Tugas belum dikerjakan</span></a>' +
    '<a class="stat" href="#/materi"><strong>' + rm.data.mapel.length + '</strong><span>Mata pelajaran</span></a></div>' +
    '<div class="card"><div class="row-between"><h2>Tugas mendatang</h2><a href="#/tugas">Semua tugas →</a></div>' +
    (belum.length ? '<div class="list">' + belum.slice(0, 3).map(tugasRow).join('') + '</div>' : '<div class="empty">Tidak ada tugas yang menunggu. Alhamdulillah!</div>') + '</div>' +
    '<div><h2 style="margin-bottom:10px">Mata pelajaran</h2>' +
    (rm.data.mapel.length ? '<div class="grid-3">' + rm.data.mapel.map(m => mapelCard(m, '#/materi/' + m.mk_id, esc(m.guru || ''))).join('') + '</div>'
      : '<div class="empty">Anda belum terdaftar di kelas mana pun. Hubungi admin sekolah.</div>') + '</div></div>';
};

// ============================================================
// MATERI
// ============================================================
async function siswaMateri(param) {
  const c = $('#content');
  if (!param) {
    c.innerHTML = '<div class="page-head"><h1>Materi Pembelajaran</h1><p>Pilih mata pelajaran.</p></div>' + SPIN;
    const r = await api('sisMapelSaya');
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    c.innerHTML = '<div class="page-head"><h1>Materi Pembelajaran</h1><p>Pilih mata pelajaran.</p></div>' +
      (r.data.mapel.length ? '<div class="grid-3">' + r.data.mapel.map(m => mapelCard(m, '#/materi/' + m.mk_id, m.bab + ' bab · ' + m.tugas + ' tugas' + (m.guru ? '<br>' + esc(m.guru) : ''))).join('') + '</div>'
        : '<div class="empty">Anda belum terdaftar di kelas mana pun. Hubungi admin sekolah.</div>');
    return;
  }
  c.innerHTML = SPIN;
  const r = await api('sisGetMapel', { mk_id: param });
  if (!r.success) { c.innerHTML = errBox(r.message) + '<p><a href="#/materi">← Kembali</a></p>'; return; }
  const { info, bab, tugas } = r.data;
  c.innerHTML = '<p><a href="#/materi">← Semua mata pelajaran</a></p>' +
    '<div class="page-head"><h1>' + esc(info.mapel) + '</h1><p>Kelas ' + esc(info.kelas) + (info.guru ? ' · ' + esc(info.guru) : '') + '</p></div><div class="stack">' +
    (bab.length ? bab.map(b =>
      '<div class="card"><h2>Bab ' + b.urutan + ' · ' + esc(b.judul) + '</h2>' + (b.deskripsi ? '<p class="hint" style="margin:0">' + esc(b.deskripsi) + '</p>' : '') +
      '<div class="list" style="margin-top:8px">' + (b.materi.length ? b.materi.map(m =>
        '<div class="list-item"><div class="li-main"><strong>' + esc(m.judul) + '</strong><span class="li-meta">' + esc(JENIS_LABEL[m.jenis]) + '</span></div>' +
        '<div class="li-actions"><button class="btn btn-primary btn-sm" data-buka="' + esc(m.id) + '">Buka</button></div></div>').join('') : '<div class="empty">Materi belum tersedia.</div>') + '</div></div>').join('')
      : '<div class="empty">Guru belum menerbitkan materi.</div>') +
    (tugas.length ? '<div class="card"><h2>Tugas</h2><div class="list">' + tugas.map(t => tugasRow(Object.assign({ lewat: t.state === 'belum' && new Date(t.tenggat) < new Date() }, t))).join('') + '</div></div>' : '') + '</div>';

  c.onclick = e => {
    const b = e.target.closest('[data-buka]'); if (!b) return;
    const m = bab.flatMap(x => x.materi).find(y => y.id === b.dataset.buka);
    const body = m.jenis === 'teks' ? '<div class="materi-teks">' + renderTeks(m.isi) + '</div>'
      : (m.jenis === 'video' || m.jenis === 'tautan') ? (m.isi ? '<p dir="auto" style="white-space:pre-wrap">' + esc(m.isi) + '</p>' : '') + '<p>' + safeLink(m.url) + '</p>'
      : (m.isi ? '<p>' + esc(m.isi) + '</p>' : '') + (m.lampiran.length ? lampiranHtml(m.lampiran) : '<div class="empty">Berkas belum tersedia.</div>');
    modal({ title: m.judul, body: body, submit: '', cancel: 'Tutup' });
  };
}

// ============================================================
// TUGAS
// ============================================================
async function siswaTugas(param) {
  const c = $('#content');
  if (param) return siswaTugasDetail(param);
  let filter = 'semua', items = [];
  const draw = () => {
    const f = items.filter(t => filter === 'semua' || (filter === 'belum' ? t.state === 'belum' : filter === 'dikumpulkan' ? t.state === 'dikumpulkan' : t.state === 'dinilai'));
    $('#ts-list').innerHTML = f.length ? '<div class="list">' + f.map(tugasRow).join('') + '</div>' : '<div class="empty">Tidak ada tugas pada kategori ini.</div>';
  };
  c.innerHTML = '<div class="page-head"><h1>Tugas Saya</h1><p>Kerjakan sebelum tenggat.</p></div>' + SPIN;
  const r = await api('sisTugasSaya');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  items = r.data.items;
  c.innerHTML = '<div class="page-head"><h1>Tugas Saya</h1><p>Kerjakan sebelum tenggat.</p></div>' +
    '<div class="tabs" id="ts-tabs">' + [['semua', 'Semua'], ['belum', 'Belum'], ['dikumpulkan', 'Terkirim'], ['dinilai', 'Dinilai']].map(([k, l], i) => '<button data-f="' + k + '"' + (i ? '' : ' class="active"') + '>' + l + '</button>').join('') + '</div>' +
    '<div class="card" id="ts-list"></div>';
  $('#ts-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.f; $$('#ts-tabs button').forEach(x => x.classList.toggle('active', x === b)); draw(); });
  draw();
}

async function siswaTugasDetail(id) {
  const c = $('#content');
  async function load() {
    c.innerHTML = SPIN;
    const r = await api('sisGetTugas', { tugas_id: id });
    if (!r.success) { c.innerHTML = errBox(r.message) + '<p><a href="#/tugas">← Kembali</a></p>'; return; }
    const { tugas: t, saya } = r.data;
    const open = t.status === 'terbit' && !(saya && saya.status === 'dinilai');
    const j = t.jenis_jawaban;
    c.innerHTML = '<p><a href="#/tugas">← Semua tugas</a></p>' +
      '<div class="page-head"><span class="chip chip-soft">' + esc(t.mapel) + '</span><h1 style="margin-top:8px">' + esc(t.judul) + '</h1>' +
      '<p>Tenggat ' + esc(fmtTenggat(t.tenggat)) + (t.status === 'ditutup' ? ' · ' + 'ditutup' : '') + '</p></div><div class="stack">' +
      '<div class="card"><h2>Instruksi</h2><p dir="auto" style="white-space:pre-wrap">' + esc(t.instruksi) + '</p>' + lampiranHtml(t.lampiran) + '</div>' +
      (saya ? '<div class="card"><h2>Pengumpulan Anda</h2><p class="hint" style="margin:0 0 8px">' + stateChip({ state: saya.status, terlambat: saya.terlambat, nilai: saya.nilai, status: t.status }) +
        ' · dikirim ' + esc(fmtTenggat(saya.waktu_kumpul)) + '</p>' +
        (saya.jawaban_teks ? '<p dir="auto" style="white-space:pre-wrap">' + esc(saya.jawaban_teks) + '</p>' : '') + (saya.url ? '<p>' + safeLink(saya.url) + '</p>' : '') + (saya.file ? '<p>' + fileBtn(saya.file) + '</p>' : '') +
        (saya.status === 'dinilai' ? '<div class="secret"><div><small>Nilai</small><strong style="font-size:28px;color:var(--primary)">' + esc(saya.nilai) + '</strong></div>' + (saya.umpan_balik ? '<div><small>Umpan balik guru</small><span dir="auto" style="white-space:pre-wrap">' + esc(saya.umpan_balik) + '</span></div>' : '') + '</div>' : '') + '</div>' : '') +
      (open ? '<form id="ts-form" class="card" novalidate><h2>' + (saya ? 'Kirim ulang jawaban' : 'Jawaban Anda') + '</h2>' +
        (saya ? '<p class="hint">Mengirim ulang akan menggantikan jawaban sebelumnya selama belum dinilai.</p>' : '') +
        (j === 'teks' || j === 'kombinasi' ? '<label class="field"><span class="field-label">Jawaban teks</span><textarea id="ts-teks" rows="7" maxlength="10000" dir="auto">' + esc(saya ? saya.jawaban_teks : '') + '</textarea></label>' : '') +
        (j === 'berkas' || j === 'kombinasi' ? '<label class="field"><span class="field-label">Berkas jawaban (PDF, foto, dokumen, atau audio — maks. 5 MB)</span><input type="file" id="ts-berkas" accept="' + FILE_ACCEPT + '"></label>' : '') +
        (j === 'tautan' || j === 'kombinasi' ? fld('Tautan jawaban (https://…)', 'ts-url', saya ? saya.url : '', 'inputmode="url" autocapitalize="none"') : '') +
        '<label class="check"><input type="checkbox" id="ts-ikrar"><span><strong>Ikrar Kejujuran:</strong> Saya menyatakan tugas ini adalah hasil karya saya sendiri dan mematuhi adab menuntut ilmu.</span></label>' +
        '<p id="ts-err" class="form-error" hidden></p><button type="submit" class="btn btn-primary btn-block" id="ts-btn">Kirim tugas sekarang</button></form>'
        : (t.status === 'ditutup' ? '<div class="empty">Tugas ini sudah ditutup oleh guru.</div>' : '')) + '</div>';

    const form = $('#ts-form');
    if (form) form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const err = $('#ts-err'), btn = $('#ts-btn'); err.hidden = true;
      if (!$('#ts-ikrar').checked) { err.textContent = 'Centang Ikrar Kejujuran terlebih dahulu.'; err.hidden = false; return; }
      setBusy(btn, true, 'Mengirim…');
      let file = null;
      try { file = $('#ts-berkas') ? await fileToPayload($('#ts-berkas').files[0]) : null; } catch (e) { setBusy(btn, false); err.textContent = e.message; err.hidden = false; return; }
      const res = await api('sisKumpul', { tugas_id: id, jawaban_teks: $('#ts-teks') ? $('#ts-teks').value : '', url: $('#ts-url') ? $('#ts-url').value : '', file });
      setBusy(btn, false);
      if (!res.success) { err.textContent = res.message; err.hidden = false; return; }
      toast(res.message); load();
    });
  }
  load();
}

window.SISWA_PAGES = { materi: siswaMateri, tugas: siswaTugas };
