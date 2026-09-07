import { Readable } from 'node:stream';
import { env } from '$env/dynamic/private';
import { google } from 'googleapis';
import { readDriveConfig } from './config';

export type UploadedDriveFile = { id: string; name: string };

export async function uploadFile(file: File): Promise<UploadedDriveFile> {
	const config = readDriveConfig(env);
	const auth = new google.auth.GoogleAuth({
		credentials: config.credentials,
		scopes: ['https://www.googleapis.com/auth/drive.file']
	});
	const drive = google.drive({ version: 'v3', auth });
	const response = await drive.files.create({
		requestBody: { name: file.name, parents: [config.folderId] },
		media: {
			mimeType: file.type || 'application/octet-stream',
			body: Readable.fromWeb(file.stream() as never)
		},
		fields: 'id,name'
	});
	if (!response.data.id) throw new Error('Google Drive tidak mengembalikan ID file');
	return { id: response.data.id, name: response.data.name || file.name };
}
