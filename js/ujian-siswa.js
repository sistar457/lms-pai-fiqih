// ============================================================
// LMS PAI & FIQIH — UJIAN: SISI SISWA (Fase 4A)
// Daftar ujian, pengerjaan CBT (timer server, simpan otomatis), hasil & pembahasan
// ============================================================

const sleep = ms => new Promise(r => setTimeout(r, ms));
const isNetErr = r => !r.success && String(r.message || '').indexOf('Tidak dapat terhubung') === 0;

// Percobaan ulang otomatis untuk gangguan jaringan / lonjakan permintaan sesaat
async function apiRetry(action, data, tries) {
  let r;
  for (let i = 0; i < (tries || 3); i++) {
    r = await api(action, data);
    if (!isNetErr(r)) return r;
    await sleep(1500 + Math.random() * 2000);
  }
  return r;
}

const STATE_CHIP = u => ({
  berlangsung: chip('Sedang dikerjakan', 'soft'), bisa_mulai: chip('Dibuka', 'ok'), akan_datang: chip('Belum dibuka', 'warn'),
  selesai: u.menunggu ? chip('Menunggu nilai esai', 'soft') : (u.nilai !== '' ? chip('Nilai ' + u.nilai, 'ok') : (u.terpakai ? chip('Selesai', 'soft') : chip('Tidak dikerjakan', 'err')))
}[u.state]);
const optText = (opsi, k) => { const o = (opsi || []).find(x => x.k === k); return o ? o.t : String(k || '—'); };

