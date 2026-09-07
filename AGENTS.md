# AGENTS.md — "Storage" PWA (Hero Interaktif + Cloud Upload)

Dokumen ini adalah spesifikasi teknis lengkap untuk AI coding agent yang akan membangun website PWA dengan hero section animasi interaktif. Ikuti dokumen ini sebagai sumber kebenaran tunggal. Jangan berasumsi di luar yang tertulis — jika ada keputusan desain yang ambigu, pilih opsi yang paling sederhana dan konsisten dengan sistem desain di bawah.

---

## 1. Ringkasan Proyek

Website satu halaman (PWA) dengan hero section bertema langit cerah. Elemen utama:

1. Teks besar **"storage"** dengan gaya font balon (bubble/rounded, playful) di tengah hero.
2. Di bawah teks, satu (atau beberapa) **butiran embun air** berbentuk bulat yang:
   - Bereaksi terhadap gerakan mouse (menempel/mengikuti kursor, efek seperti tegangan permukaan air).
   - Ketika user melakukan **scroll ke bawah** (gesture scroll down), butiran embun **bergerak naik** ke posisi tertentu dan **bermetamorfosis menjadi tombol "+"**.
3. Tombol **"+"** membuka file picker untuk upload gambar/file apa pun.
4. File yang diupload disimpan ke folder Google Drive milik user:
   `https://drive.google.com/drive/folders/1phlqxDUgcoYHNYqeHdsvbzPTT_Sh0Ve8`
   Folder ID: `1phlqxDUgcoYHNYqeHdsvbzPTT_Sh0Ve8`

---

## 2. Tech Stack yang Direkomendasikan

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | **SvelteKit** | Ringan, bagus untuk animasi berbasis state, mudah dijadikan PWA |
| Styling | **Tailwind CSS** | Konsisten dengan proyek lain, cepat untuk desain custom |
| Animasi | **Svelte transitions/motion** + custom SVG/Canvas untuk efek "embun cair" | Native, tidak perlu library berat |
| Scroll trigger | **IntersectionObserver** atau custom scroll-progress hook (jangan pakai library scroll-jacking berat) | Performa & kontrol presisi |
| Font balon | Google Fonts: **"Baloo 2"** atau **"Fredoka"** (bulat, playful, mendukung karakter tebal) | Sesuai deskripsi "font balon" |
| Upload ke Drive | **Google Drive API v3** via **Service Account** (lihat §5) | Tidak butuh login user berulang, cocok untuk personal storage |
| PWA | **@vite-pwa/sveltekit** (Workbox-based) | Manifest + service worker otomatis |
| Backend upload | **SvelteKit server route** (`+server.ts`) sebagai proxy ke Drive API | Kredensial service account TIDAK BOLEH ada di client |

Jika agent memilih stack lain, prinsip di §5 (proxy server-side, kredensial tidak boleh exposed ke client) tetap wajib diikuti.

---

## 3. Sistem Desain

### 3.1 Warna
- Background utama: gradient biru langit cerah, contoh:
  `linear-gradient(180deg, #E8F6FF 0%, #BFE7FF 45%, #8FD3FF 100%)`
- Aksen droplet/tombol: `#3FA9F5` → `#1E88E5` (gradient biru lebih pekat untuk kesan air/kaca)
- Highlight/glow droplet: putih transparan `rgba(255,255,255,0.6)` untuk efek pantulan cahaya di air
- Teks "storage": biru tua kontras, misal `#0B4C8C`, dengan outline/shadow lembut putih agar tetap "clean"

### 3.2 Tipografi
- Font judul "storage": **Baloo 2** (bold/800), ukuran besar (clamp `48px–120px` responsif)
- Font body/UI lain: **Inter** atau **Poppins** — netral, clean, kontras dengan font balon di judul

### 3.3 Prinsip Visual
- Clean, banyak whitespace, tidak ramai
- Droplet dan tombol harus terasa "cair" — gunakan `border-radius` asimetris + sedikit distorsi SVG (blob shape), bukan lingkaran sempurna kaku
- Shadow lembut (soft blur), tanpa shadow tajam/hard-edge

---

## 4. Spesifikasi Animasi Hero (State Machine)

Definisikan animasi sebagai state machine dengan 1 variabel utama: `scrollProgress` (0–1), diambil dari scroll position dalam batas hero section saja (bukan seluruh halaman).

