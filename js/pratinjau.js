// ============================================================
// LMS PAI & FIQIH — PRATINJAU LANGSUNG DI HALAMAN
// Video (YouTube / Google Drive), PDF, gambar, dan audio tampil di dalam aplikasi; selalu ada tombol Unduh.
// Memakai esc, api, modal, SPIN, fmtSize, renderTeks, safeLink, bisaPratinjau (belajar.js).
//
// KEAMANAN:
//  - Video hanya ditanam dari domain tepercaya (YouTube via youtube-nocookie, Google Drive) dengan ID ketat dan iframe ber-sandbox.
//  - Berkas privat diambil lewat backend (hak akses diperiksa di server), lalu ditampilkan dari Blob lokal; tidak ada tautan publik.
//  - PDF dirender oleh PDF.js (versi dikunci) sebagai gambar di <canvas>; skrip di dalam PDF tidak dijalankan.
//  - PDF.js dimuat dari CDN cdnjs hanya saat pertama kali ada PDF dibuka. Bila gagal dimuat, penampil bawaan browser dipakai sebagai cadangan.
// ============================================================

const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const ekstensi = n => (String(n || '').split('.').pop() || '').toLowerCase();

// ---------- Video tertanam ----------
function embedDari(url) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch (e) { return null; }
  if (u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase().replace(/^www\./, ''), idOk = s => /^[A-Za-z0-9_-]{11}$/.test(s || '');
  const detik = t => {
    if (!t) return 0;
    if (/^\d+$/.test(t)) return Math.min(Number(t), 86400);
    const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t);
    return m ? Math.min((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0), 86400) : 0;
  };
  let id = '';
  if (h === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (h === 'youtube.com' || h === 'm.youtube.com' || h === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else { const m = /^\/(embed|shorts|live|v)\/([^/?]+)/.exec(u.pathname); if (m) id = m[2]; }
  }
  if (idOk(id)) {
    const mulai = detik(u.searchParams.get('t') || u.searchParams.get('start'));
    return { tipe: 'youtube', src: 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&modestbranding=1' + (mulai ? '&start=' + mulai : '') };
  }
  if (h === 'drive.google.com') {
    const m = /^\/file\/d\/([A-Za-z0-9_-]{10,})\//.exec(u.pathname + '/');
    if (m) return { tipe: 'drive', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
  }
  return null;
}
const iframeHtml = e => '<div class="pv-video"><iframe src="' + esc(e.src) + '" title="Video pembelajaran" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" ' +
  'allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"></iframe></div>';

// ---------- Pengambilan berkas privat (dengan cache memori terbatas) ----------
const berkasCache = new Map();
async function ambilBerkas(id) {
  if (berkasCache.has(id)) return berkasCache.get(id);
  const r = await api('getFile', { id: id });
  if (!r.success) throw new Error(r.message || 'Berkas tidak dapat dimuat.');
  const bin = atob(r.data.base64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const item = { nama: r.data.nama, mime: r.data.mime, bytes: bytes, blob: new Blob([bytes], { type: r.data.mime }), url: '' };
  berkasCache.set(id, item);
  while (berkasCache.size > 6) {                                          // batasi pemakaian memori
    const k = berkasCache.keys().next().value, lama = berkasCache.get(k);
    if (lama.url) URL.revokeObjectURL(lama.url);
    berkasCache.delete(k);
  }
  return item;
}
const urlBerkas = it => it.url || (it.url = URL.createObjectURL(it.blob));

// ---------- Penampil PDF (PDF.js) ----------
let pdfJsJanji = null;
function muatPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfJsJanji) pdfJsJanji = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PDFJS_BASE + 'pdf.min.js'; s.async = true;
    s.onload = () => {
      if (!window.pdfjsLib) { pdfJsJanji = null; return rej(new Error('Pustaka PDF tidak valid.')); }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js';
      res(window.pdfjsLib);
    };
    s.onerror = () => { pdfJsJanji = null; rej(new Error('Pustaka PDF tidak dapat dimuat.')); };
    document.head.appendChild(s);
  });
  return pdfJsJanji;
}

