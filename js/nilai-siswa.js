// ============================================================
// LMS PAI & FIQIH — NILAI: SISI SISWA (Fase 4B) — "Nilai Saya"
// Bergantung pada nilai-guru.js (KOMP, KOMP_LABEL, fmtN, statusChip) — muat setelahnya.
// ============================================================

async function siswaNilai() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Nilai Saya</h1></div>' + SPIN;
  const r = await api('sisNilaiSaya');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  const { items, rata } = r.data;
  c.innerHTML = '<div class="page-head"><h1>Nilai Saya</h1><p>Nilai per mata pelajaran semester ini.</p></div><div class="stack">' +
    (items.length ? '<div class="stats"><div class="stat"><strong>' + fmtN(rata) + '</strong><span>Rata-rata nilai akhir</span></div><div class="stat"><strong>' + items.filter(i => i.tuntas === true).length + '/' + items.length + '</strong><span>Mapel tuntas</span></div></div>' +
      items.map(i =>
        '<div class="card"><div class="row-between"><div><span class="chip chip-soft">Semester ' + esc(i.semester) + '</span><h2 style="margin-top:8px">' + esc(i.mapel) + '</h2>' +
        '<p class="hint" style="margin:0">' + (i.guru ? esc(i.guru) + ' · ' : '') + 'KKM ' + fmtN(i.kkm) + '</p></div>' +
        '<div style="text-align:right"><strong style="font-size:34px;line-height:40px;color:var(--primary)">' + fmtN(i.akhir) + '</strong>' +
        (i.predikat ? '<div class="li-meta">Predikat ' + esc(i.predikat) + ' · ' + esc(i.ket) + '</div>' : '') + '</div></div>' +
        '<p style="margin:10px 0">' + statusChip(i.akhir, i.tuntas, i.sementara) + '</p>' +
        '<div class="stats">' + KOMP.map(k => '<div class="stat" style="padding:12px"><strong style="font-size:22px;line-height:28px">' + fmtN(i.komp[k].rata) + '</strong><span>' + KOMP_LABEL[k] + ' <small>(' + i.bobot[k] + '%)</small></span></div>').join('') + '</div>' +
        (i.sementara && i.akhir !== null ? '<p class="hint" style="margin-top:10px">Nilai ini masih sementara karena ada komponen yang belum dinilai.</p>' : '') +
        (i.rincian.length ? '<details style="margin-top:10px"><summary>Rincian nilai (' + i.rincian.length + ')</summary><div class="list">' +
          i.rincian.map(x => '<div class="list-item"><div class="li-main"><strong dir="auto">' + esc(x.nama) + '</strong><span class="li-meta">' + esc(KOMP_LABEL[x.komponen] || x.komponen) + '</span></div><strong>' + fmtN(x.nilai) + '</strong></div>').join('') + '</div></details>' : '<p class="hint" style="margin-top:10px">Belum ada nilai yang masuk.</p>') + '</div>').join('')
      : '<div class="empty">Anda belum terdaftar di kelas mana pun. Hubungi admin sekolah.</div>') + '</div>';
}

Object.assign(window.SISWA_PAGES, { nilai: siswaNilai });
