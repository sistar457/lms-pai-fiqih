// ============================================================
// LMS PAI & FIQIH — HELPER PEMBELAJARAN (Fase 3, dipakai guru & siswa)
// Memakai $, esc, api, toast, chip, SPIN, errBox dari app.js / admin.js
// ============================================================

const JENIS_LABEL = { teks: 'Teks', pdf: 'PDF', modul: 'Modul', video: 'Video', tautan: 'Tautan' };
const JAWAB_LABEL = { teks: 'Teks', berkas: 'Berkas', tautan: 'Tautan', kombinasi: 'Teks, berkas, atau tautan' };
const FILE_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'pptx', 'mp3', 'm4a'];
const FILE_ACCEPT = FILE_EXT.map(e => '.' + e).join(',');
const MAX_FILE = 5 * 1024 * 1024;

const fmtSize = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const fmtTenggat = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d.toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; };
const toLocalInput = iso => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 7 * 864e5);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
};

// Baca berkas pilihan pengguna → {nama, base64}; melempar Error berisi pesan jika tidak valid
function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (FILE_EXT.indexOf(ext) < 0) return reject(new Error('Jenis berkas tidak diizinkan. Gunakan PDF, JPG, PNG, DOCX, PPTX, MP3, atau M4A.'));
    if (file.size > MAX_FILE) return reject(new Error('Ukuran berkas maksimal 5 MB.'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Berkas tidak dapat dibaca.'));
    fr.onload = () => resolve({ nama: file.name, base64: String(fr.result).split(',')[1] });
    fr.readAsDataURL(file);
  });
}

// Berkas bersifat privat: diunduh lewat backend setelah hak akses diperiksa
async function downloadLampiran(id, nama, btn) {
  if (btn) btn.disabled = true;
  toast('Menyiapkan berkas…');
  const r = await api('getFile', { id });
  if (btn) btn.disabled = false;
  if (!r.success) return toast(r.message, true);
  const bin = atob(r.data.base64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: r.data.mime }));
  const a = document.createElement('a');
  a.href = url; a.download = r.data.nama || nama || 'berkas';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-file]');
  if (b) downloadLampiran(b.dataset.file, b.dataset.nama, b);
});

const fileBtn = l => '<button type="button" class="btn btn-secondary btn-sm" data-file="' + esc(l.id) + '" data-nama="' + esc(l.nama) + '">⬇ ' + esc(l.nama) + ' <small>(' + fmtSize(l.ukuran) + ')</small></button>';
const lampiranHtml = list => (list && list.length ? '<div class="row-actions">' + list.map(fileBtn).join('') + '</div>' : '');
const safeLink = u => /^https?:\/\//i.test(u || '') ? '<a class="btn btn-secondary btn-sm" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Buka tautan ↗</a>' : '';

// Teks materi: paragraf dipisah baris kosong; paragraf berawalan ">" tampil sebagai kutipan ayat/hadits
function renderTeks(text) {
  return String(text || '').split(/\n{2,}/).map(p => {
    p = p.trim(); if (!p) return '';
    if (p.charAt(0) === '>') return '<blockquote class="ayat" dir="auto">' + esc(p.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n')) + '</blockquote>';
    return '<p dir="auto">' + esc(p).replace(/\n/g, '<br>') + '</p>';
  }).join('');
}

// Chip status tugas dari sisi siswa
function stateChip(it) {
  if (it.state === 'dinilai') return chip('Nilai ' + it.nilai, 'ok');
  if (it.state === 'dikumpulkan') return chip(it.terlambat ? 'Dikumpulkan (terlambat)' : 'Dikumpulkan', 'soft');
  if (it.status === 'ditutup') return chip('Ditutup', 'err');
  return it.lewat ? chip('Lewat tenggat', 'err') : chip('Belum dikerjakan', 'warn');
}

const mapelCard = (m, href, extra) =>
  '<a class="card kelas-card" href="' + href + '"><span class="chip chip-soft">Semester ' + esc(m.semester) + '</span>' +
  '<h2>' + esc(m.mapel) + '</h2><p class="hint" style="margin:0">Kelas ' + esc(m.kelas) + (extra ? '<br>' + extra : '') + '</p></a>';
