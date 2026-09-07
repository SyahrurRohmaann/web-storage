import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

const env = {};
for (const line of readFileSync('/opt/data/storagecloud/.env', 'utf8').split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.startsWith('#')) env[line.slice(0, i)] = line.slice(i + 1);
}
const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new google.auth.GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'] });
const drive = google.drive({ version: 'v3', auth });
try {
  const { data } = await drive.files.get({ fileId: env.GOOGLE_DRIVE_FOLDER_ID, supportsAllDrives: true, fields: 'id,name,driveId,mimeType,parents' });
  console.log(JSON.stringify({ ok: true, name: data.name, driveId: data.driveId || null, mimeType: data.mimeType, parents: data.parents || null }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, status: e?.response?.status, msg: String(e?.message).slice(0, 150) }));
}