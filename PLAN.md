# PLAN — StorageCloud

## Selesai
- Scaffold SvelteKit TypeScript dengan adapter Node.
- Utilitas animasi murni dan validasi upload melalui TDD.
- Hero langit, droplet pointer-magnetic, morph berbasis scroll yang reversible.
- File picker multiple, drag/drop, progress, status, dan validasi 100 MiB/file.
- Endpoint privat server-side ke Google Drive dengan respons error aman.
- Manifest PWA, ikon PNG 192/512, service worker, dan offline app shell.
- QA desktop 1440x900 dan mobile 390x844.

## Menunggu owner
1. Aktifkan Google Drive API.
2. Buat service account dan JSON key.
3. Share folder target ke email service account sebagai Editor.
4. Isi environment sesuai `.env.example`.
5. Jalankan satu upload nyata dan konfirmasi file muncul di folder Drive.

Rincian status mesin-resumable ada di `STATE.json`.
