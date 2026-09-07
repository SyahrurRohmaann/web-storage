"""Sekali-pakai: kirim ulang .env lokal (lengkap, tanpa nilai tercetak) ke VPS,
lalu recreate container web-storage dengan parameter yang sama.

Jalankan:  python3 scripts/redeploy-env.py
"""
import pathlib
import subprocess
import sys
import time

LOCAL_ENV = pathlib.Path('/opt/data/storagecloud/.env')
SSH = ['ssh', '-i', '/opt/data/home/.ssh/scansignal_deploy_ed25519', '-o', 'BatchMode=yes', 'ubuntu@16.79.198.38']

env_text = LOCAL_ENV.read_text()
required = ['STORAGE_UPLOAD_KEY=', 'GOOGLE_DRIVE_FOLDER_ID=', 'GOOGLE_SERVICE_ACCOUNT_JSON=', 'BODY_SIZE_LIMIT=']
for r in required:
    if r not in env_text:
        print(f'ENV_INVALID: {r} hilang dari .env lokal')
        sys.exit(1)

# 1) tulis .env penuh ke VPS via stdin (root lewat sudo tee, lalu chown ubuntu, mode 600)
write = subprocess.run(
    SSH + ["sudo -n tee /home/ubuntu/web-storage/.env > /dev/null && sudo -n chmod 600 /home/ubuntu/web-storage/.env && sudo -n chown ubuntu:ubuntu /home/ubuntu/web-storage/.env && sudo -n grep -c '=' /home/ubuntu/web-storage/.env && echo ENV_WRITTEN"],
    input=env_text, text=True, capture_output=True, timeout=60,
)
print('vps env:', (write.stdout or '').strip() or f'GAGAL {write.stderr[:150]}')
if 'ENV_WRITTEN' not in write.stdout:
    sys.exit(1)

# 2) recreate container dengan env-file baru
recreate = (
    'sudo -n docker rm -f web-storage >/dev/null 2>&1; '
    'sudo -n docker run -d --name web-storage --restart unless-stopped '
    '--env-file /home/ubuntu/web-storage/.env '
    '-e ORIGIN=https://storecloud.my.id '
    '-e PROTOCOL_HEADER=x-forwarded-proto '
    '-e HOST_HEADER=x-forwarded-host '
    '-p 127.0.0.1:8797:3000 web-storage:latest >/dev/null && echo CONTAINER_UP'
)
run = subprocess.run(SSH + [recreate], capture_output=True, text=True, timeout=180)
print('container:', (run.stdout or '').strip() or f'GAGAL {run.stderr[:200]}')
if 'CONTAINER_UP' not in run.stdout:
    sys.exit(1)

# 3) verifikasi env yang benar-benar dipakai proses node
time.sleep(3)
verify = subprocess.run(
    SSH + ["sudo -n docker exec web-storage node -e 'const p=process.env;console.log(JSON.stringify({key_len:(p.STORAGE_UPLOAD_KEY||\"\").length,folder:(p.GOOGLE_DRIVE_FOLDER_ID||\"\").slice(0,4)+\"...\",sa_len:(p.GOOGLE_SERVICE_ACCOUNT_JSON||\"\").length,body:p.BODY_SIZE_LIMIT,origin:p.ORIGIN}))'"],
    capture_output=True, text=True, timeout=60,
)
print('runtime env:', (verify.stdout or verify.stderr)[:300])
