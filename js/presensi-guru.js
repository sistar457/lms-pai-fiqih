// ============================================================
// LMS PAI & FIQIH — PRESENSI: SISI GURU (Fase 5A)
// Mengisi presensi per kelas/mapel/tanggal/sesi dan melihat rekap.
// Bergantung pada nilai-guru.js (fmtN) dan admin.js (opts, downloadCSV) — muat setelahnya.
// ============================================================

Object.assign(ICONS, { check: '<path d="M20 6L9 17l-5-5"/>' });
const ST_LABEL = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa' };
const ST_KODE = { hadir: 'H', izin: 'I', sakit: 'S', alpa: 'A' };
const todayWib = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

async function guruPresensi() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Presensi</h1></div>' + SPIN;
  const m = await api('gruMapelSaya');
  if (!m.success) { c.innerHTML = errBox(m.message); return; }
  const list = m.data.mapel.filter(x => x.aktif);
  if (!list.length) { c.innerHTML = '<div class="page-head"><h1>Presensi</h1></div><div class="empty">Anda belum ditugaskan pada kelas dan mata pelajaran di semester aktif.</div>'; return; }
  let saved = ''; try { saved = sessionStorage.getItem('nilai_mk') || ''; } catch (e) {}
  let mkId = list.some(x => x.mk_id === saved) ? saved : list[0].mk_id, tab = 'isi', tanggal = todayWib(), sesi = '1', cur = null, status = {};

  c.innerHTML = '<div class="page-head"><h1>Presensi</h1><p>Catat kehadiran siswa pada setiap pertemuan.</p></div>' +
    '<div class="toolbar"><select id="pr-mk" class="select" aria-label="Kelas dan mata pelajaran">' + opts(list.map(x => [x.mk_id, x.mapel + ' — Kelas ' + x.kelas]), mkId) + '</select></div>' +
    '<div class="tabs" id="pr-tabs"><button class="active" data-t="isi">Isi presensi</button><button data-t="rekap">Rekap kehadiran</button></div><div id="pr-body"></div>';
  $('#pr-mk').addEventListener('change', e => { mkId = e.target.value; try { sessionStorage.setItem('nilai_mk', mkId); } catch (x) {} go(); });
  $('#pr-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; $$('#pr-tabs button').forEach(x => x.classList.toggle('active', x === b)); go(); });
  const body = () => $('#pr-body');
  const go = () => (tab === 'isi' ? muat() : rekap());

  async function muat() {
    body().innerHTML = SPIN;
    const r = await api('gruPresensiSesi', { mk_id: mkId, tanggal: tanggal, sesi: sesi });
    if (!$('#pr-mk') || $('#pr-mk').value !== mkId) return;
    if (!r.success) { body().innerHTML = controls(null) + errBox(r.message); pasangKontrol(); return; }
    cur = r.data; status = {};
    cur.roster.forEach(x => { status[x.siswa_id] = x.status || 'hadir'; });      // bawaan: hadir; guru tinggal mengubah yang tidak hadir
    gambar();
  }
  const controls = d => '<div class="card"><div class="toolbar"><label class="field" style="margin:0"><span class="field-label">Tanggal</span><input id="pr-tgl" type="date" max="' + todayWib() + '" value="' + esc(tanggal) + '"></label>' +
    '<label class="field" style="margin:0"><span class="field-label">Sesi / jam ke-</span><select id="pr-sesi" class="select">' +
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => '<option value="' + n + '"' + (String(n) === sesi ? ' selected' : '') + '>' + n + (d && d.sesi_terpakai.indexOf(String(n)) >= 0 ? ' (terisi)' : '') + '</option>').join('') + '</select></label></div>';
  function pasangKontrol() {
    $('#pr-tgl').addEventListener('change', e => { if (e.target.value) { tanggal = e.target.value; muat(); } });
    $('#pr-sesi').addEventListener('change', e => { sesi = e.target.value; muat(); });
  }
  function gambar() {
    const cnt = { hadir: 0, izin: 0, sakit: 0, alpa: 0 }; cur.roster.forEach(x => { cnt[status[x.siswa_id]]++; });
    body().innerHTML = controls(cur) +
      (cur.sudah_ada ? '<p class="hint" style="margin:8px 0 0">Sesi ini <strong>sudah terisi</strong>. Menyimpan akan memperbarui data (koreksi dicatat di log).</p>' : '') +
      '<div class="row-between" style="margin:14px 0 4px"><div class="row-actions">' + Object.keys(ST_LABEL).map(k => chip(ST_LABEL[k] + ' ' + cnt[k], k === 'hadir' ? 'ok' : k === 'alpa' ? 'err' : 'warn')).join('') + '</div>' +
      '<button class="btn btn-secondary btn-sm" id="pr-semua">Semua hadir</button></div>' +
      '<div class="list">' + cur.roster.map(x => '<div class="list-item"><div class="li-main"><strong>' + esc(x.nama) + '</strong><span class="li-meta">NISN ' + esc(x.nisn) + '</span></div>' +
        '<div class="seg" role="group" aria-label="Status ' + esc(x.nama) + '">' + Object.keys(ST_LABEL).map(k => '<button type="button" class="seg-' + k + (status[x.siswa_id] === k ? ' on' : '') + '" data-sid="' + esc(x.siswa_id) + '" data-s="' + k + '" aria-pressed="' + (status[x.siswa_id] === k) + '" title="' + ST_LABEL[k] + '">' + ST_KODE[k] + '</button>').join('') + '</div></div>').join('') + '</div>' +
      '<div style="margin-top:14px"><button class="btn btn-primary btn-block" id="pr-save">' + (cur.sudah_ada ? 'Perbarui presensi' : 'Simpan presensi') + '</button></div></div>';
    pasangKontrol();
    $('#pr-semua').addEventListener('click', () => { cur.roster.forEach(x => { status[x.siswa_id] = 'hadir'; }); gambar(); });
    body().onclick = e => { const b = e.target.closest('[data-s]'); if (b) { status[b.dataset.sid] = b.dataset.s; gambar(); } };
    $('#pr-save').addEventListener('click', async () => {
      const btn = $('#pr-save'); setBusy(btn, true, 'Menyimpan…');
      const r = await api('gruPresensiSimpan', { mk_id: mkId, tanggal: tanggal, sesi: sesi, rows: cur.roster.map(x => ({ siswa_id: x.siswa_id, status: status[x.siswa_id] })) });
      setBusy(btn, false); toast(r.message || 'Selesai.', !r.success); if (r.success) muat();
    });
  }

  async function rekap() {
    body().innerHTML = SPIN;
    const r = await api('gruPresensiRekap', { mk_id: mkId });
    if (!$('#pr-mk') || $('#pr-mk').value !== mkId) return;
    if (!r.success) { body().innerHTML = errBox(r.message); return; }
    const d = r.data;
    body().innerHTML = '<div class="stats"><div class="stat"><strong>' + d.jumlah_sesi + '</strong><span>Sesi tercatat</span></div><div class="stat"><strong>' + (d.rata === null ? '—' : fmtN(d.rata) + '%') + '</strong><span>Rata-rata kehadiran</span></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="row-between"><h2>Rekap per siswa</h2><button class="btn btn-secondary btn-sm" id="pr-csv">Unduh CSV</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th class="num">Hadir</th><th class="num">Izin</th><th class="num">Sakit</th><th class="num">Alpa</th><th class="num">Kehadiran</th></tr></thead><tbody>' +
      (d.siswa.length ? d.siswa.map(x => '<tr><td><strong>' + esc(x.nama) + '</strong><small>NISN ' + esc(x.nisn) + '</small></td><td class="num">' + x.hadir + '</td><td class="num">' + x.izin + '</td><td class="num">' + x.sakit + '</td><td class="num">' + x.alpa + '</td><td class="num"><strong>' + (x.persen === null ? '—' : fmtN(x.persen) + '%') + '</strong></td></tr>').join('') : '<tr><td colspan="6"><div class="empty">Belum ada siswa.</div></td></tr>') + '</tbody></table></div></div>' +
      '<div class="card" style="margin-top:16px"><h2>Sesi terbaru</h2>' + (d.sesi.length ? '<div class="list">' + d.sesi.map(s => '<div class="list-item"><div class="li-main"><strong>' + esc(s.tanggal) + ' · sesi ' + esc(s.sesi) + '</strong></div><span class="li-meta">H ' + s.hadir + ' · I ' + s.izin + ' · S ' + s.sakit + ' · A ' + s.alpa + '</span></div>').join('') + '</div>' : '<div class="empty">Belum ada presensi.</div>') + '</div>';
    $('#pr-csv').addEventListener('click', () => downloadCSV('rekap-kehadiran.csv', [['Nama', 'NISN', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Kehadiran (%)']].concat(d.siswa.map(x => [x.nama, x.nisn, x.hadir, x.izin, x.sakit, x.alpa, x.persen === null ? '' : x.persen]))));
  }
  go();
}

Object.assign(window.GURU_PAGES, { presensi: guruPresensi });
