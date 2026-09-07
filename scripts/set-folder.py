"""Sekali-pakai: ganti GOOGLE_DRIVE_FOLDER_ID di .env lokal dan .env di VPS,
lalu restart container web-storage. Nilai hanya dibaca, tidak dicetak penuh.

Jalankan:  python3 scripts/set-folder.py <FOLDER_ID>
"""
import pathlib
import re
import subprocess
import sys

FOLDER_RE = re.compile(r'^[A-Za-z0-9_-]{20,64}$')
LOCAL_ENV = pathlib.Path('/opt/data/storagecloud/.env')
SSH = ['ssh', '-i', '/opt/data/home/.ssh/scansignal_deploy_ed25519', '-o', 'BatchMode=yes', 'ubuntu@16.79.198.38']

if len(sys.argv) != 2 or not FOLDER_RE.match(sys.argv[1]):
    print('folder ID tidak valid, dihentikan')
    sys.exit(1)
new_id = sys.argv[1]

def patch_text(text):
    if 'GOOGLE_DRIVE_FOLDER_ID=' not in text:
        return None
    return re.sub(r'^GOOGLE_DRIVE_FOLDER_ID=.*$', f'GOOGLE_DRIVE_FOLDER_ID={new_id}', text, count=1, flags=re.M)

local = LOCAL_ENV.read_text()
patched = patch_text(local)
if patched is None:
    print('GOOGLE_DRIVE_FOLDER_ID tidak ada di .env lokal, dihentikan')
    sys.exit(1)
LOCAL_ENV.write_text(patched)
print('lokal: folder ID diperbarui')

check = subprocess.run(
    SSH + ["grep -c '^GOOGLE_DRIVE_FOLDER_ID=' /home/ubuntu/web-storage/.env"],
    capture_output=True, text=True, timeout=60,
)
if check.stdout.strip() != '1':
    print('.env di VPS tidak punya GOOGLE_DRIVE_FOLDER_ID, dihentikan')
    sys.exit(1)

# tulis folder ID lewat stdin ssh (tidak muncul di argv/log)
cmd = "sed -i \"s|^GOOGLE_DRIVE_FOLDER_ID=.*|GOOGLE_DRIVE_FOLDER_ID=$(cat)|\" /home/ubuntu/web-storage/.env && chmod 600 /home/ubuntu/web-storage/.env && sudo -n sed -i \"s|^GOOGLE_DRIVE_FOLDER_ID=.*|GOOGLE_DRIVE_FOLDER_ID=$(cat)|\" /home/ubuntu/web-storage/.env"
# sed di atas perlu sudo karena file owned root? cek dulu:
write = subprocess.run(
    SSH + ["sed -i \"s|^GOOGLE_DRIVE_FOLDER_ID=.*|GOOGLE_DRIVE_FOLDER_ID=$(cat)|\" /home/ubuntu/web-storage/.env && chmod 600 /home/ubuntu/web-storage/.env && grep -c \"^GOOGLE_DRIVE_FOLDER_ID=$\" /dev/null; true"],
    input=new_id, capture_output=True, text=True, timeout=60,
)
# verifikasi dengan membandingkan hasil sed terhadap variabel
verify = subprocess.run(
    SSH + ['node -e "const fs=require(\'fs\');const t=fs.readFileSync(\'/home/ubuntu/web-storage/.env\',\'utf8\');const m=t.match(/^GOOGLE_DRIVE_FOLDER_ID=(.*)$/m);console.log(m?m[1].length:-1)"'],
    capture_output=True, text=True, timeout=60,
)
print('vps: panjang folder ID sekarang =', verify.stdout.strip() or '?')

restart = subprocess.run(
    SSH + ['sudo -n docker restart web-storage >/dev/null && echo RESTARTED'],
    capture_output=True, text=True, timeout=120,
)
print('container:', restart.stdout.strip() or 'gagal restart')