### State 1 — `IDLE` (scrollProgress = 0)
- Teks "storage" tampil penuh dengan efek fade-in + slight bounce saat page load (khas font balon)
- Droplet muncul di bawah teks, posisi statis, animasi idle halus (naik-turun pelan, seperti mengambang)
- **Interaksi mouse**: droplet mengikuti kursor dalam radius terbatas (magnetic effect) — gunakan lerp/easing, jangan snap instan. Saat mouse menjauh, droplet kembali ke posisi asal dengan easing elastis (seperti tegangan permukaan air yang "molor" lalu kembali)

### State 2 — `TRANSITION` (0 < scrollProgress < 1)
- Saat user mulai scroll ke bawah, droplet bergerak naik secara progresif mengikuti `scrollProgress`
- Bentuk droplet ber-morph dari blob organik → bentuk lingkaran sempurna dengan simbol "+" yang muncul (fade + scale in) di tengahnya
- Teks "storage" perlahan fade-out dan/atau mengecil & naik (parallax), agar tombol "+" menjadi fokus baru
- Gunakan interpolasi halus (misal cubic-bezier ease) berdasarkan `scrollProgress`, bukan animasi berbasis waktu tetap — supaya terasa "discroll" dan responsif terhadap kecepatan scroll user

### State 3 — `DOCKED` (scrollProgress = 1)
- Droplet sudah sepenuhnya menjadi **tombol "+"** solid, posisi fixed/sticky (misal pojok kanan bawah atau tetap center — tentukan agent sesuai layout final, tapi harus tetap terlihat/reachable)
- Tombol ini **klikable**: membuka file input (`<input type="file" multiple>`)
- Hover state: sedikit scale-up + glow, tetap dengan estetika "cair" (bukan tombol kotak biasa)

### Interaksi Tambahan
- Di state IDLE, klik pada droplet **juga** boleh langsung membuka file picker (tidak harus menunggu scroll) — agar tetap fungsional untuk user yang tidak scroll (misal di mobile dengan viewport pendek)
- Reversible: scroll ke atas kembali harus me-reverse animasi secara mulus ke State 1

---

## 5. Upload & Integrasi Google Drive

### 5.1 Prinsip Keamanan (WAJIB)
- Kredensial Google (service account JSON / client secret) **HANYA** boleh berada di server (environment variable), **TIDAK PERNAH** dikirim atau di-bundle ke client/browser.
- Semua upload harus lewat endpoint backend milik sendiri, yang lalu meneruskan file ke Google Drive API.

### 5.2 Alur yang Direkomendasikan: Service Account
1. Buat project di Google Cloud Console, aktifkan **Google Drive API**.
2. Buat **Service Account**, download file kredensial JSON.
3. **Share folder Drive tujuan** (`1phlqxDUgcoYHNYqeHdsvbzPTT_Sh0Ve8`) ke email service account tersebut dengan akses **Editor** (langkah ini dilakukan manual oleh pemilik akun/pemilik proyek, bukan oleh agent).
4. Simpan kredensial di environment variable server (`.env`, JANGAN commit ke repo — tambahkan ke `.gitignore`).
5. Endpoint server (`/api/upload` atau SvelteKit `+server.ts`):
   - Terima file dari client (multipart/form-data)
   - Gunakan library resmi `googleapis` (Node.js) untuk autentikasi via service account
   - Upload file ke folder dengan `parents: ['1phlqxDUgcoYHNYqeHdsvbzPTT_Sh0Ve8']`
   - Kembalikan status sukses/gagal + progress ke client

### 5.3 Alternatif: OAuth User Login
Jika pemilik proyek lebih memilih upload atas nama akun Google pribadinya sendiri (bukan service account), gunakan OAuth 2.0 flow (login Google sekali, simpan refresh token terenkripsi di server). Ini lebih kompleks — gunakan hanya jika service account tidak memungkinkan.

### 5.4 UX Upload
- Setelah klik tombol "+", buka file picker native
- Setelah file dipilih: tampilkan progress indicator (bisa berbentuk animasi "tetesan air mengisi" sesuai tema)
- Tampilkan toast/notifikasi sukses atau error setelah upload selesai
- Validasi ukuran file di client sebelum upload (tentukan limit wajar, misal maks 100MB per file, sesuaikan dengan kuota Drive)

