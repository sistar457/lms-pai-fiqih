// ============================================================
// LMS PAI & FIQIH — FORUM & DISKUSI (Fase 5B) — admin, guru, dan siswa
// Memakai $, esc, api, toast, chip, SPIN, errBox, modal, opts, fld, sel, val, fmtTenggat, setBusy.
// ============================================================

Object.assign(ICONS, {
  forum: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7"/>',
  more: '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>'
});

async function halamanForum(param) {
  if (param) return detailForum(param);
  const c = $('#content');
  c.innerHTML = '<div class="page-head"><h1>Forum</h1></div>' + SPIN;
  async function load() {
    const r = await api('listForum');
    if (!r.success) { c.innerHTML = errBox(r.message); return; }
    const { items, kelasOpsi } = r.data, boleh = me.role === 'admin' || (me.role === 'guru' && kelasOpsi.length);
    const stChip = f => f.status === 'buka' ? '' : chip(f.status === 'ditutup' ? 'Ditutup' : 'Diarsipkan', 'err');
    c.innerHTML = '<div class="page-head row-between"><div><h1>Forum</h1><p>Diskusi umum dan diskusi khusus kelas.</p></div>' + (boleh ? '<button class="btn btn-primary btn-sm" id="fr-add">+ Forum</button>' : '') + '</div>' +
      (items.length ? '<div class="card"><div class="list">' + items.map(f =>
        '<a class="list-item row-link" href="#/forum/' + esc(f.id) + '"><div class="li-main"><strong>' + esc(f.judul) + '</strong>' +
        '<span class="li-meta">' + (f.tipe === 'umum' ? 'Forum umum' : 'Kelas ' + esc(f.kelas)) + ' · ' + f.jumlah + ' pesan' + (f.terakhir ? ' · terakhir ' + esc(fmtTenggat(f.terakhir)) : '') + '</span></div>' +
        '<div class="li-actions">' + stChip(f) + (f.bisa_kelola ? '<button class="btn btn-secondary btn-sm" data-edit="' + esc(f.id) + '">Ubah</button>' : '') + '</div></a>').join('') + '</div></div>'
        : '<div class="empty">Belum ada forum yang dapat Anda akses.</div>');
    const add = $('#fr-add'); if (add) add.addEventListener('click', () => formForum(null, kelasOpsi, load));
    c.onclick = e => {
      const b = e.target.closest('[data-edit]'); if (!b) return;
      e.preventDefault();                                                       // tombol berada di dalam tautan baris
      formForum(items.find(x => x.id === b.dataset.edit), kelasOpsi, load);
    };
  }
  load();
}

function formForum(f, kelasOpsi, done) {
  const admin = me.role === 'admin';
  modal({ title: f ? 'Ubah forum' : 'Buat forum', body:
    fld('Judul forum', 'fr-judul', f ? f.judul : '', 'maxlength="80"') +
    (f ? '' : (admin ? sel('Jenis', 'fr-tipe', opts([['kelas', 'Forum kelas'], ['umum', 'Forum umum (semua siswa)']], 'kelas')) : '<input type="hidden" id="fr-tipe" value="kelas">')) +
    (f ? '' : '<div id="fr-kelas-box">' + sel('Kelas', 'fr-kelas', opts(kelasOpsi.map(k => [k.id, 'Kelas ' + k.nama]), '', '— pilih kelas —')) + '</div>') +
    sel('Status', 'fr-st', opts([['buka', 'Buka (dapat menulis)'], ['ditutup', 'Ditutup (hanya baca)'], ['arsip', 'Arsip (disembunyikan dari siswa)']], f ? f.status : 'buka')),
    onOpen: m => {
      const t = $('#fr-tipe', m.el), box = $('#fr-kelas-box', m.el);
      if (t && box) { const sync = () => { box.hidden = t.value === 'umum'; }; t.addEventListener('change', sync); sync(); }
    },
    onSubmit: async () => {
      const tipe = f ? f.tipe : val('fr-tipe'), kelas = f ? f.kelas_id : val('fr-kelas');
      if (tipe === 'kelas' && !kelas) return 'Pilih kelas untuk forum ini.';
      const r = await api('saveForum', { id: f ? f.id : '', judul: val('fr-judul'), tipe: tipe, kelas_id: kelas, status: val('fr-st') });
      if (!r.success) return r.message; toast('Forum disimpan.'); done();
    } });
}

