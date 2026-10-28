// ============================================================
// LMS PAI & FIQIH — PENILAIAN: SISI ADMIN (Fase 4B)
// Bobot komponen, KKM per mata pelajaran/semester, dan skala predikat.
// Bergantung pada nilai-guru.js (KOMP, KOMP_LABEL) — muat setelahnya.
// ============================================================

async function adminPenilaian() {
  const c = $('#content');
  let semId = '';
  async function load() {
    c.innerHTML = '<div class="page-head"><h1>Penilaian</h1></div>' + SPIN;
    const r = await api('admGetPenilaian', { semester_id: semId });
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    const d = r.data; semId = d.semester_id || '';
    if (!d.semester.length) { c.innerHTML = '<div class="page-head"><h1>Penilaian</h1></div><div class="empty">Belum ada semester. Buat tahun ajaran di menu Akademik.</div>'; return; }
    c.innerHTML = '<div class="page-head"><h1>Penilaian</h1><p>Bobot komponen, batas ketuntasan (KKM), dan skala predikat.</p></div><div class="stack">' +
      '<div class="toolbar"><select id="pn-sem" class="select" aria-label="Semester">' + opts(d.semester.map(s => [s.id, s.label + (s.aktif ? ' (aktif)' : '')]), semId) + '</select></div>' +
      (d.terkunci ? '<p class="form-error" style="background:#FFFBEB;color:#92400E;border-color:#FDE68A">Semester ini tidak aktif sehingga pengaturannya <strong>dikunci</strong>. Hal ini menjaga hasil nilai yang sudah lalu agar tidak berubah.</p>' : '') +
      d.mapel.map(m => '<div class="card" data-mp="' + esc(m.id) + '"><div class="row-between"><h2>' + esc(m.nama) + '</h2>' + (m.bawaan ? chip('Bawaan', 'warn') : chip('Diatur', 'ok')) + '</div>' +
        '<div class="bobot-grid">' + KOMP.map(k => '<label class="field"><span class="field-label">' + KOMP_LABEL[k] + ' (%)</span><input type="number" min="0" max="100" step="1" inputmode="numeric" data-k="' + k + '" value="' + m.bobot[k] + '"' + (d.terkunci ? ' disabled' : '') + '></label>').join('') +
        '<label class="field"><span class="field-label">KKM</span><input type="number" min="0" max="100" step="1" inputmode="numeric" data-kkm value="' + m.kkm + '"' + (d.terkunci ? ' disabled' : '') + '></label></div>' +
        '<div class="row-between"><span class="li-meta" data-sum></span>' + (d.terkunci ? '' : '<button class="btn btn-primary btn-sm" data-save>Simpan</button>') + '</div></div>').join('') +
      '<div class="card"><h2>Skala predikat</h2><p class="hint">Berlaku untuk seluruh aplikasi. Hanya mengubah huruf/keterangan yang tampil, bukan angka nilai.</p><div id="sk-rows"></div>' +
      '<div class="row-actions" style="margin-top:12px"><button class="btn btn-secondary btn-sm" id="sk-add">+ Baris</button><button class="btn btn-primary btn-sm" id="sk-save">Simpan skala</button></div></div></div>';

    $('#pn-sem').addEventListener('change', e => { semId = e.target.value; load(); });
    $$('[data-mp]').forEach(card => {
      const sum = () => { const t = $$('[data-k]', card).reduce((s, i) => s + (Number(i.value) || 0), 0); const e = $('[data-sum]', card); e.textContent = 'Jumlah bobot: ' + t + (t === 100 ? ' ✓' : ' (harus 100)'); e.style.color = t === 100 ? 'var(--ok-ink)' : 'var(--err-ink)'; return t; };
      card.addEventListener('input', sum); sum();
      const sv = $('[data-save]', card);
      if (sv) sv.addEventListener('click', async () => {
        if (sum() !== 100) return toast('Jumlah bobot harus tepat 100.', true);
        const bobot = {}; $$('[data-k]', card).forEach(i => { bobot[i.dataset.k] = Number(i.value); });
        setBusy(sv, true, 'Menyimpan…');
        const s = await api('admSavePenilaian', { semester_id: semId, mapel_id: card.dataset.mp, bobot: bobot, kkm: Number($('[data-kkm]', card).value) });
        setBusy(sv, false); toast(s.message || 'Selesai.', !s.success); if (s.success) load();
      });
    });

    let skala = d.skala.map(x => Object.assign({}, x));
    const drawSkala = () => {
      $('#sk-rows').innerHTML = skala.map((x, i) => '<div class="opt-row"><input type="number" min="0" max="100" style="max-width:84px" data-s="min" data-i="' + i + '" value="' + x.min + '" aria-label="Nilai minimal">' +
        '<input type="text" maxlength="3" style="max-width:72px" data-s="p" data-i="' + i + '" value="' + esc(x.p) + '" aria-label="Predikat">' +
        '<input type="text" maxlength="30" data-s="ket" data-i="' + i + '" value="' + esc(x.ket) + '" aria-label="Keterangan"><button class="btn btn-danger btn-sm" data-del="' + i + '"' + (skala.length <= 2 ? ' disabled' : '') + '>✕</button></div>').join('') +
        '<p class="li-meta">Kolom pertama: nilai minimal untuk predikat itu. Baris terakhir harus 0.</p>';
    };
    drawSkala();
    $('#sk-rows').addEventListener('input', e => { const i = e.target.dataset.i; if (i === undefined) return; skala[i][e.target.dataset.s] = e.target.dataset.s === 'min' ? Number(e.target.value) : e.target.value; });
    $('#sk-rows').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b && skala.length > 2) { skala.splice(Number(b.dataset.del), 1); drawSkala(); } });
    $('#sk-add').addEventListener('click', () => { if (skala.length < 7) { skala.splice(skala.length - 1, 0, { min: 0, p: '', ket: '' }); drawSkala(); } });
    $('#sk-save').addEventListener('click', async () => {
      const b = $('#sk-save'); setBusy(b, true, 'Menyimpan…');
      const s = await api('admSaveSkala', { rows: skala }); setBusy(b, false); toast(s.message || 'Selesai.', !s.success); if (s.success) load();
    });
  }
  load();
}

Object.assign(window.ADMIN_PAGES, { penilaian: adminPenilaian });
