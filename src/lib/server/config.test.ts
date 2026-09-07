import { describe, expect, it } from 'vitest';
import { readDriveConfig } from './config';

describe('Drive server configuration', () => {
	it('fails closed when credentials are missing', () => {
		expect(() => readDriveConfig({})).toThrow('Google Drive belum dikonfigurasi');
	});

	it('parses escaped newlines in private keys', () => {
		const credentials = {
			client_email: 'storage@example.iam.gserviceaccount.com',
			private_key: 'line one\\nline two'
		};
		const config = readDriveConfig({
			GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(credentials),
			GOOGLE_DRIVE_FOLDER_ID: 'folder-123'
		});
		expect(config.credentials.private_key).toBe('line one\nline two');
		expect(config.folderId).toBe('folder-123');
	});

	it('rejects malformed or incomplete service account JSON', () => {
		expect(() =>
			readDriveConfig({ GOOGLE_SERVICE_ACCOUNT_JSON: '{bad', GOOGLE_DRIVE_FOLDER_ID: 'x' })
		).toThrow('Kredensial Google Drive tidak valid');
		expect(() =>
			readDriveConfig({
				GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'x' }),
				GOOGLE_DRIVE_FOLDER_ID: 'x'
			})
		).toThrow('Kredensial Google Drive tidak lengkap');
	});
});
