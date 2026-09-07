# StorageCloud

PWA satu halaman untuk mengunggah file ke folder Google Drive privat melalui endpoint server. Hero memiliki droplet magnetis yang bermorph menjadi tombol upload berdasarkan scroll.

## Menjalankan lokal

```bash
npm install
cp .env.example .env
npm run dev
```

Tanpa kredensial, seluruh UI/PWA tetap dapat diuji, tetapi endpoint upload menjawab `503` tanpa membocorkan detail server.

## Menyiapkan Google Drive

1. Buat project di Google Cloud Console dan aktifkan **Google Drive API**.
2. Buat Service Account dan sebuah JSON key.
3. Share folder Drive `1phlqxDUgcoYHNYqeHdsvbzPTT_Sh0Ve8` ke `client_email` service account sebagai **Editor**.
4. Minify JSON menjadi satu baris dan set sebagai secret server `GOOGLE_SERVICE_ACCOUNT_JSON`.
5. Set `GOOGLE_DRIVE_FOLDER_ID=1phlqxDUgcoYHNYqeHdsvbzPTT_Sh0Ve8`.
6. Buat `STORAGE_UPLOAD_KEY` yang panjang dan acak; user memasukkan nilai yang sama di UI saat upload.
7. Set `BODY_SIZE_LIMIT=106954752` agar adapter Node menerima satu file 100 MiB plus overhead multipart.
8. Pada reverse proxy, batasi request body maksimal sekitar 102 MiB dan pasang rate limit untuk `/api/upload`.
9. Wajib HTTPS di deployment produksi.
10. Jangan pernah memakai prefix `PUBLIC_` untuk kredensial dan jangan commit `.env`.

Contoh minify lokal:

```bash
python3 -c 'import json; print(json.dumps(json.load(open("service-account.json"))))'
```

## Quality gates

```bash
npm test
npm run check
npm run build
npm audit --omit=dev
```

## Batasan

- Maksimal 10 file per pilihan; setiap file dikirim sebagai satu request terpisah ke endpoint.
- Maksimal 100 MiB per file.
- Upload membutuhkan koneksi; app shell tetap tersedia offline.
- Hosting harus mendukung SvelteKit server routes (bukan static-only hosting).