async function tampilPdf(box, it) {
  let pdf;
  try {
    const lib = await muatPdfJs();
    pdf = await lib.getDocument({ data: it.bytes.slice(), isEvalSupported: false }).promise;   // salinan: PDF.js memindahkan buffer ke worker
  } catch (e) {                                                                               // cadangan: penampil PDF bawaan browser
    box.innerHTML = '<iframe class="pv-frame" title="' + esc(it.nama) + '" src="' + esc(urlBerkas(it)) + '"></iframe><p class="hint">Jika tampilan di atas kosong, gunakan tombol Unduh.</p>';
    return;
  }
  if (!document.body.contains(box)) { try { pdf.destroy(); } catch (e) {} return; }
  let hal = 1, zoom = 1, ver = 0, tugas = null;
  box.innerHTML = '<div class="pv-bar"><div class="row-actions"><button type="button" class="btn btn-secondary btn-sm" data-pv="prev" aria-label="Halaman sebelumnya">‹</button>' +
    '<span class="li-meta pv-info" aria-live="polite"></span><button type="button" class="btn btn-secondary btn-sm" data-pv="next" aria-label="Halaman berikutnya">›</button></div>' +
    '<div class="row-actions"><button type="button" class="btn btn-secondary btn-sm" data-pv="out" aria-label="Perkecil">−</button><button type="button" class="btn btn-secondary btn-sm" data-pv="fit">Lebar</button><button type="button" class="btn btn-secondary btn-sm" data-pv="in" aria-label="Perbesar">+</button></div></div>' +
    '<div class="pv-pages"><canvas></canvas></div>';
  const kanvas = $('canvas', box), wrap = $('.pv-pages', box);
  async function gambar() {
    const v = ++ver;
    const p = await pdf.getPage(hal);
    if (v !== ver || !document.body.contains(box)) return;
    const v1 = p.getViewport({ scale: 1 }), lebar = Math.max(240, wrap.clientWidth - 16), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vp = p.getViewport({ scale: lebar / v1.width * zoom * dpr });
    kanvas.width = vp.width; kanvas.height = vp.height;
    kanvas.style.width = Math.floor(vp.width / dpr) + 'px'; kanvas.style.height = Math.floor(vp.height / dpr) + 'px';
    if (tugas) { try { tugas.cancel(); } catch (e) {} }
    tugas = p.render({ canvasContext: kanvas.getContext('2d'), viewport: vp });
    try { await tugas.promise; } catch (e) { if (!(e && e.name === 'RenderingCancelledException')) { box.insertAdjacentHTML('beforeend', '<p class="form-error">Halaman tidak dapat ditampilkan.</p>'); return; } }
    $('.pv-info', box).textContent = 'Halaman ' + hal + ' / ' + pdf.numPages + (zoom !== 1 ? ' · ' + Math.round(zoom * 100) + '%' : '');
    $('[data-pv="prev"]', box).disabled = hal <= 1; $('[data-pv="next"]', box).disabled = hal >= pdf.numPages;
  }
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-pv]'); if (!b) return;
    const a = b.dataset.pv;
    if (a === 'prev' && hal > 1) hal--; else if (a === 'next' && hal < pdf.numPages) hal++;
    else if (a === 'in') zoom = Math.min(3, Math.round((zoom + 0.25) * 100) / 100); else if (a === 'out') zoom = Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100); else if (a === 'fit') zoom = 1;
    gambar(); if (a === 'prev' || a === 'next') wrap.scrollTop = 0;
  });
  let rt = null;
  const onResize = () => { if (!document.body.contains(box)) return window.removeEventListener('resize', onResize); clearTimeout(rt); rt = setTimeout(gambar, 200); };
  window.addEventListener('resize', onResize);
  gambar();
}

function tampilGambar(box, it) {
  box.innerHTML = '<div class="pv-img"><img alt="' + esc(it.nama) + '" src="' + esc(urlBerkas(it)) + '"></div><p class="li-meta">Klik gambar untuk memperbesar atau memperkecil.</p>';
  $('img', box).addEventListener('click', e => e.target.classList.toggle('zoom'));
}
function tampilAudio(box, it) { box.innerHTML = '<audio controls preload="metadata" src="' + esc(urlBerkas(it)) + '">Browser Anda tidak mendukung pemutar audio.</audio>'; }

