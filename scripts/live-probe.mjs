import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { google } from 'googleapis';

const env = {};
for (const line of readFileSync('/opt/data/storagecloud/.env', 'utf8').split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.startsWith('#')) env[line.slice(0, i)] = line.slice(i + 1);
}
const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
const folderId = env.GOOGLE_DRIVE_FOLDER_ID;

const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/drive.file'] });
const drive = google.drive({ version: 'v3', auth });

const body = 'storagecloud live upload probe ' + Date.now();
try {
  const res = await drive.files.create({
    requestBody: { name: 'storagecloud-live-probe.txt', parents: [folderId] },
    media: { mimeType: 'text/plain', body: Readable.from(Buffer.from(body)) },
    fields: 'id,name,parents'
  });
  console.log(JSON.stringify({ ok: true, id: res.data.id, name: res.data.name, parents: res.data.parents }));
} catch (error) {
  const status = error?.response?.status;
  const reason = error?.response?.data?.error?.errors?.[0]?.reason || error?.response?.data?.error?.status;
  console.log(JSON.stringify({ ok: false, status, reason, msg: String(error?.message).slice(0, 200) }));
}
