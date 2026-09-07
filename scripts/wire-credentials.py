"""Sekali-pakai: pasang credensial service account ke .env lalu hapus salinan cache.

Jalankan:  python3 scripts/wire-credentials.py <path-json-service-account>
Nilai rahasia tidak pernah dicetak; hanya nama field dan panjang yang ditampilkan.
"""
import json
import pathlib
import sys

if len(sys.argv) != 2:
    print('pakai: python3 scripts/wire-credentials.py <path-json>')
    sys.exit(2)

src = pathlib.Path(sys.argv[1]).expanduser().resolve()
data = json.loads(src.read_text())

required = ('type', 'client_email', 'private_key')
missing = [k for k in required if not data.get(k)]
if missing:
    print('field wajib hilang:', missing)
    sys.exit(1)
if data['type'] != 'service_account':
    print('tipe file bukan service_account, dihentikan')
    sys.exit(1)
if '-----BEGIN PRIVATE KEY-----' not in data['private_key']:
    print('private_key tidak valid, dihentikan')
    sys.exit(1)

minified = json.dumps(data, separators=(',', ':'))

env_path = pathlib.Path('/opt/data/storagecloud/.env')
lines = [ln for ln in env_path.read_text().splitlines() if not ln.startswith('GOOGLE_SERVICE_ACCOUNT_JSON=')]
lines.insert(0, 'GOOGLE_SERVICE_ACCOUNT_JSON=' + minified)
env_path.write_text('\n'.join(lines) + '\n')
env_path.chmod(0o600)

# Buang semua salinan dokumen di cache uploads, jangan simpan duplikat kunci.
cache_dir = pathlib.Path('/opt/data/cache/documents')
removed = 0
for candidate in cache_dir.glob('*sonic-earth*'):
    try:
        candidate.unlink()
        removed += 1
    except OSError as exc:
        print('gagal hapus', candidate.name, exc)

print('service account terpasang ke .env (mode 600)')
print('client_email:', data['client_email'])
print('salinan cache dihapus:', removed)
print('panjang JSON terpasang:', len(minified))
