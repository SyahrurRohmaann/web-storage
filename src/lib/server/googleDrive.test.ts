import { describe, expect, it, vi } from 'vitest';

const create = vi.fn().mockResolvedValue({ data: { id: 'drive-9', name: 'note.txt' } });
const setCredentials = vi.fn();
const OAuth2 = vi.fn(function OAuth2Mock(this: { setCredentials: typeof setCredentials }) {
	this.setCredentials = setCredentials;
});

vi.mock('googleapis', () => ({
	google: {
		auth: {
			OAuth2,
			GoogleAuth: vi.fn()
		},
		drive: vi.fn(() => ({ files: { create } }))
	}
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		GOOGLE_CLIENT_ID: 'client-id',
		GOOGLE_CLIENT_SECRET: 'client-secret',
		GOOGLE_REFRESH_TOKEN: 'refresh-token',
		GOOGLE_DRIVE_FOLDER_ID: 'folder-1'
	}
}));

describe('uploadFile (OAuth user account)', () => {
	it('authenticates with the user OAuth refresh token and uploads into the folder', async () => {
		const { uploadFile } = await import('./googleDrive');
		const { google } = await import('googleapis');
		const result = await uploadFile(new File(['hi'], 'note.txt', { type: 'text/plain' }));
		expect(result).toEqual({ id: 'drive-9', name: 'note.txt' });
		expect(google.auth.OAuth2).toHaveBeenCalledWith('client-id', 'client-secret');
		expect(setCredentials).toHaveBeenCalledWith({ refresh_token: 'refresh-token' });
		expect(create.mock.calls[0][0].supportsAllDrives).toBe(true);
		expect(create.mock.calls[0][0].requestBody.parents).toEqual(['folder-1']);
	});
});
