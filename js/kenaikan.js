// ============================================================
// LMS PAI & FIQIH — KENAIKAN KELAS (Fase 5C) — hanya admin
// Alur: pilih tahun ajaran → siapkan kelas tujuan → buat rencana → tetapkan status → periksa → jalankan.
// Memakai $, esc, api, toast, chip, SPIN, errBox, modal, opts, sel, fld, val, setBusy.
// ============================================================

Object.assign(ICONS, { grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>' });
const STATUS_LABEL = { naik: 'Naik kelas', tinggal: 'Tinggal kelas', lulus: 'Lulus', keluar: 'Keluar/pindah' };

async function adminKenaikan() {
  const c = $('#content');
  let asal = '', tujuan = '', edit = {}, tab = 'semua', hasilPeriksa = null;

  async function load() {
    c.innerHTML = '<div class="page-head"><h1>Kenaikan Kelas</h1></div>' + SPIN;
    const r = await api('admKenaikanInfo', { ta_asal_id: asal, ta_tujuan_id: tujuan });
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    const d = r.data; asal = d.asal; tujuan = d.tujuan;
    const kepala = '<div class="page-head"><h1>Kenaikan Kelas</h1><p>Pindahkan siswa ke kelas tahun ajaran berikutnya dengan pemeriksaan berlapis.</p></div>';
    if (d.butuh_tahun) { c.innerHTML = kepala + '<div class="card"><div class="empty">Diperlukan minimal dua tahun ajaran. Buat tahun ajaran berikutnya di menu <a href="#/akademik">Akademik</a>.</div></div>'; return; }
    const tOpts = d.tahun.map(t => [t.id, 'T.A ' + t.label + (t.aktif ? ' (aktif)' : '')]);
    c.innerHTML = kepala + '<div class="stack">' +
      '<div class="card"><h2>1. Tahun ajaran</h2><div class="grid-2"><label class="field"><span class="field-label">Dari (asal)</span><select id="kn-asal" class="select">' + opts(tOpts, asal) + '</select></label>' +
      '<label class="field"><span class="field-label">Ke (tujuan)</span><select id="kn-tuj" class="select">' + opts(tOpts, tujuan, '— pilih —') + '</select></label></div>' +
      '<p class="hint" style="margin:0">' + d.siswa_aktif + ' siswa aktif di ' + d.kelas_asal + ' kelas asal · ' + d.kelas_tujuan + ' kelas tersedia di tahun ajaran tujuan.</p>' +
      (tujuan && d.kurang.length ? '<p class="form-error" style="background:#FFFBEB;color:#92400E;border-color:#FDE68A;margin-top:12px">Kelas tujuan belum lengkap: ' + d.kurang.map(k => esc(k.nama) + ' → ' + esc(k.usulan || '?')).join(', ') + '.</p><button class="btn btn-secondary btn-sm" id="kn-siap">Buat kelas tujuan otomatis</button>' : '') +
      (tujuan && !d.batch && !d.kurang.length ? '<div style="margin-top:12px"><button class="btn btn-primary" id="kn-rencana">Buat rencana kenaikan</button></div>' : '') +
      (tujuan && !d.batch && d.kurang.length ? '' : '') + '</div>' +
      '<div id="kn-rencana-box"></div><div class="card"><h2>Riwayat kenaikan kelas</h2><div id="kn-riwayat">' + SPIN + '</div></div></div>';

    $('#kn-asal').addEventListener('change', e => { asal = e.target.value; tujuan = ''; edit = {}; hasilPeriksa = null; load(); });
    $('#kn-tuj').addEventListener('change', e => { tujuan = e.target.value; edit = {}; hasilPeriksa = null; load(); });
    const siap = $('#kn-siap'); if (siap) siap.addEventListener('click', async () => { setBusy(siap, true, 'Membuat…'); const s = await api('admKenaikanSiapkanKelas', { ta_asal_id: asal, ta_tujuan_id: tujuan }); toast(s.message || 'Selesai.', !s.success); load(); });
    const rc = $('#kn-rencana'); if (rc) rc.addEventListener('click', async () => { setBusy(rc, true, 'Menyusun…'); const s = await api('admKenaikanRencana', { ta_asal_id: asal, ta_tujuan_id: tujuan }); toast(s.message || 'Rencana siap.', !s.success); load(); });
    if (d.batch) rencana(d.batch);
    riwayat();
  }

  async function riwayat() {
    const r = await api('admKenaikanRiwayat'), box = $('#kn-riwayat'); if (!box) return;
    if (!r.success) { box.innerHTML = errBox(r.message); return; }
    box.innerHTML = r.data.items.length ? '<div class="list">' + r.data.items.map(x => '<div class="list-item"><div class="li-main"><strong>T.A ' + esc(x.asal) + ' → ' + esc(x.tujuan) + '</strong><span class="li-meta">' + esc(fmtTenggat(x.waktu)) + ' · oleh ' + esc(x.oleh) + '</span></div>' +
      '<div class="li-actions">' + chip('Naik ' + x.status.naik, 'ok') + chip('Tinggal ' + x.status.tinggal, 'warn') + chip('Lulus ' + x.status.lulus, 'soft') + chip('Keluar ' + x.status.keluar, 'err') + (x.selesai ? '' : chip('Belum tuntas ' + x.diproses + '/' + x.total, 'err')) + '</div></div>').join('') + '</div>'
      : '<div class="empty">Belum ada kenaikan kelas yang dijalankan.</div>';
  }

  async function rencana(batch) {
    const box = $('#kn-rencana-box');
    box.innerHTML = '<div class="card"><h2>2. Rencana & status siswa</h2>' + SPIN + '</div>';
    const r = await api('admKenaikanDaftar', { batch_id: batch.id });
    if (!r.success) { box.innerHTML = errBox(r.message); return; }
    const d = r.data, draf = d.state === 'draf', kelasAsal = [...new Set(d.items.map(i => i.kelas_asal))];
    const nilai = i => Object.assign({ status: i.status, kelas_tujuan_id: i.kelas_kt === undefined ? i.kelas_tujuan_id : i.kelas_kt }, edit[i.id] || {});
    const terpilih = () => d.items.filter(i => tab === 'semua' || i.kelas_asal === tab);
    const hitung = () => { const h = { naik: 0, tinggal: 0, lulus: 0, keluar: 0, belum: 0 }; d.items.forEach(i => { const s = nilai(i).status; h[s || 'belum']++; }); return h; };

    function gambar() {
      const h = hitung(), n = Object.keys(edit).length;
      box.innerHTML = '<div class="card"><div class="row-between"><h2>2. Rencana &amp; status siswa</h2>' + chip(draf ? 'Draf' : d.state === 'selesai' ? 'Sudah dijalankan' : 'Sedang berjalan', draf ? 'warn' : 'ok') + '</div>' +
        '<p class="hint">T.A ' + esc(d.asal) + ' → ' + esc(d.tujuan) + '. Status <strong>tidak ditentukan otomatis</strong>; tetapkan untuk setiap siswa. Usulan kelas tujuan hanya berdasarkan nama kelas.</p>' +
        '<div class="row-actions" style="margin-bottom:10px">' + chip('Naik ' + h.naik, 'ok') + chip('Tinggal ' + h.tinggal, 'warn') + chip('Lulus ' + h.lulus, 'soft') + chip('Keluar ' + h.keluar, 'err') + chip('Belum diputuskan ' + h.belum, h.belum ? 'warn' : 'ok') + '</div>' +
        '<div class="tabs" id="kn-tabs"><button data-t="semua"' + (tab === 'semua' ? ' class="active"' : '') + '>Semua</button>' + kelasAsal.map(k => '<button data-t="' + esc(k) + '"' + (tab === k ? ' class="active"' : '') + '>' + esc(k) + '</button>').join('') + '</div>' +
        (draf && tab !== 'semua' ? '<div class="row-actions" style="margin-bottom:10px"><button class="btn btn-secondary btn-sm" data-bulk="naik">Semua ' + esc(tab) + ': Naik (ikuti usulan)</button><button class="btn btn-secondary btn-sm" data-bulk="lulus">Semua: Lulus</button><button class="btn btn-secondary btn-sm" data-bulk="kosong">Kosongkan</button></div>' : '') +
        '<div class="list">' + terpilih().map(i => { const v = nilai(i), kt = d.kelas_tujuan; return '<div class="list-item"><div class="li-main"><strong>' + esc(i.nama) + '</strong><span class="li-meta">' + esc(i.kelas_asal) + ' · NISN ' + esc(i.nisn) + '</span></div><div class="li-actions">' +
          (draf ? '<select class="select" data-st="' + esc(i.id) + '" aria-label="Status ' + esc(i.nama) + '">' + opts(Object.entries(STATUS_LABEL), v.status, '— pilih status —') + '</select>' +
            '<select class="select" data-kt="' + esc(i.id) + '"' + (v.status === 'naik' || v.status === 'tinggal' ? '' : ' disabled') + ' aria-label="Kelas tujuan ' + esc(i.nama) + '">' + opts(kt.map(k => [k.id, k.nama]), v.kelas_tujuan_id, '— kelas tujuan —') + '</select>'
            : chip(STATUS_LABEL[i.status] || '—', i.status === 'naik' ? 'ok' : i.status === 'lulus' ? 'soft' : i.status === 'keluar' ? 'err' : 'warn') + (i.kelas_tujuan_id ? '<span class="li-meta">→ ' + esc((kt.find(k => k.id === i.kelas_tujuan_id) || {}).nama || '') + '</span>' : '') +
              (i.status === 'naik' || i.status === 'tinggal' ? '<button class="btn btn-secondary btn-sm" data-kor="' + esc(i.id) + '">Koreksi</button>' : '')) + '</div></div>'; }).join('') + '</div>' +
        (draf ? '<div class="row-actions" style="margin-top:14px"><button class="btn btn-secondary" id="kn-simpan"' + (n ? '' : ' disabled') + '>Simpan perubahan' + (n ? ' (' + n + ')' : '') + '</button><button class="btn btn-primary" id="kn-periksa">Periksa rencana</button></div><div id="kn-hasil"></div>' : '') +
        (d.state === 'berjalan' ? '<div class="form-error" style="margin-top:12px">Proses sempat terhenti. Data aman dan dapat dilanjutkan.</div><button class="btn btn-primary" id="kn-lanjut" style="margin-top:8px">Lanjutkan proses</button><div id="kn-prog"></div>' : '') + '</div>';

      $('#kn-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; gambar(); } });
      box.onchange = e => {
        const s = e.target.dataset.st, k = e.target.dataset.kt;
        if (s) { const i = d.items.find(x => x.id === s), cur = nilai(i); const st = e.target.value; edit[s] = { status: st, kelas_tujuan_id: st === 'naik' || st === 'tinggal' ? (cur.kelas_tujuan_id || (st === 'naik' ? i.usulan_id : '')) : '' }; hasilPeriksa = null; gambar(); }
        if (k) { const cur = nilai(d.items.find(x => x.id === k)); edit[k] = { status: cur.status, kelas_tujuan_id: e.target.value }; hasilPeriksa = null; gambar(); }
      };
      box.onclick = async e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.bulk) {
          terpilih().forEach(i => { edit[i.id] = b.dataset.bulk === 'naik' ? { status: 'naik', kelas_tujuan_id: i.usulan_id || '' } : b.dataset.bulk === 'lulus' ? { status: 'lulus', kelas_tujuan_id: '' } : { status: '', kelas_tujuan_id: '' }; });
          hasilPeriksa = null; gambar();
        } else if (b.dataset.kor) formKoreksi(d, d.items.find(x => x.id === b.dataset.kor), () => load());
      };
      const simpan = $('#kn-simpan'); if (simpan) simpan.addEventListener('click', () => simpanSemua());
      const per = $('#kn-periksa'); if (per) per.addEventListener('click', periksa);
      const lj = $('#kn-lanjut'); if (lj) lj.addEventListener('click', () => proses(batch.id, 'lanjut', {}));
      if (hasilPeriksa) tampilHasil();
    }

    async function simpanSemua() {
      const rows = Object.keys(edit).map(id => Object.assign({ id: id }, edit[id]));
      for (let i = 0; i < rows.length; i += 150) {
        const r = await api('admKenaikanSimpan', { batch_id: batch.id, rows: rows.slice(i, i + 150) });
        if (!r.success) { toast(r.message, true); return false; }
      }
      edit = {}; toast('Perubahan disimpan.'); await rencana(batch); return true;
    }

    async function periksa() {
      const b = $('#kn-periksa'); setBusy(b, true, 'Memeriksa…');
      if (Object.keys(edit).length && !(await simpanSemua())) return;
      const r = await api('admKenaikanPeriksa', { batch_id: batch.id });
      if (!r.success) { toast(r.message, true); const bb = $('#kn-periksa'); if (bb) setBusy(bb, false); return; }
      hasilPeriksa = r.data; gambar(); $('#kn-hasil').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function tampilHasil() {
      const p = hasilPeriksa, box2 = $('#kn-hasil'); if (!box2) return;
      box2.innerHTML = '<div class="card" style="box-shadow:none;margin-top:14px"><h2>3. Pratinjau &amp; pemeriksaan</h2>' +
        (p.jumlah_galat ? '<p class="form-error">' + p.jumlah_galat + ' masalah harus diperbaiki sebelum dijalankan.</p><div class="im-err" style="background:var(--err-bg)">' + p.galat.map(g => '<div>' + (g.nama ? '<strong>' + esc(g.nama) + ':</strong> ' : '') + esc(g.pesan) + '</div>').join('') + '</div>' : '<p class="hint" style="color:var(--ok-ink)">✓ Tidak ada masalah. Periksa ringkasan jalur di bawah.</p>') +
        '<div class="tbl-wrap"><table class="tbl" style="min-width:0"><thead><tr><th>Jalur</th><th class="num">Siswa</th></tr></thead><tbody>' + p.ringkas.jalur.map(j => '<tr><td>' + esc(j.jalur) + '</td><td class="num">' + j.jumlah + '</td></tr>').join('') + '</tbody></table></div>' +
        (p.siap ? '<button class="btn btn-primary btn-block" id="kn-jalan" style="margin-top:14px">Jalankan kenaikan kelas…</button>' : '') + '</div>';
      const j = $('#kn-jalan'); if (j) j.addEventListener('click', () => konfirmasi(p.ringkas));
    }

    function konfirmasi(rk) {
      modal({ title: 'Jalankan kenaikan kelas', submit: 'Jalankan sekarang', cancel: 'Batal', body:
        '<p class="form-error" style="background:#FFFBEB;color:#92400E;border-color:#FDE68A"><strong>Tindakan ini mengubah kelas ' + rk.total + ' siswa dan tidak dapat dibatalkan dengan satu klik.</strong> Cadangan data dibuat otomatis lebih dulu. Koreksi sesudahnya harus melalui prosedur tercatat.</p>' +
        '<p>' + chip('Naik ' + rk.status.naik, 'ok') + ' ' + chip('Tinggal ' + rk.status.tinggal, 'warn') + ' ' + chip('Lulus ' + rk.status.lulus, 'soft') + ' ' + chip('Keluar ' + rk.status.keluar, 'err') + '</p>' +
        '<p class="hint">Siswa yang lulus atau keluar tidak dapat lagi masuk ke aplikasi (data tetap tersimpan).</p>' +
        fld('Ketik JALANKAN untuk konfirmasi', 'kn-ok', '', 'autocomplete="off" autocapitalize="characters"') + '<label class="field"><span class="field-label">Kata sandi Anda</span><input id="kn-pw" type="password" autocomplete="current-password"></label>',
        onSubmit: async () => {
          if (val('kn-ok') !== 'JALANKAN') return 'Ketik JALANKAN (huruf besar) untuk melanjutkan.';
          if (!val('kn-pw')) return 'Masukkan kata sandi Anda.';
          const res = await proses(batch.id, 'mulai', { konfirmasi: val('kn-ok'), sandi: val('kn-pw') });
          return res && !res.success ? res.message : undefined;
        } });
    }

    // Menjalankan semua tahap sampai tuntas; aman diulang bila koneksi terputus (server idempoten)
    async function proses(id, tahap, extra) {
      const ov = document.createElement('div'); ov.className = 'modal-ov';
      ov.innerHTML = '<div class="modal"><h2>Memproses kenaikan kelas…</h2><div class="bar"><span id="pg-bar" style="width:0%"></span></div><p class="hint" id="pg-txt">Membuat cadangan dan memulai…</p><p class="hint"><strong>Jangan tutup atau muat ulang halaman ini.</strong></p></div>';
      document.body.appendChild(ov);
      let t = tahap, last = null;
      try {
        for (;;) {
          const r = await api('admKenaikanJalankan', Object.assign({ batch_id: id, tahap: t }, t === 'mulai' ? extra : {}), 300000);
          if (!r.success) { ov.remove(); if (r.network) { toast('Koneksi terputus. Data aman — klik "Lanjutkan proses" untuk meneruskan.', true); await rencana(batch); } else toast(r.message, true); return r; }
          last = r; $('#pg-bar').style.width = Math.round(r.data.selesai / r.data.total * 100) + '%'; $('#pg-txt').textContent = r.data.selesai + ' dari ' + r.data.total + ' siswa diproses';
          if (r.data.tuntas) break; t = 'lanjut';
        }
      } catch (e) { ov.remove(); toast('Terjadi gangguan. Data aman; coba lanjutkan.', true); return { success: false, message: 'Terjadi gangguan.' }; }
      ov.remove(); toast('Kenaikan kelas selesai.'); hasilPeriksa = null; edit = {}; load(); return last;
    }

    gambar();
  }

  function formKoreksi(d, i, done) {
    modal({ title: 'Koreksi — ' + i.nama, submit: 'Simpan koreksi', body:
      '<p class="hint">Koreksi tercatat di Log beserta alasannya. Hanya untuk memindahkan kelas tujuan atau mengubah naik ↔ tinggal kelas, dan hanya bila siswa belum memiliki nilai/presensi di kelas barunya.</p>' +
      sel('Status', 'kr-st', opts([['naik', 'Naik kelas'], ['tinggal', 'Tinggal kelas']], i.status)) + sel('Kelas tujuan', 'kr-kt', opts(d.kelas_tujuan.map(k => [k.id, k.nama]), i.kelas_tujuan_id)) +
      '<label class="field"><span class="field-label">Alasan koreksi (wajib)</span><textarea id="kr-alasan" rows="3" maxlength="300"></textarea></label>',
      onSubmit: async () => { const r = await api('admKenaikanKoreksi', { id: i.id, status: val('kr-st'), kelas_tujuan_id: val('kr-kt'), alasan: val('kr-alasan') }); if (!r.success) return r.message; toast(r.message); done(); } });
  }
  load();
}

window.ADMIN_PAGES = Object.assign(window.ADMIN_PAGES || {}, { kenaikan: adminKenaikan });
