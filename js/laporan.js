// ============================================================
// LMS PAI & FIQIH — LAPORAN & CADANGAN (Fase 5C)
// Admin: ringkasan per kelas×mapel dan leger nilai per kelas. Guru: leger untuk kelas yang ia WALI.
// Admin (Pengaturan): panel cadangan data. Memakai fmtN (nilai-guru.js), downloadCSV/opts (admin.js).
// ============================================================

function tabelLeger(data) {
  const { mapel, rows } = data, mk = mapel.map(m => m.mk_id);
  const sel_ = (v, kkm) => v.akhir === null ? '<td class="num">—</td>' : '<td class="num' + (v.tuntas === false ? ' rendah' : '') + '">' + fmtN(v.akhir) + (v.sementara ? '*' : '') + '<small>' + esc(v.predikat || '') + '</small></td>';
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th>' + mapel.map(m => '<th class="num">' + esc(m.nama) + '<small>KKM ' + fmtN(m.kkm) + '</small></th>').join('') +
    '<th class="num">Rata-rata</th><th class="num">Kehadiran</th><th class="num">Alpa</th></tr></thead><tbody>' +
    (rows.length ? rows.map(r => '<tr><td><strong>' + esc(r.nama) + '</strong><small>NISN ' + esc(r.nisn) + '</small></td>' + mk.map((id, i) => sel_(r.nilai[id], mapel[i].kkm)).join('') +
      '<td class="num"><strong>' + fmtN(r.rata) + '</strong></td><td class="num">' + (r.kehadiran === null ? '—' : fmtN(r.kehadiran) + '%') + '</td><td class="num' + (r.alpa ? ' rendah' : '') + '">' + r.alpa + '</td></tr>').join('')
      : '<tr><td colspan="' + (mapel.length + 4) + '"><div class="empty">Tidak ada siswa.</div></td></tr>') + '</tbody></table></div>' +
    '<p class="hint" style="margin-top:8px">Merah = di bawah KKM. Tanda * = nilai sementara (ada komponen yang belum terisi).</p>';
}
function csvLeger(data, nama) {
  const { mapel, rows, kelas, semester } = data, mk = mapel.map(m => m.mk_id);
  downloadCSV('leger-' + String(kelas.nama).replace(/\W+/g, '-') + '-' + String(semester.nama) + '.csv',
    [['Nama', 'NISN'].concat(mapel.map(m => m.nama), ['Rata-rata', 'Kehadiran (%)', 'Hadir', 'Izin', 'Sakit', 'Alpa'])].concat(rows.map(r =>
      [r.nama, r.nisn].concat(mk.map(id => r.nilai[id].akhir === null ? '' : r.nilai[id].akhir), [r.rata === null ? '' : r.rata, r.kehadiran === null ? '' : r.kehadiran, r.hadir, r.izin, r.sakit, r.alpa]))));
}