---

## 6. Persyaratan PWA

- `manifest.json`: nama app "Storage", theme_color biru langit (`#3FA9F5`), background_color senada hero (`#E8F6FF`), ikon 192x192 & 512x512 (bertema droplet/cloud)
- Service worker: cache app shell untuk offline-first loading (halaman tetap tampil saat offline, tapi fitur upload butuh koneksi — tampilkan pesan jelas jika offline saat user mencoba upload)
- Installable di mobile & desktop (`display: standalone`)
- Responsif penuh: animasi droplet & scroll-morph harus tetap smooth di mobile (gunakan touch scroll/gesture, bukan hanya `wheel` event)

---

## 7. Struktur Proyek yang Disarankan

```
/src
  /routes
    +page.svelte          # Hero + halaman utama
    /api/upload/+server.ts # Endpoint proxy upload ke Google Drive
  /lib
    /components
      Hero.svelte
      Droplet.svelte       # Komponen animasi blob/droplet + morph
      UploadButton.svelte
    /animations
      dropletMotion.ts      # Logic lerp/easing untuk magnetic + morph
      scrollProgress.ts      # Hook scroll progress dalam hero
    /server
      googleDrive.ts         # Wrapper googleapis untuk service account
  /static
    manifest.json
    icons/
```

---

## 8. Task Breakdown (mengikuti pola AGENTS.md/TASKS.md/STATE.json)

Buat `TASKS.md` dengan urutan berikut, dan `STATE.json` untuk melacak progres tiap task agar proses resumable:

1. **Setup proyek** — init SvelteKit + Tailwind + PWA plugin
2. **Desain sistem** — setup warna, font (Baloo 2/Fredoka + Inter), token Tailwind custom
3. **Komponen Hero statis** — layout teks "storage" + droplet diam, tanpa animasi dulu
4. **Interaksi mouse pada droplet** — magnetic follow + easing kembali
5. **Scroll progress hook** — hitung `scrollProgress` dalam batas hero section
6. **Animasi morph droplet → tombol +** — terikat ke `scrollProgress`, reversible
7. **File picker & UI upload** — klik tombol + buka input file, progress indicator
8. **Setup Google Cloud + Service Account** — dokumentasikan langkah manual untuk pemilik akun
9. **Endpoint server upload ke Drive** — implementasi `googleDrive.ts` + `+server.ts`
10. **Koneksi UI upload ⇄ endpoint** — end-to-end test upload file nyata ke folder Drive
11. **PWA manifest & service worker** — installable, offline shell
12. **Testing responsif & lintas device** — mobile touch scroll, desktop mouse, tablet
13. **Polish akhir** — micro-interactions, error states, loading states

Setiap task di `STATE.json` sebaiknya punya field: `status` (`pending`/`in_progress`/`done`), `notes`, `blockers`.

---

## 9. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Hero tampil dengan gradient biru langit cerah dan teks "storage" berfont balon
- [ ] Droplet bereaksi terhadap gerakan mouse secara halus (bukan snap kaku)
- [ ] Scroll ke bawah membuat droplet bermigrasi naik dan bermorph menjadi tombol "+" secara progresif mengikuti posisi scroll
- [ ] Scroll ke atas me-reverse animasi dengan mulus
- [ ] Tombol "+" membuka file picker dan berhasil mengupload file ke folder Google Drive yang ditentukan
- [ ] Tidak ada kredensial Google yang ter-expose di client/browser
- [ ] Website terinstall sebagai PWA dan app shell tetap tampil saat offline
- [ ] Animasi tetap smooth (≥50fps) di perangkat mobile menengah

---

## 10. Catatan untuk Agent

- Prioritaskan performa animasi: hindari re-render berat per frame, gunakan `requestAnimationFrame` atau Svelte spring/tweened store untuk interpolasi.
- Bentuk "blob"/organik sebaiknya dibuat dengan SVG path yang di-morph (misal via `interpolate` dari beberapa path), bukan gambar statis, agar transisi ke tombol "+" mulus.
- Jika ragu soal detail visual, prioritaskan kesan "clean, lembut, playful" — hindari elemen tajam/kaku yang bertentangan dengan tema air & langit cerah.
