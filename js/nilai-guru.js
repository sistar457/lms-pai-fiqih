// ============================================================
// LMS PAI & FIQIH — NILAI: SISI GURU (Fase 4B)
// Rekap nilai per kelas & mata pelajaran, serta input nilai praktik.
// File ini juga memuat pembantu bersama (dipakai nilai-siswa.js dan nilai-admin.js) — muat PERTAMA.
// ============================================================

Object.assign(ICONS, {
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
});
const KOMP = ['tugas', 'kuis', 'ujian', 'praktik'];
const KOMP_LABEL = { tugas: 'Tugas', kuis: 'Kuis', ujian: 'Ujian', praktik: 'Praktik' };
const fmtN = v => (v === null || v === '' || v === undefined ? '—' : String(Math.round(Number(v) * 100) / 100).replace('.', ','));
const statusChip = (akhir, tuntas, sementara) =>
  akhir === null ? chip('Belum ada nilai', 'warn') : (tuntas ? chip('Tuntas', 'ok') : chip('Belum tuntas', 'err')) + (sementara ? ' ' + chip('Sementara', 'soft') : '');

async function guruNilai() {
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Nilai</h1></div>' + SPIN;
  const m = await api('gruMapelSaya');
  if (!m.success) { c.innerHTML = errBox(m.message); return; }
  const list = m.data.mapel;
  if (!list.length) { c.innerHTML = '<div class="page-head"><h1>Nilai</h1></div><div class="empty">Anda belum ditugaskan pada kelas dan mata pelajaran mana pun. Hubungi admin.</div>'; return; }
  let saved = ''; try { saved = sessionStorage.getItem('nilai_mk') || ''; } catch (e) {}
  let mkId = list.some(x => x.mk_id === saved) ? saved : list[0].mk_id, tab = 'rekap', label = '';

  c.innerHTML = '<div class="page-head"><h1>Nilai</h1><p>Rekap nilai kelas dan penilaian praktik.</p></div>' +
    '<div class="toolbar"><select id="nl-mk" class="select" aria-label="Kelas dan mata pelajaran">' +
    opts(list.map(x => [x.mk_id, x.mapel + ' — Kelas ' + x.kelas + ' (' + x.semester + (x.aktif ? '' : ', lalu') + ')']), mkId) + '</select></div>' +
    '<div class="tabs" id="nl-tabs"><button class="active" data-t="rekap">Rekap nilai</button><button data-t="praktik">Penilaian praktik</button><button data-t="remedial">Remedial</button><button data-t="sertifikat">Sertifikat</button></div><div id="nl-body"></div>';
  $('#nl-mk').addEventListener('change', e => { mkId = e.target.value; label = ''; try { sessionStorage.setItem('nilai_mk', mkId); } catch (x) {} draw(); });
  $('#nl-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; $$('#nl-tabs button').forEach(x => x.classList.toggle('active', x === b)); draw(); });
  const draw = () => (tab === 'rekap' ? tabRekap(mkId) : tab === 'praktik' ? tabPraktik(mkId, label, l => { label = l; }) : tab === 'remedial' ? tabRemedial(mkId) : tabSertifikat(mkId));
  draw();
}

async function tabRekap(mkId) {
  const box = $('#nl-body');
  box.innerHTML = SPIN;
  const r = await api('gruRekap', { mk_id: mkId });
  if (!r.success) { box.innerHTML = errBox(r.message); return; }
  if ($('#nl-mk') && $('#nl-mk').value !== mkId) return;           // pengguna sudah berpindah pilihan
  const { info, konfig, total, rows, stat } = r.data;
  const sementara = rows.some(x => x.akhir !== null && x.sementara);
  box.innerHTML =
    '<div class="stats"><div class="stat"><strong>' + fmtN(stat.rata) + '</strong><span>Rata-rata kelas</span></div>' +
    '<div class="stat"><strong>' + stat.tuntas + '</strong><span>Tuntas</span></div><div class="stat"><strong>' + stat.belum + '</strong><span>Belum tuntas</span></div>' +
    '<div class="stat"><strong>' + fmtN(konfig.kkm) + '</strong><span>KKM</span></div></div>' +
    '<div class="card" style="margin-top:16px"><div class="row-between"><div><h2>Rekap ' + esc(info.mapel || '') + ' — Kelas ' + esc(info.kelas || '') + '</h2>' +
    '<p class="hint" style="margin:0">Bobot: ' + KOMP.map(k => KOMP_LABEL[k] + ' ' + konfig.bobot[k] + '%').join(' · ') + (konfig.bawaan ? ' (bawaan — admin belum mengatur)' : '') + '</p></div>' +
    '<button class="btn btn-secondary btn-sm" id="nl-csv">Unduh CSV</button></div>' +
    (sementara ? '<p class="hint" style="margin-top:8px">Sebagian nilai masih <strong>sementara</strong>: ada komponen berbobot yang belum memiliki nilai, sehingga bobotnya dinormalkan sampai semuanya terisi.</p>' : '') +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th>' +
    KOMP.map(k => '<th class="num">' + KOMP_LABEL[k] + '<small>' + total[k] + ' item</small></th>').join('') + '<th class="num">Nilai akhir</th><th>Predikat</th><th>Status</th></tr></thead><tbody>' +
    (rows.length ? rows.map(x => '<tr><td><strong>' + esc(x.nama) + '</strong><small>NISN ' + esc(x.nisn) + '</small></td>' +
      KOMP.map(k => '<td class="num">' + fmtN(x.komp[k].rata) + (x.komp[k].n ? '<small>' + x.komp[k].n + ' nilai</small>' : '') + '</td>').join('') +
      '<td class="num"><strong>' + fmtN(x.akhir) + '</strong></td><td>' + (x.predikat ? esc(x.predikat) + '<small>' + esc(x.ket) + '</small>' : '—') + '</td><td>' + statusChip(x.akhir, x.tuntas, x.sementara) + '</td></tr>').join('')
      : '<tr><td colspan="8"><div class="empty">Belum ada siswa di kelas ini.</div></td></tr>') + '</tbody></table></div>' +
    '<p class="hint" style="margin-top:10px">Nilai komponen adalah rata-rata nilai yang sudah masuk; tugas yang belum dikumpulkan tidak dihitung otomatis sebagai 0.</p></div>';
  $('#nl-csv').addEventListener('click', () => downloadCSV('rekap-nilai-' + String(info.mapel || 'kelas').replace(/\W+/g, '-') + '-' + String(info.kelas || '') + '.csv',
    [['Nama', 'NISN'].concat(KOMP.map(k => KOMP_LABEL[k]), ['Nilai akhir', 'Predikat', 'Status'])].concat(rows.map(x =>
      [x.nama, x.nisn].concat(KOMP.map(k => x.komp[k].rata === null ? '' : x.komp[k].rata), [x.akhir === null ? '' : x.akhir, x.predikat, x.akhir === null ? '' : (x.tuntas ? 'Tuntas' : 'Belum tuntas') + (x.sementara ? ' (sementara)' : '')]))) ));
}

async function tabPraktik(mkId, label, setLabel) {
  const box = $('#nl-body');
  box.innerHTML = SPIN;
  const r = await api('gruPraktik', { mk_id: mkId, label: label });
  if (!r.success) { box.innerHTML = errBox(r.message); return; }
  if ($('#nl-mk') && $('#nl-mk').value !== mkId) return;
  const { labels, rows } = r.data;
  if (label && labels.indexOf(label) < 0) { label = ''; setLabel(''); }
  box.innerHTML = '<div class="card"><div class="row-between"><h2>Penilaian praktik</h2><button class="btn btn-primary btn-sm" id="pk-new">+ Penilaian baru</button></div>' +
    '<p class="hint">Contoh: Praktik Wudhu, Praktik Shalat Jenazah. Setiap penilaian dihitung sebagai satu item pada komponen Praktik.</p>' +
    (labels.length ? '<div class="toolbar"><select id="pk-label" class="select" aria-label="Penilaian praktik">' + opts(labels.map(l => [l, l]), label, '— pilih penilaian —') + '</select></div>' : '<div class="empty">Belum ada penilaian praktik.</div>') +
    (label ? '<div class="list">' + rows.map(x => '<div class="list-item"><div class="li-main"><strong>' + esc(x.nama) + '</strong><span class="li-meta">NISN ' + esc(x.nisn) + '</span></div>' +
      '<div class="li-actions"><input class="select" style="width:96px" type="number" min="0" max="100" step="0.5" inputmode="decimal" data-pk="' + esc(x.siswa_id) + '" value="' + esc(x.nilai) + '" aria-label="Nilai ' + esc(x.nama) + '"></div></div>').join('') + '</div>' +
      '<div class="row-actions" style="margin-top:14px"><button class="btn btn-primary" id="pk-save">Simpan nilai</button><button class="btn btn-danger" id="pk-del">Hapus penilaian ini</button></div>' : '') + '</div>';

  $('#pk-new').addEventListener('click', () => modal({ title: 'Penilaian praktik baru', submit: 'Buat', body: fld('Nama penilaian', 'pk-nama', '', 'maxlength="40" placeholder="Contoh: Praktik Wudhu"'),
    onSubmit: async () => {
      const nama = val('pk-nama').trim(); if (!nama) return 'Isi nama penilaian.';
      const s = await api('gruPraktikSimpan', { mk_id: mkId, label: nama, rows: [] });      // label baru muncul setelah ada nilai pertama
      if (!s.success) return s.message;
      setLabel(nama); tabPraktikBaru(mkId, nama, setLabel);
    } }));
  const sel_ = $('#pk-label'); if (sel_) sel_.addEventListener('change', e => { setLabel(e.target.value); tabPraktik(mkId, e.target.value, setLabel); });
  const save = $('#pk-save');
  if (save) save.addEventListener('click', async () => {
    setBusy(save, true, 'Menyimpan…');
    const s = await api('gruPraktikSimpan', { mk_id: mkId, label: label, rows: $$('[data-pk]').map(i => ({ siswa_id: i.dataset.pk, nilai: i.value })) });
    setBusy(save, false); toast(s.message || 'Selesai.', !s.success); if (s.success) tabPraktik(mkId, label, setLabel);
  });
  const del = $('#pk-del');
  if (del) del.addEventListener('click', async () => {
    if (!confirm('Hapus penilaian “' + label + '” beserta seluruh nilainya? Tindakan ini tidak dapat dibatalkan.')) return;
    const s = await api('gruPraktikHapus', { mk_id: mkId, label: label });
    toast(s.message || 'Selesai.', !s.success); if (s.success) { setLabel(''); tabPraktik(mkId, '', setLabel); }
  });
}

// Label baru belum punya nilai, jadi belum ada di daftar server: tampilkan lembar isian kosong untuk label itu
async function tabPraktikBaru(mkId, label, setLabel) {
  const box = $('#nl-body');
  const rr = await api('gruRekap', { mk_id: mkId });
  if (!rr.success) { box.innerHTML = errBox(rr.message); return; }
  const rows = rr.data.rows;
  box.innerHTML = '<div class="card"><h2>' + esc(label) + '</h2><p class="hint">Isi nilai 0–100. Kolom yang dikosongkan tidak disimpan.</p><div class="list">' +
    rows.map(x => '<div class="list-item"><div class="li-main"><strong>' + esc(x.nama) + '</strong><span class="li-meta">NISN ' + esc(x.nisn) + '</span></div><div class="li-actions"><input class="select" style="width:96px" type="number" min="0" max="100" step="0.5" inputmode="decimal" data-pk="' + esc(x.siswa_id) + '" aria-label="Nilai ' + esc(x.nama) + '"></div></div>').join('') +
    '</div><div style="margin-top:14px"><button class="btn btn-primary" id="pk-save2">Simpan nilai</button></div></div>';
  $('#pk-save2').addEventListener('click', async () => {
    const b = $('#pk-save2'); setBusy(b, true, 'Menyimpan…');
    const s = await api('gruPraktikSimpan', { mk_id: mkId, label: label, rows: $$('[data-pk]').map(i => ({ siswa_id: i.dataset.pk, nilai: i.value })) });
    setBusy(b, false); toast(s.message || 'Selesai.', !s.success); if (s.success) tabPraktik(mkId, label, setLabel);
  });
}

// ---------- Remedial ----------
const REM_LABEL = { berjalan: 'Berjalan', selesai: 'Selesai', batal: 'Dibatalkan' };
async function tabRemedial(mkId) {
  const box = $('#nl-body');
  box.innerHTML = SPIN;
  const r = await api('gruRemedialList', { mk_id: mkId });
  if (!r.success) { box.innerHTML = errBox(r.message); return; }
  if ($('#nl-mk') && $('#nl-mk').value !== mkId) return;
  const d = r.data, lain = d.siswa.filter(x => !d.kandidat.some(k => k.siswa_id === x.siswa_id));
  const cek = (x, on) => '<label class="pick-item"><input type="checkbox" data-sid="' + esc(x.siswa_id) + '"' + (on ? ' checked' : '') + (x.sedang_remedial ? ' disabled' : '') + '><span><strong>' + esc(x.nama) + '</strong><br><small class="li-meta">Nilai akhir ' + fmtN(x.akhir) + (x.sedang_remedial ? ' · remedial sedang berjalan' : '') + '</small></span></label>';
  box.innerHTML = '<div class="card"><h2>Tetapkan remedial</h2><p class="hint">KKM ' + fmtN(d.kkm) + '. Siswa di bawah KKM sudah tercentang; Anda dapat mengubah pilihan.</p>' +
    '<div class="pick-list" style="max-height:220px">' + (d.kandidat.length ? d.kandidat.map(x => cek(x, !x.sedang_remedial)).join('') : '<div class="empty">Tidak ada siswa di bawah KKM.</div>') + '</div>' +
    (lain.length ? '<details><summary>Pilih siswa lain (' + lain.length + ')</summary><div class="pick-list" style="max-height:200px">' + lain.map(x => cek(x, false)).join('') + '</div></details>' : '') +
    '<label class="field"><span class="field-label">Aktivitas remedial</span><textarea id="rm-akt" rows="3" maxlength="1000" placeholder="Contoh: Ulangi praktik wudhu dan kerjakan ulang tugas Bab 2 sebelum Jumat."></textarea></label>' +
    '<p id="rm-err" class="form-error" hidden></p><button class="btn btn-primary" id="rm-buat">Tetapkan remedial</button></div>' +
    '<div class="card" style="margin-top:16px"><h2>Daftar remedial</h2>' + (d.items.length ? '<div class="list">' + d.items.map(x =>
      '<div class="list-item"><div class="li-main"><strong>' + esc(x.nama) + '</strong><span class="li-meta" dir="auto">' + esc(x.aktivitas) + '</span>' +
      '<span class="li-meta">Nilai awal ' + fmtN(x.asal) + (x.nilai !== null ? ' → hasil remedial ' + fmtN(x.nilai) : '') + (x.catatan ? ' · ' + esc(x.catatan) : '') + '</span></div>' +
      '<div class="li-actions">' + chip(REM_LABEL[x.status] || x.status, x.status === 'selesai' ? 'ok' : x.status === 'batal' ? 'err' : 'soft') + '<button class="btn btn-secondary btn-sm" data-rm="' + esc(x.id) + '">Perbarui</button></div></div>').join('') + '</div>' : '<div class="empty">Belum ada remedial.</div>') + '</div>';

  $('#rm-buat').addEventListener('click', async () => {
    const err = $('#rm-err'), b = $('#rm-buat'); err.hidden = true;
    const ids = $$('.pick-item input:checked', box).map(i => i.dataset.sid);
    if (!ids.length) { err.textContent = 'Pilih minimal satu siswa.'; err.hidden = false; return; }
    setBusy(b, true, 'Menyimpan…');
    const s = await api('gruRemedialBuat', { mk_id: mkId, siswa_ids: ids, aktivitas: $('#rm-akt').value });
    setBusy(b, false);
    if (!s.success) { err.textContent = s.message; err.hidden = false; return; }
    toast(s.message); tabRemedial(mkId);
  });
  box.onclick = e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    const x = d.items.find(i => i.id === b.dataset.rm);
    modal({ title: 'Perbarui remedial — ' + x.nama, body:
      '<label class="field"><span class="field-label">Aktivitas</span><textarea id="ru-akt" rows="3" maxlength="1000">' + esc(x.aktivitas) + '</textarea></label>' +
      sel('Status', 'ru-st', opts([['berjalan', 'Berjalan'], ['selesai', 'Selesai'], ['batal', 'Dibatalkan']], x.status)) +
      fld('Nilai hasil remedial (wajib bila selesai)', 'ru-nilai', x.nilai === null ? '' : x.nilai, 'type="number" min="0" max="100" step="0.5" inputmode="decimal"') +
      '<label class="field"><span class="field-label">Catatan progres</span><textarea id="ru-cat" rows="2" maxlength="500">' + esc(x.catatan) + '</textarea></label>',
      onSubmit: async () => {
        const s = await api('gruRemedialUbah', { id: x.id, status: val('ru-st'), nilai: val('ru-nilai'), catatan: val('ru-cat'), aktivitas: val('ru-akt') });
        if (!s.success) return s.message; toast('Remedial diperbarui.'); tabRemedial(mkId);
      } });
  };
}

Object.assign(window.GURU_PAGES, { nilai: guruNilai });