// ============================================================
// ADMIN
// ============================================================
async function adminLaporan() {
  const c = $('#content');
  let semId = '', tab = 'ringkasan', kelasId = '';
  async function load() {
    c.innerHTML = '<div class="page-head"><h1>Laporan</h1></div>' + SPIN;
    const r = await api('admLaporanRingkasan', { semester_id: semId });
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    const d = r.data; semId = d.semester_id;
    if (!d.kelas.some(k => k.id === kelasId)) kelasId = d.kelas.length ? d.kelas[0].id : '';
    c.innerHTML = '<div class="page-head"><h1>Laporan</h1><p>Ringkasan pembelajaran dan leger nilai per kelas.</p></div>' +
      '<div class="toolbar"><select id="lp-sem" class="select" aria-label="Semester">' + opts(d.semester.map(s => [s.id, s.label + (s.aktif ? ' (aktif)' : '')]), semId) + '</select></div>' +
      '<div class="tabs" id="lp-tabs"><button data-t="ringkasan"' + (tab === 'ringkasan' ? ' class="active"' : '') + '>Ringkasan</button><button data-t="leger"' + (tab === 'leger' ? ' class="active"' : '') + '>Leger kelas</button></div><div id="lp-body"></div>';
    $('#lp-sem').addEventListener('change', e => { semId = e.target.value; load(); });
    $('#lp-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; $$('#lp-tabs button').forEach(x => x.classList.toggle('active', x === b)); gambar(); } });
    const gambar = () => (tab === 'ringkasan' ? ringkasan(d) : leger(d));
    gambar();
  }
  function ringkasan(d) {
    $('#lp-body').innerHTML = '<div class="card"><div class="row-between"><h2>Ringkasan kelas &amp; mata pelajaran</h2><button class="btn btn-secondary btn-sm" id="lp-csv">Unduh CSV</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kelas</th><th>Mata pelajaran</th><th class="num">Siswa</th><th class="num">Bernilai</th><th class="num">Rata-rata</th><th class="num">Tuntas</th><th class="num">Belum</th><th class="num">Kehadiran</th><th class="num">Tugas</th><th class="num">Ujian</th></tr></thead><tbody>' +
      (d.items.length ? d.items.map(x => '<tr><td><strong>' + esc(x.kelas) + '</strong></td><td>' + esc(x.mapel) + '</td><td class="num">' + x.siswa + '</td><td class="num">' + x.bernilai + '</td><td class="num"><strong>' + fmtN(x.rata) + '</strong></td><td class="num">' + x.tuntas + '</td><td class="num' + (x.belum ? ' rendah' : '') + '">' + x.belum + '</td><td class="num">' + (x.kehadiran === null ? '—' : fmtN(x.kehadiran) + '%') + '</td><td class="num">' + x.tugas + '</td><td class="num">' + x.ujian + '</td></tr>').join('')
        : '<tr><td colspan="10"><div class="empty">Belum ada mata pelajaran yang dipasang pada kelas di semester ini.</div></td></tr>') + '</tbody></table></div></div>';
    $('#lp-csv').addEventListener('click', () => downloadCSV('ringkasan-laporan.csv', [['Kelas', 'Mapel', 'Siswa', 'Bernilai', 'Rata-rata', 'Tuntas', 'Belum tuntas', 'Kehadiran (%)', 'Tugas', 'Ujian']].concat(d.items.map(x => [x.kelas, x.mapel, x.siswa, x.bernilai, x.rata === null ? '' : x.rata, x.tuntas, x.belum, x.kehadiran === null ? '' : x.kehadiran, x.tugas, x.ujian]))));
  }
  async function leger(d) {
    const box = $('#lp-body');
    box.innerHTML = '<div class="toolbar"><select id="lp-kelas" class="select" aria-label="Kelas">' + opts(d.kelas.map(k => [k.id, 'Kelas ' + k.nama]), kelasId) + '</select></div><div class="card" id="lp-leger">' + SPIN + '</div>';
    $('#lp-kelas').addEventListener('change', e => { kelasId = e.target.value; leger(d); });
    if (!kelasId) { $('#lp-leger').innerHTML = '<div class="empty">Tidak ada kelas pada tahun ajaran semester ini.</div>'; return; }
    const r = await api('admLaporanKelas', { kelas_id: kelasId, semester_id: semId });
    const el = $('#lp-leger'); if (!el) return;
    if (!r.success) { el.innerHTML = errBox(r.message); return; }
    el.innerHTML = '<div class="row-between"><h2>Leger Kelas ' + esc(r.data.kelas.nama) + ' — Semester ' + esc(r.data.semester.nama) + '</h2><button class="btn btn-secondary btn-sm" id="lg-csv">Unduh CSV</button></div>' + tabelLeger(r.data);
    $('#lg-csv').addEventListener('click', () => csvLeger(r.data));
  }
  load();
}

// ============================================================
// GURU — wali kelas
// ============================================================
async function guruLaporan() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Laporan Kelas</h1></div>' + SPIN;
  const w = await api('gruKelasWali');
  if (!w.success) { c.innerHTML = errBox(w.message); return; }
  const kelas = w.data.items;
  if (!kelas.length) { c.innerHTML = '<div class="page-head"><h1>Laporan Kelas</h1></div><div class="empty">Laporan leger tersedia untuk guru yang menjadi <strong>wali kelas</strong>. Anda belum ditetapkan sebagai wali kelas; hubungi admin.</div>'; return; }
  let kid = kelas[0].id;
  c.innerHTML = '<div class="page-head"><h1>Laporan Kelas</h1><p>Leger nilai dan kehadiran kelas yang Anda walikan.</p></div><div class="toolbar"><select id="gl-kelas" class="select" aria-label="Kelas">' + opts(kelas.map(k => [k.id, 'Kelas ' + k.nama]), kid) + '</select></div><div class="card" id="gl-body"></div>';
  async function muat() {
    const box = $('#gl-body'); box.innerHTML = SPIN;
    const r = await api('gruLaporanKelas', { kelas_id: kid });
    if (!$('#gl-body')) return;
    if (!r.success) { box.innerHTML = errBox(r.message); return; }
    box.innerHTML = '<div class="row-between"><h2>Leger Kelas ' + esc(r.data.kelas.nama) + ' — Semester ' + esc(r.data.semester.nama) + '</h2><button class="btn btn-secondary btn-sm" id="gl-csv">Unduh CSV</button></div>' + tabelLeger(r.data);
    $('#gl-csv').addEventListener('click', () => csvLeger(r.data));
  }
  $('#gl-kelas').addEventListener('change', e => { kid = e.target.value; muat(); });
  muat();
}