async function siswaUjian(param) {
  if (param) return siswaUjianDetail(param);
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Ujian &amp; Kuis</h1></div>' + SPIN;
  const r = await api('sisListUjian');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  const items = r.data.items; let tab = 'aktif';
  const groups = { aktif: u => u.state === 'berlangsung' || u.state === 'bisa_mulai', akan: u => u.state === 'akan_datang', riwayat: u => u.state === 'selesai' };
  const draw = () => {
    const f = items.filter(groups[tab]);
    $('#uj-list').innerHTML = f.length ? '<div class="list">' + f.map(u =>
      '<a class="list-item row-link" href="#/ujian/' + esc(u.id) + '"><div class="li-main"><strong>' + esc(u.judul) + '</strong>' +
      '<span class="li-meta">' + esc(u.mapel) + ' · ' + (u.tipe === 'kuis' ? 'Kuis' : 'Ujian') + ' · ' + esc(fmtTenggat(u.mulai)) + ' – ' + esc(fmtTenggat(u.selesai)) + '</span></div>' +
      '<div class="li-actions">' + STATE_CHIP(u) + '</div></a>').join('') + '</div>' : '<div class="empty">Tidak ada ujian pada kategori ini.</div>';
  };
  c.innerHTML = '<div class="page-head"><h1>Ujian &amp; Kuis</h1><p>Kerjakan dengan jujur, tepat waktu, dan berdoa dahulu.</p></div>' +
    '<div class="tabs" id="uj-tabs"><button class="active" data-t="aktif">Sedang berlangsung</button><button data-t="akan">Akan datang</button><button data-t="riwayat">Riwayat</button></div><div class="card" id="uj-list"></div>';
  $('#uj-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; $$('#uj-tabs button').forEach(x => x.classList.toggle('active', x === b)); draw(); });
  draw();
}

async function siswaUjianDetail(id) {
  const c = $('#content');
  c.innerHTML = SPIN;
  const r = await api('sisListUjian');
  if (!r.success) { c.innerHTML = errBox(r.message); return; }
  const u = r.data.items.find(x => x.id === id);
  if (!u) { c.innerHTML = errBox('Ujian tidak ditemukan.') + '<p><a href="#/ujian">← Kembali</a></p>'; return; }
  let hasil = null;
  if (u.mode === 'cbt' && u.terpakai > 0) { const h = await api('sisHasilUjian', { ujian_id: id }); if (h.success) hasil = h.data; }
  const cbt = u.mode === 'cbt';

  c.innerHTML = '<p><a href="#/ujian">← Semua ujian</a></p>' +
    '<div class="page-head"><span class="chip chip-soft">' + esc(u.mapel) + '</span><h1 style="margin-top:8px">' + esc(u.judul) + '</h1><p>' + STATE_CHIP(u) + '</p></div><div class="stack">' +
    '<div class="card"><h2>Informasi</h2><div class="list"><div class="list-item"><span>Dibuka</span><strong>' + esc(fmtTenggat(u.mulai)) + '</strong></div><div class="list-item"><span>Ditutup</span><strong>' + esc(fmtTenggat(u.selesai)) + '</strong></div>' +
    (cbt ? '<div class="list-item"><span>Jumlah soal</span><strong>' + u.jumlah_soal + '</strong></div><div class="list-item"><span>Durasi</span><strong>' + u.durasi_menit + ' menit</strong></div><div class="list-item"><span>Percobaan</span><strong>' + u.terpakai + ' dari ' + u.maks_percobaan + '</strong></div>' : '') + '</div>' +
    (u.state === 'berlangsung' || u.state === 'bisa_mulai' ? (cbt ?
      '<p class="hint" style="margin-top:12px">Waktu berjalan sejak tombol ditekan dan tidak bisa dihentikan. Jawaban tersimpan otomatis. Jika koneksi terputus, buka kembali halaman ini untuk melanjutkan.</p><button class="btn btn-primary btn-block" id="uj-start">' + (u.state === 'berlangsung' ? 'Lanjutkan ujian' : 'Mulai ujian sekarang') + '</button>'
      : '<p style="margin-top:12px"><a class="btn btn-primary btn-block" href="' + esc(u.url) + '" target="_blank" rel="noopener noreferrer">Buka ujian ↗</a></p><p class="hint">Ujian dikerjakan di tautan eksternal. Nilai akan diinput oleh guru.</p>') : '') + '</div>' +
    (hasil && hasil.attempts.length ? '<div class="card"><h2>Hasil Anda</h2><div class="list">' + hasil.attempts.map(a =>
      '<div class="list-item"><div class="li-main"><strong>Percobaan ' + a.ke + '</strong><span class="li-meta">' + esc(fmtTenggat(a.selesai)) + '</span></div><div class="li-actions">' +
      (a.status === 'dinilai' ? chip('Nilai ' + a.nilai, 'ok') : chip('Menunggu penilaian guru', 'soft')) +
      (hasil.boleh ? '<button class="btn btn-secondary btn-sm" data-pem="' + esc(a.id) + '">Pembahasan</button>' : '') + '</div></div>').join('') + '</div>' +
      (!hasil.boleh && hasil.pembahasan !== 'tidak' ? '<p class="hint">Pembahasan akan tersedia setelah ujian ditutup.</p>' : '') + '</div>' : '') + '</div>';

  const start = $('#uj-start');
  if (start) start.addEventListener('click', async () => {
    const resume = u.state === 'berlangsung';
    if (!resume && !confirm('Mulai ujian "' + u.judul + '"?\nWaktu ' + u.durasi_menit + ' menit langsung berjalan.')) return;
    setBusy(start, true, 'Menyiapkan soal…');
    if (!resume) await sleep(Math.random() * 4000);            // sebar lonjakan saat banyak siswa menekan tombol bersamaan
    const res = await apiRetry('sisMulaiUjian', { ujian_id: id }, 4);
    if (!res.success) { setBusy(start, false); return toast(res.message, true); }
    runCbt(c, res.data, id);
  });
  c.onclick = async e => {
    const b = e.target.closest('[data-pem]'); if (!b) return;
    const h = await api('sisHasilUjian', { ujian_id: id, attempt_id: b.dataset.pem });
    if (!h.success) return toast(h.message, true);
    if (!h.data.detail) return toast('Pembahasan belum tersedia.', true);
    showPembahasan(h.data.detail.soal);
  };
}

function showPembahasan(soal) {
  modal({ title: 'Pembahasan', submit: '', cancel: 'Tutup', body: soal.map((s, i) => {
    const head = '<p dir="auto" style="white-space:pre-wrap"><strong>' + (i + 1) + '.</strong> ' + esc(s.pertanyaan) + '</p>';
    if (s.jenis === 'esai') return '<div class="card" style="box-shadow:none;margin-bottom:12px">' + head + '<div class="secret"><div><small>Jawaban Anda</small><span dir="auto" style="white-space:pre-wrap">' + esc(s.jawab || '(tidak dijawab)') + '</span></div>' +
      '<div><small>Skor</small><strong>' + (s.skor === null ? 'belum dinilai' : s.skor + ' / ' + s.bobot) + '</strong></div>' + (s.fb ? '<div><small>Umpan balik</small>' + esc(s.fb) + '</div>' : '') + '</div></div>';
    return '<div class="card" style="box-shadow:none;margin-bottom:12px">' + head + '<p>' + chip(s.benar ? 'Benar' : 'Salah', s.benar ? 'ok' : 'err') + '</p>' +
      '<p class="li-meta">Jawaban Anda: ' + esc(s.jawab ? optText(s.opsi, s.jawab) : '—') + '<br>Kunci: <strong>' + esc(optText(s.opsi, s.kunci)) + '</strong></p></div>';
  }).join('') });
}

// ============================================================
// PENGERJAAN CBT
// ============================================================
function runCbt(c, paket, ujianId) {
  const soal = paket.soal, jawab = Object.assign({}, paket.jawab), ragu = new Set(paket.ragu || []);
  let idx = 0, dirty = false, saving = false, finished = false, tab = 0, deadline = performance.now() + paket.sisa_detik * 1000;
  let tSave = null, tTick = null, tAuto = null;

  c.innerHTML = '<div class="cbt-bar"><strong class="cbt-title">' + esc(paket.judul) + '</strong><span class="cbt-timer" id="cb-timer">--:--</span></div>' +
    '<div class="cbt-save" id="cb-save">Jawaban tersimpan otomatis.</div><div class="qnav" id="cb-nav" role="navigation" aria-label="Nomor soal"></div>' +
    '<div class="card cbt-card" id="cb-q"></div>' +
    '<div class="cbt-foot"><button class="btn btn-secondary" id="cb-prev">← Sebelumnya</button><label class="check-inline"><input type="checkbox" id="cb-ragu"> Tandai ragu</label><button class="btn btn-primary" id="cb-next">Selanjutnya →</button></div>' +
    '<div style="margin-top:14px"><button class="btn btn-block" style="background:var(--gold);color:var(--text)" id="cb-done">Selesaikan ujian</button></div>';

  const setSave = (t, bad) => { const e = $('#cb-save'); if (e) { e.textContent = t; e.style.color = bad ? 'var(--err-ink)' : ''; } };
  const touch = () => { dirty = true; clearTimeout(tSave); tSave = setTimeout(save, 5000); };

  function draw() {
    const s = soal[idx];
    $('#cb-nav').innerHTML = soal.map((q, i) => '<button type="button" class="qn' + (jawab[q.id] ? ' done' : '') + (ragu.has(q.id) ? ' ragu' : '') + (i === idx ? ' cur' : '') + '" data-i="' + i + '" aria-label="Soal ' + (i + 1) + '">' + (i + 1) + '</button>').join('');
    $('#cb-ragu').checked = ragu.has(s.id);
    $('#cb-prev').disabled = idx === 0; $('#cb-next').disabled = idx === soal.length - 1;
    let body = '<div class="row-between"><div><span class="chip chip-soft">Soal ' + (idx + 1) + ' dari ' + soal.length + '</span> <span class="chip chip-warn">' + esc(JENIS_SOAL[s.jenis]) + '</span></div><span class="li-meta">Bobot ' + s.bobot + '</span></div>' +
      '<p class="q-text" dir="auto">' + esc(s.pertanyaan) + '</p>';
    if (s.jenis === 'esai') body += '<textarea id="cb-esai" rows="9" maxlength="1200" dir="auto" class="cbt-esai" placeholder="Tulis jawaban Anda…">' + esc(jawab[s.id] || '') + '</textarea><small class="li-meta" id="cb-cnt">' + (jawab[s.id] || '').length + ' / 1200</small>';
    else body += s.opsi.map((o, i) => '<button type="button" class="opt' + (jawab[s.id] === o.k ? ' sel' : '') + '" data-k="' + esc(o.k) + '"><span class="opt-l">' + (s.jenis === 'pg' ? 'ABCDE'[i] : (o.k === 'benar' ? 'B' : 'S')) + '</span><span dir="auto">' + esc(o.t) + '</span></button>').join('');
    $('#cb-q').innerHTML = body;
  }

  async function save() {
    if (finished || saving || !dirty) return;
    saving = true; const snap = JSON.stringify([jawab, [...ragu], tab]); setSave('Menyimpan…');
    const r = await api('sisSimpanJawaban', { attempt_id: paket.attempt_id, jawab: jawab, ragu: [...ragu], tab: tab });
    saving = false;
    if (r.success) {
      if (r.data.selesai) return finish(true);
      if (snap === JSON.stringify([jawab, [...ragu], tab])) dirty = false;
      deadline = performance.now() + r.data.sisa_detik * 1000; setSave('Tersimpan ✓');
    } else setSave('Belum tersimpan — mencoba lagi…', true);
  }

  function tick() {
    const sisa = Math.max(0, Math.ceil((deadline - performance.now()) / 1000)), t = $('#cb-timer');
    if (t) { t.textContent = String(Math.floor(sisa / 60)).padStart(2, '0') + ':' + String(sisa % 60).padStart(2, '0'); t.classList.toggle('low', sisa <= 300); }
    if (sisa <= 0) finish(true);
  }

  const onVis = () => { if (document.hidden && !finished) { tab++; dirty = true; save(); } };
  const onHash = () => { if (!finished) { save(); cleanup(); } };           // keluar halaman: simpan terakhir, ujian tetap berjalan di server
  function cleanup() {
    clearTimeout(tSave); clearInterval(tTick); clearInterval(tAuto);
    document.removeEventListener('visibilitychange', onVis); window.removeEventListener('hashchange', onHash); window.onbeforeunload = null;
  }

  async function finish(auto) {
    if (finished) return;
    if (!auto) {
      const kosong = soal.filter(q => !jawab[q.id]).length;
      if (!confirm(kosong ? 'Masih ada ' + kosong + ' soal belum dijawab. Selesaikan ujian sekarang?' : 'Selesaikan ujian sekarang? Jawaban tidak dapat diubah lagi.')) return;
    }
    finished = true; cleanup();
    c.innerHTML = '<div class="empty"><span class="spinner"></span><p>' + (auto ? 'Waktu habis. ' : '') + 'Mengirim jawaban Anda… jangan tutup halaman ini.</p></div>';
    const r = await apiRetry('sisSelesaiUjian', { attempt_id: paket.attempt_id, jawab: jawab, tab: tab }, 5);
    if (!r.success) {
      c.innerHTML = errBox(r.message) + '<p>Jawaban Anda masih tersimpan di layar ini. Periksa koneksi, lalu coba kirim lagi.</p><button class="btn btn-primary" id="cb-retry">Kirim lagi</button>';
      $('#cb-retry').addEventListener('click', async () => { const x = await apiRetry('sisSelesaiUjian', { attempt_id: paket.attempt_id, jawab: jawab, tab: tab }, 5); x.success ? hasilView(x.data) : toast(x.message, true); });
      return;
    }
    hasilView(r.data);
  }

  function hasilView(d) {
    c.innerHTML = '<div class="card" style="text-align:center"><h1>Alhamdulillah, ujian selesai</h1>' +
      (d.status === 'dinilai' ? '<p class="hint">Nilai Anda</p><p style="font-size:44px;font-weight:700;color:var(--primary);margin:0">' + esc(d.nilai) + '</p>' : '<p class="hint">Jawaban pilihan ganda sudah dinilai. Nilai akhir akan muncul setelah guru memeriksa jawaban esai.</p>') +
      '<p style="margin-top:16px"><a class="btn btn-primary" href="#/ujian">Kembali ke daftar ujian</a></p></div>';
  }

  $('#cb-nav').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { idx = Number(b.dataset.i); draw(); } });
  $('#cb-prev').addEventListener('click', () => { if (idx > 0) { idx--; draw(); } });
  $('#cb-next').addEventListener('click', () => { if (idx < soal.length - 1) { idx++; draw(); } });
  $('#cb-done').addEventListener('click', () => finish(false));
  $('#cb-ragu').addEventListener('change', e => { const id = soal[idx].id; e.target.checked ? ragu.add(id) : ragu.delete(id); touch(); draw(); });
  $('#cb-q').addEventListener('click', e => { const b = e.target.closest('.opt'); if (!b) return; jawab[soal[idx].id] = b.dataset.k; touch(); draw(); });
  $('#cb-q').addEventListener('input', e => {
    if (e.target.id !== 'cb-esai') return;
    const id = soal[idx].id, v = e.target.value; v ? (jawab[id] = v) : delete jawab[id];
    $('#cb-cnt').textContent = v.length + ' / 1200'; touch();
  });

  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('hashchange', onHash);
  window.onbeforeunload = e => { e.preventDefault(); e.returnValue = ''; return ''; };
  tTick = setInterval(tick, 1000); tAuto = setInterval(save, 20000);
  draw(); tick();
}

Object.assign(window.SISWA_PAGES, { ujian: siswaUjian });
