// ============================================================
// LMS PAI & FIQIH — KEHADIRAN: SISI SISWA (Fase 5A)
// Bergantung pada nilai-guru.js (fmtN) dan presensi-guru.js (ST_LABEL) — muat setelahnya.
// ============================================================

async function siswaKehadiran() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Kehadiran</h1></div>' + SPIN;
  const r = await api('sisKehadiran');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  const { items, total } = r.data;
  c.innerHTML = '<div class="page-head"><h1>Kehadiran</h1><p>Rekap kehadiran semester ini.</p></div><div class="stack">' +
    (items.length ? '<div class="stats"><div class="stat"><strong>' + (total.persen === null ? '—' : fmtN(total.persen) + '%') + '</strong><span>Kehadiran keseluruhan</span></div>' +
      '<div class="stat"><strong>' + total.hadir + '/' + total.n + '</strong><span>Pertemuan hadir</span></div></div>' +
      items.map(i => '<div class="card"><div class="row-between"><h2>' + esc(i.mapel) + '</h2><strong style="color:var(--primary);font-size:22px">' + (i.persen === null ? '—' : fmtN(i.persen) + '%') + '</strong></div>' +
        '<div class="bar"><span style="width:' + (i.persen === null ? 0 : i.persen) + '%"></span></div>' +
        '<div class="row-actions" style="margin-top:10px">' + chip('Hadir ' + i.hadir, 'ok') + chip('Izin ' + i.izin, 'warn') + chip('Sakit ' + i.sakit, 'warn') + chip('Alpa ' + i.alpa, i.alpa ? 'err' : 'soft') + '</div>' +
        (i.tidak_hadir.length ? '<details style="margin-top:10px"><summary>Riwayat tidak hadir (' + i.tidak_hadir.length + ')</summary><div class="list">' + i.tidak_hadir.map(x => '<div class="list-item"><span>' + esc(x.tanggal) + ' · sesi ' + esc(x.sesi) + '</span>' + chip(ST_LABEL[x.status] || x.status, x.status === 'alpa' ? 'err' : 'warn') + '</div>').join('') + '</div></details>' : (i.n ? '' : '<p class="hint" style="margin-top:10px">Belum ada presensi tercatat.</p>')) + '</div>').join('')
      : '<div class="empty">Anda belum terdaftar di kelas mana pun. Hubungi admin sekolah.</div>') + '</div>';
}

Object.assign(window.SISWA_PAGES, { kehadiran: siswaKehadiran });