async function detailForum(id) {
  const c = $('#content');
  let limit = 50, timer = null;
  c.innerHTML = SPIN;
  async function load(diam) {
    const r = await api('getForum', { forum_id: id, limit: limit });
    if (!document.body.contains(c)) { clearInterval(timer); return; }          // halaman sudah ditinggalkan
    if (!r.success) { clearInterval(timer); c.innerHTML = errBox(r.message) + '<p><a href="#/forum">← Semua forum</a></p>'; return; }
    const d = r.data, a = d.akses;
    const kotak = (x, balasan) => '<div class="post' + (x.hidden ? ' hidden' : '') + (balasan ? ' reply' : '') + '"><div class="post-head"><strong>' + esc(x.penulis) + '</strong> ' +
      (x.peran === 'Guru' || x.peran === 'Admin' ? chip(x.peran, 'soft') : '') + '<span class="li-meta"> · ' + esc(fmtTenggat(x.waktu)) + '</span></div>' +
      (x.hidden && !x.isi ? '<p class="li-meta"><em>Pesan ini disembunyikan oleh moderator.</em></p>' : (x.hidden ? '<p class="li-meta"><em>(disembunyikan — hanya terlihat oleh moderator)</em></p>' : '') + '<p class="post-body" dir="auto">' + esc(x.isi) + '</p>') +
      '<div class="row-actions">' + (a.posting && !balasan && !x.hidden ? '<button class="btn btn-secondary btn-sm" data-balas="' + esc(x.id) + '">Balas</button>' : '') +
      (a.moderasi ? '<button class="btn btn-sm ' + (x.hidden ? 'btn-secondary' : 'btn-danger') + '" data-mod="' + esc(x.id) + '" data-aksi="' + (x.hidden ? 'tampilkan' : 'sembunyikan') + '">' + (x.hidden ? 'Tampilkan' : 'Sembunyikan') + '</button>' : '') + '</div>' +
      (balasan ? '' : '<div class="balas-box" data-box="' + esc(x.id) + '"></div>') + '</div>';
    // pertahankan ketikan di kotak pesan bila ini penyegaran otomatis
    const draf = diam && $('#fr-isi') ? $('#fr-isi').value : '';
    c.innerHTML = '<p><a href="#/forum">← Semua forum</a></p><div class="page-head"><h1>' + esc(d.forum.judul) + '</h1><p>' + (d.forum.tipe === 'umum' ? 'Forum umum' : 'Kelas ' + esc(d.forum.kelas)) +
      (d.forum.status !== 'buka' ? ' · ' + (d.forum.status === 'ditutup' ? 'ditutup (hanya baca)' : 'diarsipkan') : '') + '</p></div><div class="stack">' +
      (a.posting ? '<div class="card"><label class="field" style="margin-bottom:8px"><span class="field-label">Tulis pesan</span><textarea id="fr-isi" rows="3" maxlength="2000" dir="auto" placeholder="Tulis pertanyaan atau pendapat Anda dengan sopan…"></textarea></label>' +
        '<div class="row-between"><small class="li-meta" id="fr-cnt">0 / 2000</small><button class="btn btn-primary btn-sm" id="fr-kirim">Kirim</button></div></div>' : '') +
      '<div class="card"><h2>Pesan</h2>' + (d.posts.length ? (d.ada_lebih ? '<button class="btn btn-secondary btn-sm" id="fr-lama" style="margin-bottom:10px">Muat pesan lebih lama</button>' : '') +
        d.posts.slice().reverse().map(p => kotak(p, false) + p.replies.map(rp => kotak(rp, true)).join('')).join('') : '<div class="empty">Belum ada pesan. Jadilah yang pertama menulis.</div>') + '</div></div>';
    if (draf && $('#fr-isi')) { $('#fr-isi').value = draf; $('#fr-cnt').textContent = draf.length + ' / 2000'; }

    const isi = $('#fr-isi');
    if (isi) isi.addEventListener('input', () => { $('#fr-cnt').textContent = isi.value.length + ' / 2000'; });
    const kirim = (teks, induk, btn, sesudah) => async () => {
      const t = teks().trim(); if (!t) return toast('Pesan tidak boleh kosong.', true);
      setBusy(btn, true, 'Mengirim…');
      const x = await api('postDiskusi', { forum_id: id, isi: t, induk_id: induk || '' });
      setBusy(btn, false); toast(x.message || 'Selesai.', !x.success); if (x.success) { sesudah(); load(); }
    };
    const k = $('#fr-kirim'); if (k) k.addEventListener('click', kirim(() => isi.value, '', k, () => { isi.value = ''; }));
    const lama = $('#fr-lama'); if (lama) lama.addEventListener('click', () => { limit += 50; load(); });
    c.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.balas) {
        const box = $('[data-box="' + b.dataset.balas + '"]', c);
        if (box.innerHTML) { box.innerHTML = ''; return; }
        box.innerHTML = '<textarea rows="2" maxlength="2000" dir="auto" class="cbt-esai" placeholder="Tulis balasan…"></textarea><button class="btn btn-primary btn-sm" style="margin-top:6px">Kirim balasan</button>';
        const ta = $('textarea', box), btn = $('button', box); ta.focus();
        btn.addEventListener('click', kirim(() => ta.value, b.dataset.balas, btn, () => {}));
      } else if (b.dataset.mod) {
        if (b.dataset.aksi === 'sembunyikan' && !confirm('Sembunyikan pesan ini dari pengguna lain?')) return;
        const x = await api('moderasiDiskusi', { id: b.dataset.mod, aksi: b.dataset.aksi });
        toast(x.message || 'Selesai.', !x.success); if (x.success) load();
      }
    };
  }
  await load(false);
  // Penyegaran otomatis ringan tiap 30 detik: hanya bila tab terlihat dan pengguna tidak sedang mengetik
  timer = setInterval(() => {
    if (!document.body.contains(c)) return clearInterval(timer);
    const ae = document.activeElement;
    if (document.hidden || document.querySelector('.modal-ov') || (ae && /^(TEXTAREA|INPUT)$/.test(ae.tagName) && c.contains(ae) && ae.value)) return;
    load(true);
  }, 30000);
}

window.ADMIN_PAGES = Object.assign(window.ADMIN_PAGES || {}, { forum: halamanForum });
window.GURU_PAGES = Object.assign(window.GURU_PAGES || {}, { forum: halamanForum });
window.SISWA_PAGES = Object.assign(window.SISWA_PAGES || {}, { forum: halamanForum });
