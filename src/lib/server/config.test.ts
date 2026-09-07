import { describe, expect, it } from 'vitest';
import { readDriveConfig } from './config';

const base = {
	GOOGLE_DRIVE_FOLDER_ID: 'folder-1',
	GOOGLE_CLIENT_ID: 'client-id',
	GOOGLE_CLIENT_SECRET: 'client-secret',
	GOOGLE_REFRESH_TOKEN: 'refresh-token'
};

describe('readDriveConfig (OAuth)', () => {
	it('returns OAuth credentials when all OAuth env vars are present', () => {
		const config = readDriveConfig(base);
		expect(config.folderId).toBe('folder-1');
		expect(config.oAuth).toEqual({
			clientId: 'client-id',
			clientSecret: 'client-secret',
			refreshToken: 'refresh-token'
		});
	});

	it('throws when any OAuth env var is missing', () => {
		expect(() => readDriveConfig({ ...base, GOOGLE_REFRESH_TOKEN: undefined })).toThrow(/OAuth Google belum lengkap/);
		expect(() => readDriveConfig({ ...base, GOOGLE_CLIENT_SECRET: undefined })).toThrow(/OAuth Google belum lengkap/);
		expect(() => readDriveConfig({ GOOGLE_DRIVE_FOLDER_ID: 'folder-1' })).toThrow(/OAuth Google belum lengkap/);
	});

	it('throws when folder id is missing', () => {
		expect(() => readDriveConfig({ ...base, GOOGLE_DRIVE_FOLDER_ID: undefined })).toThrow(/belum dikonfigurasi/);
	});
});