// Tampilkan satu lampiran {id, nama, ukuran} ke dalam elemen box
async function renderBerkas(box, l) {
  const ext = ekstensi(l.nama);
  box.innerHTML = '<div class="empty"><span class="spinner"></span><p>Memuat ' + esc(l.nama) + (l.ukuran ? ' (' + fmtSize(l.ukuran) + ')' : '') + '…</p></div>';
  let it;
  try { it = await ambilBerkas(l.id); } catch (e) { if (document.body.contains(box)) box.innerHTML = '<p class="form-error">' + esc(e.message) + '</p>'; return; }
  if (!document.body.contains(box)) return;
  if (ext === 'pdf') return tampilPdf(box, it);
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return tampilGambar(box, it);
  if (ext === 'mp3' || ext === 'm4a') return tampilAudio(box, it);
  box.innerHTML = '<div class="empty">Jenis berkas ini tidak dapat dipratinjau. Silakan unduh.</div>';
}

const lebarkan = m => { const e = m.el.querySelector('.modal'); if (e) e.classList.add('modal-wide'); };
const unduhBtn = l => '<button type="button" class="btn btn-secondary btn-sm" data-file="' + esc(l.id) + '" data-nama="' + esc(l.nama) + '">⬇ Unduh</button>';

// Jendela pratinjau satu berkas (tombol "Pratinjau")
function bukaPratinjau(l) {
  const m = modal({ title: l.nama, submit: '', cancel: 'Tutup', body: '<div class="pv-host"></div><div class="row-actions" style="margin-top:10px">' + unduhBtn(l) + '</div>' });
  lebarkan(m);
  renderBerkas($('.pv-host', m.el), l);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-prev]');
  if (b) bukaPratinjau({ id: b.dataset.prev, nama: b.dataset.nama, ukuran: Number(b.dataset.ukuran) || 0 });
});

// Pembaca materi: teks, video (tertanam), gambar/PDF/modul (langsung tampil). Dipakai siswa dan guru.
function bukaMateri(mt) {
  const ap = mt.lampiran || [];
  let body;
  if (mt.jenis === 'teks') body = '<div class="materi-teks">' + renderTeks(mt.isi) + '</div>';
  else if (mt.jenis === 'video' || mt.jenis === 'tautan') {
    const e = embedDari(mt.url);
    body = (mt.isi ? '<p dir="auto" style="white-space:pre-wrap">' + esc(mt.isi) + '</p>' : '') +
      (e ? iframeHtml(e) + '<p class="li-meta" style="margin-top:8px">Jika video tidak muncul: ' + safeLink(mt.url) + '</p>'
         : '<p>' + safeLink(mt.url) + '</p><p class="hint">Tautan ini tidak dapat ditampilkan langsung di halaman, sehingga dibuka di tab baru.</p>');
  } else {
    body = (mt.isi ? '<p dir="auto" style="white-space:pre-wrap">' + esc(mt.isi) + '</p>' : '') +
      (ap.length ? ap.map(l => '<div class="pv-item"><div class="row-between"><strong dir="auto">' + esc(l.nama) + '</strong><div class="row-actions">' +
        (bisaPratinjau(l.nama) ? '<button type="button" class="btn btn-secondary btn-sm" data-pv-load="' + esc(l.id) + '">Tampilkan</button>' : '') + unduhBtn(l) + '</div></div>' +
        '<div class="pv-host" data-host="' + esc(l.id) + '">' + (bisaPratinjau(l.nama) ? '' : '<p class="hint">Jenis berkas ini hanya dapat diunduh.</p>') + '</div></div>').join('') : '<div class="empty">Berkas belum tersedia.</div>');
  }
  const m = modal({ title: mt.judul, submit: '', cancel: 'Tutup', body: body,
    onOpen: mm => {
      const muat = id => { const l = ap.find(x => x.id === id), host = $('[data-host="' + id + '"]', mm.el); if (l && host) { renderBerkas(host, l); const t = $('[data-pv-load="' + id + '"]', mm.el); if (t) t.hidden = true; } };
      mm.el.addEventListener('click', e => { const b = e.target.closest('[data-pv-load]'); if (b) muat(b.dataset.pvLoad); });
      const pertama = ap.find(l => bisaPratinjau(l.nama));
      if (pertama && mt.jenis !== 'teks' && mt.jenis !== 'video' && mt.jenis !== 'tautan') muat(pertama.id);      // berkas pertama langsung tampil
    } });
  lebarkan(m);
}