// ============================================================
// ADMIN — panel cadangan pada halaman Pengaturan (dipanggil dari app.js)
// ============================================================
window.extraPengaturan = function (c) {
  const box = document.createElement('div');
  box.className = 'card'; box.style.marginTop = '16px';
  box.innerHTML = '<h2>Cadangan data</h2>' + SPIN;
  c.appendChild(box);
  async function muat() {
    const [a, u] = await Promise.all([api('admListCadangan'), api('admUkuranData')]);
    if (!document.body.contains(box)) return;
    box.innerHTML = '<h2>Cadangan data</h2><p class="hint">Salinan seluruh Spreadsheet database disimpan di folder <strong>Cadangan</strong> pada Drive. Cadangan juga dibuat otomatis sebelum kenaikan kelas. Aplikasi menyimpan ' + (a.success ? a.data.simpan : 8) + ' salinan terbaru.</p>' +
      (u.success ? '<p style="margin:0 0 4px">Pemakaian Spreadsheet: <strong>' + fmtN(u.data.persen_batas) + '%</strong> dari batas Google Sheets</p><div class="bar"><span style="width:' + Math.min(100, u.data.persen_batas) + '%"></span></div>' +
        (u.data.peringatan.length ? '<div class="form-error" style="margin-top:10px">' + u.data.peringatan.map(p => '<div>' + esc(p) + '</div>').join('') + '</div>' : '') : '') +
      '<div class="row-actions" style="margin:14px 0"><button class="btn btn-primary btn-sm" id="cd-buat">Buat cadangan sekarang</button></div>' +
      (a.success ? (a.data.items.length ? '<div class="list">' + a.data.items.map(x => '<div class="list-item"><div class="li-main"><strong>' + esc(x.nama) + '</strong><span class="li-meta">' + esc(fmtTenggat(x.dibuat)) + '</span></div><div class="li-actions"><a class="btn btn-secondary btn-sm" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">Buka</a></div></div>').join('') + '</div>' : '<div class="empty">Belum ada cadangan.</div>') : errBox(a.message)) +
      '<details style="margin-top:12px"><summary>Cadangan mingguan otomatis &amp; cara memulihkan</summary><p class="hint"><strong>Otomatis mingguan:</strong> buka Apps Script, pilih fungsi <code>aktifkanCadanganMingguan</code>, lalu klik Run (cukup sekali).</p>' +
      '<p class="hint"><strong>Memulihkan:</strong> buka salinan cadangan dan periksa isinya. Lalu di Apps Script → Project Settings → Script Properties, ganti nilai <code>SPREADSHEET_ID</code> dengan ID salinan itu (bagian di antara <code>/d/</code> dan <code>/edit</code> pada alamatnya). Tunggu sekitar 5 menit agar cache sheet segar.</p></details>';
    const b = $('#cd-buat', box);
    if (b) b.addEventListener('click', async () => { setBusy(b, true, 'Membuat salinan…'); const r = await api('admBuatCadangan'); toast(r.message || 'Selesai.', !r.success); muat(); });
  }
  muat();
};

window.ADMIN_PAGES = Object.assign(window.ADMIN_PAGES || {}, { laporan: adminLaporan });
window.GURU_PAGES = Object.assign(window.GURU_PAGES || {}, { laporan: guruLaporan });
