"""Sekali-pakai: sinkronkan STORAGE_UPLOAD_KEY dari .env lokal ke .env di VPS lalu restart container.

Jalankan:  python3 scripts/sync-upload-key.py
Nilai kunci tidak pernah dicetak; hanya panjang yang ditampilkan.
"""
import pathlib
import subprocess
import sys

LOCAL_ENV = pathlib.Path('/opt/data/storagecloud/.env')
SSH = ['ssh', '-i', '/opt/data/home/.ssh/scansignal_deploy_ed25519', '-o', 'BatchMode=yes', 'ubuntu@16.79.198.38']

local_key = ''
for line in LOCAL_ENV.read_text().splitlines():
    if line.startswith('STORAGE_UPLOAD_KEY='):
        local_key = line.split('=', 1)[1].strip()
        break
if not local_key:
    print('STORAGE_UPLOAD_KEY kosong di .env lokal, dihentikan')
    sys.exit(1)

remote = subprocess.run(
    SSH + ["grep -c . /home/ubuntu/web-storage/.env >/dev/null && grep -q '^STORAGE_UPLOAD_KEY=' /home/ubuntu/web-storage/.env && echo PRESENT"],
    capture_output=True, text=True, timeout=60,
)
if 'PRESENT' not in remote.stdout:
    print('.env di VPS tidak ditemukan atau formatnya salah, dihentikan')
    sys.exit(1)

# tulis kunci lewat stdin ssh, tanpa pernah muncul di argv/log
replace = f"sed -i 's/^STORAGE_UPLOAD_KEY=.*/STORAGE_UPLOAD_KEY={{}}/' /home/ubuntu/web-storage/.env && chmod 600 /home/ubuntu/web-storage/.env"
proc = subprocess.run(SSH + [replace], input=local_key, text=True, capture_output=True, timeout=60)
if proc.returncode != 0:
    print('gagal menulis di vps:', proc.stderr[:200])
    sys.exit(1)

restart = subprocess.run(
    SSH + ['sudo -n docker restart web-storage >/dev/null && echo RESTARTED'],
    capture_output=True, text=True, timeout=120,
)
print('kunci tersinkron, container:', restart.stdout.strip() or 'gagal')
print('panjang kunci:', len(local_key))
